// Helpers for turning free-text spreadsheet-style unit columns (price / area)
// into numbers we can animate, plus the column-matching heuristics shared
// with the project detail page.

export function isPriceCol(label: string) {
  return /سعر|price/i.test(label);
}

export function isAreaCol(label: string) {
  return /مساحة|area/i.test(label) && !/مبنية|built|جزء/i.test(label);
}

/** Extracts the first numeric value out of a free-text cell like
 *  "1,250,000 ريال" or "من 180 م²" -> 1250000 / 180. Returns null if none found. */
export function parseNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.replace(/[٬,]/g, "").match(/\d+(\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatNumber(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

export type UnitLite = {
  project_id: string;
  status: string;
  extra: Record<string, string> | null;
};

export type ProjectStats = {
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  availableCount: number;
  totalUnits: number;
};

/** Aggregates a project's units into price/area ranges for display. */
export function computeProjectStats(
  units: UnitLite[],
  columns: string[] | null | undefined,
): ProjectStats {
  const priceCol = (columns ?? []).find(isPriceCol);
  const areaCol = (columns ?? []).find(isAreaCol);

  const prices = priceCol
    ? units.map((u) => parseNumber(u.extra?.[priceCol])).filter((n): n is number => n !== null)
    : [];
  const areas = areaCol
    ? units.map((u) => parseNumber(u.extra?.[areaCol])).filter((n): n is number => n !== null)
    : [];

  return {
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    minArea: areas.length ? Math.min(...areas) : null,
    maxArea: areas.length ? Math.max(...areas) : null,
    availableCount: units.filter((u) => u.status === "متاح").length,
    totalUnits: units.length,
  };
}
