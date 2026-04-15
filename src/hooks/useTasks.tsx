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
      .order("created_at", { ascending: true });
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [user, projectId]);

  const createTask = async (task: { title: string; description?: string; status?: TaskStatus; start_date?: string; end_date?: string }) => {
    if (!user || !projectId) return null;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...task, project_id: projectId, user_id: user.id })
      .select()
      .single();
    if (!error && data) setTasks((prev) => [...prev, data]);
    return data;
  };

  const updateTask = async (id: string, updates: Partial<Omit<Task, "id" | "project_id" | "user_id" | "created_at">>) => {
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
    if (!error && data) setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return { tasks, loading, createTask, updateTask, deleteTask, refetch: fetchTasks };
};
