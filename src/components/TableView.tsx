import { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTasks, TaskStatus } from "@/hooks/useTasks";

const statusLabels: Record<TaskStatus, string> = {
  todo: "Yapılacak",
  in_progress: "Devam ediyor",
  done: "Tamamlandı",
};

const statusColors: Record<TaskStatus, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-foreground",
  done: "text-muted-foreground line-through",
};

const TableView = ({ projectId }: { projectId: string }) => {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId);
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<TaskStatus | "all">("all");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim() });
    setNewTitle("");
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

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
            <SelectItem value="done">Tamamlandı</SelectItem>
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

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Henüz görev yok</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-light tracking-wide">Başlık</TableHead>
                <TableHead className="text-xs font-light tracking-wide w-32">Durum</TableHead>
                <TableHead className="text-xs font-light tracking-wide w-28">Başlangıç</TableHead>
                <TableHead className="text-xs font-light tracking-wide w-28">Bitiş</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task) => (
                <TableRow key={task.id} className="group">
                  <TableCell className={`text-sm font-light ${statusColors[task.status]}`}>
                    {task.title}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(v) => updateTask(task.id, { status: v as TaskStatus })}
                    >
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
                  <TableCell>
                    <Input
                      type="date"
                      value={task.start_date || ""}
                      onChange={(e) => updateTask(task.id, { start_date: e.target.value || null })}
                      className="h-7 text-xs bg-transparent border-none p-0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={task.end_date || ""}
                      onChange={(e) => updateTask(task.id, { end_date: e.target.value || null })}
                      className="h-7 text-xs bg-transparent border-none p-0"
                    />
                  </TableCell>
                  <TableCell>
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
        </div>
      )}
    </div>
  );
};

export default TableView;
