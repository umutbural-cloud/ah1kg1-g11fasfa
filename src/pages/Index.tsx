import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FileText, Table as TableIcon, GanttChart, Kanban, Calendar } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import NotesView from "@/components/NotesView";
import TableView from "@/components/TableView";
import GanttView from "@/components/GanttView";
import KanbanView from "@/components/KanbanView";
import WeeklyCalendarView from "@/components/WeeklyCalendarView";
import { useProjects } from "@/hooks/useProjects";

type View = "notes" | "table" | "gantt" | "kanban" | "calendar";

const VIEWS: { id: View; label: string; jp: string; icon: any }[] = [
  { id: "notes", label: "Notlar", jp: "ノート", icon: FileText },
  { id: "table", label: "Tablo", jp: "表", icon: TableIcon },
  { id: "gantt", label: "Gantt", jp: "ガント", icon: GanttChart },
  { id: "kanban", label: "Kanban", jp: "看板", icon: Kanban },
  { id: "calendar", label: "Hafta", jp: "週", icon: Calendar },
];

const Index = () => {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [view, setView] = useState<View>("notes");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (!selectedProjectId && projects.length > 0 && !loading) {
    setSelectedProjectId(projects[0].id);
  }

  const handleCreate = async (name: string, parentId?: string) => {
    const p = await createProject(name, parentId);
    if (p) { setSelectedProjectId(p.id); setView("notes"); }
  };

  const handleSelect = (id: string) => {
    setSelectedProjectId(id);
    setView("notes");
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    if (selectedProjectId === id) {
      setSelectedProjectId(projects.find((p) => p.id !== id)?.id || null);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          projects={projects}
          selectedId={selectedProjectId}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onUpdateProject={updateProject}
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
                {VIEWS.map((v) => {
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
