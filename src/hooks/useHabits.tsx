import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { format } from "date-fns";

export type Habit = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  position: number;
  hidden: boolean;
  created_at: string;
  completed_today: boolean;
};

const todayStr = () => format(new Date(), "yyyy-MM-dd");

export const useHabits = (projectId: string | null) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(todayStr());

  // Watch for date change (midnight rollover)
  useEffect(() => {
    const interval = setInterval(() => {
      const d = todayStr();
      if (d !== today) setToday(d);
    }, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [today]);

  const fetchHabits = async () => {
    if (!user || !projectId) { setHabits([]); setLoading(false); return; }
    const { data: rows } = await supabase
      .from("habits")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (!rows) { setHabits([]); setLoading(false); return; }
    const ids = rows.map((r: any) => r.id);
    let completedSet = new Set<string>();
    if (ids.length) {
      const { data: comps } = await supabase
        .from("habit_completions")
        .select("habit_id")
        .in("habit_id", ids)
        .eq("completion_date", today);
      completedSet = new Set((comps || []).map((c: any) => c.habit_id));
    }
    setHabits(rows.map((r: any) => ({ ...r, completed_today: completedSet.has(r.id) })));
    setLoading(false);
  };

  useEffect(() => { fetchHabits(); }, [user, projectId, today]);

  const createHabit = async (title: string) => {
    if (!user || !projectId || !title.trim()) return;
    const maxPos = habits.reduce((m, h) => Math.max(m, h.position || 0), 0);
    const { data } = await supabase
      .from("habits")
      .insert({ user_id: user.id, project_id: projectId, title: title.trim(), position: maxPos + 1 })
      .select()
      .single();
    if (data) setHabits((prev) => [...prev, { ...(data as any), completed_today: false }]);
  };

  const updateHabit = async (id: string, updates: Partial<Pick<Habit, "title" | "hidden">>) => {
    const { data } = await supabase.from("habits").update(updates).eq("id", id).select().single();
    if (data) setHabits((prev) => prev.map((h) => h.id === id ? { ...h, ...(data as any) } : h));
  };

  const deleteHabit = async (id: string) => {
    await supabase.from("habits").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const toggleCompletion = async (habit: Habit) => {
    if (!user) return;
    if (habit.completed_today) {
      await supabase
        .from("habit_completions")
        .delete()
        .eq("habit_id", habit.id)
        .eq("completion_date", today);
      setHabits((prev) => prev.map((h) => h.id === habit.id ? { ...h, completed_today: false } : h));
    } else {
      await supabase
        .from("habit_completions")
        .insert({ habit_id: habit.id, user_id: user.id, completion_date: today });
      setHabits((prev) => prev.map((h) => h.id === habit.id ? { ...h, completed_today: true } : h));
    }
  };

  return { habits, loading, createHabit, updateHabit, deleteHabit, toggleCompletion };
};
