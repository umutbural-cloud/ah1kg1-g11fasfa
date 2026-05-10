// Runs every minute (via pg_cron). Scans reminders, computes which are due in the
// user's timezone, sends a push, and stamps last_sent_for_date to prevent duplicates.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// Minutes since midnight in given IANA timezone.
const minutesInTz = (tz: string, now = new Date()) => {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const [hh, mm] = fmt.format(now).split(":").map((s) => parseInt(s, 10));
    return hh * 60 + mm;
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
};

// Day-of-week (0=Sun..6=Sat) in given timezone.
const dowInTz = (tz: string, now = new Date()) => {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
    const d = fmt.format(now);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(d);
  } catch {
    return now.getUTCDay();
  }
};

// Date YYYY-MM-DD in given timezone.
const dateInTz = (tz: string, now = new Date()) => {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    });
    return fmt.format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
};

const inQuietHours = (nowMin: number, start?: string | null, end?: string | null) => {
  if (!start || !end) return false;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map((s) => parseInt(s, 10));
    return h * 60 + m;
  };
  const s = toMin(start), e = toMin(end);
  if (s === e) return false;
  if (s < e) return nowMin >= s && nowMin < e;
  return nowMin >= s || nowMin < e; // wraps midnight
};

const parseTimeStr = (t: string): number => {
  const [h, m] = t.split(":").map((s) => parseInt(s, 10));
  return h * 60 + m;
};

// Resolve current time-of-day starts for a user. We re-fetch prayer times if auto mode.
const getSlotStarts = async (userSettings: any): Promise<Record<string, number>> => {
  const DEFAULT: Record<string, string> = {
    morning: "06:00", noon: "12:00", ikindi: "15:00", evening: "18:00", night: "21:00",
  };
  let starts = DEFAULT;

  if (userSettings.auto_prayer_times && (userSettings.city || userSettings.latitude != null)) {
    try {
      const date = dateInTz(userSettings.timezone || "Europe/Istanbul");
      const url = userSettings.latitude != null && userSettings.longitude != null
        ? `https://api.aladhan.com/v1/timings/${date}?latitude=${userSettings.latitude}&longitude=${userSettings.longitude}&method=${userSettings.calculation_method ?? 13}`
        : `https://api.aladhan.com/v1/timingsByCity/${date}?city=${encodeURIComponent(userSettings.city)}&country=${encodeURIComponent(userSettings.country || "Turkey")}&method=${userSettings.calculation_method ?? 13}`;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        const t = j?.data?.timings ?? {};
        const clean = (s: string) => /^\d{2}:\d{2}/.exec(String(s).trim())?.[0] ?? "00:00";
        starts = {
          morning: clean(t.Fajr), noon: clean(t.Dhuhr), ikindi: clean(t.Asr),
          evening: clean(t.Maghrib), night: clean(t.Isha),
        };
      }
    } catch { /* fall back to defaults */ }
  }

  const out: Record<string, number> = {};
  for (const k of Object.keys(starts)) out[k] = parseTimeStr(starts[k]);
  return out;
};

const sendPush = async (userId: string, payload: { title: string; body: string; url?: string; tag?: string }) => {
  await fetch(`${SUPABASE_URL}/functions/v1/push-send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ user_id: userId, ...payload }),
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Pull all enabled reminders. Volume should be modest.
    const { data: reminders, error } = await admin
      .from("reminders")
      .select("*")
      .eq("enabled", true);
    if (error) throw error;
    if (!reminders?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by user — we need user's timezone, slot starts, notification toggles, quiet hours
    const userIds = Array.from(new Set(reminders.map((r) => r.user_id)));
    const { data: settings } = await admin
      .from("user_settings")
      .select("user_id,timezone,quiet_hours_start,quiet_hours_end,notify_habits,notify_tasks,notify_pomodoro,auto_prayer_times,city,latitude,longitude,country,calculation_method")
      .in("user_id", userIds);
    const settingsByUser = new Map<string, any>();
    (settings ?? []).forEach((s) => settingsByUser.set(s.user_id, s));

    // Pre-compute per-user slot starts (only for users who have any time_of_day-based reminder)
    const slotStartsCache = new Map<string, Record<string, number>>();
    for (const userId of userIds) {
      const us = settingsByUser.get(userId) ?? {};
      slotStartsCache.set(userId, await getSlotStarts(us));
    }

    let sent = 0;
    let skipped = 0;

    for (const rem of reminders) {
      const us = settingsByUser.get(rem.user_id) ?? {};
      const tz = us.timezone || "Europe/Istanbul";
      const dow = dowInTz(tz, now);
      const dayDate = dateInTz(tz, now);
      const nowMin = minutesInTz(tz, now);

      // Day of week filter
      if (Array.isArray(rem.days_of_week) && !rem.days_of_week.includes(dow)) continue;

      // Quiet hours
      if (inQuietHours(nowMin, us.quiet_hours_start, us.quiet_hours_end)) continue;

      // Module toggle
      if (rem.target_type === "habit" && us.notify_habits === false) continue;
      if (rem.target_type === "task" && us.notify_tasks === false) continue;
      if (rem.target_type === "pomodoro_phase" && us.notify_pomodoro === false) continue;

      // Already sent today?
      if (rem.last_sent_for_date === dayDate) continue;

      // Compute trigger minute-of-day
      let triggerMin: number | null = null;
      if (rem.trigger_type === "absolute_time" && rem.absolute_time) {
        triggerMin = parseTimeStr(String(rem.absolute_time).slice(0, 5));
      } else if ((rem.trigger_type === "before_slot" || rem.trigger_type === "after_slot") && rem.slot_key) {
        const starts = slotStartsCache.get(rem.user_id) ?? {};
        const base = starts[rem.slot_key];
        if (base != null) {
          const offset = Number(rem.offset_minutes ?? 0);
          triggerMin = rem.trigger_type === "before_slot" ? base - offset : base + offset;
        }
      }

      if (triggerMin == null) { skipped++; continue; }

      // Fire if within a 5-minute window after the trigger time. Stamp last_sent_for_date so we don't double-fire.
      const diff = nowMin - triggerMin;
      if (diff < 0 || diff > 5) continue;

      // Resolve title/body
      let title = rem.title || "Keikaku";
      let body = rem.body || "Hatırlatıcı";

      if (rem.target_type === "habit" && rem.target_id) {
        const { data: habit } = await admin.from("habits").select("title").eq("id", rem.target_id).maybeSingle();
        if (habit) {
          title = habit.title;
          body = "Alışkanlık zamanı.";
        }
      } else if (rem.target_type === "task" && rem.target_id) {
        const { data: task } = await admin.from("tasks").select("title").eq("id", rem.target_id).maybeSingle();
        if (task) {
          title = task.title;
          body = "Görev zamanı.";
        }
      }

      await sendPush(rem.user_id, { title, body, url: "/", tag: `reminder-${rem.id}` });
      await admin.from("reminders").update({
        last_sent_at: new Date().toISOString(),
        last_sent_for_date: dayDate,
      }).eq("id", rem.id);
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, processed: reminders.length, sent, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
