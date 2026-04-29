import { useState } from "react";
import { Plus, Trash2, GripVertical, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTasks, Task, TaskStatus } from "@/hooks/useTasks";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

const COLUMNS: { key: TaskStatus; label: string; jpLabel: string }[] = [
  { key: "todo", label: "Yapılacak", jpLabel: "未" },
  { key: "in_progress", label: "Devam Eden", jpLabel: "進" },
  { key: "done", label: "Tamamlandı", jpLabel: "了" },
];

const SortableCard = ({ task, onUpdate, onDelete }: {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [startDate, setStartDate] = useState(task.start_date || "");
  const [endDate, setEndDate] = useState(task.end_date || "");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description || "");
    setStartDate(task.start_date || "");
    setEndDate(task.end_date || "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div ref={setNodeRef} style={style} className="border border-border/60 rounded-sm p-3 bg-card space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık..." className="bg-transparent h-7 text-sm" autoFocus />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Açıklama..." className="bg-transparent min-h-[60px] text-xs resize-none" />
        <div className="space-y-2">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç</div>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent h-7 text-xs" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş</div>
            <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent h-7 text-xs" />
          </div>
        </div>
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}><Check className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="group border border-border/60 rounded-sm p-3 bg-card/50 hover:bg-card transition-colors">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/40 shrink-0" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-light truncate">{task.title}</p>
          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
          {task.start_date && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {task.start_date}{task.end_date && ` → ${task.end_date}`}
            </p>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
          <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  );
};

const KanbanColumn = ({ column, tasks, onCreateTask, onUpdateTask, onDeleteTask }: {
  column: (typeof COLUMNS)[0];
  tasks: Task[];
  onCreateTask: (title: string, status: TaskStatus) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}) => {
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const { setNodeRef } = useDroppable({ id: `column-${column.key}` });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onCreateTask(newTitle.trim(), column.key);
    setNewTitle("");
    setIsAdding(false);
  };

  const isDoneCol = column.key === "done";
  const sorted = isDoneCol
    ? [...tasks].sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    : tasks;
  const visibleTasks = isDoneCol && !showAllDone ? sorted.slice(0, 3) : sorted;
  const hiddenCount = isDoneCol ? Math.max(0, sorted.length - 3) : 0;

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[240px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{column.jpLabel}</span>
          <h3 className="text-sm tracking-wide">{column.label}</h3>
          <span className="text-xs text-muted-foreground/60">{tasks.length}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAdding(true)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-2 flex-1 min-h-[100px]">
        {isAdding && (
          <div className="border border-border/60 rounded-sm p-2 space-y-2">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setIsAdding(false); setNewTitle(""); }
            }} placeholder="Görev adı..." className="bg-transparent h-7 text-sm" autoFocus />
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAdd}>Ekle</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setIsAdding(false); setNewTitle(""); }}>İptal</Button>
            </div>
          </div>
        )}
        <SortableContext items={visibleTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visibleTasks.map((task) => (
            <SortableCard key={task.id} task={task} onUpdate={onUpdateTask} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
        {isDoneCol && hiddenCount > 0 && (
          <button
            onClick={() => setShowAllDone(!showAllDone)}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2 tracking-wide transition-colors"
          >
            {showAllDone ? "↑ Sadece son 3'ü göster" : `↓ ${hiddenCount} tane daha göster`}
          </button>
        )}
      </div>
    </div>
  );
};

const KanbanView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask, updateTask, deleteTask, reorderTasks } = useTasks(projectId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleCreate = async (title: string, status: TaskStatus) => {
    await createTask({ title, status });
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    let targetStatus: TaskStatus | null = null;
    let overTask: Task | undefined;

    if (overId.startsWith("column-")) {
      targetStatus = overId.replace("column-", "") as TaskStatus;
    } else {
      overTask = tasks.find((t) => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

    // Status change
    if (activeTask.status !== targetStatus) {
      await updateTask(active.id as string, { status: targetStatus });
      return;
    }

    // Same column reorder
    if (overTask && active.id !== over.id) {
      const colTasks = tasks.filter((t) => t.status === targetStatus);
      const ids = colTasks.map((t) => t.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex >= 0 && newIndex >= 0) {
        const newOrder = arrayMove(colTasks, oldIndex, newIndex);
        const finalOrder = [
          ...newOrder,
          ...tasks.filter((t) => !newOrder.find((n) => n.id === t.id)),
        ];
        reorderTasks(finalOrder.map((t) => t.id));
      }
    }
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg tracking-wide font-light">看板 — Kanban</h2>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              tasks={tasks.filter((t) => t.status === col.key)}
              onCreateTask={handleCreate}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};

export default KanbanView;
