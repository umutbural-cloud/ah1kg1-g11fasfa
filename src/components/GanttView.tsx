import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import {
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  differenceInDays,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  addMonths,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { tr } from "date-fns/locale";

const GanttView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading } = useTasks(projectId);
  const [viewDate, setViewDate] = useState(new Date());
  const [mode, setMode] = useState<"week" | "month">("month");

  const range = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(viewDate, { weekStartsOn: 1 });
      const end = endOfWeek(viewDate, { weekStartsOn: 1 });
      return { start, end, days: eachDayOfInterval({ start, end }) };
    }
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return { start, end, days: eachDayOfInterval({ start, end }) };
  }, [viewDate, mode]);

  const navigate = (dir: number) => {
    setViewDate(mode === "week" ? addDays(viewDate, dir * 7) : addMonths(viewDate, dir));
  };

  const tasksWithDates = tasks.filter((t) => t.start_date && t.end_date);

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg tracking-wide">ガント — Gantt</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMode(mode === "week" ? "month" : "week")} className="text-xs">
            {mode === "week" ? "Aylık" : "Haftalık"}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[120px] text-center">
            {format(viewDate, mode === "week" ? "d MMM yyyy" : "MMMM yyyy", { locale: tr })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {tasksWithDates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Tarih aralığı olan görev yok</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-x-auto">
          {/* Header */}
          <div className="flex border-b border-border/60 min-w-[600px]">
            <div className="w-40 shrink-0 p-2 text-xs text-muted-foreground tracking-wide">Görev</div>
            <div className="flex-1 flex">
              {range.days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="flex-1 text-center text-[10px] text-muted-foreground p-1 border-l border-border/30"
                >
                  {format(day, "d")}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {tasksWithDates.map((task) => {
            const taskStart = parseISO(task.start_date!);
            const taskEnd = parseISO(task.end_date!);
            const totalDays = range.days.length;

            const startOffset = Math.max(0, differenceInDays(taskStart, range.start));
            const endOffset = Math.min(totalDays - 1, differenceInDays(taskEnd, range.start));
            const barWidth = Math.max(0, endOffset - startOffset + 1);

            const isVisible = barWidth > 0 && startOffset < totalDays;

            return (
              <div key={task.id} className="flex border-b border-border/30 min-w-[600px] hover:bg-card/50">
                <div className="w-40 shrink-0 p-2 text-xs font-light truncate">{task.title}</div>
                <div className="flex-1 relative h-8">
                  {isVisible && (
                    <div
                      className="absolute top-1.5 h-5 rounded-sm bg-foreground/15 border border-border/40"
                      style={{
                        left: `${(startOffset / totalDays) * 100}%`,
                        width: `${(barWidth / totalDays) * 100}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GanttView;
