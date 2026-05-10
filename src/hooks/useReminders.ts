import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ReminderTargetType = "habit" | "task" | "pomodoro_phase" | "time_of_day";
export type ReminderTriggerType = "absolute_time" | "before_slot" | "after_slot";

export type Reminder = {
  id: string;
  user_id: string;
  target_type: ReminderTargetType;
  target_id: string | null;
  target_key: string | null;
  trigger_type: ReminderTriggerType;
  absolute_time: string | null; // 'HH:MM:SS'
  slot_key: string | null;
  offset_minutes: number;
  days_of_week: number[];
  enabled: boolean;
  title: string | null;
  body: string | null;
  created_at: string;
};

export const useReminders = (target_type: ReminderTargetType, target_id?: string | null, target_key?: string | null) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setReminders([]); setLoading(false); return; }
    let q = supabase.from("reminders" as any).select("*").eq("user_id", user.id).eq("target_type", target_type);
    if (target_id !== undefined) q = q.eq("target_id", target_id ?? (null as any));
    if (target_key !== undefined && target_key !== null) q = q.eq("target_key", target_key);
    const { data } = await q.order("created_at", { ascending: true });
    setReminders((data as any[] as Reminder[]) ?? []);
    setLoading(false);
  }, [user?.id, target_type, target_id, target_key]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (input: Partial<Reminder>) => {
    if (!user) return null;
    const payload: any = {
      user_id: user.id,
      target_type,
      target_id: target_id ?? null,
      target_key: target_key ?? null,
      trigger_type: input.trigger_type ?? "absolute_time",
      absolute_time: input.absolute_time ?? null,
      slot_key: input.slot_key ?? null,
      offset_minutes: input.offset_minutes ?? 0,
      days_of_week: input.days_of_week ?? [0, 1, 2, 3, 4, 5, 6],
      enabled: input.enabled ?? true,
      title: input.title ?? null,
      body: input.body ?? null,
    };
    const { data } = await supabase.from("reminders" as any).insert(payload).select().single();
    if (data) setReminders((p) => [...p, data as any as Reminder]);
    return data;
  };

  const update = async (id: string, patch: Partial<Reminder>) => {
    const { data } = await supabase.from("reminders" as any).update(patch as any).eq("id", id).select().single();
    if (data) setReminders((p) => p.map((r) => r.id === id ? (data as any as Reminder) : r));
  };

  const remove = async (id: string) => {
    await supabase.from("reminders" as any).delete().eq("id", id);
    setReminders((p) => p.filter((r) => r.id !== id));
  };

  return { reminders, loading, create, update, remove, refetch: fetchAll };
};
