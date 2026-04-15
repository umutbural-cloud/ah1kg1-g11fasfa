import { useState } from "react";
import { Plus, FolderOpen, Trash2, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Project } from "@/hooks/useProjects";

type Props = {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
};

const AppSidebar = ({ projects, selectedId, onSelect, onCreate, onDelete }: Props) => {
  const { signOut, user } = useAuth();
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setShowInput(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
            計画 Projeler
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    onClick={() => onSelect(project.id)}
                    className={`group/item text-sm font-light ${selectedId === project.id ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    <FolderOpen className="h-3.5 w-3.5 mr-2 shrink-0" />
                    <span className="truncate flex-1">{project.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                      className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {showInput ? (
                <SidebarMenuItem>
                  <div className="flex gap-1 px-2 py-1">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") setShowInput(false);
                      }}
                      autoFocus
                      placeholder="Proje adı..."
                      className="h-7 text-xs bg-transparent"
                    />
                  </div>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShowInput(true)} className="text-xs text-muted-foreground">
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Yeni Proje
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
            {user?.email}
          </span>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
