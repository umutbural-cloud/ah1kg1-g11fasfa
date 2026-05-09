import { useEffect, useState } from "react";

export type TimeOfDay = "morning" | "noon" | "ikindi" | "evening" | "night" | "any";

export type TimeOfDayKey = Exclude<TimeOfDay, "any">;

export const TIME_OF_DAY_KEYS: TimeOfDayKey[] = ["morning", "noon", "ikindi", "evening", "night"];

export const TIME_OF_DAY_LABELS: Record<TimeOfDayKey, { label: string; jp: string }> = {
  morning: { label: "Sabah", jp: "朝" },
  noon: { label: "Öğle", jp: "昼" },
  ikindi: { label: "İkindi", jp: "申" },
  evening: { label: "Akşam", jp: "夕" },
  night: { label: "Gece", jp: "夜" },
};

// Default start times for each slot (HH:MM, 24h). Each slot ends where the next begins.
export const DEFAULT_TIME_OF_DAY_STARTS: Record<TimeOfDayKey, string> = {
  morning: "04:00",
  noon: "11:00",
  ikindi: "14:00",
  evening: "17:30",
  night: "21:00",
};

const STORAGE_KEY = "habits-time-of-day-starts";
const EVENT = "time-of-day-ranges-changed";

const isValidTime = (s: unknown): s is string =>
  typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export const readTimeOfDayStarts = (): Record<TimeOfDayKey, string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TIME_OF_DAY_STARTS };
    const parsed = JSON.parse(raw);
    const out = { ...DEFAULT_TIME_OF_DAY_STARTS };
    TIME_OF_DAY_KEYS.forEach((k) => {
      if (isValidTime(parsed?.[k])) out[k] = parsed[k];
    });
    return out;
  } catch {
    return { ...DEFAULT_TIME_OF_DAY_STARTS };
  }
};

export const saveTimeOfDayStarts = (starts: Record<TimeOfDayKey, string>) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(starts)); } catch {}
  window.dispatchEvent(new Event(EVENT));
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
};

const fmtRange = (startMin: number, endMin: number) => {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
};

export type TimeOfDayOption = {
  key: TimeOfDayKey;
  label: string;
  jp: string;
  range: string;
  startMin: number;
  endMin: number;
};

export const getTimeOfDayOptions = (
  starts: Record<TimeOfDayKey, string> = readTimeOfDayStarts(),
): TimeOfDayOption[] => {
  return TIME_OF_DAY_KEYS.map((k, i) => {
    const startMin = toMinutes(starts[k]);
    const nextKey = TIME_OF_DAY_KEYS[(i + 1) % TIME_OF_DAY_KEYS.length];
    let endMin = toMinutes(starts[nextKey]);
    if (endMin <= startMin) endMin += 24 * 60;
    return {
      key: k,
      label: TIME_OF_DAY_LABELS[k].label,
      jp: TIME_OF_DAY_LABELS[k].jp,
      range: fmtRange(startMin, endMin),
      startMin,
      endMin,
    };
  });
};

// Backwards-compatible default export of options (computed at module init for non-reactive callers).
export const TIME_OF_DAY_OPTIONS: TimeOfDayOption[] = getTimeOfDayOptions();

export const currentTimeOfDay = (d = new Date()): TimeOfDayKey => {
  const opts = getTimeOfDayOptions();
  const nowMin = d.getHours() * 60 + d.getMinutes();
  for (const o of opts) {
    const s = o.startMin;
    const e = o.endMin;
    if (e <= 24 * 60) {
      if (nowMin >= s && nowMin < e) return o.key;
    } else {
      if (nowMin >= s || nowMin < e - 24 * 60) return o.key;
    }
  }
  return "morning";
};

export const timeOfDayLabel = (t: TimeOfDay) => {
  if (t === "any") return "Herhangi";
  // Backwards compatibility: legacy "afternoon" → "Öğle"
  if ((t as string) === "afternoon") return TIME_OF_DAY_LABELS.noon.label;
  return TIME_OF_DAY_LABELS[t as TimeOfDayKey]?.label || "";
};

export const useTimeOfDayRanges = () => {
  const [starts, setStarts] = useState<Record<TimeOfDayKey, string>>(readTimeOfDayStarts);

  useEffect(() => {
    const onChange = () => setStarts(readTimeOfDayStarts());
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) onChange(); };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = (key: TimeOfDayKey, value: string) => {
    if (!isValidTime(value)) return;
    const next = { ...starts, [key]: value };
    setStarts(next);
    saveTimeOfDayStarts(next);
  };

  const reset = () => {
    setStarts({ ...DEFAULT_TIME_OF_DAY_STARTS });
    saveTimeOfDayStarts({ ...DEFAULT_TIME_OF_DAY_STARTS });
  };

  const options = getTimeOfDayOptions(starts);
  return { starts, options, update, reset };
};
