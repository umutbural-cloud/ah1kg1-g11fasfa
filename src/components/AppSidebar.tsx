import { useState } from "react";
import { Plus, Trash2, LogOut, ChevronRight, Pencil, FileText, Table as TableIcon, GanttChart, Kanban, Calendar, X, BookOpen, ChevronLeft } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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
import type { ViewKey } from "@/hooks/useProjectViews";

const EMOJIS = ["📁", "🎯", "💼", "🚀", "📝", "🎨", "💡", "🔧", "📊", "🌟", "🎵", "📚", "🏠", "⚡", "🌱", "🔥", "❤️", "🧩", "🎮", "🍀"];

const VIEW_META: Record<ViewKey, { label: string; jp: string; icon: any }> = {
  notes: { label: "Notlar", jp: "ノート", icon: FileText },
  table: { label: "Tablo", jp: "表", icon: TableIcon },
  gantt: { label: "Gantt", jp: "ガント", icon: GanttChart },
  kanban: { label: "Kanban", jp: "看板", icon: Kanban },
  calendar: { label: "Takvim", jp: "暦", icon: Calendar },
};
const ALL_VIEW_KEYS: ViewKey[] = ["notes", "table", "gantt", "kanban", "calendar"];

type Props = {
  projects: Project[];
  selectedId: string | null;
  selectedView: ViewKey;
  onSelect: (id: string, view?: ViewKey) => void;
  onCreate: (name: string, parentId?: string) => void;
  onDelete: (id: string) => void;
  onUpdateProject: (id: string, updates: { name?: string; emoji?: string }) => void;
  getProjectViews: (projectId: string) => ViewKey[];
  onAddView: (projectId: string, v: ViewKey) => void;
  onRemoveView: (projectId: string, v: ViewKey) => void;
  journalDate: string | null;
  onSelectJournal: (date: string) => void;
};

