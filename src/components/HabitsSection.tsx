import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHabits } from "@/hooks/useHabits";

const HabitsSection = ({ projectId }: { projectId: string }) => {
  const { habits, loading, createHabit, updateHabit, deleteHabit, toggleCompletion } = useHabits(projectId);
  const [newTitle, setNewTitle] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createHabit(newTitle);
    setNewTitle("");
  };

  if (loading) return null;

  const visible = habits.filter((h) => !h.hidden);

  return (
    <div className="space-y-3">
      <h3 className="text-sm tracking-wide font-light text-muted-foreground">習慣 — Alışkanlıklar</h3>

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Yeni alışkanlık..."
          className="bg-transparent h-9 text-sm"
        />
        <Button variant="ghost" size="sm" onClick={handleCreate} className="h-9">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">
          <p>Her gün tekrarlanan eylemler için</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-light tracking-wide">Alışkanlık</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((habit) => (
                <TableRow key={habit.id} className="group">
                  <TableCell className="py-1 w-10">
                    <Checkbox
                      checked={habit.completed_today}
                      onCheckedChange={() => toggleCompletion(habit)}
                    />
                  </TableCell>
                  <TableCell className="text-sm font-light">
                    <Input
                      value={habit.title}
                      onChange={(e) => updateHabit(habit.id, { title: e.target.value })}
                      className={`bg-transparent border-none p-0 h-7 text-sm font-light focus-visible:ring-0 ${habit.completed_today ? "line-through text-muted-foreground" : ""}`}
                    />
                  </TableCell>
                  <TableCell className="w-16 text-right">
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
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

export default HabitsSection;
