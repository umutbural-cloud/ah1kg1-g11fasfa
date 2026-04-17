import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasks, Task } from "@/hooks/useTasks";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  addWeeks,
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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00

const WeeklyCalendarView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeek]);

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => {
      if (t.start_date && t.end_date) {
        return isWithinInterval(day, { start: parseISO(t.start_date), end: parseISO(t.end_date) });
      }
      if (t.start_date) return isSameDay(day, parseISO(t.start_date));
      return false;
    });

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedSlot) return;
    const dateStr = format(selectedSlot.date, "yyyy-MM-dd");
    await createTask({ title: newTitle.trim(), start_date: dateStr, end_date: dateStr });
    setNewTitle("");
    setSelectedSlot(null);
  };

  const today = new Date();
  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg tracking-wide">週 — Hafta</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[180px] text-center">
            {format(days[0], "d MMM", { locale: tr })} – {format(days[6], "d MMM yyyy", { locale: tr })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCurrentWeek(new Date())}>
            Bugün
          </Button>
        </div>
      </div>

      <div className="border border-border/60 rounded-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/60 bg-card/30">
          <div />
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={i} className="text-center p-2 border-l border-border/30">
                <div className="text-[10px] text-muted-foreground tracking-wide">{weekDays[i]}</div>
                <div className={`text-sm mt-0.5 ${isToday ? "text-foreground font-medium" : "text-muted-foreground font-light"}`}>
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/60 min-h-[40px]">
          <div className="text-[9px] text-muted-foreground p-1.5 tracking-wide">tüm gün</div>
          {days.map((day, i) => {
            const dayTasks = getTasksForDay(day);
            return (
              <div
                key={i}
                className="border-l border-border/30 p-1 space-y-0.5 cursor-pointer hover:bg-card/40"
                onClick={() => setSelectedSlot({ date: day, hour: 9 })}
              >
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={(e) => { e.stopPropagation(); setOpenTask(t); }}
                    className="text-[10px] font-light truncate px-1.5 py-1 rounded-sm bg-foreground/10 hover:bg-foreground/20 transition-colors border-l-2 border-foreground/40"
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Hour grid */}
        <div className="max-h-[60vh] overflow-y-auto">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30 min-h-[44px]">
              <div className="text-[10px] text-muted-foreground p-1.5 tracking-wide">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((day, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedSlot({ date: day, hour })}
                  className="border-l border-border/30 cursor-pointer hover:bg-card/40 transition-colors"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* New task dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={(o) => { if (!o) { setSelectedSlot(null); setNewTitle(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-light tracking-wide">
              {selectedSlot && format(selectedSlot.date, "d MMMM yyyy", { locale: tr })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Görev başlığı..."
              className="bg-transparent h-9 text-sm"
              autoFocus
            />
            <Button variant="ghost" size="sm" onClick={handleCreate} className="h-9">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task detail dialog */}
      <Dialog open={!!openTask} onOpenChange={(o) => { if (!o) setOpenTask(null); }}>
        <DialogContent className="sm:max-w-md">
          {openTask && (
            <div className="space-y-3">
              <Input
                value={openTask.title}
                onChange={(e) => {
                  const v = e.target.value;
                  setOpenTask({ ...openTask, title: v });
                  updateTask(openTask.id, { title: v });
                }}
                className="bg-transparent border-none p-0 h-auto text-lg font-light tracking-wide focus-visible:ring-0"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç</div>
                  <Input
                    type="date"
                    value={openTask.start_date || ""}
                    onChange={(e) => {
                      setOpenTask({ ...openTask, start_date: e.target.value });
                      updateTask(openTask.id, { start_date: e.target.value || null });
                    }}
                    className="bg-transparent h-8 text-xs"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş</div>
                  <Input
                    type="date"
                    value={openTask.end_date || ""}
                    onChange={(e) => {
                      setOpenTask({ ...openTask, end_date: e.target.value });
                      updateTask(openTask.id, { end_date: e.target.value || null });
                    }}
                    className="bg-transparent h-8 text-xs"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive w-full justify-start"
                onClick={() => { deleteTask(openTask.id); setOpenTask(null); }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Sil
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyCalendarView;
