import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Session = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  kind: "work" | "break";
  note: string | null;
};

const isoToTimeInput = (iso: string) => format(parseISO(iso), "HH:mm");
const combineDateTime = (iso: string, hhmm: string) => {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const d = parseISO(iso);
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d.toISOString();
};

const JournalWorkSessions = ({ date }: { date: string }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    const { data } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("kind", "work")
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString())
      .order("started_at", { ascending: false });
    setSessions((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("pomodoro:session-saved", handler);
    return () => window.removeEventListener("pomodoro:session-saved", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, date]);

  const totalSec = sessions.reduce((a, s) => a + s.duration_seconds, 0);
  const totalH = Math.floor(totalSec / 3600);
  const totalM = Math.floor((totalSec % 3600) / 60);

  const updateNote = async (id: string, note: string) => {
    await supabase.from("pomodoro_sessions").update({ note }).eq("id", id);
    setSessions((arr) => arr.map((s) => (s.id === id ? { ...s, note } : s)));
  };

  const updateTimes = async (id: string, startedAt: string, endedAt: string) => {
    const dur = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
    if (dur <= 0) { toast.error("Bitiş başlangıçtan sonra olmalı."); return; }
    await supabase.from("pomodoro_sessions").update({
      started_at: startedAt, ended_at: endedAt, duration_seconds: dur,
    }).eq("id", id);
    setSessions((arr) => arr.map((s) => (s.id === id
      ? { ...s, started_at: startedAt, ended_at: endedAt, duration_seconds: dur }
      : s)));
  };

  return (
    <div className="border border-border/60 rounded-sm overflow-hidden mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-card/40 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Clock className="h-3.5 w-3.5" />
        <span className="tracking-wide flex-1 text-left">Günlük çalışma süresi</span>
        <span className="tabular-nums text-foreground/80">
          {totalH > 0 ? `${totalH}s ` : ""}{totalM}d
        </span>
      </button>
      {open && (
        <div className="divide-y divide-border/40">
          {loading ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">読み込み中...</div>
          ) : sessions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              <p>空 — Bugün hiç çalışma kaydı yok</p>
            </div>
          ) : (
            sessions.map((s) => (
              <Row key={s.id} session={s} onUpdateNote={updateNote} onUpdateTimes={updateTimes} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const Row = ({
  session, onUpdateNote, onUpdateTimes,
}: {
  session: Session;
  onUpdateNote: (id: string, note: string) => void;
  onUpdateTimes: (id: string, startedAt: string, endedAt: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(session.note || "");
  const [startVal, setStartVal] = useState(isoToTimeInput(session.started_at));
  const [endVal, setEndVal] = useState(isoToTimeInput(session.ended_at));

  useEffect(() => {
    setStartVal(isoToTimeInput(session.started_at));
    setEndVal(isoToTimeInput(session.ended_at));
    setNote(session.note || "");
  }, [session.started_at, session.ended_at, session.note]);

  const mins = Math.round(session.duration_seconds / 60);

  const commitTimes = () => {
    const newStart = combineDateTime(session.started_at, startVal);
    const newEnd = combineDateTime(session.ended_at, endVal);
    if (!newStart || !newEnd) return;
    if (newStart === session.started_at && newEnd === session.ended_at) return;
    onUpdateTimes(session.id, newStart, newEnd);
  };

  return (
    <div className="px-3 py-2">
      <div
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 text-left text-xs hover:bg-card/40 transition-colors cursor-pointer"
      >
        <span className="tabular-nums w-16">{mins} Dakika</span>
        {!expanded ? (
          <span className="tabular-nums text-muted-foreground w-24">
            {format(parseISO(session.started_at), "HH:mm")}-{format(parseISO(session.ended_at), "HH:mm")}
          </span>
        ) : (
          <span className="flex items-center gap-1 w-28" onClick={(e) => e.stopPropagation()}>
            <input
              type="time"
              value={startVal}
              onChange={(e) => setStartVal(e.target.value)}
              onBlur={commitTimes}
              className="bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs tabular-nums w-[52px]"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="time"
              value={endVal}
              onChange={(e) => setEndVal(e.target.value)}
              onBlur={commitTimes}
              className="bg-transparent border-b border-border/60 outline-none focus:border-foreground/40 text-xs tabular-nums w-[52px]"
            />
          </span>
        )}
        <span className="text-muted-foreground">—</span>
        {!expanded ? (
          <span className="flex-1 truncate text-muted-foreground/80">
            {note || <span className="text-muted-foreground/40">Boşluk</span>}
          </span>
        ) : (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (session.note || "") && onUpdateNote(session.id, note)}
            onClick={(e) => e.stopPropagation()}
            placeholder="ne çalıştın?"
            autoFocus
            className="flex-1 bg-transparent border-0 outline-none text-xs placeholder:text-muted-foreground/40"
          />
        )}
      </div>
    </div>
  );
};

export default JournalWorkSessions;
