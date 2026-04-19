import { useState } from "react";
import { Plus, Trash2, ArrowRight, Flame, Clock, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBacklog, BacklogTask, Priority, Urgency } from "@/hooks/useBacklog";
import { useProjects, Project } from "@/hooks/useProjects";

const priorityMeta: Record<Priority, { label: string; color: string; rank: number }> = {
  high: { label: "Yüksek", color: "text-red-700", rank: 0 },
  medium: { label: "Orta", color: "text-amber-700", rank: 1 },
  low: { label: "Düşük", color: "text-stone-500", rank: 2 },
};

const urgencyMeta: Record<Urgency, { label: string; jp: string; rank: number }> = {
  today: { label: "Bugün", jp: "今日", rank: 0 },
  this_week: { label: "Bu hafta", jp: "今週", rank: 1 },
  someday: { label: "Bir gün", jp: "いつか", rank: 2 },
};

const MoveMenu = ({ projects, onMove }: { projects: Project[]; onMove: (pid: string) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        title="Projeye taşı"
      >
        <ArrowRight className="h-3 w-3" />
        <span>Taşı</span>
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-56 p-1 max-h-72 overflow-auto" align="end">
      {projects.length === 0 ? (
        <div className="text-xs text-muted-foreground p-2">Önce bir proje oluşturun</div>
      ) : projects.map((p) => (
        <button
          key={p.id}
          onClick={() => onMove(p.id)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent rounded-sm transition-colors text-left"
        >
          <span>{p.emoji}</span>
          <span className="truncate">{p.name}</span>
        </button>
      ))}
    </PopoverContent>
  </Popover>
);

const BacklogRow = ({ item, projects, onUpdate, onDelete, onMove }: {
  item: BacklogTask;
  projects: Project[];
  onUpdate: (id: string, updates: Partial<BacklogTask>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, projectId: string) => void;
}) => {
  return (
    <div className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 px-3 py-2 border-b border-border/40 hover:bg-card/40 transition-colors">
      <Input
        value={item.title}
        onChange={(e) => onUpdate(item.id, { title: e.target.value })}
        className="bg-transparent border-none p-0 h-7 text-sm font-light focus-visible:ring-0"
      />
      <Select value={item.priority} onValueChange={(v) => onUpdate(item.id, { priority: v as Priority })}>
        <SelectTrigger className="h-7 w-24 text-xs bg-transparent border-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(["high","medium","low"] as Priority[]).map((p) => (
            <SelectItem key={p} value={p}><span className={priorityMeta[p].color}>{priorityMeta[p].label}</span></SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={item.urgency} onValueChange={(v) => onUpdate(item.id, { urgency: v as Urgency })}>
        <SelectTrigger className="h-7 w-24 text-xs bg-transparent border-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(["today","this_week","someday"] as Urgency[]).map((u) => (
            <SelectItem key={u} value={u}>{urgencyMeta[u].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={item.due_date || ""}
        onChange={(e) => onUpdate(item.id, { due_date: e.target.value || null })}
        className="h-7 w-32 text-xs bg-transparent border-none p-0"
      />
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <MoveMenu projects={projects} onMove={(pid) => onMove(item.id, pid)} />
        <button
          onClick={() => onDelete(item.id)}
          className="text-muted-foreground hover:text-destructive p-1"
          title="Sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

type SortKey = "manual" | "priority" | "urgency" | "due_date";

const BacklogView = () => {
  const { items, loading, createItem, updateItem, deleteItem, moveToProject } = useBacklog();
  const { projects } = useProjects();
  const [newTitle, setNewTitle] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("manual");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterUrgency, setFilterUrgency] = useState<Urgency | "all">("all");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createItem({ title: newTitle.trim() });
    setNewTitle("");
  };

  let filtered = items;
  if (filterPriority !== "all") filtered = filtered.filter((i) => i.priority === filterPriority);
  if (filterUrgency !== "all") filtered = filtered.filter((i) => i.urgency === filterUrgency);

  const sorted = [...filtered];
  if (sortBy === "priority") sorted.sort((a, b) => priorityMeta[a.priority].rank - priorityMeta[b.priority].rank);
  else if (sortBy === "urgency") sorted.sort((a, b) => urgencyMeta[a.urgency].rank - urgencyMeta[b.urgency].rank);
  else if (sortBy === "due_date") sorted.sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  const flatProjects = projects;

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">荷袋 Heybe</div>
        <h1 className="text-3xl font-light tracking-wide mt-1">Heybe</h1>
        <p className="text-xs text-muted-foreground mt-1 font-light max-w-prose">
          Karmaşık alan. Tüm görevleri, fikirleri buraya at; öncelik ver, sırala, sonra projelere taşıyıp sade alanlarda çalış.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground tracking-wide">Sırala:</span>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-7 w-32 text-xs bg-transparent"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manuel</SelectItem>
            <SelectItem value="priority">Önceliğe</SelectItem>
            <SelectItem value="urgency">Aciliyete</SelectItem>
            <SelectItem value="due_date">Bitiş tarihine</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground tracking-wide ml-2">Öncelik:</span>
        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as any)}>
          <SelectTrigger className="h-7 w-28 text-xs bg-transparent"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="high">Yüksek</SelectItem>
            <SelectItem value="medium">Orta</SelectItem>
            <SelectItem value="low">Düşük</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground tracking-wide ml-2">Aciliyet:</span>
        <Select value={filterUrgency} onValueChange={(v) => setFilterUrgency(v as any)}>
          <SelectTrigger className="h-7 w-28 text-xs bg-transparent"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="today">Bugün</SelectItem>
            <SelectItem value="this_week">Bu hafta</SelectItem>
            <SelectItem value="someday">Bir gün</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Heybeye bir görev at..."
          className="bg-transparent h-9 text-sm"
        />
        <Button variant="ghost" size="sm" onClick={handleCreate} className="h-9">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Heybede iş yok</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 px-3 py-2 border-b border-border/60 text-[10px] tracking-wide uppercase text-muted-foreground bg-card/30">
            <span>Başlık</span>
            <span className="w-24">Öncelik</span>
            <span className="w-24">Aciliyet</span>
            <span className="w-32">Bitiş</span>
            <span className="w-20"></span>
          </div>
          {sorted.map((item) => (
            <BacklogRow
              key={item.id}
              item={item}
              projects={flatProjects}
              onUpdate={updateItem}
              onDelete={deleteItem}
              onMove={moveToProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BacklogView;
