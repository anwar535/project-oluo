import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPriceValidityNotice,
  normalizeExtraValue,
  parseSheetDate,
} from "./sheet-normalize";

describe("normalizeExtraValue", () => {
  test("normalizes price formats and clears zero/empty values", () => {
    assert.equal(normalizeExtraValue("السعر", "1,925,000"), "1,925,000");
    assert.equal(normalizeExtraValue("السعر", "1٬925٬000"), "1,925,000");
    assert.equal(normalizeExtraValue("السعر", "1،098،000"), "1,098,000");
    assert.equal(normalizeExtraValue("السعر", "١٬٩٢٥٬٠٠٠"), "1,925,000");
    assert.equal(normalizeExtraValue("Price", "1925000"), "1,925,000");
    assert.equal(normalizeExtraValue("السعر", "0.000.000"), "");
    assert.equal(normalizeExtraValue("السعر", "-"), "");
    assert.equal(normalizeExtraValue("السعر", "٠"), "");
  });

  test("normalizes purely numeric-like non-price values and preserves letters/*", () => {
    assert.equal(normalizeExtraValue("المساحة", "١٨٠٫٥"), "180.5");
    assert.equal(normalizeExtraValue("المساحة", "210٫75"), "210.75");
    assert.equal(normalizeExtraValue("الأطوال", "12.25*12.7"), "12.25*12.7");
    assert.equal(normalizeExtraValue("الدور", "الدور الأول"), "الدور الأول");
    assert.equal(normalizeExtraValue("المساحة", "180 م²"), "180 م²");
  });
});

describe("parseSheetDate", () => {
  test("parses YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY and ignores empty/invalid", () => {
    assert.equal(parseSheetDate("2026-11-30"), "2026-11-30");
    assert.equal(parseSheetDate("2026/11/30"), "2026-11-30");
    assert.equal(parseSheetDate("30/11/2026"), "2026-11-30");
    assert.equal(parseSheetDate("٣٠/١١/٢٠٢٦"), "2026-11-30");
    assert.equal(parseSheetDate(""), null);
    assert.equal(parseSheetDate("31/02/2026"), null);
  });
});

describe("formatPriceValidityNotice", () => {
  const now = new Date("2026-11-25T12:00:00Z"); // 2026-11-25 15:00 Asia/Riyadh

  test("handles null, active, and expired dates in Asia/Riyadh", () => {
    assert.equal(
      formatPriceValidityNotice(null, now),
      "الأسعار قابلة للتغيير دون إشعار مسبق",
    );
    assert.equal(
      formatPriceValidityNotice("2026-11-30", now),
      "تسري الأسعار حتى تاريخ 2026/11/30",
    );
    assert.equal(
      formatPriceValidityNotice("2026-11-25", now),
      "تسري الأسعار حتى تاريخ 2026/11/25",
    );
    assert.equal(
      formatPriceValidityNotice("2026-11-24", now),
      "انتهى سريان الأسعار، يرجى التواصل مع المبيعات للتأكيد",
    );
  });
});