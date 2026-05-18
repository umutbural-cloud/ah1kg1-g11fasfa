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

// Fetch ALL rows for a user from a table, paginating past the 1000-row default cap.
async function fetchAll(table: string, userId: string): Promise<any[]> {
  const PAGE = 1000;
  const all: any[] = [];
  let from = 0;
  // Hard safety cap to avoid infinite loops on misconfigured tables.
  for (let i = 0; i < 1000; i++) {
    const { data, error } = await supabase
      .from(table as any)
      .select("*")
      .eq("user_id", userId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = data || [];
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Pull all rows for the current user across whitelisted, importer-supported tables.
// Knowledge Center tables (notebooks / notebook_notes / quick_notes) are intentionally
// NOT exported — neither in `data` nor in `counts`.
export async function exportUserData(userId: string): Promise<ExportFile> {
  const data: Record<string, any> = {};
  const counts: Record<string, number> = {};

  for (const t of EXPORT_TABLES) {
    const rows = await fetchAll(t.name, userId);
    const cleaned = rows.map(cleanRow);
    data[t.name] = cleaned;
    counts[t.name] = cleaned.length;
  }

  // user_settings: single row per user. Always include the key so the consumer
  // can distinguish "no settings yet" (null) from "missing field" (undefined).
  const { data: settings, error: settingsErr } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (settingsErr) throw new Error(`user_settings: ${settingsErr.message}`);

  data.user_settings = settings ? cleanRow(settings) : null;
  counts.user_settings = settings ? 1 : 0;

  // Helpful debug breadcrumb in dev consoles; harmless in production builds.
  // eslint-disable-next-line no-console
  console.info("[Keikaku export] counts:", counts);

  return {
    app_name: APP_NAME,
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    export_id: crypto.randomUUID(),
    user_data_only: true,
    data,
    counts,
  };
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
