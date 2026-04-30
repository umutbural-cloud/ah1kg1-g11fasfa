import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const SettingsDialog = ({ open, onOpenChange }: Props) => {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleEmail = async () => {
    if (!email.trim() || email === user?.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    if (error) toast.error(error.message);
    else toast.success("Doğrulama e-postası gönderildi");
  };

  const handlePassword = async () => {
    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Şifre güncellendi");
      setPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-light tracking-wide">設定 — Ayarlar</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Tema */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-light">Karanlık tema</div>
              <div className="text-[10px] text-muted-foreground tracking-wide">Yumuşak tonlarda gece modu</div>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border/60 hover:bg-accent/50 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span className="text-xs tracking-wide">{theme === "dark" ? "Aydınlık" : "Karanlık"}</span>
            </button>
          </div>

          <div className="border-t border-border/60" />

          {/* E-posta */}
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">E-posta</div>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                className="bg-transparent h-8 text-sm"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEmail}
                disabled={savingEmail || email === user?.email || !email.trim()}
              >
                Güncelle
              </Button>
            </div>
          </div>

          {/* Şifre */}
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Yeni şifre</div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="bg-transparent h-8 text-sm"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePassword}
                disabled={savingPassword || password.length < 6}
              >
                Güncelle
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
