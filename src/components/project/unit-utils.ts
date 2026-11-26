import { isAreaCol, isPriceCol, parseNumber } from "@/lib/property-numbers";
import type { UnitRow } from "@/lib/types";

export { isAreaCol, isPriceCol, parseNumber };

export const STATUS_OPTS = ["كل الحالات", "متاح", "محجوز", "مباع", "غير متاح"] as const;
export type StatusFilter = (typeof STATUS_OPTS)[number];
export type UnitSort = "available" | "area-asc" | "area-desc" | "price-asc" | "price-desc" | "unit";

export const isFeaturesCol = (label: string) => /مميزات|ميزة|ملاحظ|features|notes/i.test(label);
export const isVideoCol = (label: string) => /فيديو|video|3d/i.test(label);
export const isFloorCol = (label: string) => /الدور|floor/i.test(label);
export const isRoomsCol = (label: string) => /غرف|rooms/i.test(label);
export const isBuiltAreaCol = (label: string) => /مسطح|بناء|built/i.test(label);
export const isPrivateAreaCol = (label: string) => /خاص|private/i.test(label);
export const isLengthsCol = (label: string) => /الأطوال|الاطوال|length|أبعاد|ابعاد/i.test(label);

export function statusStyle(status: string) {
  switch (status) {
    case "متاح":
      return { border: "border-emerald-500", side: "border-r-emerald-500", overlay: "", hidePrice: false };
    case "محجوز":
      return { border: "border-amber-500", side: "border-r-amber-500", overlay: "bg-amber-500/10", hidePrice: true };
    case "مباع":
      return { border: "border-red-500", side: "border-r-red-500", overlay: "bg-red-500/10", hidePrice: true };
    case "غير متاح":
    default:
      return { border: "border-gray-400", side: "border-r-gray-400", overlay: "bg-gray-500/10", hidePrice: true };
  }
}

export function statusBtnActive(status: string) {
  switch (status) {
    case "متاح": return "bg-emerald-100 text-emerald-700 border-emerald-500";
    case "محجوز": return "bg-amber-100 text-amber-700 border-amber-500";
    case "مباع": return "bg-stone-200 text-stone-700 border-red-500";
    case "غير متاح": return "bg-stone-100 text-stone-600 border-gray-400";
    default: return "bg-navy text-navy-foreground border-navy";
  }
}

export function featureChips(value: string | null | undefined) {
  return (value ?? "")
    .split(/\s*(?:\+|\||،|\r?\n|\s+-\s+)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function distinctUnitValues(units: UnitRow[], column?: string) {
  if (!column) return [];
  return [...new Set(units.map((unit) => unit.extra?.[column]?.trim()).filter((value): value is string => !!value))];
}

const collator = new Intl.Collator("ar", { numeric: true, sensitivity: "base" });
const statusRank = (status: string) => status === "متاح" ? 0 : status === "محجوز" ? 1 : 2;

function compareNumbers(a: number | null, b: number | null, direction: 1 | -1) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
}

export function sortUnits(units: UnitRow[], sort: UnitSort, areaCol?: string, priceCol?: string) {
  return units
    .map((unit, index) => ({ unit, index }))
    .sort((a, b) => {
      let result = 0;
      if (sort === "available") {
        result = statusRank(a.unit.status) - statusRank(b.unit.status);
      } else if (sort === "unit") {
        result = collator.compare(a.unit.unit_number, b.unit.unit_number);
      } else if (sort === "area-asc" || sort === "area-desc") {
        result = compareNumbers(
          parseNumber(a.unit.extra?.[areaCol ?? ""]),
          parseNumber(b.unit.extra?.[areaCol ?? ""]),
          sort === "area-asc" ? 1 : -1,
        );
      } else {
        const aAvailable = a.unit.status === "متاح";
        const bAvailable = b.unit.status === "متاح";
        if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
        if (aAvailable) {
          result = compareNumbers(
            parseNumber(a.unit.extra?.[priceCol ?? ""]),
            parseNumber(b.unit.extra?.[priceCol ?? ""]),
            sort === "price-asc" ? 1 : -1,
          );
        }
      }
      return result || a.index - b.index;
    })
    .map(({ unit }) => unit);
}

export function lowestAvailablePrice(units: UnitRow[], priceCol?: string) {
  if (!priceCol) return null;
  const prices = units
    .filter((unit) => unit.status === "متاح")
    .map((unit) => parseNumber(unit.extra?.[priceCol]))
    .filter((price): price is number => price !== null);
  return prices.length ? Math.min(...prices) : null;
}
