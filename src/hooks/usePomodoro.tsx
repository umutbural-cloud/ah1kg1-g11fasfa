import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type PomodoroPhase = "idle" | "running" | "paused";
export type PomodoroKind = "work" | "break";

type Ctx = {
  durationSec: number;
  remainingSec: number;
  phase: PomodoroPhase;
  kind: PomodoroKind;
  startedAt: Date | null;
  workDurationSec: number;     // user-configured work duration
  breakDurationSec: number;    // user-configured break duration
  setDuration: (sec: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  complete: () => void;        // saves & moves to next phase
  reset: () => void;
  skipBreak: () => void;       // during a break, jump straight to work
};

const PomodoroContext = createContext<Ctx | null>(null);

const DEFAULT_WORK = 25 * 60;
const DEFAULT_BREAK = 5 * 60;

function playChime() {
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    const notes = [880, 1318.5, 1760];
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
  const [workDurationSec, setWorkDurationSec] = useState(DEFAULT_WORK);
  const [breakDurationSec] = useState(DEFAULT_BREAK);
  const [durationSec, setDurationSec] = useState(DEFAULT_WORK);
  const [remainingSec, setRemainingSec] = useState(DEFAULT_WORK);
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [kind, setKind] = useState<PomodoroKind>("work");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);
  // refs mirror state so timer callbacks see fresh values
  const phaseRef = useRef(phase);
  const kindRef = useRef(kind);
  const startedAtRef = useRef<Date | null>(null);
  const durationRef = useRef(durationSec);
  const workDurRef = useRef(workDurationSec);
  const breakDurRef = useRef(breakDurationSec);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { kindRef.current = kind; }, [kind]);
  useEffect(() => { startedAtRef.current = startedAt; }, [startedAt]);
  useEffect(() => { durationRef.current = durationSec; }, [durationSec]);
  useEffect(() => { workDurRef.current = workDurationSec; }, [workDurationSec]);
  useEffect(() => { breakDurRef.current = breakDurationSec; }, [breakDurationSec]);

  const clearTimer = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const persistSession = useCallback(async (k: PomodoroKind, started: Date, ended: Date, durationS: number) => {
    if (!user || durationS < 1) return;
    await supabase.from("pomodoro_sessions").insert({
      user_id: user.id,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: durationS,
      kind: k,
    });
    window.dispatchEvent(new CustomEvent("pomodoro:session-saved"));
  }, [user]);

  // Auto-cycle: when current phase finishes, save it and start the next
  const handleAutoFinish = useCallback(() => {
    const ended = new Date();
    const started = startedAtRef.current || new Date(ended.getTime() - durationRef.current * 1000);
    const elapsed = Math.min(Math.round((ended.getTime() - started.getTime()) / 1000), durationRef.current);
    const finishedKind = kindRef.current;
    persistSession(finishedKind, started, ended, elapsed);
    playChime();

    if (finishedKind === "work") {
      toast.success("Pomodoro tamamlandı! Mola zamanı.");
      // start break automatically
      const br = breakDurRef.current;
      setKind("break");
      setDurationSec(br);
      setRemainingSec(br);
      setStartedAt(new Date());
      setPhase("running");
    } else {
      toast.success("Mola bitti! Çalışmaya dönüldü.");
      const wk = workDurRef.current;
      setKind("work");
      setDurationSec(wk);
      setRemainingSec(wk);
      setStartedAt(new Date());
      setPhase("running");
    }
  }, [persistSession]);

  const tick = useCallback(() => {
    setRemainingSec((r) => {
      if (r <= 1) {
        clearTimer();
        handleAutoFinish();
        return 0;
      }
      return r - 1;
    });
  }, [handleAutoFinish]);

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
    if (kind === "work") setWorkDurationSec(v);
    setDurationSec(v);
    setRemainingSec(v);
  };

  const start = () => {
    if (phase === "running") return;
    setStartedAt(new Date());
    setKind("work");
    setDurationSec(workDurationSec);
    setRemainingSec(workDurationSec);
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

  // Manual completion: save partial session, then start next phase (like auto-finish)
  const complete = () => {
    if (phase !== "running" && phase !== "paused") return;
    const ended = new Date();
    const started = startedAt || new Date(ended.getTime() - (durationSec - remainingSec) * 1000);
    const elapsed = Math.max(0, durationSec - remainingSec);
    if (elapsed >= 5) {
      persistSession(kind, started, ended, elapsed);
    }
    clearTimer();
    playChime();

    if (kind === "work") {
      toast.success("Çalışma kaydedildi. Mola zamanı.");
      setKind("break");
      setDurationSec(breakDurationSec);
      setRemainingSec(breakDurationSec);
      setStartedAt(new Date());
      setPhase("running");
    } else {
      toast.success("Mola bitti.");
      setKind("work");
      setDurationSec(workDurationSec);
      setRemainingSec(workDurationSec);
      setStartedAt(null);
      setPhase("idle");
    }
  };

  const reset = () => {
    clearTimer();
    setPhase("idle");
    setStartedAt(null);
    setKind("work");
    setDurationSec(workDurationSec);
    setRemainingSec(workDurationSec);
  };

  const skipBreak = () => {
    if (kind !== "break") return;
    clearTimer();
    setKind("work");
    setDurationSec(workDurationSec);
    setRemainingSec(workDurationSec);
    setStartedAt(new Date());
    setPhase("running");
    toast("Mola atlandı.");
  };

  return (
    <PomodoroContext.Provider
      value={{
        durationSec, remainingSec, phase, kind, startedAt,
        workDurationSec, breakDurationSec,
        setDuration, start, pause, resume, complete, reset, skipBreak,
      }}
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
