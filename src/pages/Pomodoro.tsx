import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Play, Pause, Check, RotateCcw, SkipForward, Clock, Trash2, Bell, BellOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePomodoro, formatMMSS } from "@/hooks/usePomodoro";
import PomodoroTaskList from "@/components/PomodoroTaskList";
import { toast } from "sonner";

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
  const { remainingSec, phase, kind, setDuration, start, pause, resume, complete, reset, skipBreak } = usePomodoro();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingTime, setEditingTime] = useState(false);
  const [editVal, setEditVal] = useState(formatMMSS(remainingSec));
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  const requestNotif = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Bu tarayıcı bildirimleri desteklemiyor.");
      return;
    }
    if (Notification.permission === "granted") {
      toast("Bildirimler zaten açık.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPerm(result);
    if (result === "granted") {
      toast.success("Bildirimler açıldı. Pomodoro bittiğinde haber vereceğiz.");
      try { new Notification("Keikaku", { body: "Bildirimler aktif." }); } catch {}
    } else {
      toast.error("Bildirim izni reddedildi.");
    }
  };

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
  const isIdle = phase === "idle";
  const isBreak = kind === "break";

  const updateNote = async (id: string, note: string) => {
    await supabase.from("pomodoro_sessions").update({ note }).eq("id", id);
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, note } : s)));
  };

  const updateDuration = async (id: string, totalSeconds: number) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    const newDuration = Math.max(1, Math.round(totalSeconds));
    const newEnd = new Date(parseISO(session.started_at).getTime() + newDuration * 1000).toISOString();
    await supabase.from("pomodoro_sessions").update({ duration_seconds: newDuration, ended_at: newEnd }).eq("id", id);
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, duration_seconds: newDuration, ended_at: newEnd } : s)));
  };

  const deleteSession = async (id: string) => {
    await supabase.from("pomodoro_sessions").delete().eq("id", id);
    setSessions((arr) => arr.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-12 flex items-center border-b border-border/60 px-4 gap-3">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-base font-light tracking-wide">Pomodoro</h1>
        <div className="ml-auto">
          {notifPerm !== "granted" && notifPerm !== "unsupported" && (
            <button
              onClick={requestNotif}
              title="Pomodoro bittiğinde bildirim al"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-sm border border-border/60 hover:bg-accent/40"
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bildirimleri aç</span>
            </button>
          )}
          {notifPerm === "granted" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Bildirimler açık">
              <Bell className="h-3.5 w-3.5" />
            </span>
          )}
          {notifPerm === "denied" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60" title="Bildirimler engellendi (tarayıcı ayarlarından açın)">
              <BellOff className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        <div
          className={`text-center transition-all duration-700 ease-out ${
            isRunning ? "py-24" : "py-12"
          }`}
        >
          <div
            className={`text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light mb-4 transition-opacity duration-500 ${
              isRunning ? "opacity-40" : "opacity-100"
            }`}
          >
            {isBreak ? "Dinlenme" : "Çalışma"}
          </div>

          {editingTime && isIdle ? (
            <input
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onBlur={commitTime}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTime();
                if (e.key === "Escape") { setEditVal(formatMMSS(remainingSec)); setEditingTime(false); }
              }}
              autoFocus
              className="w-[28rem] max-w-full text-center bg-transparent border-b border-border/60 focus:border-foreground/40 outline-none text-8xl font-extralight tracking-widest tabular-nums mb-8 mx-auto block"
            />
          ) : (
            <button
              onClick={() => { if (isIdle) { setEditVal(formatMMSS(remainingSec)); setEditingTime(true); } }}
              disabled={!isIdle}
              title={isIdle ? "Süreyi düzenlemek için tıkla" : ""}
              className={`text-8xl font-extralight tracking-widest tabular-nums mb-8 block mx-auto transition-all duration-700 ease-out ${
                isRunning
                  ? "scale-110 text-foreground"
                  : isIdle
                  ? "hover:text-foreground/80 cursor-text"
                  : ""
              }`}
            >
              {formatMMSS(remainingSec)}
            </button>
          )}

          <div
            className={`flex items-center justify-center gap-3 transition-all duration-700 ease-out ${
              isRunning ? "opacity-30 hover:opacity-100 scale-95" : "opacity-100 scale-100"
            }`}
          >
            {isRunning ? (
              <>
                <button onClick={pause} className="flex items-center gap-2 px-5 py-2 rounded-sm bg-accent hover:bg-accent/80 text-sm transition-colors">
                  <Pause className="h-4 w-4" /> Duraklat
                </button>
                {isBreak ? (
                  <button onClick={skipBreak} className="flex items-center gap-2 px-5 py-2 rounded-sm border border-border/60 hover:bg-accent/50 text-sm transition-colors">
                    <SkipForward className="h-4 w-4" /> Atla
                  </button>
                ) : (
                  <button onClick={complete} className="flex items-center gap-2 px-5 py-2 rounded-sm border border-border/60 hover:bg-accent/50 text-sm transition-colors">
                    <Check className="h-4 w-4" /> Tamamla
                  </button>
                )}
              </>
            ) : isPaused ? (
              <>
                <button onClick={resume} className="flex items-center gap-2 px-5 py-2 rounded-sm bg-accent hover:bg-accent/80 text-sm transition-colors">
                  <Play className="h-4 w-4" /> Devam
                </button>
                <button onClick={complete} className="flex items-center gap-2 px-5 py-2 rounded-sm border border-border/60 hover:bg-accent/50 text-sm transition-colors">
                  <Check className="h-4 w-4" /> Tamamla
                </button>
              </>
            ) : (
              <>
                <button onClick={start} className="flex items-center gap-2 px-6 py-2 rounded-sm bg-foreground text-background hover:bg-foreground/90 text-sm transition-colors">
                  <Play className="h-4 w-4" /> Başlat
                </button>
                <button onClick={reset} className="flex items-center gap-2 px-5 py-2 rounded-sm border border-border/60 hover:bg-accent/50 text-sm transition-colors">
                  <RotateCcw className="h-4 w-4" /> Sıfırla
                </button>
              </>
            )}
          </div>
        </div>

        <div
          className={`mt-12 transition-all duration-700 ease-out ${
            isRunning ? "opacity-30 hover:opacity-100" : "opacity-100"
          }`}
        >
          <PomodoroTaskList />
        </div>

        <section
          className={`mt-12 transition-all duration-700 ease-out ${
            isRunning ? "opacity-30 hover:opacity-100" : "opacity-100"
          }`}
        >
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light mb-4">
            Çalışma Geçmişi
          </div>
          {grouped.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">Henüz oturum yok</div>
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
                        <SessionRow
                          key={s.id}
                          session={s}
                          onUpdateNote={updateNote}
                          onUpdateDuration={updateDuration}
                          onDelete={deleteSession}
                        />
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

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s} sn`;
  if (s === 0) return `${m} dk`;
  return `${m} dk ${s} sn`;
};

const SessionRow = ({
  session,
  onUpdateNote,
  onUpdateDuration,
  onDelete,
}: {
  session: Session;
  onUpdateNote: (id: string, note: string) => void;
  onUpdateDuration: (id: string, totalSeconds: number) => void;
  onDelete: (id: string) => void;
}) => {
  const [note, setNote] = useState(session.note || "");
  const [editingDur, setEditingDur] = useState(false);
  const initialEditVal = () => {
    const m = Math.floor(session.duration_seconds / 60);
    const s = session.duration_seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  const [durVal, setDurVal] = useState(initialEditVal());

  useEffect(() => {
    setDurVal(initialEditVal());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.duration_seconds]);

  const commitDur = () => {
    const match = durVal.match(/^(\d{1,3}):?(\d{0,2})$/);
    if (match) {
      const mins = parseInt(match[1] || "0", 10);
      const secs = parseInt(match[2] || "0", 10);
      const total = mins * 60 + secs;
      if (total > 0 && total !== session.duration_seconds) {
        onUpdateDuration(session.id, total);
      } else {
        setDurVal(initialEditVal());
      }
    } else {
      setDurVal(initialEditVal());
    }
    setEditingDur(false);
  };

  return (
    <div className="group flex items-center gap-3 px-3 py-2 text-xs">
      <span className={`text-[10px] uppercase tracking-wider w-16 ${session.kind === "break" ? "text-muted-foreground" : "text-foreground"}`}>
        {session.kind === "work" ? "Çalışma" : "Mola"}
      </span>
      {editingDur ? (
        <input
          value={durVal}
          onChange={(e) => setDurVal(e.target.value)}
          onBlur={commitDur}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDur();
            if (e.key === "Escape") { setDurVal(initialEditVal()); setEditingDur(false); }
          }}
          autoFocus
          placeholder="dk:sn"
          className="w-20 bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs tabular-nums"
        />
      ) : (
        <button
          onClick={() => setEditingDur(true)}
          title="Süreyi düzenle (dk:sn)"
          className="tabular-nums w-24 text-left hover:text-foreground/80"
        >
          {formatDuration(session.duration_seconds)}
        </button>
      )}
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
      <button
        onClick={() => onDelete(session.id)}
        title="Sil"
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default Pomodoro;
