import { Bell, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useReminders, type ReminderTargetType, type Reminder } from "@/hooks/useReminders";
import { useTimeOfDayRanges } from "@/lib/timeOfDay";

type Props = {
  target_type: ReminderTargetType;
  target_id?: string | null;
  target_key?: string | null;
  /** Optional default title used when creating a new reminder */
  defaultTitle?: string;
};

const ReminderEditor = ({ target_type, target_id, target_key, defaultTitle }: Props) => {
  const { reminders, create, update, remove } = useReminders(target_type, target_id, target_key);
  const { options: slots } = useTimeOfDayRanges();

  const handleAdd = async () => {
    await create({
      trigger_type: "absolute_time",
      absolute_time: "08:00:00",
      offset_minutes: 0,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      title: defaultTitle ?? null,
    });
  };

  const renderRow = (r: Reminder) => (
    <div key={r.id} className="flex flex-col gap-1.5 px-2.5 py-2 rounded-sm border border-border/40 bg-card/40">
      <div className="flex items-center gap-2">
        <Switch
          checked={r.enabled}
          onCheckedChange={(v) => update(r.id, { enabled: v })}
          className="shrink-0"
        />
        <Select
          value={r.trigger_type}
          onValueChange={(v: any) => update(r.id, { trigger_type: v })}
        >
          <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="absolute_time">Belirli saat</SelectItem>
            <SelectItem value="before_slot">Vaktin öncesi</SelectItem>
            <SelectItem value="after_slot">Vaktin sonrası</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => remove(r.id)}
          className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Hatırlatıcıyı sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {r.trigger_type === "absolute_time" ? (
        <div className="pl-9">
          <Input
            type="time"
            value={(r.absolute_time ?? "08:00").slice(0, 5)}
            onChange={(e) => update(r.id, { absolute_time: `${e.target.value}:00` })}
            className="bg-transparent h-7 text-xs w-28"
          />
        </div>
      ) : (
        <div className="pl-9 flex items-center gap-2">
          <Select
            value={r.slot_key ?? slots[0]?.key ?? ""}
            onValueChange={(v) => update(r.id, { slot_key: v })}
          >
            <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
              <SelectValue placeholder="Dilim" />
            </SelectTrigger>
            <SelectContent>
              {slots.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            max={240}
            value={r.offset_minutes}
            onChange={(e) => update(r.id, { offset_minutes: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })}
            className="bg-transparent h-7 text-xs w-16"
          />
          <span className="text-[10px] text-muted-foreground tracking-wide whitespace-nowrap">
            dk {r.trigger_type === "before_slot" ? "önce" : "sonra"}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
          <Bell className="h-3 w-3" />
          Hatırlatıcılar
        </div>
        <Button variant="ghost" size="sm" onClick={handleAdd} className="h-7 px-2 text-xs gap-1">
          <Plus className="h-3 w-3" />
          Ekle
        </Button>
      </div>
      {reminders.length === 0 ? (
        <div className="text-[10px] text-muted-foreground tracking-wide pt-1 pb-2">
          Henüz hatırlatıcı yok. Belirli bir saat veya günün dilimine göre ekleyebilirsin.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reminders.map(renderRow)}
        </div>
      )}
    </div>
  );
};

export default ReminderEditor;
