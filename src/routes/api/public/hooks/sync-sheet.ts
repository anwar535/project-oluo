import { createFileRoute } from "@tanstack/react-router";
import { normalizeExtraValue, parseSheetDate } from "@/lib/sheet-normalize";

const SHEET_ID = "1nSVfMa9OdZZUt9n9B-3CwX7KdjOqLOxy_5flkR2VfpU";
const PROJECTS_META_TABS = ["projects", "projects "] as const;
const PROBE_NONEXISTENT_TAB = "__nonexistent_tab_guard__";
const THROTTLE_MS = 30_000;

// Special header synonyms — these get mapped to dedicated columns.
// Everything else is preserved verbatim as a dynamic column per project.
const UNIT_NUMBER_KEYS = new Set([
  "unit_number", "رقم الوحدة", "رقم", "رقم الوحدة / الفيلا",
  "رقم الفيلا", "رقم الشقة",
]);
const STATUS_KEYS = new Set(["status", "الحالة"]);
const PLAN_IMAGE_KEYS = new Set([
  "plan_image", "المخطط", "صورة المخطط",
  "رابط صورة المخطط", "رابط المخطط",
]);

function isUnitNumberHeader(h: string) {
  const n = h.trim().toLowerCase();
  return [...UNIT_NUMBER_KEYS].some((k) => k.toLowerCase() === n);
}
function isStatusHeader(h: string) {
  const n = h.trim().toLowerCase();
  return [...STATUS_KEYS].some((k) => k.toLowerCase() === n);
}
function isPlanImageHeader(h: string) {
  const n = h.trim().toLowerCase();
  return [...PLAN_IMAGE_KEYS].some((k) => k.toLowerCase() === n);
}

type TabResult = {
  columns: string[]; // ordered dynamic column labels (excluding special)
  rows: Array<{
    unit_number: string;
    status?: string;
    plan_image?: string;
    extra: Record<string, string>;
  }>;
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") {} else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function normalizeDriveUrl(url: string): string {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600`;
  const q = url.match(/[?&]id=([\w-]+)/);
  if (q && url.includes("drive.google.com")) return `https://drive.google.com/thumbnail?id=${q[1]}&sz=w1600`;
  return url;
}

async function fetchTab(tab: string): Promise<TabResult | null> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const csv = await res.text();
  const rows = parseCSV(csv);
  const headerRow = rows[0];
  if (rows.length < 2 || !headerRow) return null;

  const headers = headerRow.map((h) => h.trim().replace(/\s+/g, " "));
  // Classify headers
  type HeaderRole = "unit_number" | "status" | "plan_image" | "extra" | "skip";
  const roles: HeaderRole[] = headers.map((h) => {
    if (!h) return "skip";
    if (isUnitNumberHeader(h)) return "unit_number";
    if (isStatusHeader(h)) return "status";
    if (isPlanImageHeader(h)) return "plan_image";
    return "extra";
  });

  // Safety: if no unit_number header is present, this tab is NOT a units tab
  // (likely gviz fell back to the first sheet). Skip to avoid corrupting columns.
  if (!roles.includes("unit_number")) return null;

  const dynamicColumns: string[] = [];
  headers.forEach((h, i) => {
    if (roles[i] === "extra" && !dynamicColumns.includes(h)) dynamicColumns.push(h);
  });

  const out: TabResult = { columns: dynamicColumns, rows: [] };
  for (const r of rows.slice(1)) {
    let unitNumber = "";
    let status: string | undefined;
    let planImage: string | undefined;
    const extra: Record<string, string> = {};
    headers.forEach((h, i) => {
      const val = (r[i] ?? "").trim();
      if (!val) return;
      const role = roles[i];
      if (role === "unit_number") unitNumber = val;
      else if (role === "status") status = val;
      else if (role === "plan_image") planImage = normalizeDriveUrl(val);
      else if (role === "extra") extra[h] = normalizeExtraValue(h, val);
    });
    if (unitNumber) {
      out.rows.push({ unit_number: unitNumber, status, plan_image: planImage, extra });
    }
  }
  return out;
}

