import { useState, useMemo } from "react";
import { Moon, Sun, Bell, BellOff, Sprout, LayoutGrid, User, SlidersHorizontal, Trash2, RotateCcw, Plus, Sunrise, MapPin, Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useHabitTodayDefault } from "@/hooks/useHabitSettings";
import {
  useTimeOfDayRanges,
  DEFAULT_TIME_OF_DAY_LABELS,
  ALL_TIME_OF_DAY_KEYS,
  type TimeOfDayKey,
} from "@/lib/timeOfDay";
import {
  useSidebarPreferences,
  SIDEBAR_ITEM_ORDER,
  SIDEBAR_ITEM_LABELS,
} from "@/hooks/useSidebarPreferences";
import { useStartupPage } from "@/hooks/useStartupPage";
import { useProjects } from "@/hooks/useProjects";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useUserLocation } from "@/hooks/useUserLocation";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { searchTurkeyCities, TURKEY_CITIES } from "@/lib/turkeyCities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

type SectionKey = "habits" | "modules" | "account" | "preferences";

const SECTIONS: { key: SectionKey; label: string; jp: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "habits", label: "Alışkanlık", jp: "習慣", icon: Sprout },
  { key: "modules", label: "Modüller", jp: "区分", icon: LayoutGrid },
  { key: "account", label: "Hesap", jp: "個人", icon: User },
  { key: "preferences", label: "Tercihler", jp: "設定", icon: SlidersHorizontal },
];

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase mb-2 sm:hidden">{children}</div>
);

