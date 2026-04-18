import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FileText, Table as TableIcon, GanttChart, Kanban, Calendar, Plus } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import NotesView from "@/components/NotesView";
import TableView from "@/components/TableView";
import GanttView from "@/components/GanttView";
import KanbanView from "@/components/KanbanView";
import WeeklyCalendarView from "@/components/WeeklyCalendarView";
import { useProjects } from "@/hooks/useProjects";
import { useProjectViews, ViewKey } from "@/hooks/useProjectViews";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const VIEWS: { id: ViewKey; label: string; jp: string; icon: any }[] = [
  { id: "notes", label: "Notlar", jp: "ノート", icon: FileText },
  { id: "table", label: "Tablo", jp: "表", icon: TableIcon },
  { id: "gantt", label: "Gantt", jp: "ガント", icon: GanttChart },
  { id: "kanban", label: "Kanban", jp: "看板", icon: Kanban },
  { id: "calendar", label: "Takvim", jp: "暦", icon: Calendar },
];

const Index = () => {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>("notes");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const { views: projectViews, addView, removeView } = useProjectViews(selectedProjectId);

  if (!selectedProjectId && projects.length > 0 && !loading) {
    setSelectedProjectId(projects[0].id);
  }

  // Per-project views helper for sidebar
  const getProjectViewsFor = (pid: string): ViewKey[] => {
    try {
      const m = JSON.parse(localStorage.getItem("keikaku.projectViews.v1") || "{}");
      return m[pid] || ["notes", "table"];
    } catch { return ["notes", "table"]; }
  };

  const handleAddViewFor = (pid: string, v: ViewKey) => {
    const m = (() => { try { return JSON.parse(localStorage.getItem("keikaku.projectViews.v1") || "{}"); } catch { return {}; } })();
    const cur: ViewKey[] = m[pid] || ["notes", "table"];
    if (cur.includes(v)) return;
    m[pid] = [...cur, v];
    localStorage.setItem("keikaku.projectViews.v1", JSON.stringify(m));
    if (pid === selectedProjectId) addView(v);
    else setSelectedProjectId(selectedProjectId); // force render
  };
  const handleRemoveViewFor = (pid: string, v: ViewKey) => {
    const m = (() => { try { return JSON.parse(localStorage.getItem("keikaku.projectViews.v1") || "{}"); } catch { return {}; } })();
    const cur: ViewKey[] = m[pid] || ["notes", "table"];
    m[pid] = cur.filter((x) => x !== v);
    localStorage.setItem("keikaku.projectViews.v1", JSON.stringify(m));
    if (pid === selectedProjectId) removeView(v);
    if (pid === selectedProjectId && view === v) setView("notes");
  };

  const handleCreate = async (name: string, parentId?: string) => {
    const p = await createProject(name, parentId);
    if (p) { setSelectedProjectId(p.id); setView("notes"); }
  };

  const handleSelect = (id: string, v?: ViewKey) => {
    setSelectedProjectId(id);
    if (v) setView(v);
    else {
      // Default: open first available view (notes)
      const pvs = getProjectViewsFor(id);
      setView(pvs.includes(view) ? view : (pvs[0] || "notes"));
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    if (selectedProjectId === id) {
      setSelectedProjectId(projects.find((p) => p.id !== id)?.id || null);
    }
  };

  const activeViews = selectedProject ? projectViews : [];
  const availableToAdd = VIEWS.filter((v) => !activeViews.includes(v.id));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          projects={projects}
          selectedId={selectedProjectId}
          selectedView={view}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onUpdateProject={updateProject}
          getProjectViews={getProjectViewsFor}
          onAddView={handleAddViewFor}
          onRemoveView={handleRemoveViewFor}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border/60 px-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground" />
              {selectedProject && (
                <h1 className="text-base tracking-wide truncate font-light">
                  <span className="mr-2">{selectedProject.emoji}</span>
                  {selectedProject.name}
                </h1>
              )}
            </div>

            {selectedProject && (
              <nav className="flex items-center gap-0.5">
                {VIEWS.filter((v) => activeViews.includes(v.id)).map((v) => {
                  const Icon = v.icon;
                  const active = view === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setView(v.id)}
                      title={`${v.jp} ${v.label}`}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs tracking-wide transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">{v.label}</span>
                    </button>
                  );
                })}
                {availableToAdd.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        title="Görünüm ekle"
                        className="flex items-center gap-1 px-1.5 py-1 rounded-sm text-xs text-muted-foreground/70 hover:bg-accent/50 hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1" align="end">
                      {availableToAdd.map((v) => {
                        const Icon = v.icon;
                        return (
                          <button
                            key={v.id}
                            onClick={() => { addView(v.id); setView(v.id); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
                          >
                            <Icon className="h-3 w-3" />
                            <span>{v.label}</span>
                            <span className="text-muted-foreground/60 ml-auto text-[9px]">{v.jp}</span>
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                )}
              </nav>
            )}
          </header>

          <main className="flex-1 p-6 overflow-auto">
            {!selectedProject ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <div className="text-center space-y-2">
                  <p className="text-2xl tracking-widest">計画</p>
                  <p className="text-xs">Bir proje seçin veya yeni bir proje oluşturun</p>
                </div>
              </div>
            ) : !activeViews.includes(view) ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <p className="text-xs">Bu görünüm bu projeye eklenmemiş</p>
              </div>
            ) : (
              <>
                {view === "notes" && <NotesView key={selectedProject.id} projectId={selectedProject.id} />}
                {view === "table" && <TableView projectId={selectedProject.id} />}
                {view === "gantt" && <GanttView projectId={selectedProject.id} />}
                {view === "kanban" && <KanbanView projectId={selectedProject.id} />}
                {view === "calendar" && <WeeklyCalendarView projectId={selectedProject.id} />}
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
