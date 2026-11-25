const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toWesternDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

export function isPriceHeader(header: string): boolean {
  return /سعر|price/i.test(header);
}

export function normalizeExtraValue(header: string, raw: string): string {
  if (isPriceHeader(header)) {
    const digits = toWesternDigits(raw).replace(/\D/g, "").replace(/^0+/, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  if (/\p{L}/u.test(raw) || raw.includes("*")) return raw;

  if (/[0-9٠-٩۰-۹]/.test(raw) && /^[0-9٠-٩۰-۹.,٫\s]+$/.test(raw)) {
    return toWesternDigits(raw).replace(/٫/g, ".");
  }

  return raw;
}

export function parseSheetDate(raw: string): string | null {
  const s = toWesternDigits(raw).trim();
  if (!s) return null;

  let y: number;
  let m: number;
  let d: number;

  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

  if (ymd) {
    y = Number(ymd[1]);
    m = Number(ymd[2]);
    d = Number(ymd[3]);
  } else if (dmy) {
    d = Number(dmy[1]);
    m = Number(dmy[2]);
    y = Number(dmy[3]);
  } else {
    return null;
  }

  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }

  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function todayInRiyadh(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${d}`;
}

export function formatPriceValidityNotice(
  priceValidUntil: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!priceValidUntil) return "الأسعار قابلة للتغيير دون إشعار مسبق";
  const iso = priceValidUntil.slice(0, 10);
  if (iso < todayInRiyadh(now)) {
    return "انتهى سريان الأسعار، يرجى التواصل مع المبيعات للتأكيد";
  }
  return `تسري الأسعار حتى تاريخ ${iso.replace(/-/g, "/")}`;
}