const SettingsDialog = ({ open, onOpenChange }: Props) => {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user } = useAuth();
  const [habitDefault, setHabitDefault] = useHabitTodayDefault();
  const {
    starts: todStarts,
    labels: todLabels,
    disabled: todDisabled,
    options: todOptions,
    auto: todAuto,
    update: updateTod,
    rename: renameTod,
    setEnabled: setTodEnabled,
    reset: resetTod,
    setAutoMode: setTodAutoMode,
  } = useTimeOfDayRanges();
  const { settings: userSettings, update: updateUserSettings } = useUserSettings();
  const { request: requestGeo, loading: geoLoading } = useUserLocation();
  const prayerQuery = usePrayerTimes();
  const [citySearch, setCitySearch] = useState("");
  const cityResults = useMemo(() => searchTurkeyCities(citySearch).slice(0, 30), [citySearch]);
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
  const [section, setSection] = useState<SectionKey>("habits");
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

  const enabledCount = ALL_TIME_OF_DAY_KEYS.length - todDisabled.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden",
          // Mobile: nearly full-screen sheet. Desktop: centered modal.
          "w-screen h-[100dvh] max-w-none rounded-none border-0",
          "sm:w-[90vw] sm:h-auto sm:max-w-3xl sm:rounded-lg sm:border sm:max-h-[85vh]"
        )}
      >
        <DialogHeader className="px-4 sm:px-5 py-3 border-b border-border/60 shrink-0">
          <DialogTitle className="text-base font-light tracking-wide">設定 — Ayarlar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 sm:max-h-[calc(85vh-3.5rem)]">
          {/* Sidebar / top tabs */}
          <nav
            className={cn(
              "shrink-0 border-border/60 bg-muted/20 flex gap-1",
              // Mobile: horizontal sticky tabs
              "border-b px-2 py-1.5 overflow-x-auto",
              // Desktop: vertical sidebar
              "sm:flex-col sm:border-b-0 sm:border-r sm:w-48 sm:py-3 sm:px-2 sm:overflow-visible"
            )}
          >
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-colors shrink-0 sm:w-full",
                    active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs tracking-wide whitespace-nowrap">{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 min-h-0">
            {section === "habits" && (
              <div className="space-y-5">
                <SectionTitle>習慣 — Alışkanlık</SectionTitle>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
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

                <div className="border-t border-border/60" />

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-light">Gün dilimleri</div>
                      <div className="text-[10px] text-muted-foreground tracking-wide">
                        Adı düzenleyin, başlangıç saatini değiştirin veya dilimi kaldırın.
                      </div>
                    </div>
                    <button
                      onClick={resetTod}
                      className="flex items-center gap-1 text-[10px] tracking-wide text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Sıfırla
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    {ALL_TIME_OF_DAY_KEYS.map((k) => {
                      const isEnabled = !todDisabled.includes(k);
                      const opt = todOptions.find((o) => o.key === k);
                      const range = opt?.range ?? "—";
                      return (
                        <div
                          key={k}
                          className={cn(
                            "flex flex-col gap-1.5 px-2.5 py-2 rounded-sm border border-border/40 bg-card/40",
                            !isEnabled && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground/70 text-xs w-4 text-center shrink-0">
                              {DEFAULT_TIME_OF_DAY_LABELS[k].jp}
                            </span>
                            <Input
                              value={todLabels[k]}
                              onChange={(e) => renameTod(k, e.target.value)}
                              disabled={!isEnabled}
                              placeholder={DEFAULT_TIME_OF_DAY_LABELS[k].label}
                              className="bg-transparent h-7 text-sm font-light flex-1 min-w-0 px-2"
                            />
                            {isEnabled ? (
                              <button
                                onClick={() => setTodEnabled(k, false)}
                                disabled={enabledCount <= 1}
                                title={enabledCount <= 1 ? "En az bir dilim olmalı" : "Dilimi kaldır"}
                                className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setTodEnabled(k, true)}
                                title="Dilimi geri ekle"
                                className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pl-6">
                            <Input
                              type="time"
                              value={todStarts[k]}
                              onChange={(e) => updateTod(k, e.target.value)}
                              disabled={!isEnabled}
                              className="bg-transparent h-7 text-xs w-28 px-2"
                            />
                            <span className="text-[10px] text-muted-foreground tracking-wide tabular-nums ml-auto">
                              {isEnabled ? range : "kapalı"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {section === "modules" && (
              <div className="space-y-2">
                <SectionTitle>区分 — Modüller</SectionTitle>
                <div className="text-[10px] text-muted-foreground tracking-wide">
                  Yan menüde hangi bölümler görünsün
                </div>
                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  {SIDEBAR_ITEM_ORDER.map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-sm hover:bg-accent/40 transition-colors cursor-pointer"
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
            )}

            {section === "account" && (
              <div className="space-y-5">
                <SectionTitle>個人 — Hesap</SectionTitle>
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">E-posta</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@mail.com"
                      className="bg-transparent h-9 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEmail}
                      disabled={savingEmail || email === user?.email || !email.trim()}
                      className="shrink-0"
                    >
                      Güncelle
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Yeni şifre</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="bg-transparent h-9 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handlePassword}
                      disabled={savingPassword || password.length < 6}
                      className="shrink-0"
                    >
                      Güncelle
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {section === "preferences" && (
              <div className="space-y-5">
                <SectionTitle>設定 — Tercihler</SectionTitle>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-light">Karanlık tema</div>
                    <div className="text-[10px] text-muted-foreground tracking-wide">Yumuşak tonlarda gece modu</div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border/60 hover:bg-accent/50 transition-colors shrink-0"
                  >
                    {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    <span className="text-xs tracking-wide">{theme === "dark" ? "Aydınlık" : "Karanlık"}</span>
                  </button>
                </div>

                <div className="border-t border-border/60" />

                <div className="space-y-2">
                  <div className="text-sm font-light">Açılış sayfası</div>
                  <div className="text-[10px] text-muted-foreground tracking-wide">
                    Uygulama açıldığında hangi sayfaya gidilsin
                  </div>
                  <Select value={startupValue} onValueChange={handleStartupChange}>
                    <SelectTrigger className="h-9 text-sm font-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="default">Varsayılan (ilk proje)</SelectItem>
                      {enabledModules.length > 0 && (
                        <div className="px-2 pt-1.5 pb-0.5 text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Modüller</div>
                      )}
                      {enabledModules.map((k) => (
                        <SelectItem key={`mod:${k}`} value={`mod:${k}`}>{SIDEBAR_ITEM_LABELS[k]}</SelectItem>
                      ))}
                      {projects.length > 0 && (
                        <div className="px-2 pt-1.5 pb-0.5 text-[10px] text-muted-foreground tracking-[0.15em] uppercase">Projeler</div>
                      )}
                      {projects.map((p) => (
                        <SelectItem key={`prj:${p.id}`} value={`prj:${p.id}`}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t border-border/60" />

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
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
                    className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border/60 hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {notifPerm === "granted" ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    <span className="text-xs tracking-wide">
                      {notifPerm === "granted" ? "Açık" : notifPerm === "denied" ? "Engelli" : "Aç"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
