import test from "node:test";
import assert from "node:assert/strict";

import {
  computeReturn,
  formatAnnualisedRate,
  parseUnitsToStroops,
  stroopsToNumber,
  termDays,
} from "../lib/investment.js";

test("parseUnitsToStroops handles decimals and rejects invalid input", () => {
  assert.equal(parseUnitsToStroops("100"), 1_000_000_000n);
  assert.equal(parseUnitsToStroops("100.5"), 1_005_000_000n);
  assert.equal(parseUnitsToStroops("0.0000001"), 1n);
  assert.equal(parseUnitsToStroops(""), null);
  assert.equal(parseUnitsToStroops("."), null);
  assert.equal(parseUnitsToStroops("-5"), null);
  assert.equal(parseUnitsToStroops("abc"), null);
  assert.equal(stroopsToNumber(1_000_000_000n), 100);
});

test("termDays rounds up and clamps past dates to zero", () => {
  assert.equal(termDays("2026-01-02T00:00:00Z", new Date("2026-01-01T00:00:00Z")), 1);
  assert.equal(termDays("2026-01-01T12:00:00Z", new Date("2026-01-01T00:00:00Z")), 1);
  assert.equal(termDays("2025-12-31T00:00:00Z", new Date("2026-01-01T00:00:00Z")), 0);
});

test("a 8% coupon on a 60-day invoice is a flat coupon, not an annual rate", () => {
  const result = computeReturn({
    fundedStroops: parseUnitsToStroops("1000"),
    yieldBps: 800,
    dueDate: "2026-03-01T00:00:00Z",
    now: new Date("2026-01-01T00:00:00Z"),
  });

  assert.equal(result.termDays, 59);
  assert.equal(result.couponStroops, parseUnitsToStroops("80"));
  assert.equal(result.payoutStroops, parseUnitsToStroops("1080"));
  assert.equal(result.annualisedBps, 4949n);
  assert.equal(formatAnnualisedRate(result.annualisedBps), "49.49%");
});

test("the same 8% coupon over a full year is 8% annualised", () => {
  const result = computeReturn({
    fundedStroops: parseUnitsToStroops("1000"),
    yieldBps: 800,
    dueDate: "2027-01-01T00:00:00Z",
    now: new Date("2026-01-01T00:00:00Z"),
  });

  assert.equal(result.termDays, 365);
  assert.equal(result.couponStroops, parseUnitsToStroops("80"));
  assert.equal(result.annualisedBps, 800n);
});

test("the coupon floors like the contract", () => {
  const result = computeReturn({
    fundedStroops: 1n,
    yieldBps: 1,
    dueDate: "2026-01-02T00:00:00Z",
    now: new Date("2026-01-01T00:00:00Z"),
  });

  assert.equal(result.couponStroops, 0n);
  assert.equal(result.payoutStroops, 1n);
});

test("an invoice past its due date has no term and no annualised rate", () => {
  const result = computeReturn({
    fundedStroops: parseUnitsToStroops("100"),
    yieldBps: 500,
    dueDate: "2025-01-01T00:00:00Z",
    now: new Date("2026-01-01T00:00:00Z"),
  });

  assert.equal(result.termDays, 0);
  assert.equal(result.annualisedBps, 0n);
});

test("zero and malformed yields produce no profit", () => {
  const zero = computeReturn({
    fundedStroops: parseUnitsToStroops("100"),
    yieldBps: 0,
    dueDate: "2027-01-01T00:00:00Z",
    now: new Date("2026-01-01T00:00:00Z"),
  });
  assert.equal(zero.couponStroops, 0n);
});
