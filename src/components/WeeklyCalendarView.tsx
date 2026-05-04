import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasks, Task, TaskColor, TaskKind } from "@/hooks/useTasks";
import { usePomodoroSessions } from "@/hooks/usePomodoroSessions";
import { TASK_COLORS, colorClasses } from "@/lib/taskColors";
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

const ColorPicker = ({ value, onChange }: { value: TaskColor; onChange: (c: TaskColor) => void }) => (
  <div className="flex items-center gap-1.5">
    {TASK_COLORS.map((c) => (
      <button
        key={c.value}
        type="button"
        onClick={() => onChange(c.value)}
        title={c.label}
        className={`h-5 w-5 rounded-full border transition-all ${colorClasses(c.value, "swatch")} ${
          value === c.value ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background scale-110" : "opacity-70 hover:opacity-100"
        }`}
      />
    ))}
  </div>
);

const WeeklyCalendarView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId);
  const [current, setCurrent] = useState(new Date());
  const [mode, setMode] = useState<Mode>("week");
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState<TaskColor>("gray");
  const [newKind, setNewKind] = useState<TaskKind>("task");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [openTask, setOpenTask] = useState<Task | null>(null);

  // Drag-to-create state (mouse + touch)
  const [dragging, setDragging] = useState<{ day: Date; startHour: number; currentHour: number } | null>(null);
  const dragRef = useRef<{ day: Date; startHour: number; moved: boolean } | null>(null);

  const days = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(current, { weekStartsOn: 1 });
      const end = endOfWeek(current, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [current, mode]);

  // Pomodoro sessions for the visible range
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const { sessions } = usePomodoroSessions(
    new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0),
    new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59),
  );

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
    setNewColor("gray");
    setNewKind("task");
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
      color: newColor,
      kind: newKind,
    });
    setNewTitle("");
    setSelectedSlot(null);
  };

  // Pointer handlers for drag-to-create (works on mouse + touch via Pointer Events)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setSlotRef = (key: string) => (el: HTMLDivElement | null) => {
    if (el) slotRefs.current.set(key, el);
    else slotRefs.current.delete(key);
  };

  const handlePointerDown = (e: React.PointerEvent, day: Date, hour: number) => {
    // ignore right click
    if (e.button === 2) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { day, startHour: hour, moved: false };
    setDragging({ day, startHour: hour, currentHour: hour });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    // Hit-test the element under the pointer
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const slot = el?.closest("[data-slot-key]") as HTMLElement | null;
    if (!slot) return;
    const key = slot.dataset.slotKey!;
    const [dayStr, hourStr] = key.split("|");
    if (dayStr !== format(dragRef.current.day, "yyyy-MM-dd")) return;
    const hour = parseInt(hourStr, 10);
    if (hour !== dragging?.currentHour) {
      dragRef.current.moved = true;
      setDragging((d) => (d ? { ...d, currentHour: hour } : null));
    }
  };

  const handlePointerUp = () => {
    if (dragging && dragRef.current) {
      const startHour = Math.min(dragging.startHour, dragging.currentHour);
      const endHour = Math.max(dragging.startHour, dragging.currentHour) + 1;
      openSlot(dragging.day, startHour, endHour);
    }
    dragRef.current = null;
    setDragging(null);
  };

  // Cancel any stuck drag if pointer leaves the page
  useEffect(() => {
    const cancel = () => { dragRef.current = null; setDragging(null); };
    window.addEventListener("pointercancel", cancel);
    return () => window.removeEventListener("pointercancel", cancel);
  }, []);

  const today = new Date();
  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  // Helper: time-box blocks render as a faded background spanning slots
  const isTimebox = (t: Task) => t.kind === "timebox";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg tracking-wide">
          {mode === "week" ? "週 — Hafta" : "月 — Ay"}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
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
          <span className="text-xs sm:text-sm text-muted-foreground min-w-[140px] sm:min-w-[180px] text-center">
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
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Day headers */}
          <div className="grid grid-cols-[44px_repeat(7,1fr)] sm:grid-cols-[60px_repeat(7,1fr)] border-b border-border/60 bg-card/30">
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
          <div className="grid grid-cols-[44px_repeat(7,1fr)] sm:grid-cols-[60px_repeat(7,1fr)] border-b border-border/60 min-h-[40px]">
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
                      className={`text-[10px] font-light truncate px-1.5 py-1 rounded-sm border-l-2 transition-colors ${colorClasses(t.color)}`}
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Hour grid */}
          <div className="max-h-[60vh] overflow-y-auto relative touch-pan-y">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[44px_repeat(7,1fr)] sm:grid-cols-[60px_repeat(7,1fr)] border-b border-border/30" style={{ minHeight: SLOT_HEIGHT }}>
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
                  // Pomodoro sessions starting in this hour, for this day
                  const hourSessions = sessions.filter((s) => {
                    const d = parseISO(s.started_at);
                    return isSameDay(d, day) && d.getHours() === hour;
                  });
                  const slotKey = `${format(day, "yyyy-MM-dd")}|${hour}`;
                  return (
                    <div
                      key={i}
                      ref={setSlotRef(slotKey)}
                      data-slot-key={slotKey}
                      onPointerDown={(e) => handlePointerDown(e, day, hour)}
                      className={`border-l border-border/30 cursor-pointer transition-colors relative touch-none ${
                        isDraggingThis ? "bg-foreground/15" : "hover:bg-card/40"
                      }`}
                    >
                      {timedTasks.map((t) => {
                        const [sh, sm] = t.start_time!.split(":").map(Number);
                        const [eh, em] = (t.end_time || t.start_time!).split(":").map(Number);
                        const heightHrs = Math.max(0.5, (eh + em / 60) - (sh + sm / 60));
                        const tb = isTimebox(t);
                        return (
                          <div
                            key={t.id}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); setOpenTask(t); }}
                            className={`absolute left-0.5 right-0.5 px-1.5 py-1 rounded-sm border-l-2 text-[10px] font-light truncate cursor-pointer z-10 ${colorClasses(t.color)} ${tb ? "border-dashed border" : ""}`}
                            style={{ top: 1, height: `${heightHrs * SLOT_HEIGHT - 2}px` }}
                          >
                            <div className="flex items-center gap-1 truncate">
                              {tb && <Timer className="h-2.5 w-2.5 opacity-70 shrink-0" />}
                              <span className="truncate">{t.title}</span>
                            </div>
                            <div className="text-[9px] opacity-70">{t.start_time?.slice(0,5)}{t.end_time && `–${t.end_time.slice(0,5)}`}</div>
                          </div>
                        );
                      })}

                      {/* Pomodoro session badges (compact, on right edge) */}
                      {hourSessions.map((s) => {
                        const sd = parseISO(s.started_at);
                        const ed = parseISO(s.ended_at);
                        const startMins = sd.getMinutes();
                        const totalMins = (ed.getTime() - sd.getTime()) / 60000;
                        const heightHrs = Math.max(0.25, totalMins / 60);
                        const topPx = (startMins / 60) * SLOT_HEIGHT;
                        return (
                          <div
                            key={s.id}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            title={`Pomodoro · ${Math.round(totalMins)} dk${s.note ? ` · ${s.note}` : ""}`}
                            className="absolute right-0 w-1.5 rounded-sm bg-rose-400/80 dark:bg-rose-500/80"
                            style={{ top: topPx + 1, height: `${heightHrs * SLOT_HEIGHT - 2}px` }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border/40 text-[10px] text-muted-foreground bg-card/20">
            <div className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-3 rounded-sm bg-rose-400/80" />
              <span>Pomodoro</span>
            </div>
            <div className="flex items-center gap-1">
              <Timer className="h-2.5 w-2.5" />
              <span>Time-box</span>
            </div>
            <span className="hidden sm:inline ml-auto">Boş bir slota tıkla veya sürükle</span>
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
                        className={`text-[10px] font-light truncate px-1 py-0.5 rounded-sm border-l-2 ${colorClasses(t.color)}`}
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
              Saat aralığı, tip ve renk seç
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Type toggle */}
            <div className="flex border border-border/60 rounded-sm overflow-hidden text-xs">
              <button
                onClick={() => setNewKind("task")}
                className={`flex-1 px-2 py-1.5 ${newKind === "task" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
              >
                Görev
              </button>
              <button
                onClick={() => setNewKind("timebox")}
                className={`flex-1 px-2 py-1.5 flex items-center justify-center gap-1 ${newKind === "timebox" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
              >
                <Timer className="h-3 w-3" /> Time-box
              </button>
            </div>

            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={newKind === "timebox" ? "Time-box başlığı (ör: Derin çalışma)" : "Görev başlığı..."}
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

            <div>
              <div className="text-[10px] text-muted-foreground mb-1.5 tracking-wide">Renk</div>
              <ColorPicker value={newColor} onChange={setNewColor} />
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
              <div className="flex items-center gap-2">
                {openTask.kind === "timebox" && <Timer className="h-4 w-4 text-muted-foreground" />}
                <Input
                  value={openTask.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setOpenTask({ ...openTask, title: v });
                    updateTask(openTask.id, { title: v });
                  }}
                  className="bg-transparent border-none p-0 h-auto text-lg font-light tracking-wide focus-visible:ring-0"
                />
              </div>
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

              <div>
                <div className="text-[10px] text-muted-foreground mb-1.5 tracking-wide">Renk</div>
                <ColorPicker
                  value={(openTask.color || "gray") as TaskColor}
                  onChange={(c) => {
                    setOpenTask({ ...openTask, color: c });
                    updateTask(openTask.id, { color: c });
                  }}
                />
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
