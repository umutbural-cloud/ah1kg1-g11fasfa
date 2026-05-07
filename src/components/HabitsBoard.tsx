import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHabits, type Habit, type FrequencyType } from "@/hooks/useHabits";
import HabitIconPicker from "./HabitIconPicker";
import HabitDetailDialog from "./HabitDetailDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIME_OF_DAY_OPTIONS, type TimeOfDay, timeOfDayLabel } from "@/lib/timeOfDay";

const FREQ_LABEL: Record<FrequencyType, string> = {
  daily: "Her gün",
  weekdays: "Belirli günler",
  weekly: "Haftalık",
  monthly: "Aylık",
};

const HabitsBoard = () => {
  const { habits, createHabit, updateHabit, deleteHabit } = useHabits();
  const [newTitle, setNewTitle] = useState("");
  const [openHabit, setOpenHabit] = useState<Habit | null>(null);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createHabit({ title: newTitle.trim() });
    setNewTitle("");
  };

  return (
    <div className="space-y-3">
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

      {habits.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">Henüz alışkanlık eklenmedi</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-light tracking-wide">Alışkanlık</TableHead>
                <TableHead className="text-xs font-light tracking-wide hidden sm:table-cell w-40">Sıklık</TableHead>
                <TableHead className="text-xs font-light tracking-wide hidden md:table-cell w-44">Günün Dilimi</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {habits.map((h) => (
                <TableRow key={h.id} className="group">
                  <TableCell className="px-1 sm:px-2 py-1">
                    <HabitIconPicker value={h.icon} onChange={(v) => updateHabit(h.id, { icon: v })} />
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1">
                    <button
                      onClick={() => setOpenHabit(h)}
                      className="text-sm font-light text-left w-full hover:underline"
                    >
                      {h.title}
                    </button>
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1 hidden sm:table-cell">
                    <Select value={h.frequency_type} onValueChange={(v: FrequencyType) => updateHabit(h.id, { frequency_type: v })}>
                      <SelectTrigger className="h-8 text-xs border-none bg-transparent shadow-none focus:ring-0 px-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{FREQ_LABEL.daily}</SelectItem>
                        <SelectItem value="weekdays">{FREQ_LABEL.weekdays}</SelectItem>
                        <SelectItem value="weekly">{FREQ_LABEL.weekly}</SelectItem>
                        <SelectItem value="monthly">{FREQ_LABEL.monthly}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1 hidden md:table-cell">
                    <Select value={h.time_of_day} onValueChange={(v: TimeOfDay) => updateHabit(h.id, { time_of_day: v })}>
                      <SelectTrigger className="h-8 text-xs border-none bg-transparent shadow-none focus:ring-0 px-1"><SelectValue>{timeOfDayLabel(h.time_of_day)}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Herhangi</SelectItem>
                        {TIME_OF_DAY_OPTIONS.map((o) => (
                          <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-1 sm:px-2 py-1 text-right">
                    <button
                      onClick={() => deleteHabit(h.id)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
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

      <HabitDetailDialog
        open={!!openHabit}
        habit={openHabit}
        onClose={() => setOpenHabit(null)}
        onSave={updateHabit}
        onDelete={deleteHabit}
      />
    </div>
  );
};

export default HabitsBoard;
