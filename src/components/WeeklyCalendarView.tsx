import { useState, useMemo, useRef } from "react";
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
  addMonths,
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
} from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00
const SLOT_HEIGHT = 44; // px per hour slot

type Mode = "week" | "month";
type SlotInfo = { date: Date; startHour: number; endHour: number };

const WeeklyCalendarView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId);
  const [current, setCurrent] = useState(new Date());
  const [mode, setMode] = useState<Mode>("week");
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [openTask, setOpenTask] = useState<Task | null>(null);

  // Drag-to-create state
  const [dragging, setDragging] = useState<{ day: Date; startHour: number; currentHour: number } | null>(null);
  const dragRef = useRef<{ day: Date; startHour: number } | null>(null);

  const days = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(current, { weekStartsOn: 1 });
      const end = endOfWeek(current, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    // month: full weeks covering the month
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [current, mode]);

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => {
      if (t.start_date && t.end_date) {
        return isWithinInterval(day, { start: parseISO(t.start_date), end: parseISO(t.end_date) });
      }
      if (t.start_date) return isSameDay(day, parseISO(t.start_date));
      return false;
    });

  const navigate = (dir: number) => {
    setCurrent(mode === "week" ? addWeeks(current, dir) : addMonths(current, dir));
  };

  const openSlot = (date: Date, startHour: number, endHour: number) => {
    setSelectedSlot({ date, startHour, endHour });
    setStartTime(`${String(startHour).padStart(2, "0")}:00`);
    setEndTime(`${String(endHour).padStart(2, "0")}:00`);
    setNewTitle("");
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedSlot) return;
    const dateStr = format(selectedSlot.date, "yyyy-MM-dd");
    await createTask({
      title: newTitle.trim(),
      start_date: dateStr,
      end_date: dateStr,
      start_time: startTime,
      end_time: endTime,
    });
    setNewTitle("");
    setSelectedSlot(null);
  };

  // Mouse handlers for drag-to-create
  const handleSlotMouseDown = (day: Date, hour: number) => {
    dragRef.current = { day, startHour: hour };
    setDragging({ day, startHour: hour, currentHour: hour });
  };
  const handleSlotMouseEnter = (day: Date, hour: number) => {
    if (dragRef.current && isSameDay(dragRef.current.day, day)) {
      setDragging((d) => (d ? { ...d, currentHour: hour } : null));
    }
  };
  const handleMouseUp = () => {
    if (dragging && dragRef.current) {
      const startHour = Math.min(dragging.startHour, dragging.currentHour);
      const endHour = Math.max(dragging.startHour, dragging.currentHour) + 1;
      openSlot(dragging.day, startHour, endHour);
    }
    dragRef.current = null;
    setDragging(null);
  };

  const today = new Date();
  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg tracking-wide">
          {mode === "week" ? "週 — Hafta" : "月 — Ay"}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex border border-border/60 rounded-sm overflow-hidden">
            <button
              onClick={() => setMode("week")}
              className={`text-xs px-2.5 py-1 ${mode === "week" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              Hafta
            </button>
            <button
              onClick={() => setMode("month")}
              className={`text-xs px-2.5 py-1 ${mode === "month" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
            >
              Ay
            </button>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[180px] text-center">
            {mode === "week"
              ? `${format(days[0], "d MMM", { locale: tr })} – ${format(days[6], "d MMM yyyy", { locale: tr })}`
              : format(current, "MMMM yyyy", { locale: tr })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCurrent(new Date())}>
            Bugün
          </Button>
        </div>
      </div>

      {mode === "week" ? (
        <div
          className="border border-border/60 rounded-sm overflow-hidden select-none"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
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
              const dayTasks = getTasksForDay(day).filter((t) => !t.start_time);
              return (
                <div
                  key={i}
                  className="border-l border-border/30 p-1 space-y-0.5 cursor-pointer hover:bg-card/40"
                  onClick={() => openSlot(day, 9, 10)}
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
          <div className="max-h-[60vh] overflow-y-auto relative">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30" style={{ minHeight: SLOT_HEIGHT }}>
                <div className="text-[10px] text-muted-foreground p-1.5 tracking-wide">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {days.map((day, i) => {
                  const isDraggingThis =
                    dragging && isSameDay(dragging.day, day) &&
                    hour >= Math.min(dragging.startHour, dragging.currentHour) &&
                    hour <= Math.max(dragging.startHour, dragging.currentHour);
                  const timedTasks = tasks.filter((t) => {
                    if (!t.start_date || !t.start_time) return false;
                    if (!isSameDay(parseISO(t.start_date), day)) return false;
                    return parseInt(t.start_time.slice(0, 2)) === hour;
                  });
                  return (
                    <div
                      key={i}
                      onMouseDown={() => handleSlotMouseDown(day, hour)}
                      onMouseEnter={() => handleSlotMouseEnter(day, hour)}
                      className={`border-l border-border/30 cursor-pointer transition-colors relative ${
                        isDraggingThis ? "bg-foreground/15" : "hover:bg-card/40"
                      }`}
                    >
                      {timedTasks.map((t) => {
                        const [sh, sm] = t.start_time!.split(":").map(Number);
                        const [eh, em] = (t.end_time || t.start_time!).split(":").map(Number);
                        const heightHrs = Math.max(0.5, (eh + em / 60) - (sh + sm / 60));
                        return (
                          <div
                            key={t.id}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); setOpenTask(t); }}
                            className="absolute left-0.5 right-0.5 px-1.5 py-1 rounded-sm bg-foreground/15 hover:bg-foreground/25 border-l-2 border-foreground/50 text-[10px] font-light truncate cursor-pointer z-10"
                            style={{ top: 1, height: `${heightHrs * SLOT_HEIGHT - 2}px` }}
                          >
                            <div className="truncate">{t.title}</div>
                            <div className="text-[9px] text-muted-foreground">{t.start_time?.slice(0,5)}{t.end_time && `–${t.end_time.slice(0,5)}`}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // MONTH VIEW
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border/60 bg-card/30">
            {weekDays.map((d) => (
              <div key={d} className="text-center p-2 border-l first:border-l-0 border-border/30 text-[10px] text-muted-foreground tracking-wide">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[100px]">
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, current);
              const dayTasks = getTasksForDay(day);
              return (
                <div
                  key={i}
                  className={`border-l border-t border-border/30 p-1.5 cursor-pointer hover:bg-card/40 overflow-hidden ${
                    !inMonth ? "bg-muted/20" : ""
                  }`}
                  onClick={() => openSlot(day, 9, 10)}
                >
                  <div className={`text-xs mb-1 ${isToday ? "text-foreground font-medium" : inMonth ? "text-foreground/70" : "text-muted-foreground/40"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => { e.stopPropagation(); setOpenTask(t); }}
                        className="text-[10px] font-light truncate px-1 py-0.5 rounded-sm bg-foreground/10 hover:bg-foreground/20 border-l-2 border-foreground/40"
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[9px] text-muted-foreground px-1">+{dayTasks.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New task dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={(o) => { if (!o) { setSelectedSlot(null); setNewTitle(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-light tracking-wide">
              {selectedSlot && format(selectedSlot.date, "d MMMM yyyy", { locale: tr })}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Görev için saat aralığı belirleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Görev başlığı..."
              className="bg-transparent h-9 text-sm"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç</div>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-transparent h-8 text-xs" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş</div>
                <Input type="time" value={endTime} min={startTime} onChange={(e) => setEndTime(e.target.value)} className="bg-transparent h-8 text-xs" />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCreate} className="w-full h-9">
              <Plus className="h-3.5 w-3.5 mr-1" /> Ekle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task detail dialog */}
      <Dialog open={!!openTask} onOpenChange={(o) => { if (!o) setOpenTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Görev detayı</DialogTitle>
            <DialogDescription className="sr-only">Görevi düzenleyin veya silin</DialogDescription>
          </DialogHeader>
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
                      const v = e.target.value;
                      const updates: any = { start_date: v || null };
                      if (v && openTask.end_date && v > openTask.end_date) updates.end_date = v;
                      setOpenTask({ ...openTask, ...updates });
                      updateTask(openTask.id, updates);
                    }}
                    className="bg-transparent h-8 text-xs"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş</div>
                  <Input
                    type="date"
                    value={openTask.end_date || ""}
                    min={openTask.start_date || undefined}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && openTask.start_date && v < openTask.start_date) return;
                      setOpenTask({ ...openTask, end_date: v || null });
                      updateTask(openTask.id, { end_date: v || null });
                    }}
                    className="bg-transparent h-8 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç saati</div>
                  <Input
                    type="time"
                    value={openTask.start_time?.slice(0,5) || ""}
                    onChange={(e) => {
                      const v = e.target.value || null;
                      setOpenTask({ ...openTask, start_time: v });
                      updateTask(openTask.id, { start_time: v });
                    }}
                    className="bg-transparent h-8 text-xs"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş saati</div>
                  <Input
                    type="time"
                    value={openTask.end_time?.slice(0,5) || ""}
                    min={openTask.start_time?.slice(0,5)}
                    onChange={(e) => {
                      const v = e.target.value || null;
                      setOpenTask({ ...openTask, end_time: v });
                      updateTask(openTask.id, { end_time: v });
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
