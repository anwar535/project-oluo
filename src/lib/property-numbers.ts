// Utility helpers for extracting/formatting numeric data from unit rows.

export function toArabicDigits(input: string | number): string {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(input).replace(/[0-9]/g, (d) => map[Number(d)]);
}

export function parseNumber(value: unknown): number | null {
  if (value == null) return null;
  const raw = String(value).replace(/[^\d.\-]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(Math.round(n));
}

export function formatSAR(n: number): string {
  return new Intl.NumberFormat("ar-SA").format(Math.round(n));
}
