import assert from "node:assert";
import { test } from "node:test";
import { getColorByOrder } from "./color.util.js";
import {
  getISOWeekDetails,
  getTodayGMT7,
  isWeekendGMT7,
  isPastOrTodayGMT7,
  isValidDDMMYYYY,
  toDDMMYYYYFormat,
  toISOFormat,
} from "./date.util.js";

test("color.util - order 1 to 5 mapping and default fallback", () => {
  assert.strictEqual(getColorByOrder(1).name, "Blue");
  assert.strictEqual(getColorByOrder(1).hex, "#3B82F6");

  assert.strictEqual(getColorByOrder(2).name, "Yellow");
  assert.strictEqual(getColorByOrder(2).hex, "#EAB308");

  assert.strictEqual(getColorByOrder(3).name, "Green");
  assert.strictEqual(getColorByOrder(3).hex, "#22C55E");

  assert.strictEqual(getColorByOrder(4).name, "Purple");
  assert.strictEqual(getColorByOrder(4).hex, "#A855F7");

  assert.strictEqual(getColorByOrder(5).name, "Orange");
  assert.strictEqual(getColorByOrder(5).hex, "#F97316");

  assert.strictEqual(getColorByOrder(6).name, "Gray");
  assert.strictEqual(getColorByOrder(6).hex, "#6B7280");
});

test("date.util - DD-MM-YYYY format conversions and validations", () => {
  assert.strictEqual(toISOFormat("03-08-2026"), "2026-08-03");
  assert.strictEqual(toDDMMYYYYFormat("2026-08-03"), "03-08-2026");

  assert.strictEqual(isValidDDMMYYYY("03-08-2026"), true);
  assert.strictEqual(isValidDDMMYYYY("31-02-2026"), false);
  assert.strictEqual(isValidDDMMYYYY("invalid"), false);
});

test("date.util - weekend check", () => {
  // 01-08-2026 is Saturday
  assert.strictEqual(isWeekendGMT7("01-08-2026"), true);
  // 02-08-2026 is Sunday
  assert.strictEqual(isWeekendGMT7("02-08-2026"), true);
  // 03-08-2026 is Monday
  assert.strictEqual(isWeekendGMT7("03-08-2026"), false);
});

test("date.util - ISO week calculation", () => {
  const weekInfo = getISOWeekDetails("03-08-2026");
  assert.strictEqual(weekInfo.year, 2026);
  assert.strictEqual(weekInfo.weekNumber, 32);
});

test("date.util - isPastOrTodayGMT7 check", () => {
  const today = getTodayGMT7();
  assert.strictEqual(isPastOrTodayGMT7(today), true);

  // 01-01-2020 is in the past
  assert.strictEqual(isPastOrTodayGMT7("01-01-2020"), true);
  // 31-12-2099 is in the future
  assert.strictEqual(isPastOrTodayGMT7("31-12-2099"), false);
});
