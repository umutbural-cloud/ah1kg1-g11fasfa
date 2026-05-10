import { useEffect } from "react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { readAutoMode, writeAutoMode } from "@/lib/timeOfDay";

/**
 * Mirrors the user's `auto_prayer_times` (stored in DB / synced across devices)
 * into the local time-of-day system. This makes the "günün konumuna göre belirle"
 * preference persistent for the same user across browsers/devices.
 */
export const AutoPrayerSync = () => {
  const { settings, loading } = useUserSettings();
  useEffect(() => {
    if (loading) return;
    const local = readAutoMode();
    if (local !== settings.auto_prayer_times) {
      writeAutoMode(settings.auto_prayer_times);
    }
  }, [loading, settings.auto_prayer_times]);
  return null;
};
