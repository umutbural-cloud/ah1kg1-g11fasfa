import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Project = {
  id: string;
  name: string;
  emoji: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
};

export const useProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });
    setProjects((data as Project[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const createProject = async (name: string, parentId?: string) => {
    if (!user) return null;
    const insertData: any = { name, user_id: user.id };
    if (parentId) insertData.parent_id = parentId;
    const { data, error } = await supabase
      .from("projects")
      .insert(insertData)
      .select()
      .single();
    if (!error && data) {
      setProjects((prev) => [...prev, data as Project]);
    }
    return data as Project | null;
  };

  const updateProject = async (id: string, updates: { name?: string; emoji?: string }) => {
    const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single();
    if (!error && data) setProjects((prev) => prev.map((p) => (p.id === id ? (data as Project) : p)));
    return data;
  };

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id && p.parent_id !== id));
  };

  return { projects, loading, createProject, updateProject, deleteProject, refetch: fetchProjects };
};
