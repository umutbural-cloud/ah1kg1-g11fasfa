import { useMemo, useState } from "react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import { useHabits, isHabitScheduledOn } from "@/hooks/useHabits";
import { getHabitIcon } from "@/lib/habitIcons";

type Range = "week" | "month" | "year";

const RANGE_DAYS: Record<Range, number> = { week: 7, month: 30, year: 365 };
const RANGE_LABEL: Record<Range, string> = { week: "Hafta", month: "Ay", year: "Yıl" };

const HabitsStats = () => {
  const { habits, completionsMap, today } = useHabits();
  const [range, setRange] = useState<Range>("week");

  const stats = useMemo(() => {
    const days = RANGE_DAYS[range];
    const end = parseISO(today);
    const start = subDays(end, days - 1);
    const dateList = eachDayOfInterval({ start, end });

    return habits.map((h) => {
      const scheduled = dateList.filter((d) => isHabitScheduledOn(h, d));
      const set = completionsMap[h.id] || new Set<string>();
      const completed = scheduled.filter((d) => set.has(format(d, "yyyy-MM-dd"))).length;
      const total = scheduled.length;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

      // longest streak (within range, scheduled days only)
      let cur = 0, best = 0;
      scheduled.forEach((d) => {
        if (set.has(format(d, "yyyy-MM-dd"))) { cur++; best = Math.max(best, cur); }
        else cur = 0;
      });

      return { habit: h, completed, total, rate, best };
    });
  }, [habits, completionsMap, today, range]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-sm text-xs tracking-wide transition-colors ${range === r ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"}`}
          >{RANGE_LABEL[r]}</button>
        ))}
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p>İstatistik için alışkanlık ekleyin</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden divide-y divide-border/40">
          {stats.map(({ habit, completed, total, rate, best }) => {
            const Icon = getHabitIcon(habit.icon);
            return (
              <div key={habit.id} className="px-3 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-sm font-light flex-1 truncate">{habit.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{rate}%</span>
                </div>
                <div className="h-1.5 w-full bg-accent/30 rounded-sm overflow-hidden">
                  <div className="h-full bg-foreground/60" style={{ width: `${rate}%` }} />
                </div>
                <div className="flex items-center gap-4 text-[10px] tracking-wide text-muted-foreground">
                  <span>{completed} / {total} tamamlama</span>
                  <span>En uzun seri: {best} gün</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HabitsStats;
