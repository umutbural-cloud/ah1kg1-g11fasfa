import { useState } from "react";
import { Moon, Sun, Bell, BellOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useHabitTodayDefault } from "@/hooks/useHabitSettings";
import {
  useSidebarPreferences,
  SIDEBAR_ITEM_ORDER,
  SIDEBAR_ITEM_LABELS,
} from "@/hooks/useSidebarPreferences";
import { useStartupPage } from "@/hooks/useStartupPage";
import { useProjects } from "@/hooks/useProjects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const SettingsDialog = ({ open, onOpenChange }: Props) => {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user } = useAuth();
  const [habitDefault, setHabitDefault] = useHabitTodayDefault();
  const { prefs: sidebarPrefs, setItem: setSidebarPref } = useSidebarPreferences();
  const { startup, setStartup } = useStartupPage();
  const { projects } = useProjects();
  const enabledModules = SIDEBAR_ITEM_ORDER.filter((k) => sidebarPrefs[k]);
  const startupValue =
    startup.type === "module" ? `mod:${startup.value}` :
    startup.type === "project" ? `prj:${startup.value}` :
    "default";
  const handleStartupChange = (v: string) => {
    if (v === "default") setStartup({ type: "default" });
    else if (v.startsWith("mod:")) setStartup({ type: "module", value: v.slice(4) as any });
    else if (v.startsWith("prj:")) setStartup({ type: "project", value: v.slice(4) });
  };
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  const requestNotif = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Bu tarayıcı bildirimleri desteklemiyor.");
      return;
    }
    if (Notification.permission === "granted") {
      toast("Bildirimler zaten açık.");
      return;
    }
    if (Notification.permission === "denied") {
      toast.error("Bildirimler engellendi. Tarayıcı ayarlarından izin verin.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPerm(result);
    if (result === "granted") {
      toast.success("Bildirimler açıldı.");
      try { new Notification("Keikaku", { body: "Bildirimler aktif." }); } catch {}
    } else {
      toast.error("Bildirim izni reddedildi.");
    }
  };

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

          {/* Bildirimler */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-light">Bildirimler</div>
              <div className="text-[10px] text-muted-foreground tracking-wide">
                {notifPerm === "granted" && "Açık — Pomodoro bittiğinde haber verilir"}
                {notifPerm === "default" && "Site arka planda olsa bile haber alın"}
                {notifPerm === "denied" && "Engellendi — Tarayıcı ayarlarından açın"}
                {notifPerm === "unsupported" && "Bu tarayıcı desteklemiyor"}
              </div>
            </div>
            <button
              onClick={requestNotif}
              disabled={notifPerm === "unsupported"}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border/60 hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {notifPerm === "granted" ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              <span className="text-xs tracking-wide">
                {notifPerm === "granted" ? "Açık" : notifPerm === "denied" ? "Engelli" : "Aç"}
              </span>
            </button>
          </div>

          <div className="border-t border-border/60" />

          {/* Alışkanlıklar */}
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">習慣 — Alışkanlıklar</div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-light">Bugün varsayılan filtresi</div>
                <div className="text-[10px] text-muted-foreground tracking-wide">
                  Sayfa açıldığında hangi alışkanlıklar gösterilsin
                </div>
              </div>
              <div className="flex rounded-sm border border-border/60 overflow-hidden shrink-0">
                <button
                  onClick={() => setHabitDefault("time")}
                  className={`px-3 py-1.5 text-xs tracking-wide transition-colors ${
                    habitDefault === "time" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"
                  }`}
                >Günün saati</button>
                <button
                  onClick={() => setHabitDefault("all")}
                  className={`px-3 py-1.5 text-xs tracking-wide transition-colors border-l border-border/60 ${
                    habitDefault === "all" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40"
                  }`}
                >Tümü</button>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60" />

          {/* Tercihler — Sidebar görünürlüğü */}
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">設定 — Tercihler</div>
            <div className="text-[10px] text-muted-foreground tracking-wide">
              Yan menüde hangi bölümler görünsün
            </div>
            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {SIDEBAR_ITEM_ORDER.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-accent/40 transition-colors cursor-pointer"
                >
                  <Checkbox
                    checked={sidebarPrefs[key]}
                    onCheckedChange={(v) => setSidebarPref(key, v === true)}
                  />
                  <span className="text-sm font-light tracking-wide">{SIDEBAR_ITEM_LABELS[key]}</span>
                </label>
              ))}
            </div>
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