const JournalSection = ({ journalDate, onSelectJournal }: { journalDate: string | null; onSelectJournal: (d: string) => void }) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const active = journalDate !== null;
  const current = journalDate || today;
  const currentDate = parseISO(current);
  const [pickerOpen, setPickerOpen] = useState(false);

  const shift = (n: number) => {
    onSelectJournal(format(addDays(currentDate, n), "yyyy-MM-dd"));
  };

  return (
    <div className="px-2 py-2">
      <button
        onClick={() => onSelectJournal(current)}
        className={cn(
          "w-full flex items-center gap-1.5 px-1.5 py-1 rounded-sm text-xs transition-colors",
          active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        )}
      >
        <BookOpen className="h-3 w-3 shrink-0" />
        <span className="font-light tracking-wide">日記 Günlük</span>
      </button>
      <div className="flex items-center gap-0.5 mt-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); shift(-1); }}
          className="p-1 text-muted-foreground hover:text-foreground rounded-sm hover:bg-accent/50"
          title="Önceki gün"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex-1 text-[11px] text-center font-light tracking-wide text-muted-foreground hover:text-foreground py-1 rounded-sm hover:bg-accent/50 transition-colors"
              title="Tarih seç"
            >
              {format(currentDate, "d MMM yyyy", { locale: tr })}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={currentDate}
              onSelect={(d) => {
                if (d) {
                  onSelectJournal(format(d, "yyyy-MM-dd"));
                  setPickerOpen(false);
                }
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <button
          onClick={(e) => { e.stopPropagation(); shift(1); }}
          className="p-1 text-muted-foreground hover:text-foreground rounded-sm hover:bg-accent/50"
          title="Sonraki gün"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

const EmojiPicker = ({ current, onSelect }: { current: string; onSelect: (emoji: string) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button onClick={(e) => e.stopPropagation()} className="text-sm hover:scale-110 transition-transform shrink-0">{current}</button>
    </PopoverTrigger>
    <PopoverContent className="w-48 p-2" align="start" onClick={(e) => e.stopPropagation()}>
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
  selectedView,
  onSelect,
  onDelete,
  onUpdateProject,
  onAddSub,
  getProjectViews,
  onAddView,
  onRemoveView,
  depth = 0,
}: {
  project: Project;
  children: Project[];
  selectedId: string | null;
  selectedView: ViewKey;
  onSelect: (id: string, view?: ViewKey) => void;
  onDelete: (id: string) => void;
  onUpdateProject: (id: string, updates: { name?: string; emoji?: string }) => void;
  onAddSub: (parentId: string) => void;
  getProjectViews: (id: string) => ViewKey[];
  onAddView: (id: string, v: ViewKey) => void;
  onRemoveView: (id: string, v: ViewKey) => void;
  depth?: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const hasSubProjects = children.length > 0;
  const isSelected = selectedId === project.id;
  const projectViews = getProjectViews(project.id);
  const availableToAdd = ALL_VIEW_KEYS.filter((v) => !projectViews.includes(v));

  const commitRename = () => {
    const v = renameValue.trim();
    if (v && v !== project.name) onUpdateProject(project.id, { name: v });
    setRenaming(false);
  };

  const handleProjectClick = () => {
    if (renaming) return;
    onSelect(project.id);
    setExpanded(true);
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleProjectClick}
          className={`group/item text-sm font-light ${isSelected ? "bg-accent text-accent-foreground" : ""}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="shrink-0 mr-0.5"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
          <EmojiPicker current={project.emoji} onSelect={(emoji) => onUpdateProject(project.id, { emoji })} />
          {renaming ? (
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setRenameValue(project.name); setRenaming(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="h-6 ml-1.5 text-xs bg-transparent px-1 py-0 flex-1"
            />
          ) : (
            <span
              className="truncate flex-1 ml-1.5"
              onDoubleClick={(e) => { e.stopPropagation(); setRenameValue(project.name); setRenaming(true); }}
            >
              {project.name}
            </span>
          )}
          <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setRenameValue(project.name); setRenaming(true); }} className="text-muted-foreground hover:text-foreground" title="Yeniden adlandır">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onAddSub(project.id); }} className="text-muted-foreground hover:text-foreground" title="Alt proje">
              <Plus className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-muted-foreground hover:text-destructive" title="Sil">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Alt sayfalar (görünümler) */}
      {expanded && projectViews.map((vk) => {
        const meta = VIEW_META[vk];
        const Icon = meta.icon;
        const active = isSelected && selectedView === vk;
        return (
          <SidebarMenuItem key={vk}>
            <SidebarMenuButton
              onClick={() => onSelect(project.id, vk)}
              className={`text-xs font-light group/view ${active ? "bg-accent/60 text-accent-foreground" : "text-muted-foreground"}`}
              style={{ paddingLeft: `${8 + (depth + 1) * 16 + 12}px` }}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1">{meta.label}</span>
              {vk !== "notes" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveView(project.id, vk); }}
                  className="opacity-0 group-hover/view:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                  title="Bu görünümü kaldır"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}

      {/* Görünüm ekle */}
      {expanded && availableToAdd.length > 0 && (
        <SidebarMenuItem>
          <Popover>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                className="text-[10px] text-muted-foreground/70 font-light"
                style={{ paddingLeft: `${8 + (depth + 1) * 16 + 12}px` }}
              >
                <Plus className="h-3 w-3" />
                <span>Görünüm ekle</span>
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              {availableToAdd.map((vk) => {
                const meta = VIEW_META[vk];
                const Icon = meta.icon;
                return (
                  <button
                    key={vk}
                    onClick={() => onAddView(project.id, vk)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors"
                  >
                    <Icon className="h-3 w-3" />
                    <span>{meta.label}</span>
                    <span className="text-muted-foreground/60 ml-auto text-[9px]">{meta.jp}</span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </SidebarMenuItem>
      )}

      {/* Alt projeler */}
      {expanded && children.map((child) => (
        <ProjectItem
          key={child.id}
          project={child}
          children={[]}
          selectedId={selectedId}
          selectedView={selectedView}
          onSelect={onSelect}
          onDelete={onDelete}
          onUpdateProject={onUpdateProject}
          onAddSub={onAddSub}
          getProjectViews={getProjectViews}
          onAddView={onAddView}
          onRemoveView={onRemoveView}
          depth={depth + 1}
        />
      ))}
    </>
  );
};

const AppSidebar = ({ projects, selectedId, selectedView, onSelect, onCreate, onDelete, onUpdateProject, getProjectViews, onAddView, onRemoveView, journalDate, onSelectJournal }: Props) => {
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
                    selectedView={selectedView}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onUpdateProject={onUpdateProject}
                    onAddSub={handleAddSub}
                    getProjectViews={getProjectViews}
                    onAddView={onAddView}
                    onRemoveView={onRemoveView}
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
