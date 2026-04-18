import { useState, useRef } from "react";
import { Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTasks, Task, TaskStatus } from "@/hooks/useTasks";

const COLUMNS: { key: TaskStatus; label: string; jpLabel: string }[] = [
  { key: "todo", label: "Yapılacak", jpLabel: "未" },
  { key: "in_progress", label: "Devam Eden", jpLabel: "進" },
  { key: "done", label: "Tamamlandı", jpLabel: "了" },
];

const KanbanCard = ({
  task,
  onUpdate,
  onDelete,
  onDragStart,
}: {
  task: Task;
  onUpdate: (id: string, updates: Partial<Omit<Task, "id" | "project_id" | "user_id" | "created_at">>) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [startDate, setStartDate] = useState(task.start_date || "");
  const [endDate, setEndDate] = useState(task.end_date || "");

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
      <div className="border border-border/60 rounded-sm p-3 bg-card space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Başlık..."
          className="bg-transparent h-7 text-sm"
          autoFocus
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Açıklama..."
          className="bg-transparent min-h-[60px] text-xs resize-none"
        />
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
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="group border border-border/60 rounded-sm p-3 bg-card/50 hover:bg-card transition-colors cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/40 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-light truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          {task.start_date && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {task.start_date}{task.end_date && ` → ${task.end_date}`}
            </p>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

const KanbanColumn = ({
  column,
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onDragStart,
  onDrop,
}: {
  column: (typeof COLUMNS)[0];
  tasks: Task[];
  onCreateTask: (title: string, status: TaskStatus) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, "id" | "project_id" | "user_id" | "created_at">>) => void;
  onDeleteTask: (id: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDrop: (status: TaskStatus) => void;
}) => {
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onCreateTask(newTitle.trim(), column.key);
    setNewTitle("");
    setIsAdding(false);
  };

  const isDoneCol = column.key === "done";
  // Sort done by most recently updated (use created_at desc as proxy)
  const sorted = isDoneCol
    ? [...tasks].sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    : tasks;
  const visibleTasks = isDoneCol && !showAllDone ? sorted.slice(0, 3) : sorted;
  const hiddenCount = isDoneCol ? Math.max(0, sorted.length - 3) : 0;

  return (
    <div
      className="flex-1 min-w-[240px] flex flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(column.key)}
    >
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

      <div className="space-y-2 flex-1">
        {isAdding && (
          <div className="border border-border/60 rounded-sm p-2 space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setIsAdding(false); setNewTitle(""); }
              }}
              placeholder="Görev adı..."
              className="bg-transparent h-7 text-sm"
              autoFocus
            />
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAdd}>Ekle</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setIsAdding(false); setNewTitle(""); }}>İptal</Button>
            </div>
          </div>
        )}
        {visibleTasks.map((task) => (
          <KanbanCard key={task.id} task={task} onUpdate={onUpdateTask} onDelete={onDeleteTask} onDragStart={onDragStart} />
        ))}
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
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId);
  const draggedTaskId = useRef<string | null>(null);

  const handleDragStart = (_e: React.DragEvent, taskId: string) => {
    draggedTaskId.current = taskId;
  };

  const handleDrop = async (status: TaskStatus) => {
    if (!draggedTaskId.current) return;
    const task = tasks.find((t) => t.id === draggedTaskId.current);
    if (task && task.status !== status) {
      await updateTask(draggedTaskId.current, { status });
    }
    draggedTaskId.current = null;
  };

  const handleCreate = async (title: string, status: TaskStatus) => {
    await createTask({ title, status });
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg tracking-wide">看板 — Kanban</h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            column={col}
            tasks={tasks.filter((t) => t.status === col.key)}
            onCreateTask={handleCreate}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanView;
