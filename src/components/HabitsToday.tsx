import { useMemo, useState } from "react";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useHabits, isHabitScheduledOn, type Habit } from "@/hooks/useHabits";
import { getHabitIcon } from "@/lib/habitIcons";
import { TIME_OF_DAY_OPTIONS, currentTimeOfDay, type TimeOfDay } from "@/lib/timeOfDay";
import HabitDetailDialog from "./HabitDetailDialog";
import { Circle, CircleDot } from "lucide-react";

const HabitsToday = () => {
  const { habits, completionsMap, today, toggleCompletion, updateHabit, deleteHabit } = useHabits();
  const [filter, setFilter] = useState<TimeOfDay | "all">(currentTimeOfDay());
  const [openHabit, setOpenHabit] = useState<Habit | null>(null);

  const todayDate = parseISO(today);

  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => subDays(todayDate, 6 - i)), [today]);

  const visible = habits.filter((h) =>
    isHabitScheduledOn(h, todayDate) && (filter === "all" || h.time_of_day === filter || (filter !== "all" && h.time_of_day === "any"))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-sm text-xs tracking-wide transition-colors ${filter === "all" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"}`}
        >Tümü</button>
        {TIME_OF_DAY_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => setFilter(o.key)}
            className={`px-3 py-1 rounded-sm text-xs tracking-wide transition-colors ${filter === o.key ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"}`}
          >{o.label}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Bu dilim için planlı alışkanlık yok</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden divide-y divide-border/40">
          {visible.map((h) => {
            const Icon = getHabitIcon(h.icon);
            const completedToday = h.completed_today;
            return (
              <div key={h.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent/20 transition-colors">
                <button
                  onClick={() => toggleCompletion(h)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title={completedToday ? "İşareti kaldır" : "Tamamlandı"}
                >
                  {completedToday ? <CircleDot className="h-5 w-5 text-foreground" strokeWidth={1.5} /> : <Circle className="h-5 w-5" strokeWidth={1.5} />}
                </button>
                <button
                  onClick={() => setOpenHabit(h)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <span className={`text-sm font-light truncate ${completedToday ? "line-through text-muted-foreground" : ""}`}>{h.title}</span>
                </button>
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {last7.map((d) => {
                    const ds = format(d, "yyyy-MM-dd");
                    const done = completionsMap[h.id]?.has(ds);
                    const isToday = isSameDay(d, todayDate);
                    return (
                      <div key={ds} className="flex flex-col items-center gap-0.5" title={format(d, "d MMM EEE", { locale: tr })}>
                        <span className={`text-[8px] tracking-wider uppercase ${isToday ? "text-foreground" : "text-muted-foreground/60"}`}>
                          {format(d, "EEEEEE", { locale: tr })}
                        </span>
                        {done
                          ? <CircleDot className="h-3 w-3 text-foreground" strokeWidth={1.5} />
                          : <Circle className="h-3 w-3 text-muted-foreground/50" strokeWidth={1.5} />
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HabitDetailDialog
        open={!!openHabit}
        habit={openHabit}
        onClose={() => setOpenHabit(null)}
        onSave={updateHabit}
        onDelete={deleteHabit}
      />
    </div>
  );
};

export default HabitsToday;
