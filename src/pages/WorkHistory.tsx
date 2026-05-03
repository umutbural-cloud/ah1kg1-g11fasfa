import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageState } from "@/hooks/usePageState";
import { useProjects } from "@/hooks/useProjects";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { ViewKey } from "@/hooks/useProjectViews";

type Session = {
  id: string;
  started_at: string;
  duration_seconds: number;
  kind: "work" | "break";
};

const formatDur = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h} Saat ${m} Dakika`;
  if (h > 0) return `${h} Saat`;
  return `${m} Dakika`;
};

const weekOfMonth = (d: Date) => {
  const first = startOfMonth(d);
  const firstWeekStart = startOfWeek(first, { weekStartsOn: 1 });
  const dWeekStart = startOfWeek(d, { weekStartsOn: 1 });
  return Math.floor((dWeekStart.getTime() - firstWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
};

const WorkHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, createProject, updateProject, deleteProject } = useProjects();
  const { section, selectedProjectId, view, setSection, setSelectedProjectId, setView, setJournalDate } = usePageState();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("pomodoro_sessions")
        .select("id, started_at, duration_seconds, kind")
        .eq("user_id", user.id)
        .eq("kind", "work")
        .order("started_at", { ascending: false })
        .limit(5000);
      setSessions((data as any) || []);
    })();
  }, [user]);

  // Group: month -> week -> day
  const grouped = useMemo(() => {
    const months = new Map<
      string,
      {
        date: Date;
        total: number;
        weeks: Map<string, { weekNo: number; weekStart: Date; weekEnd: Date; total: number; days: Map<string, { date: Date; total: number }> }>;
      }
    >();

    sessions.forEach((s) => {
      const d = parseISO(s.started_at);
      const dayKey = format(startOfDay(d), "yyyy-MM-dd");
      const monthKey = format(startOfMonth(d), "yyyy-MM");
      const wkStart = startOfWeek(d, { weekStartsOn: 1 });
      const weekKey = format(wkStart, "yyyy-MM-dd");

      let m = months.get(monthKey);
      if (!m) {
        m = { date: startOfMonth(d), total: 0, weeks: new Map() };
        months.set(monthKey, m);
      }
      m.total += s.duration_seconds;

      let w = m.weeks.get(weekKey);
      if (!w) {
        w = {
          weekNo: weekOfMonth(d),
          weekStart: wkStart,
          weekEnd: endOfWeek(d, { weekStartsOn: 1 }),
          total: 0,
          days: new Map(),
        };
        m.weeks.set(weekKey, w);
      }
      w.total += s.duration_seconds;

      let day = w.days.get(dayKey);
      if (!day) {
        day = { date: startOfDay(d), total: 0 };
        w.days.set(dayKey, day);
      }
      day.total += s.duration_seconds;
    });

    return Array.from(months.entries())
      .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
      .map(([key, m]) => ({
        key,
        date: m.date,
        total: m.total,
        weeks: Array.from(m.weeks.entries())
          .sort((a, b) => b[1].weekStart.getTime() - a[1].weekStart.getTime())
          .map(([wk, w]) => ({
            key: wk,
            ...w,
            days: Array.from(w.days.entries())
              .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
              .map(([dk, d]) => ({ key: dk, ...d })),
          })),
      }));
  }, [sessions]);

  const goToDay = (dayKey: string) => {
    setJournalDate(dayKey);
    setSection("journal");
    navigate("/");
  };

  // Sidebar handlers
  const handleSidebarSelect = (id: string, v?: ViewKey) => {
    setSection("project");
    setSelectedProjectId(id);
    const project = projects.find((p) => p.id === id);
    const pvs = (project?.enabled_views?.length ? project.enabled_views : ["table", "notes"]) as ViewKey[];
    setView(v || pvs[0] || "table");
    navigate("/");
  };
  const handleSidebarCreate = async (name: string, parentId?: string) => {
    const p = await createProject(name, parentId);
    if (p) {
      setSelectedProjectId(p.id);
      setSection("project");
      setView("table");
      navigate("/");
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          projects={projects}
          selectedId={selectedProjectId}
          selectedView={view}
          section={section}
          onSelect={handleSidebarSelect}
          onCreate={handleSidebarCreate}
          onDelete={(id) => deleteProject(id)}
          onUpdateProject={updateProject}
          onSelectBacklog={() => { setSection("backlog"); navigate("/"); }}
          onSelectTrash={() => { setSection("trash"); navigate("/"); }}
          onSelectJournal={() => { setSection("journal"); navigate("/"); }}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border/60 px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground" />
            <button
              onClick={() => navigate("/pomodoro")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Pomodoro
            </button>
            <div className="h-4 w-px bg-border/60" />
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-base font-light tracking-wide">Çalışma Geçmişi</h1>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto p-6 sm:p-8">
              {grouped.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-16">Henüz çalışma kaydı yok</div>
              ) : (
                <div className="space-y-2">
                  {grouped.map((m) => {
                    const monthOpen = openMonths[m.key] ?? true;
                    return (
                      <div key={m.key} className="border border-border/60 rounded-sm overflow-hidden">
                        <button
                          onClick={() => setOpenMonths((s) => ({ ...s, [m.key]: !monthOpen }))}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-card/40 hover:bg-card/60 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm font-light">
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${monthOpen ? "rotate-90" : ""}`} />
                            {format(m.date, "LLLL yyyy", { locale: tr })}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{formatDur(m.total)}</span>
                        </button>

                        {monthOpen && (
                          <div className="divide-y divide-border/40">
                            {m.weeks.map((w) => {
                              const weekOpen = openWeeks[w.key] ?? false;
                              return (
                                <div key={w.key}>
                                  <button
                                    onClick={() => setOpenWeeks((s) => ({ ...s, [w.key]: !weekOpen }))}
                                    className="w-full flex items-center justify-between px-3 py-2 pl-8 hover:bg-accent/30 transition-colors"
                                  >
                                    <span className="flex items-center gap-2 text-sm font-light text-muted-foreground">
                                      <ChevronRight className={`h-3 w-3 transition-transform ${weekOpen ? "rotate-90" : ""}`} />
                                      {format(m.date, "LLLL", { locale: tr })} {w.weekNo}. Hafta
                                      <span className="text-[10px] text-muted-foreground/60 ml-1">
                                        ({format(w.weekStart, "d MMM", { locale: tr })} – {format(w.weekEnd, "d MMM", { locale: tr })})
                                      </span>
                                    </span>
                                    <span className="text-xs text-muted-foreground tabular-nums">{formatDur(w.total)}</span>
                                  </button>

                                  {weekOpen && (
                                    <div className="divide-y divide-border/40 bg-background/40">
                                      {w.days.map((d) => (
                                        <button
                                          key={d.key}
                                          onClick={() => goToDay(d.key)}
                                          className="w-full flex items-center justify-between px-3 py-2 pl-14 hover:bg-accent/30 transition-colors text-left"
                                          title="Günlüğe git"
                                        >
                                          <span className="text-sm font-light">
                                            {format(d.date, "d MMMM, EEEE", { locale: tr })}
                                          </span>
                                          <span className="text-xs text-muted-foreground tabular-nums">{formatDur(d.total)}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default WorkHistory;
