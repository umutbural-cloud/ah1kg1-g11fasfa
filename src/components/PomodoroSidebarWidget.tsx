import { Clock, Play, Pause, Square, RotateCcw, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { usePomodoro, formatMMSS } from "@/hooks/usePomodoro";

const PomodoroSidebarWidget = () => {
  const navigate = useNavigate();
  const { remainingSec, phase, kind, start, pause, resume, reset, startBreak } = usePomodoro();

  const isRunning = phase === "running";
  const isPaused = phase === "paused";
  const isFinished = phase === "finished";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => navigate("/pomodoro")}
        className="text-xs font-light text-muted-foreground group/pom"
        title="Pomodoro"
      >
        <Clock className="h-3 w-3 shrink-0" />
        <span className="tracking-wide flex-1 truncate">
          時計 {formatMMSS(remainingSec)}
          {kind === "break" && phase !== "idle" && <span className="ml-1 text-[9px]">休</span>}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {isFinished ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); startBreak(); }}
                className="p-0.5 hover:text-foreground"
                title="Molayı başlat"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="p-0.5 hover:text-foreground"
                title="Sıfırla"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </>
          ) : isRunning ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); pause(); }}
                className="p-0.5 hover:text-foreground"
                title="Duraklat"
              >
                <Pause className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="p-0.5 hover:text-foreground"
                title="Durdur"
              >
                <Square className="h-3 w-3" />
              </button>
            </>
          ) : isPaused ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); resume(); }}
                className="p-0.5 hover:text-foreground"
                title="Devam"
              >
                <Play className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="p-0.5 hover:text-foreground"
                title="Durdur"
              >
                <Square className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); start(); }}
              className="p-0.5 hover:text-foreground"
              title="Başlat"
            >
              <Play className="h-3 w-3" />
            </button>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export default PomodoroSidebarWidget;
