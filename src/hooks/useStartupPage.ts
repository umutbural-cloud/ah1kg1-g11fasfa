import { useEffect, useState } from "react";

export type StartupPage =
  | { type: "module"; value: "backlog" | "journal" | "habits" | "workHistory" | "pomodoro" }
  | { type: "project"; value: string }
  | { type: "default" };

const STORAGE_KEY = "keikaku.startupPage.v1";
const EVENT = "keikaku:startupPage";

const read = (): StartupPage => {
  if (typeof window === "undefined") return { type: "default" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { type: "default" };
    return JSON.parse(raw);
  } catch {
    return { type: "default" };
  }
};

export const useStartupPage = () => {
  const [startup, setStartupState] = useState<StartupPage>(read);

  useEffect(() => {
    const handler = () => setStartupState(read());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setStartup = (next: StartupPage) => {
    setStartupState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT));
    } catch {}
  };

  return { startup, setStartup };
};
