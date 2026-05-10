// Sends a Web Push notification to a user (all their devices) or directly to an endpoint.
// Used by:
//  - reminder-scheduler (cron)
//  - manual triggers (e.g. test push from settings)
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import webpush from "npm:web-push@3.6.7";

const PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:noreply@keikaku.app";

webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);

type Payload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

const sendToSubscription = async (sub: { endpoint: string; p256dh: string; auth: string }, payload: Payload) => {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
    return { ok: true };
  } catch (e: any) {
    return { ok: false, statusCode: e?.statusCode, error: e?.message ?? String(e) };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const isService = auth === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = null;
    if (!isService) {
      // user-triggered: validate JWT & only allow sending to self
      if (!auth.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data, error } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
      if (error || !data?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      userId = data.claims.sub as string;
    }

    const body = await req.json();
    const targetUserId = isService ? (body.user_id as string) : userId!;
    const payload: Payload = {
      title: String(body.title ?? "Keikaku"),
      body: String(body.body ?? ""),
      url: body.url ? String(body.url) : "/",
      tag: body.tag ? String(body.tag) : undefined,
    };

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", targetUserId);

    if (!subs?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;
    let removed = 0;
    for (const s of subs) {
      const r = await sendToSubscription(s, payload);
      if (r.ok) {
        sent++;
      } else if (r.statusCode === 404 || r.statusCode === 410) {
        // subscription expired/gone — clean up
        await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        removed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, removed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), { status: 500, headers: corsHeaders });
  }
});