export const Route = createFileRoute("/api/public/hooks/sync-sheet")({
  server: {
    handlers: { POST: handler, GET: handler },
  },
});

const PROJECT_FIELD_MAP: Record<string, string> = {
  "id": "id", "slug": "slug", "name": "name", "اسم المشروع": "name", "الاسم": "name",
  "district": "district", "الحي": "district",
  "cover_image": "cover_image", "صورة الغلاف": "cover_image", "الغلاف": "cover_image",
  "status": "status", "الحالة": "status",
  "category": "category", "التصنيف": "category",
  "tagline": "tagline", "الوصف": "tagline",
  "type": "type", "النوع": "type",
  "sheet_tab": "sheet_tab", "تبويب الجدول": "sheet_tab",
  "sort_order": "sort_order", "الترتيب": "sort_order",
  "price_valid_until": "price_valid_until", "سريان الأسعار حتى": "price_valid_until",
};

async function checkFallbackSafety(): Promise<{ safe: true } | { safe: false; reason: string }> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(PROBE_NONEXISTENT_TAB)}`;
  const res = await fetch(url);
  if (!res.ok) return { safe: true };
  const rows = parseCSV(await res.text());
  const headerRow = rows[0];
  if (!headerRow) return { safe: true };
  const headers = headerRow.map((h) => h.trim().replace(/\s+/g, " "));
  if (headers.some((h) => h && isUnitNumberHeader(h))) {
    return {
      safe: false,
      reason:
        "Aborted: Google Sheets fallback returned a units tab (contains unit-number header). The first tab must be the projects metadata tab.",
    };
  }
  return { safe: true };
}

async function syncProjectsMeta(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  let rows: string[][] | null = null;
  let fieldIdx: Array<string | null> = [];

  for (const tab of PROJECTS_META_TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const parsed = parseCSV(await res.text());
    const headerRow = parsed[0];
    if (parsed.length < 2 || !headerRow) continue;
    const headers = headerRow.map((h) => h.trim().replace(/\s+/g, " "));
    const mapped: Array<string | null> = headers.map(
      (h) => PROJECT_FIELD_MAP[h.toLowerCase()] || PROJECT_FIELD_MAP[h] || null,
    );
    if (mapped.includes("id") || mapped.includes("slug")) {
      rows = parsed;
      fieldIdx = mapped;
      break;
    }
  }

  if (!rows) return { updated, errors };

  for (const r of rows.slice(1)) {
    const patch: Record<string, any> = {};
    let key: { id?: string; slug?: string } = {};
    fieldIdx.forEach((field, i) => {
      if (!field) return;
      const val = (r[i] ?? "").trim();
      if (!val) return;
      if (field === "id") key.id = val;
      else if (field === "slug") { key.slug = val; patch.slug = val; }
      else if (field === "cover_image") patch.cover_image = normalizeDriveUrl(val);
      else if (field === "sort_order") patch.sort_order = parseInt(val) || 0;
      else if (field === "price_valid_until") {
        const iso = parseSheetDate(val);
        if (iso) patch.price_valid_until = iso;
      }
      else patch[field] = val;
    });
    if (!key.id && !key.slug) continue;
    if (Object.keys(patch).length === 0) continue;
    const q = supabaseAdmin.from("projects").update(patch as any);
    const { error: e } = key.id ? await q.eq("id", key.id) : await q.eq("slug", key.slug!);
    if (e) errors.push(`project ${key.id || key.slug}: ${e.message}`);
    else updated++;
  }
  return { updated, errors };
}

async function handler() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Throttle public endpoint: skip if last sync finished < 30s ago
  const { data: lastSync } = await supabaseAdmin
    .from("sync_log")
    .select("ran_at")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastSync?.ran_at && Date.now() - new Date(lastSync.ran_at).getTime() < THROTTLE_MS) {
    return Response.json({ skipped: true }, { status: 200 });
  }

  // Guard against Google gviz silently falling back to a units tab as the first sheet
  const safety = await checkFallbackSafety();
  if (!safety.safe) {
    await supabaseAdmin.from("sync_log").insert({
      status: "error",
      inserted_rows: 0,
      updated_rows: 0,
      message: safety.reason,
    });
    return Response.json({ error: safety.reason, aborted: true }, { status: 409 });
  }

  let inserted = 0;
  let updated = 0;
  let deleted = 0;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Sync project-level metadata from optional _projects tab
  const meta = await syncProjectsMeta(supabaseAdmin);
  updated += meta.updated;
  errors.push(...meta.errors);

  const { data: projects, error } = await supabaseAdmin
    .from("projects")
    .select("id, sheet_tab");
  if (error) return Response.json({ error: error.message }, { status: 500 });


  for (const p of projects ?? []) {
    const tab = p.sheet_tab || p.id;
    try {
      const result = await fetchTab(tab);
      if (!result) continue;

      // Persist the dynamic column schema on the project
      const { error: pErr } = await supabaseAdmin
        .from("projects")
        .update({ columns: result.columns })
        .eq("id", p.id);
      if (pErr) errors.push(`columns ${p.id}: ${pErr.message}`);

      const { data: existing } = await supabaseAdmin
        .from("units")
        .select("id, unit_number")
        .eq("project_id", p.id);
      const existingMap = new Map(
        (existing ?? []).map((u: any) => [u.unit_number, u.id]),
      );

      for (let i = 0; i < result.rows.length; i++) {
        const u = result.rows[i];
        if (!u) continue;
        const payload: any = {
          project_id: p.id,
          unit_number: u.unit_number,
          status: u.status || "متاح",
          plan_image: u.plan_image || null,
          extra: u.extra,
          sort_order: i,
        };
        const existingId = existingMap.get(u.unit_number);
        if (existingId) {
          const patch: any = { ...payload };
          if (!u.plan_image) delete patch.plan_image;
          const { error: e } = await supabaseAdmin
            .from("units")
            .update(patch)
            .eq("id", existingId);
          if (e) errors.push(e.message);
          else updated++;
        } else {
          const { error: e } = await supabaseAdmin.from("units").insert(payload);
          if (e) errors.push(e.message);
          else inserted++;
        }
      }

      // Remove stale units not present in the sheet (only when >= 1 valid unit row and >= 50% of existing count)
      if (result.rows.length >= 1) {
        const existingList = existing ?? [];
        if (existingList.length > 0 && result.rows.length < existingList.length * 0.5) {
          warnings.push(
            `project ${p.id}: skipped deleting stale units (${result.rows.length} in sheet vs ${existingList.length} existing, <50%)`,
          );
        } else {
          const sheetUnitNumbers = new Set(result.rows.map((u) => u.unit_number));
          const staleIds = existingList
            .filter((u: any) => !sheetUnitNumbers.has(u.unit_number))
            .map((u: any) => u.id);
          if (staleIds.length > 0) {
            const { error: dErr } = await supabaseAdmin
              .from("units")
              .delete()
              .in("id", staleIds);
            if (dErr) errors.push(`delete ${p.id}: ${dErr.message}`);
            else deleted += staleIds.length;
          }
        }
      }
    } catch (e: any) {
      errors.push(`tab ${tab}: ${e.message}`);
    }
  }

  const logMessages = [...errors, ...warnings];
  await supabaseAdmin.from("sync_log").insert({
    status: logMessages.length ? "partial" : "ok",
    inserted_rows: inserted,
    updated_rows: updated,
    message: logMessages.slice(0, 5).join(" | ") || null,
  });

  return Response.json({ inserted, updated, deleted, warnings, errors });
}
