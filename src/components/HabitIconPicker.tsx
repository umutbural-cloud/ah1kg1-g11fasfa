import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { HABIT_ICON_GROUPS, getHabitIcon } from "@/lib/habitIcons";

const HabitIconPicker = ({ value, onChange, size = 18 }: { value: string; onChange: (v: string) => void; size?: number }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const Current = getHabitIcon(value);
  const ql = q.trim().toLowerCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-7 h-7 rounded-sm hover:bg-accent/50 text-muted-foreground transition-colors"
          title="İkon seç"
        >
          <Current style={{ width: size, height: size }} strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 max-h-[60vh] overflow-y-auto" align="start">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İkon ara..."
          className="h-8 text-xs mb-2"
        />
        {HABIT_ICON_GROUPS.map((g) => {
          const filtered = ql
            ? g.icons.filter((i) => i.label.toLowerCase().includes(ql) || i.name.includes(ql))
            : g.icons;
          if (filtered.length === 0) return null;
          return (
            <div key={g.label} className="mb-2">
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light mb-1 px-1">{g.label}</div>
              <div className="grid grid-cols-7 gap-0.5">
                {filtered.map((i) => {
                  const Icon = i.icon;
                  const active = i.name === value;
                  return (
                    <button
                      key={i.name}
                      type="button"
                      onClick={() => { onChange(i.name); setOpen(false); }}
                      title={i.label}
                      className={`flex items-center justify-center w-8 h-8 rounded-sm transition-colors ${
                        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

export default HabitIconPicker;
