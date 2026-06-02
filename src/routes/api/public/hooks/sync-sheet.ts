import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SHEET_ID = "1x3IImxiEZmrB5-cx3AUlTNGUdyoe-40RWHgvvAjc4UI";

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
  if (rows.length < 2) return null;

  const headers = rows[0].map((h) => h.trim().replace(/\s+/g, " "));
  // Classify headers
  type HeaderRole = "unit_number" | "status" | "plan_image" | "extra" | "skip";
  const roles: HeaderRole[] = headers.map((h) => {
    if (!h) return "skip";
    if (isUnitNumberHeader(h)) return "unit_number";
    if (isStatusHeader(h)) return "status";
    if (isPlanImageHeader(h)) return "plan_image";
    return "extra";
  });

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
      else if (role === "extra") extra[h] = val;
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

async function handler() {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

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
    } catch (e: any) {
      errors.push(`tab ${tab}: ${e.message}`);
    }
  }

  await supabaseAdmin.from("sync_log").insert({
    status: errors.length ? "partial" : "ok",
    inserted_rows: inserted,
    updated_rows: updated,
    message: errors.slice(0, 5).join(" | ") || null,
  });

  return Response.json({ inserted, updated, errors });
}
