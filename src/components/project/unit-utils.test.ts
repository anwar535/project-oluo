import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { UnitRow } from "@/lib/types";
import { sortUnits, statusStyle } from "./unit-utils";

const unit = (id: string, status: string, price = "1,000,000"): UnitRow => ({
  id,
  project_id: "22",
  unit_number: id,
  status,
  plan_image: null,
  sort_order: Number(id),
  extra: { "السعر": price, "المساحة": "200" },
});

describe("unit price visibility", () => {
  test("shows price only for متاح and hides it for محجوز, مباع and غير متاح", () => {
    assert.equal(statusStyle("متاح").hidePrice, false);
    assert.equal(statusStyle("محجوز").hidePrice, true);
    assert.equal(statusStyle("مباع").hidePrice, true);
    assert.equal(statusStyle("غير متاح").hidePrice, true);
  });
});

describe("unit sorting", () => {
  test("puts available first, reserved second and keeps sheet order inside each group", () => {
    const units = [unit("1", "مباع"), unit("2", "محجوز"), unit("3", "متاح"), unit("4", "متاح"), unit("5", "محجوز")];
    assert.deepEqual(sortUnits(units, "available", "المساحة", "السعر").map((item) => item.id), ["3", "4", "2", "5", "1"]);
  });

  test("sorts available units by ascending price and leaves other units in sheet order", () => {
    const units = [unit("1", "مباع", "100"), unit("2", "متاح", "2,000"), unit("3", "متاح", "1,000"), unit("4", "محجوز", "50")];
    assert.deepEqual(sortUnits(units, "price-asc", "المساحة", "السعر").map((item) => item.id), ["3", "2", "1", "4"]);
  });
});
