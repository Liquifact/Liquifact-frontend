/**
 * Tests for lib/stats.js — pure per-currency stats (issue #1397).
 * Run with: npm test (node --test, plain ESM, relative imports only).
 */

import test from "node:test";
import assert from "node:assert/strict";

import { computeStats, primaryCurrency } from "../lib/stats.js";
import { DEMO_INVOICES } from "../lib/demo.js";

// Seed data: 100 XLM + (25,000 + 42,000 + 12,500) USDC.
// The old home page summed these to a meaningless "79,600".

test("seed data: per-currency face values, never summed across currencies", () => {
  const stats = computeStats(DEMO_INVOICES);

  assert.equal(stats.count, 4);
  assert.equal(stats.open, 2); // INV_0001, INV_0002

  assert.deepEqual(Object.keys(stats.byCurrency).sort(), ["USDC", "XLM"]);
  assert.equal(stats.byCurrency.USDC.faceValue, 79500);
  assert.equal(stats.byCurrency.XLM.faceValue, 100);

  // Funded totals per currency: USDC 18,000+42,000+12,500; XLM 0.
  assert.equal(stats.byCurrency.USDC.funded, 72500);
  assert.equal(stats.byCurrency.XLM.funded, 0);
});

test("seed data: weighted yield per currency", () => {
  const stats = computeStats(DEMO_INVOICES);

  // USDC: (25000*650 + 42000*720 + 12500*900) / 79500 = 726.29 bps (approx)
  const usdc = stats.byCurrency.USDC.weightedYieldBps;
  assert.ok(Math.abs(usdc - 726.29) < 0.1, `expected ~726.29, got ${usdc}`);

  // XLM has a single invoice, so weighted == its yield.
  assert.equal(stats.byCurrency.XLM.weightedYieldBps, 800);

  // Unweighted mean of all four yields: (800+650+720+900)/4 = 767.5
  assert.equal(stats.simpleAvgYieldBps, 767.5);
});

test("empty list returns zeros and no currencies", () => {
  const stats = computeStats([]);
  assert.equal(stats.count, 0);
  assert.equal(stats.open, 0);
  assert.deepEqual(stats.byCurrency, {});
  assert.equal(stats.simpleAvgYieldBps, 0);
  assert.equal(primaryCurrency(stats.byCurrency), null);
});

test("single currency: face value, funded and weighted yield", () => {
  const stats = computeStats([
    { amount: 1000, fundedAmount: 400, currency: "EUR", yieldBps: 500, status: "open" },
    { amount: 3000, fundedAmount: 600, currency: "EUR", yieldBps: 100, status: "funded" },
  ]);

  assert.equal(stats.count, 2);
  assert.equal(stats.open, 1);
  assert.equal(Object.keys(stats.byCurrency).length, 1);
  assert.equal(stats.byCurrency.EUR.faceValue, 4000);
  assert.equal(stats.byCurrency.EUR.funded, 1000);
  // (1000*500 + 3000*100) / 4000 = 200
  assert.equal(stats.byCurrency.EUR.weightedYieldBps, 200);
  // Unweighted: (500+100)/2 = 300
  assert.equal(stats.simpleAvgYieldBps, 300);
  assert.equal(primaryCurrency(stats.byCurrency), "EUR");
});

test("decimal-safe: minor-unit rounding does not drift", () => {
  const stats = computeStats(
    Array.from({ length: 3 }, () => ({ amount: 0.1, fundedAmount: 0, currency: "USDC", yieldBps: 0 }))
  );
  // 0.1 + 0.1 + 0.1 === 0.3 exactly; naive float sums give 0.30000000000000004.
  assert.equal(stats.byCurrency.USDC.faceValue, 0.3);
});

test("primaryCurrency picks the largest face value", () => {
  const stats = computeStats(DEMO_INVOICES);
  assert.equal(primaryCurrency(stats.byCurrency), "USDC"); // 79,500 > 100
});

test("malformed input (null items, missing fields) does not throw", () => {
  const stats = computeStats([null, undefined, { currency: "XLM" }, { amount: "50", currency: "usdc" }]);
  assert.equal(stats.count, 2); // null/undefined are skipped
  assert.equal(stats.open, 0);
  assert.equal(stats.byCurrency.XLM.faceValue, 0);
  assert.equal(stats.byCurrency.USDC.faceValue, 50);
});
