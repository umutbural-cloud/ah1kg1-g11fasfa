import { supabase } from "@/integrations/supabase/client";
import { APP_NAME, SCHEMA_VERSION, EXPORT_TABLES, type ExportFile } from "./schema";

// Server-managed / sensitive columns we never include in exports.
const STRIP_COLS = new Set(["user_id"]);

function cleanRow(row: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (STRIP_COLS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

// Pull all rows for the current user across whitelisted, importer-supported tables.
export async function exportUserData(userId: string): Promise<ExportFile> {
  const data: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  for (const t of EXPORT_TABLES) {
    const { data: rows, error } = await supabase
      .from(t.name as any)
      .select("*")
      .eq("user_id", userId);
    if (error) throw new Error(`${t.name}: ${error.message}`);
    const cleaned = (rows || []).map(cleanRow);
    data[t.name] = cleaned;
    counts[t.name] = cleaned.length;
  }

  // user_settings: single row, strip user_id, only include if it exists.
  const { data: settings, error: settingsErr } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (settingsErr) throw new Error(`user_settings: ${settingsErr.message}`);

  const file: ExportFile = {
    app_name: APP_NAME,
    schema_version: SCHEMA_VERSION, // number
    exported_at: new Date().toISOString(),
    export_id: crypto.randomUUID(),
    user_data_only: true, // boolean
    data: { ...data },
    counts: { ...counts },
  };

  if (settings) {
    (file.data as any).user_settings = cleanRow(settings);
    file.counts["user_settings"] = 1;
  }

  return file;
}

export function downloadExport(file: ExportFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `keikaku-export-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
