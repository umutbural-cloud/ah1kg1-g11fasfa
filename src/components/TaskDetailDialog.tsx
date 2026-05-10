import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Task } from "@/hooks/useTasks";

type Props = {
  task: Task | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
};

const TaskDetailDialog = ({ task, open, onOpenChange, onUpdate, onDelete }: Props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Reset form when a different task is opened
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || "");
    setStartDate(task.start_date || "");
    setEndDate(task.end_date || "");
    setStartTime(task.start_time ? task.start_time.slice(0, 5) : "");
    setEndTime(task.end_time ? task.end_time.slice(0, 5) : "");
  }, [task?.id, open]);

  if (!task) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(task.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-light tracking-wide">Görevi Düzenle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlık</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık..." className="bg-transparent" autoFocus />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Açıklama</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Açıklama..." className="bg-transparent min-h-[80px] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş</div>
              <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Başlangıç saati</div>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-transparent" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 tracking-wide">Bitiş saati</div>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-transparent" />
            </div>
          </div>
          {(startTime || endTime) && !startDate && (
            <div className="text-[10px] text-muted-foreground/80 tracking-wide">
              Saatlerin takvimde görünmesi için bir tarih seçin.
            </div>
          )}
        </div>
        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Sil
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button size="sm" onClick={handleSave}>Kaydet</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
