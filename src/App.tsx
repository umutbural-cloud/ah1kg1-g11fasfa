import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { UndoProvider } from "@/hooks/useUndo";
import { PomodoroProvider } from "@/hooks/usePomodoro";
import { PageStateProvider } from "@/hooks/usePageState";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pomodoro from "./pages/Pomodoro";
import WorkHistory from "./pages/WorkHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm tracking-widest">読み込み中...</span>
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm tracking-widest">読み込み中...</span>
      </div>
    );
  }
  return user ? <Navigate to="/" replace /> : <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UndoProvider>
          <PomodoroProvider>
            <PageStateProvider>
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/pomodoro" element={<ProtectedRoute><Pomodoro /></ProtectedRoute>} />
              <Route path="/work-history" element={<ProtectedRoute><WorkHistory /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </PageStateProvider>
          </PomodoroProvider>
        </UndoProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
