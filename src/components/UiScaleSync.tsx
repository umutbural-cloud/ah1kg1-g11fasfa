import { useEffect } from "react";
import { useUserSettings } from "@/hooks/useUserSettings";

const SCALE_FONT_SIZE: Record<string, string> = {
  normal: "16px",
  large: "18.4px",   // ~+15%
  xlarge: "20.8px",  // ~+30%
};

/**
 * Applies the user's accessibility UI scale globally.
 * Because Tailwind sizes (text-*, h-*, p-*, gap-*, [&_svg]:size-*) are in rem,
 * adjusting the root font-size proportionally scales typography, spacing,
 * button heights, input sizes, paddings, icons and line-heights together.
 */
export const UiScaleSync = () => {
  const { settings } = useUserSettings();

  useEffect(() => {
    const scale = settings.ui_scale ?? "normal";
    const root = document.documentElement;
    root.dataset.uiScale = scale;
    root.style.fontSize = SCALE_FONT_SIZE[scale] ?? SCALE_FONT_SIZE.normal;
    return () => {
      root.style.removeProperty("font-size");
      delete root.dataset.uiScale;
    };
  }, [settings.ui_scale]);

  return null;
};
