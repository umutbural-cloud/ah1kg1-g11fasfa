import { useState } from "react";
import { Plus, Trash2, GripVertical, EyeOff, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTasks, Task } from "@/hooks/useTasks";
import HabitsSection from "./HabitsSection";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
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
      <TableCell className="py-1 px-1 sm:px-2 w-7 sm:w-8">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </TableCell>
      <TableCell className="py-1 px-1 sm:px-2 w-8 sm:w-10">
        <Checkbox
          checked={task.status === "done"}
          onCheckedChange={(checked) => onUpdate(task.id, { status: checked ? "done" : "todo" })}
        />
      </TableCell>
      <TableCell className="text-sm font-light px-1 sm:px-2 py-1">
        <Input
          value={task.title}
          onChange={(e) => onUpdate(task.id, { title: e.target.value })}
          className="bg-transparent border-none p-0 h-7 text-sm font-light focus-visible:ring-0"
        />
      </TableCell>
      <TableCell className="w-14 sm:w-16 px-1 sm:px-2 py-1 text-right">
        <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleHidden(task.id, !task.hidden)}
            className="text-muted-foreground hover:text-foreground p-1"
            title={task.hidden ? "Göster" : "Gizle"}
          >
            {task.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-muted-foreground hover:text-destructive p-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const TableView = ({ projectId, showHabits = false }: { projectId: string; showHabits?: boolean }) => {
  const { tasks, loading, createTask, updateTask, deleteTask, reorderTasks } = useTasks(projectId);
  const [newTitle, setNewTitle] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim() });
    setNewTitle("");
  };

  const visible = tasks.filter((t) => !t.hidden && t.status !== "done");
  const doneTasks = tasks
    .filter((t) => !t.hidden && t.status === "done")
    .sort((a, b) => {
      const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return tb - ta; // en yeni en üstte
    });
  const hiddenTasks = tasks.filter((t) => t.hidden);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visible.map((t) => t.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(visible, oldIndex, newIndex);
    const finalOrder = [
      ...newOrder,
      ...tasks.filter((t) => !newOrder.find((n) => n.id === t.id)),
    ];
    reorderTasks(finalOrder.map((t) => t.id));
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto w-full">
      <h2 className="text-lg tracking-wide font-light">表 — Tablo</h2>

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

      {visible.length === 0 ? (
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
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {visible.map((task) => (
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

      {/* Alışkanlıklar — sadece varsayılan projede */}
      {showHabits && <HabitsSection projectId={projectId} />}

      {/* Tamamlananlar — varsayılan: son 3, tıklayınca tümü */}
      {doneTasks.length > 0 && (() => {
        const visibleDone = showDone ? doneTasks : doneTasks.slice(0, 3);
        const hiddenCount = Math.max(0, doneTasks.length - 3);
        return (
          <div className="border border-border/60 rounded-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground bg-card/30">
              <span className="tracking-wide">了 — Tamamlananlar</span>
              <span className="text-muted-foreground/60">{doneTasks.length}</span>
            </div>
            <Table>
              <TableBody>
                {visibleDone.map((task) => (
                  <TableRow key={task.id} className="group">
                    <TableCell className="w-8 sm:w-10 py-1 px-1 sm:px-2">
                      <Checkbox
                        checked
                        onCheckedChange={() => updateTask(task.id, { status: "todo" })}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-light text-muted-foreground line-through px-1 sm:px-2 py-1 break-words">{task.title}</TableCell>
                    <TableCell className="text-[10px] sm:text-[11px] text-muted-foreground/70 font-light text-right whitespace-nowrap px-1 sm:px-2 py-1">
                      {task.completed_at
                        ? format(parseISO(task.completed_at), "d MMM HH:mm", { locale: tr })
                        : "—"}
                    </TableCell>
                    <TableCell className="w-10 sm:w-12 text-right px-1 sm:px-2 py-1">
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowDone(!showDone)}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 tracking-wide transition-colors border-t border-border/40"
              >
                {showDone ? "↑ Sadece son 3'ü göster" : `↓ ${hiddenCount} tane daha göster`}
              </button>
            )}
          </div>
        );
      })()}

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
                    <TableCell className="text-sm font-light text-muted-foreground italic px-2 py-1 break-words">{task.title}</TableCell>
                    <TableCell className="w-20 sm:w-24 text-right px-2 py-1">
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
