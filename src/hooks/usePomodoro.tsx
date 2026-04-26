import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type PomodoroPhase = "idle" | "running" | "paused" | "finished";
export type PomodoroKind = "work" | "break";

type Ctx = {
  durationSec: number;       // configured duration
  remainingSec: number;       // counts down
  phase: PomodoroPhase;
  kind: PomodoroKind;
  startedAt: Date | null;
  setDuration: (sec: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;             // discards
  reset: () => void;            // back to configured duration
  startBreak: (sec?: number) => void;
};

const PomodoroContext = createContext<Ctx | null>(null);

const DEFAULT_WORK = 25 * 60;
const DEFAULT_BREAK = 5 * 60;

// Soft chime via WebAudio
function playChime() {
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    const notes = [880, 1318.5, 1760]; // A5, E6, A6
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const t = now + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.65);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [durationSec, setDurationSec] = useState(DEFAULT_WORK);
  const [remainingSec, setRemainingSec] = useState(DEFAULT_WORK);
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [kind, setKind] = useState<PomodoroKind>("work");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);
  const elapsedRef = useRef(0); // accumulated seconds when paused/finished

  const clearTimer = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const persistSession = useCallback(async (k: PomodoroKind, started: Date, ended: Date, durationS: number) => {
    if (!user || durationS < 5) return; // ignore tiny ones
    await supabase.from("pomodoro_sessions").insert({
      user_id: user.id,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: durationS,
      kind: k,
    });
    window.dispatchEvent(new CustomEvent("pomodoro:session-saved"));
  }, [user]);

  const tick = useCallback(() => {
    setRemainingSec((r) => {
      if (r <= 1) {
        clearTimer();
        const ended = new Date();
        const started = startedAt || new Date(ended.getTime() - durationSec * 1000);
        const elapsed = Math.round((ended.getTime() - started.getTime()) / 1000);
        elapsedRef.current = 0;
        setPhase("finished");
        playChime();
        toast.success(kind === "work" ? "Pomodoro tamamlandı! Mola zamanı." : "Mola bitti!");
        persistSession(kind, started, ended, Math.min(elapsed, durationSec));
        return 0;
      }
      return r - 1;
    });
  }, [startedAt, durationSec, kind, persistSession]);

  useEffect(() => {
    if (phase === "running") {
      clearTimer();
      intervalRef.current = window.setInterval(tick, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [phase, tick]);

  const setDuration = (sec: number) => {
    if (phase === "running" || phase === "paused") return;
    const v = Math.max(10, Math.min(sec, 180 * 60));
    setDurationSec(v);
    setRemainingSec(v);
  };

  const start = () => {
    if (phase === "running") return;
    setStartedAt(new Date());
    setKind("work");
    setRemainingSec(durationSec);
    setPhase("running");
  };

  const pause = () => {
    if (phase !== "running") return;
    setPhase("paused");
  };

  const resume = () => {
    if (phase !== "paused") return;
    setPhase("running");
  };

  const stop = () => {
    // Save partial session if running/paused
    if ((phase === "running" || phase === "paused") && startedAt) {
      const ended = new Date();
      const elapsed = Math.max(0, durationSec - remainingSec);
      if (elapsed >= 5) persistSession(kind, startedAt, ended, elapsed);
    }
    clearTimer();
    setPhase("idle");
    setStartedAt(null);
    setRemainingSec(durationSec);
  };

  const reset = () => {
    clearTimer();
    setPhase("idle");
    setStartedAt(null);
    setKind("work");
    setRemainingSec(durationSec);
  };

  const startBreak = (sec = DEFAULT_BREAK) => {
    clearTimer();
    setKind("break");
    setDurationSec(sec);
    setRemainingSec(sec);
    setStartedAt(new Date());
    setPhase("running");
  };

  return (
    <PomodoroContext.Provider
      value={{ durationSec, remainingSec, phase, kind, startedAt, setDuration, start, pause, resume, stop, reset, startBreak }}
    >
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoro = () => {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider");
  return ctx;
};

export const formatMMSS = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
