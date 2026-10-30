import test from "node:test";
import assert from "node:assert/strict";
import { projectedCoupon, summarise } from "../lib/portfolio/summary.js";

test("summary keeps mixed currencies separate", () => {
  const result = summarise([
    { invoiceId: "A", amount: 100, currency: "USDC", yieldBps: 650, status: "funded", claimable: 1 },
    { invoiceId: "B", amount: 2, currency: "XLM", yieldBps: 800, status: "open", claimable: 2 },
  ], 0);
  assert.deepEqual(result.totalsByCurrency.map((row) => row.currency), ["USDC", "XLM"]);
  assert.equal(result.totalsByCurrency.find((row) => row.currency === "USDC").invested, 100);
  assert.equal(result.totalsByCurrency.find((row) => row.currency === "XLM").invested, 2);
  assert.deepEqual(result.claimableByCurrency, [{ currency: "USDC", amount: 1 }, { currency: "XLM", amount: 2 }]);
  assert.equal("claimableTotal" in result, false);
});

test("coupon floors to cents without overstating", () => {
  assert.equal(projectedCoupon(100.019, 100), 1);
});

test("weighted yield is weighted by invested amount", () => {
  const result = summarise([
    { amount: 100, currency: "USDC", yieldBps: 500 },
    { amount: 300, currency: "USDC", yieldBps: 700 },
  ], 0);
  assert.equal(result.totalsByCurrency[0].avgYieldBps, 650);
});

test("maturity window includes both boundaries and excludes dates outside", () => {
  const now = 1_000_000;
  const end = now + 30 * 24 * 60 * 60 * 1000;
  const result = summarise([
    { invoiceId: "start", amount: 1, dueAt: now },
    { invoiceId: "end", amount: 1, dueAt: end },
    { invoiceId: "past", amount: 1, dueAt: now - 1 },
    { invoiceId: "late", amount: 1, dueAt: end + 1 },
  ], now);
  assert.deepEqual(result.upcomingMaturities.map((row) => row.invoiceId), ["start", "end"]);
});

test("empty input returns empty totals", () => {
  assert.deepEqual(summarise([], 0).totalsByCurrency, []);
  assert.equal(summarise([], 0).count, 0);
});
