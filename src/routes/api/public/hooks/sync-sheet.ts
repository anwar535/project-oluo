import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SHEET_ID = "1nSVfMa9OdZZUt9n9B-3CwX7KdjOqLOxy_5flkR2VfpU";

// Expected sheet columns (header row, case-insensitive match):
// unit_number | area_m2 | dimensions | built_area_m2 | price | features | status | plan_image
// Arabic synonyms also accepted: رقم الوحدة | المساحة | الأبعاد | البناء | السعر | المميزات | الحالة | المخطط

const HEADER_MAP: Record<string, keyof UnitInput> = {
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
  "ابرز المميزات": "features", "الملاحظات": "features",
  status: "status", "الحالة": "status",
  plan_image: "plan_image", "المخطط": "plan_image", "صورة المخطط": "plan_image",
  "رابط صورة المخطط": "plan_image", "رابط المخطط": "plan_image",
};

type UnitInput = {
  unit_number: string;
  area_m2?: string;
  dimensions?: string;
  built_area_m2?: string;
  price?: string;
  features?: string;
  status?: string;
  plan_image?: string;
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

async function fetchTab(tab: string): Promise<UnitInput[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const csv = await res.text();
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().replace(/\s+/g, " "));
  const fields = headers.map(
    (h) => HEADER_MAP[h] ?? HEADER_MAP[h.toLowerCase()],
  );
  const units: UnitInput[] = [];
  for (const r of rows.slice(1)) {
    const u: any = {};
    fields.forEach((f, i) => {
      if (f && r[i] != null) {
        const val = r[i].trim();
        if (val) u[f] = val;
      }
    });
    if (u.plan_image) u.plan_image = normalizeDriveUrl(u.plan_image);
    if (u.unit_number) units.push(u);
  }
  return units;
}

function normalizeDriveUrl(url: string): string {
  // Convert Google Drive share links to direct image URLs
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600`;
  const q = url.match(/[?&]id=([\w-]+)/);
  if (q && url.includes("drive.google.com")) return `https://drive.google.com/thumbnail?id=${q[1]}&sz=w1600`;
  return url;
}

export const Route = createFileRoute("/api/public/hooks/sync-sheet")({
  server: {
    handlers: {
      POST: handler,
      GET: handler,
    },
  },
});

async function handler() {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  const { data: projects, error } = await supabaseAdmin
    .from("projects")
    .select("id, sheet_tab");
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  for (const p of projects ?? []) {
    const tab = p.sheet_tab || p.id;
    try {
      const units = await fetchTab(tab);
      if (units.length === 0) continue;

      const { data: existing } = await supabaseAdmin
        .from("units")
        .select("id, unit_number")
        .eq("project_id", p.id);
      const existingMap = new Map(
        (existing ?? []).map((u: any) => [u.unit_number, u.id]),
      );

      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        const payload = {
          project_id: p.id,
          unit_number: u.unit_number,
          area_m2: u.area_m2 ?? null,
          dimensions: u.dimensions ?? null,
          built_area_m2: u.built_area_m2 ?? null,
          price: u.price ?? null,
          features: u.features ?? null,
          status: u.status || "متاح",
          plan_image: u.plan_image || null,
          sort_order: i,
        };
        const existingId = existingMap.get(u.unit_number);
        if (existingId) {
          // Don't overwrite plan_image if sheet doesn't provide one
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
