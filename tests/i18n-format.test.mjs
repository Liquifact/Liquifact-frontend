import { test } from "node:test";
import assert from "node:assert/strict";
import { bpsToPercent, formatAmount, formatDate } from "../lib/format.js";

test("locale-aware formatting for es", () => {
  assert.equal(formatAmount(25000, "USDC", "es-ES"), "25.000 USDC");
  assert.equal(formatDate("2026-12-30", "es"), "30 dic 2026");
  assert.equal(bpsToPercent(800, "es").replace(/\s/g, " "), "8,00 %");
});

test("formatters default to en-US so existing output is unchanged", () => {
  assert.equal(formatAmount(25000, "USDC"), "25,000 USDC");
  assert.equal(formatAmount(25000, "USDC", "en"), "25,000 USDC");
  assert.equal(bpsToPercent(800), "8.00%");
  assert.equal(formatDate("2026-12-30"), "Dec 30, 2026");
  assert.equal(formatDate("not-a-date"), "not-a-date");
});
