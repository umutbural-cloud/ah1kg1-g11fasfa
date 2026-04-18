import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];

export type Task = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  position: number;
  hidden: boolean;
  created_at: string;
};

export const useTasks = (projectId: string | null) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!user || !projectId) { setTasks([]); setLoading(false); return; }
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true });
    setTasks((data as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [user, projectId]);

  const createTask = async (task: {
    title: string;
    description?: string;
    status?: TaskStatus;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
  }) => {
    if (!user || !projectId) return null;
    const maxPos = tasks.reduce((m, t) => Math.max(m, t.position || 0), 0);
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...task, project_id: projectId, user_id: user.id, position: maxPos + 1 } as any)
      .select()
      .single();
    if (!error && data) setTasks((prev) => [...prev, data as Task]);
    return data as Task | null;
  };

  const updateTask = async (id: string, updates: Partial<Omit<Task, "id" | "project_id" | "user_id" | "created_at">>) => {
    const { data, error } = await supabase.from("tasks").update(updates as any).eq("id", id).select().single();
    if (!error && data) setTasks((prev) => prev.map((t) => (t.id === id ? (data as Task) : t)));
    return data;
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Reorder by passing a new ordered array of task IDs (only those being reordered)
  const reorderTasks = async (orderedIds: string[]) => {
    // Optimistic
    const idToPos = new Map(orderedIds.map((id, i) => [id, i + 1]));
    setTasks((prev) =>
      [...prev].map((t) => (idToPos.has(t.id) ? { ...t, position: idToPos.get(t.id)! } : t))
        .sort((a, b) => a.position - b.position)
    );
    // Persist
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from("tasks").update({ position: i + 1 } as any).eq("id", id)
      )
    );
  };

  return { tasks, loading, createTask, updateTask, deleteTask, reorderTasks, refetch: fetchTasks };
};
