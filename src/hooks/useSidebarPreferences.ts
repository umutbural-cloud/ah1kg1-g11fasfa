import { useEffect, useState } from "react";

export type SidebarItemKey = "backlog" | "journal" | "habits" | "workHistory" | "pomodoro";

export const SIDEBAR_ITEM_LABELS: Record<SidebarItemKey, string> = {
  backlog: "Heybe",
  journal: "Günlük",
  habits: "Alışkanlıklar",
  workHistory: "Çalışma Geçmişi",
  pomodoro: "Pomodoro",
};

export const SIDEBAR_ITEM_ORDER: SidebarItemKey[] = [
  "backlog",
  "journal",
  "habits",
  "workHistory",
  "pomodoro",
];

const DEFAULT_PREFS: Record<SidebarItemKey, boolean> = {
  backlog: true,
  journal: true,
  habits: true,
  workHistory: true,
  pomodoro: true,
};

const STORAGE_KEY = "keikaku.sidebarPreferences.v1";
const EVENT = "keikaku:sidebarPreferences";

const read = (): Record<SidebarItemKey, boolean> => {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

export const useSidebarPreferences = () => {
  const [prefs, setPrefs] = useState<Record<SidebarItemKey, boolean>>(read);

  useEffect(() => {
    const handler = () => setPrefs(read());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setItem = (key: SidebarItemKey, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(EVENT));
      } catch {}
      return next;
    });
  };

  return { prefs, setItem };
};
