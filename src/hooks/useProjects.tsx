import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Project = {
  id: string;
  name: string;
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
    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const createProject = async (name: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, user_id: user.id })
      .select()
      .single();
    if (!error && data) {
      setProjects((prev) => [...prev, data]);
    }
    return data;
  };

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return { projects, loading, createProject, deleteProject, refetch: fetchProjects };
};
