import { useState } from "react";
import HabitsToday from "./HabitsToday";
import HabitsBoard from "./HabitsBoard";
import HabitsStats from "./HabitsStats";
import { ChevronDown, ChevronRight } from "lucide-react";

const Section = ({
  jp,
  title,
  defaultOpen = true,
  children,
}: {
  jp: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-4">
      <button
        onClick={() => setOpen((p) => !p)}
        className="group flex items-center gap-2 w-full text-left border-b border-border/60 pb-2"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">{jp}</span>
        <span className="text-sm font-light tracking-wide">{title}</span>
      </button>
      {open && <div>{children}</div>}
    </section>
  );
};

const HabitsView = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">習慣</div>
        <h1 className="text-2xl font-light tracking-wide">Alışkanlıklar</h1>
      </div>

      <Section jp="今日" title="Bugün" defaultOpen><HabitsToday /></Section>
      <Section jp="全て" title="Tümü" defaultOpen><HabitsBoard /></Section>
      <Section jp="統計" title="İstatistik" defaultOpen={false}><HabitsStats /></Section>
    </div>
  );
};

export default HabitsView;
