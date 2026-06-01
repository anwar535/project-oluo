import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SHEET_ID = "1nSVfMa9OdZZUt9n9B-3CwX7KdjOqLOxy_5flkR2VfpU";

// Known fields stored as dedicated columns on units; everything else is kept in `extra`.
const KNOWN_FIELDS = [
  "unit_number",
  "area_m2",
  "dimensions",
  "built_area_m2",
  "price",
  "features",
  "status",
  "plan_image",
] as const;
type KnownField = (typeof KNOWN_FIELDS)[number];

const HEADER_MAP: Record<string, KnownField> = {
  unit_number: "unit_number", "رقم الوحدة": "unit_number", "رقم": "unit_number",
  "رقم الوحدة / الفيلا": "unit_number", "رقم الفيلا": "unit_number", "رقم الشقة": "unit_number",
  area_m2: "area_m2", "المساحة": "area_m2", "مساحة الأرض": "area_m2",
  "المساحة م٢": "area_m2", "المساحة م2": "area_m2", "المساحة م²": "area_m2",
  dimensions: "dimensions", "الأبعاد": "dimensions", "الابعاد": "dimensions",
  "الأطوال": "dimensions", "الاطوال": "dimensions",
  built_area_m2: "built_area_m2", "البناء": "built_area_m2", "مساحة البناء": "built_area_m2",
  "مسطح البناء": "built_area_m2", "مسطح البناء م٢": "built_area_m2",
  "مسطح البناء م2": "built_area_m2", "مسطح البناء م²": "built_area_m2",
  price: "price", "السعر": "price", "سعر البيع": "price",
  features: "features", "المميزات": "features", "أبرز المميزات": "features",
  "أبرز المميزات ( كمثال واجهة / زاوية )": "features",
  "أبرز المميزات ( كمثال واجهة / زاوية / موقف قبو )": "features",
  "ابرز المميزات": "features", "الملاحظات": "features",
  status: "status", "الحالة": "status",
  plan_image: "plan_image", "المخطط": "plan_image", "صورة المخطط": "plan_image",
  "رابط صورة المخطط": "plan_image", "رابط المخطط": "plan_image",
};

type ColumnDef = { label: string; field: KnownField | null };

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

function mapHeader(h: string): KnownField | null {
  const norm = h.trim().replace(/\s+/g, " ");
  return HEADER_MAP[norm] ?? HEADER_MAP[norm.toLowerCase()] ?? null;
}

type FetchedTab = {
  columns: ColumnDef[];
  rows: Array<{
    known: Partial<Record<KnownField, string>>;
    extra: Record<string, string>;
  }>;
};

async function fetchTab(tab: string): Promise<FetchedTab | null> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const csv = await res.text();
  const rows = parseCSV(csv);
  if (rows.length < 2) return null;

  const rawHeaders = rows[0].map((h) => h.trim().replace(/\s+/g, " "));
  const fields = rawHeaders.map(mapHeader);

  // Public column schema (what the website shows). Exclude unit_number, status,
  // and plan_image — those are rendered separately.
  const columns: ColumnDef[] = rawHeaders
    .map((label, i) => ({ label, field: fields[i] }))
    .filter(
      (c) =>
        c.label &&
        c.field !== "unit_number" &&
        c.field !== "status" &&
        c.field !== "plan_image",
    );

  const out: FetchedTab["rows"] = [];
  for (const r of rows.slice(1)) {
    const known: Partial<Record<KnownField, string>> = {};
    const extra: Record<string, string> = {};
    rawHeaders.forEach((label, i) => {
      const val = (r[i] ?? "").trim();
      if (!val) return;
      const f = fields[i];
      if (f) {
        known[f] = f === "plan_image" ? normalizeDriveUrl(val) : val;
      } else {
        extra[label] = val;
      }
    });
    if (known.unit_number) out.push({ known, extra });
  }
  return { columns, rows: out };
}

export const Route = createFileRoute("/api/public/hooks/sync-sheet")({
  server: { handlers: { POST: handler, GET: handler } },
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
      const tabData = await fetchTab(tab);
      if (!tabData) continue;

      // Save the column schema for this project so the UI mirrors the sheet.
      await supabaseAdmin
        .from("projects")
        .update({ columns: tabData.columns })
        .eq("id", p.id);

      const { data: existing } = await supabaseAdmin
        .from("units")
        .select("id, unit_number")
        .eq("project_id", p.id);
      const existingMap = new Map(
        (existing ?? []).map((u: any) => [u.unit_number, u.id]),
      );

      for (let i = 0; i < tabData.rows.length; i++) {
        const { known, extra } = tabData.rows[i];
        const payload: any = {
          project_id: p.id,
          unit_number: known.unit_number!,
          area_m2: known.area_m2 ?? null,
          dimensions: known.dimensions ?? null,
          built_area_m2: known.built_area_m2 ?? null,
          price: known.price ?? null,
          features: known.features ?? null,
          status: known.status || "متاح",
          plan_image: known.plan_image || null,
          extra,
          sort_order: i,
        };
        const existingId = existingMap.get(known.unit_number!);
        if (existingId) {
          const patch = { ...payload };
          if (!known.plan_image) delete patch.plan_image;
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
