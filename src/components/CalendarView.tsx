import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const CalendarView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask } = useTasks(projectId);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getTasksForDay = (day: Date) => {
    return tasks.filter((t) => {
      if (t.start_date && t.end_date) {
        return isWithinInterval(day, { start: parseISO(t.start_date), end: parseISO(t.end_date) });
      }
      if (t.start_date) return isSameDay(day, parseISO(t.start_date));
      return false;
    });
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim() || !selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    await createTask({ title: newTitle.trim(), start_date: dateStr, end_date: dateStr });
    setNewTitle("");
    setSelectedDate(null);
  };

  const today = new Date();
  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg tracking-wide">暦 — Takvim</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[120px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: tr })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="border border-border/60 rounded-sm">
        {/* Week header */}
        <div className="grid grid-cols-7 border-b border-border/60">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[10px] text-muted-foreground p-2 tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayTasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[80px] p-1.5 border-b border-r border-border/30 cursor-pointer hover:bg-card/50 transition-colors ${
                  !isCurrentMonth ? "opacity-30" : ""
                }`}
              >
                <div className={`text-xs mb-1 ${isToday ? "bg-foreground text-background rounded-full w-5 h-5 flex items-center justify-center" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </div>
                {dayTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="text-[10px] font-light truncate px-1 py-0.5 mb-0.5 rounded-sm bg-foreground/5 border border-border/30"
                  >
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[9px] text-muted-foreground px-1">+{dayTasks.length - 3}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-light tracking-wide">
              {selectedDate && format(selectedDate, "d MMMM yyyy", { locale: tr })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDate && getTasksForDay(selectedDate).map((t) => (
              <div key={t.id} className="text-sm font-light px-2 py-1.5 border border-border/60 rounded-sm">
                {t.title}
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                placeholder="Yeni görev..."
                className="bg-transparent h-8 text-sm"
              />
              <Button variant="ghost" size="sm" onClick={handleCreateTask} className="h-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView;
