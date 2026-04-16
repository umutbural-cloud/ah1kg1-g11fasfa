import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppSidebar from "@/components/AppSidebar";
import NotesView from "@/components/NotesView";
import TableView from "@/components/TableView";
import GanttView from "@/components/GanttView";
import CalendarView from "@/components/CalendarView";
import KanbanView from "@/components/KanbanView";
import { useProjects } from "@/hooks/useProjects";

const Index = () => {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Auto-select first project
  if (!selectedProjectId && projects.length > 0 && !loading) {
    setSelectedProjectId(projects[0].id);
  }

  const handleCreate = async (name: string, parentId?: string) => {
    const p = await createProject(name, parentId);
    if (p) setSelectedProjectId(p.id);
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
          onSelect={setSelectedProjectId}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onUpdateProject={updateProject}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border/60 px-4 gap-4">
            <SidebarTrigger className="text-muted-foreground" />
            {selectedProject && (
              <h1 className="text-base tracking-wide truncate">{selectedProject.name}</h1>
            )}
          </header>

          <main className="flex-1 p-6">
            {!selectedProject ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <div className="text-center space-y-2">
                  <p className="text-2xl tracking-widest">計画</p>
                  <p className="text-xs">Bir proje seçin veya yeni bir proje oluşturun</p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="notes" className="space-y-6">
                <TabsList className="bg-transparent border border-border/60 h-9">
                  <TabsTrigger value="notes" className="text-xs tracking-wide data-[state=active]:bg-accent">
                    ノート Notlar
                  </TabsTrigger>
                  <TabsTrigger value="table" className="text-xs tracking-wide data-[state=active]:bg-accent">
                    表 Tablo
                  </TabsTrigger>
                  <TabsTrigger value="gantt" className="text-xs tracking-wide data-[state=active]:bg-accent">
                    ガント Gantt
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="text-xs tracking-wide data-[state=active]:bg-accent">
                    看板 Kanban
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="text-xs tracking-wide data-[state=active]:bg-accent">
                    暦 Takvim
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="notes">
                  <NotesView projectId={selectedProject.id} />
                </TabsContent>
                <TabsContent value="table">
                  <TableView projectId={selectedProject.id} />
                </TabsContent>
                <TabsContent value="gantt">
                  <GanttView projectId={selectedProject.id} />
                </TabsContent>
                <TabsContent value="kanban">
                  <KanbanView projectId={selectedProject.id} />
                </TabsContent>
                <TabsContent value="calendar">
                  <CalendarView projectId={selectedProject.id} />
                </TabsContent>
              </Tabs>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
