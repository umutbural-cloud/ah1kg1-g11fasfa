import { useEffect, useState } from "react";

export type ViewKey = "notes" | "table" | "gantt" | "kanban" | "calendar";

const ALL_VIEWS: ViewKey[] = ["notes", "table", "gantt", "kanban", "calendar"];
const DEFAULT_VIEWS: ViewKey[] = ["notes", "table"];
const STORAGE_KEY = "keikaku.projectViews.v1";

type Map = Record<string, ViewKey[]>;

const read = (): Map => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
};
const write = (m: Map) => localStorage.setItem(STORAGE_KEY, JSON.stringify(m));

export const useProjectViews = (projectId: string | null) => {
  const [views, setViews] = useState<ViewKey[]>(DEFAULT_VIEWS);

  useEffect(() => {
    if (!projectId) return;
    const m = read();
    setViews(m[projectId] || DEFAULT_VIEWS);
  }, [projectId]);

  const setProjectViews = (next: ViewKey[]) => {
    if (!projectId) return;
    const m = read();
    m[projectId] = next;
    write(m);
    setViews(next);
  };

  const addView = (v: ViewKey) => {
    if (views.includes(v)) return;
    setProjectViews([...views, v]);
  };
  const removeView = (v: ViewKey) => {
    setProjectViews(views.filter((x) => x !== v));
  };

  return { views, addView, removeView, allViews: ALL_VIEWS };
};
