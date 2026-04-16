import { useState, useRef } from "react";
import { Plus, Trash2, LogOut, ChevronRight } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { Project } from "@/hooks/useProjects";

const EMOJIS = ["📁", "🎯", "💼", "🚀", "📝", "🎨", "💡", "🔧", "📊", "🌟", "🎵", "📚", "🏠", "⚡", "🌱", "🔥", "❤️", "🧩", "🎮", "🍀"];

type Props = {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, parentId?: string) => void;
  onDelete: (id: string) => void;
  onUpdateProject: (id: string, updates: { name?: string; emoji?: string }) => void;
};

const EmojiPicker = ({ current, onSelect }: { current: string; onSelect: (emoji: string) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button className="text-sm hover:scale-110 transition-transform shrink-0">{current}</button>
    </PopoverTrigger>
    <PopoverContent className="w-48 p-2" align="start">
      <div className="grid grid-cols-5 gap-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => onSelect(e)}
            className="text-base p-1 hover:bg-accent rounded-sm transition-colors"
          >
            {e}
          </button>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);

const ProjectItem = ({
  project,
  children,
  selectedId,
  onSelect,
  onDelete,
  onUpdateProject,
  onAddSub,
  depth = 0,
}: {
  project: Project;
  children: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateProject: (id: string, updates: { name?: string; emoji?: string }) => void;
  onAddSub: (parentId: string) => void;
  depth?: number;
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => onSelect(project.id)}
          className={`group/item text-sm font-light ${selectedId === project.id ? "bg-accent text-accent-foreground" : ""}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="shrink-0 mr-0.5">
              <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          ) : (
            <span className="w-3 mr-0.5 shrink-0" />
          )}
          <EmojiPicker current={project.emoji} onSelect={(emoji) => onUpdateProject(project.id, { emoji })} />
          <span className="truncate flex-1 ml-1.5">{project.name}</span>
          <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onAddSub(project.id); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {expanded && children.map((child) => (
        <ProjectItem
          key={child.id}
          project={child}
          children={[]}
          selectedId={selectedId}
          onSelect={onSelect}
          onDelete={onDelete}
          onUpdateProject={onUpdateProject}
          onAddSub={onAddSub}
          depth={depth + 1}
        />
      ))}
    </>
  );
};

const AppSidebar = ({ projects, selectedId, onSelect, onCreate, onDelete, onUpdateProject }: Props) => {
  const { signOut, user } = useAuth();
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [subName, setSubName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setShowInput(false);
  };

  const handleAddSub = (parentId: string) => {
    setAddingParentId(parentId);
    setSubName("");
  };

  const handleCreateSub = () => {
    if (!subName.trim() || !addingParentId) return;
    onCreate(subName.trim(), addingParentId);
    setSubName("");
    setAddingParentId(null);
  };

  const rootProjects = projects.filter((p) => !p.parent_id);
  const getChildren = (parentId: string) => projects.filter((p) => p.parent_id === parentId);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
            計画 Projeler
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rootProjects.map((project) => (
                <div key={project.id}>
                  <ProjectItem
                    project={project}
                    children={getChildren(project.id)}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onUpdateProject={onUpdateProject}
                    onAddSub={handleAddSub}
                  />
                  {addingParentId === project.id && (
                    <SidebarMenuItem>
                      <div className="flex gap-1 px-2 py-1" style={{ paddingLeft: "32px" }}>
                        <Input
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateSub();
                            if (e.key === "Escape") setAddingParentId(null);
                          }}
                          autoFocus
                          placeholder="Alt proje adı..."
                          className="h-7 text-xs bg-transparent"
                        />
                      </div>
                    </SidebarMenuItem>
                  )}
                </div>
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
