import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Play, Pause, Square, RotateCcw, ChevronRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePomodoro, formatMMSS } from "@/hooks/usePomodoro";

type Session = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  kind: "work" | "break";
  note: string | null;
};

const Pomodoro = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { durationSec, remainingSec, phase, kind, setDuration, start, pause, resume, reset, startBreak } = usePomodoro();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingTime, setEditingTime] = useState(false);
  const [editVal, setEditVal] = useState(formatMMSS(remainingSec));

  useEffect(() => {
    if (!editingTime) setEditVal(formatMMSS(remainingSec));
  }, [remainingSec, editingTime]);

  const commitTime = () => {
    const m = editVal.match(/^(\d{1,3}):?(\d{0,2})$/);
    if (m) {
      const mins = parseInt(m[1] || "0", 10);
      const secs = parseInt(m[2] || "0", 10);
      const total = mins * 60 + secs;
      if (total > 0) setDuration(total);
    }
    setEditingTime(false);
  };

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(500);
    setSessions((data as any) || []);
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("pomodoro:session-saved", handler);
    return () => window.removeEventListener("pomodoro:session-saved", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<string, Session[]>();
    sessions.forEach((s) => {
      const key = format(startOfDay(parseISO(s.started_at)), "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [sessions]);

  const isRunning = phase === "running";
  const isPaused = phase === "paused";
  const isFinished = phase === "finished";

  const updateNote = async (id: string, note: string) => {
    await supabase.from("pomodoro_sessions").update({ note }).eq("id", id);
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, note } : s)));
  };

  const commitDuration = () => {
    const n = parseInt(editingMin, 10);
    if (!isNaN(n) && n > 0) setDuration(n * 60);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-12 flex items-center border-b border-border/60 px-4 gap-3">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-base font-light tracking-wide">時計 Pomodoro</h1>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        {/* Timer */}
        <div className="text-center py-12">
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light mb-4">
            {kind === "work" ? "作業 Çalışma" : "休憩 Mola"}
          </div>
          <div className="text-8xl font-extralight tracking-widest tabular-nums mb-8">
            {formatMMSS(remainingSec)}
          </div>

          {phase === "idle" && (
            <div className="flex items-center justify-center gap-2 mb-8">
              <input
                type="number"
                min={1}
                max={180}
                value={editingMin}
                onChange={(e) => setEditingMin(e.target.value)}
                onBlur={commitDuration}
                onKeyDown={(e) => e.key === "Enter" && commitDuration()}
                className="w-16 text-center bg-transparent border border-border/60 rounded-sm px-2 py-1 text-sm tabular-nums"
              />
              <span className="text-xs text-muted-foreground">dakika</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            {isFinished ? (
              <>
                <button
                  onClick={() => startBreak()}
                  className="flex items-center gap-2 px-5 py-2 rounded-sm bg-accent hover:bg-accent/80 text-sm transition-colors"
                  title="Molayı başlat"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>Mola başlat</span>
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-5 py-2 rounded-sm border border-border/60 hover:bg-accent/50 text-sm transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Sıfırla</span>
                </button>
              </>
            ) : isRunning ? (
              <>
                <button onClick={pause} className="flex items-center gap-2 px-5 py-2 rounded-sm bg-accent hover:bg-accent/80 text-sm">
                  <Pause className="h-4 w-4" /> Duraklat
                </button>
                <button onClick={reset} className="flex items-center gap-2 px-5 py-2 rounded-sm border border-border/60 hover:bg-accent/50 text-sm">
                  <Square className="h-4 w-4" /> Durdur
                </button>
              </>
            ) : isPaused ? (
              <>
                <button onClick={resume} className="flex items-center gap-2 px-5 py-2 rounded-sm bg-accent hover:bg-accent/80 text-sm">
                  <Play className="h-4 w-4" /> Devam
                </button>
                <button onClick={reset} className="flex items-center gap-2 px-5 py-2 rounded-sm border border-border/60 hover:bg-accent/50 text-sm">
                  <Square className="h-4 w-4" /> Durdur
                </button>
              </>
            ) : (
              <button onClick={start} className="flex items-center gap-2 px-6 py-2 rounded-sm bg-foreground text-background hover:bg-foreground/90 text-sm">
                <Play className="h-4 w-4" /> Başlat
              </button>
            )}
          </div>
        </div>

        {/* History */}
        <section className="mt-12">
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light mb-4">
            歴史 Çalışma Geçmişi
          </div>
          {grouped.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">空 — Henüz oturum yok</div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([day, items]) => {
                const totalSec = items.filter((s) => s.kind === "work").reduce((a, s) => a + s.duration_seconds, 0);
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                return (
                  <div key={day} className="border border-border/60 rounded-sm overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-card/40 border-b border-border/60">
                      <span className="text-sm font-light">
                        {format(parseISO(day), "d MMMM yyyy, EEEE", { locale: tr })}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {h > 0 ? `${h}s ` : ""}{m}d
                      </span>
                    </div>
                    <div className="divide-y divide-border/40">
                      {items.map((s) => (
                        <SessionRow key={s.id} session={s} onUpdateNote={updateNote} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const SessionRow = ({ session, onUpdateNote }: { session: Session; onUpdateNote: (id: string, note: string) => void }) => {
  const [note, setNote] = useState(session.note || "");
  const mins = Math.round(session.duration_seconds / 60);
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs">
      <span className={`text-[10px] uppercase tracking-wider ${session.kind === "break" ? "text-muted-foreground" : "text-foreground"}`}>
        {session.kind === "work" ? "作業" : "休憩"}
      </span>
      <span className="tabular-nums w-16">{mins} dk</span>
      <span className="tabular-nums text-muted-foreground w-28">
        {format(parseISO(session.started_at), "HH:mm")} - {format(parseISO(session.ended_at), "HH:mm")}
      </span>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (session.note || "") && onUpdateNote(session.id, note)}
        placeholder="ne çalıştın?"
        className="flex-1 bg-transparent border-0 outline-none text-xs placeholder:text-muted-foreground/40"
      />
    </div>
  );
};

export default Pomodoro;
