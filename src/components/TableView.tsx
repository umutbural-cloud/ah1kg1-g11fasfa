import { useState } from "react";
import { Plus, Trash2, GripVertical, EyeOff, Eye, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTasks, TaskStatus, Task } from "@/hooks/useTasks";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const statusColors: Record<TaskStatus, string> = {
  todo: "text-foreground",
  in_progress: "text-foreground",
  done: "text-muted-foreground line-through",
};

const TimeCell = ({ task, onUpdate }: { task: Task; onUpdate: (u: Partial<Task>) => void }) => {
  const has = task.start_time || task.end_time;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Clock className="h-3 w-3" />
          {has ? `${(task.start_time || "").slice(0,5)}${task.end_time ? `–${task.end_time.slice(0,5)}` : ""}` : <span className="opacity-40">—</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3 space-y-2" align="start">
        <div>
          <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç</div>
          <Input type="time" value={task.start_time?.slice(0,5) || ""} onChange={(e) => onUpdate({ start_time: e.target.value || null })} className="h-7 text-xs bg-transparent" />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş</div>
          <Input type="time" value={task.end_time?.slice(0,5) || ""} min={task.start_time?.slice(0,5)} onChange={(e) => onUpdate({ end_time: e.target.value || null })} className="h-7 text-xs bg-transparent" />
        </div>
        {(task.start_time || task.end_time) && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full" onClick={() => onUpdate({ start_time: null, end_time: null })}>Saati temizle</Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

const SortableRow = ({ task, onUpdate, onDelete, onToggleHidden }: {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="group">
      <TableCell className="py-1 w-8">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </TableCell>
      <TableCell className="py-1 w-10">
        <Checkbox
          checked={task.status === "done"}
          onCheckedChange={(checked) => onUpdate(task.id, { status: checked ? "done" : "todo" })}
        />
      </TableCell>
      <TableCell className={`text-sm font-light ${statusColors[task.status]}`}>
        <Input
          value={task.title}
          onChange={(e) => onUpdate(task.id, { title: e.target.value })}
          className="bg-transparent border-none p-0 h-7 text-sm font-light focus-visible:ring-0"
        />
      </TableCell>
      <TableCell className="w-32">
        <Select value={task.status} onValueChange={(v) => onUpdate(task.id, { status: v as TaskStatus })}>
          <SelectTrigger className="h-7 text-xs bg-transparent border-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Yapılacak</SelectItem>
            <SelectItem value="in_progress">Devam ediyor</SelectItem>
            <SelectItem value="done">Tamamlandı</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="w-28">
        <Input
          type="date"
          value={task.start_date || ""}
          onChange={(e) => {
            const v = e.target.value || null;
            const updates: any = { start_date: v };
            if (v && task.end_date && v > task.end_date) updates.end_date = v;
            onUpdate(task.id, updates);
          }}
          className="h-7 text-xs bg-transparent border-none p-0"
        />
      </TableCell>
      <TableCell className="w-28">
        <Input
          type="date"
          value={task.end_date || ""}
          min={task.start_date || undefined}
          onChange={(e) => {
            const v = e.target.value || null;
            if (v && task.start_date && v < task.start_date) return;
            onUpdate(task.id, { end_date: v });
          }}
          className="h-7 text-xs bg-transparent border-none p-0"
        />
      </TableCell>
      <TableCell className="w-24">
        <TimeCell task={task} onUpdate={(u) => onUpdate(task.id, u)} />
      </TableCell>
      <TableCell className="w-16 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleHidden(task.id, !task.hidden)}
            className="text-muted-foreground hover:text-foreground"
            title={task.hidden ? "Göster" : "Gizle"}
          >
            {task.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const TableView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask, updateTask, deleteTask, reorderTasks } = useTasks(projectId);
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [showDone, setShowDone] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim() });
    setNewTitle("");
  };

  const visible = tasks.filter((t) => !t.hidden && t.status !== "done");
  const filteredActive = filter === "all" ? visible : visible.filter((t) => t.status === filter);
  const doneTasks = tasks.filter((t) => !t.hidden && t.status === "done");
  const hiddenTasks = tasks.filter((t) => t.hidden);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = filteredActive.map((t) => t.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(filteredActive, oldIndex, newIndex);
    // Merge: keep done & hidden at their positions, but reset positions globally
    const finalOrder = [
      ...newOrder,
      ...tasks.filter((t) => !newOrder.find((n) => n.id === t.id)),
    ];
    reorderTasks(finalOrder.map((t) => t.id));
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg tracking-wide">表 — Tablo</h2>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-36 h-8 text-xs bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="todo">Yapılacak</SelectItem>
            <SelectItem value="in_progress">Devam ediyor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Yeni görev..."
          className="bg-transparent h-9 text-sm"
        />
        <Button variant="ghost" size="sm" onClick={handleCreate} className="h-9">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {filteredActive.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Aktif görev yok</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-light tracking-wide">Başlık</TableHead>
                <TableHead className="text-xs font-light tracking-wide w-32">Durum</TableHead>
                <TableHead className="text-xs font-light tracking-wide w-28">Başlangıç</TableHead>
                <TableHead className="text-xs font-light tracking-wide w-28">Bitiş</TableHead>
                <TableHead className="text-xs font-light tracking-wide w-24">Saat</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredActive.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {filteredActive.map((task) => (
                    <SortableRow
                      key={task.id}
                      task={task}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                      onToggleHidden={(id, hidden) => updateTask(id, { hidden })}
                    />
                  ))}
                </TableBody>
              </SortableContext>
            </DndContext>
          </Table>
        </div>
      )}

      {/* Tamamlananlar */}
      {doneTasks.length > 0 && (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <button
            onClick={() => setShowDone(!showDone)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-card/40 transition-colors"
          >
            {showDone ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="tracking-wide">了 — Tamamlananlar</span>
            <span className="text-muted-foreground/60">{doneTasks.length}</span>
          </button>
          {showDone && (
            <Table>
              <TableBody>
                {doneTasks.map((task) => (
                  <TableRow key={task.id} className="group">
                    <TableCell className="w-10 py-1">
                      <Checkbox
                        checked
                        onCheckedChange={() => updateTask(task.id, { status: "todo" })}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-light text-muted-foreground line-through">{task.title}</TableCell>
                    <TableCell className="w-16 text-right">
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Gizlenenler */}
      {hiddenTasks.length > 0 && (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-card/40 transition-colors"
          >
            {showHidden ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="tracking-wide">隠 — Gizlenenler</span>
            <span className="text-muted-foreground/60">{hiddenTasks.length}</span>
          </button>
          {showHidden && (
            <Table>
              <TableBody>
                {hiddenTasks.map((task) => (
                  <TableRow key={task.id} className="group">
                    <TableCell className="text-sm font-light text-muted-foreground italic">{task.title}</TableCell>
                    <TableCell className="w-24 text-right">
                      <button
                        onClick={() => updateTask(task.id, { hidden: false })}
                        className="text-muted-foreground hover:text-foreground text-[10px] tracking-wide"
                      >
                        Göster
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
};

export default TableView;
