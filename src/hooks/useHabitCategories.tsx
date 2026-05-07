import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type HabitCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
};

export const CATEGORY_COLORS: { key: string; hex: string; label: string }[] = [
  { key: "gray", hex: "#9ca3af", label: "Gri" },
  { key: "stone", hex: "#a8a29e", label: "Taş" },
  { key: "rose", hex: "#fb7185", label: "Gül" },
  { key: "amber", hex: "#f59e0b", label: "Kehribar" },
  { key: "emerald", hex: "#10b981", label: "Zümrüt" },
  { key: "sky", hex: "#0ea5e9", label: "Gök" },
  { key: "violet", hex: "#8b5cf6", label: "Mor" },
  { key: "slate", hex: "#64748b", label: "Çelik" },
];

export const colorHex = (key?: string | null) =>
  CATEGORY_COLORS.find((c) => c.key === key)?.hex ?? "#9ca3af";

const DEFAULTS: { name: string; color: string }[] = [
  { name: "Sağlık", color: "emerald" },
  { name: "Gelişim", color: "violet" },
  { name: "Üretkenlik", color: "sky" },
  { name: "Rutin", color: "stone" },
];

export const useHabitCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user) { setCategories([]); setLoading(false); return; }
    const { data } = await supabase
      .from("habit_categories" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true });
    let rows = (data as any as HabitCategory[]) || [];
    if (rows.length === 0) {
      const payload = DEFAULTS.map((d, i) => ({ user_id: user.id, name: d.name, color: d.color, position: i }));
      const { data: ins } = await supabase.from("habit_categories" as any).insert(payload).select();
      rows = (ins as any as HabitCategory[]) || [];
    }
    setCategories(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const createCategory = async (name: string, color = "gray") => {
    if (!user || !name.trim()) return null;
    const pos = categories.reduce((m, c) => Math.max(m, c.position), 0) + 1;
    const { data } = await supabase.from("habit_categories" as any)
      .insert({ user_id: user.id, name: name.trim(), color, position: pos })
      .select().single();
    if (data) setCategories((p) => [...p, data as any]);
    return data as any;
  };

  const updateCategory = async (id: string, updates: Partial<HabitCategory>) => {
    const { data } = await supabase.from("habit_categories" as any).update(updates as any).eq("id", id).select().single();
    if (data) setCategories((p) => p.map((c) => c.id === id ? { ...c, ...(data as any) } : c));
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("habit_categories" as any).delete().eq("id", id);
    setCategories((p) => p.filter((c) => c.id !== id));
  };

  return { categories, loading, createCategory, updateCategory, deleteCategory };
};
