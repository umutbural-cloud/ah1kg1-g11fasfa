export type TimeOfDay = "morning" | "afternoon" | "evening" | "night" | "any";

export const TIME_OF_DAY_OPTIONS: { key: TimeOfDay; label: string; jp: string; range: string }[] = [
  { key: "morning", label: "Sabah", jp: "朝", range: "04:00–12:00" },
  { key: "afternoon", label: "Öğleden Sonra", jp: "昼", range: "12:01–18:00" },
  { key: "evening", label: "Akşam", jp: "夕", range: "18:01–22:00" },
  { key: "night", label: "Gece", jp: "夜", range: "22:01–04:00" },
];

export const currentTimeOfDay = (d = new Date()): Exclude<TimeOfDay, "any"> => {
  const h = d.getHours();
  if (h >= 4 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 22) return "evening";
  return "night";
};

export const timeOfDayLabel = (t: TimeOfDay) => {
  if (t === "any") return "Herhangi";
  return TIME_OF_DAY_OPTIONS.find((o) => o.key === t)?.label || "";
};
