/**
 * tests/yield.test.mjs
 *
 * Unit tests for lib/yield.js using node:test (no JSX, no DOM).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as money from "../lib/money.js";
import { annualizedRate, daysToDue, expectedPayout } from "../lib/yield.js";

const DAY_MS = 86400000;

describe("expectedPayout", () => {
  test("adds simple yield to the principal", () => {
    const payout = expectedPayout({ amount: "1000", yieldBps: 800, currency: "USDC" });
    assert.equal(payout, money.parse("1080", "USDC"));
  });

  test("a zero yield returns the principal unchanged", () => {
    assert.equal(
      expectedPayout({ amount: "42.5", yieldBps: 0, currency: "XLM" }),
      money.parse("42.5", "XLM"),
    );
  });

  test("rounds interest half-up at the currency's smallest unit", () => {
    // 1 stroop * 5000 bps = 0.5 stroops -> rounds up to 1 stroop.
    assert.equal(expectedPayout({ amount: "0.0000001", yieldBps: 5000, currency: "XLM" }), 2n);
    // 1 stroop * 4999 bps = 0.4999 stroops -> rounds down to 0.
    assert.equal(expectedPayout({ amount: "0.0000001", yieldBps: 4999, currency: "XLM" }), 1n);
  });

  test("keeps 7-decimal amounts exact", () => {
    const payout = expectedPayout({ amount: "1234.5678901", yieldBps: 1234, currency: "USDC" });
    assert.equal(payout, 13869135677n);
    assert.equal(money.format(payout, "USDC", { maxFractionDigits: 7 }), "1,386.9135677 USDC");
  });

  test("accepts numeric amounts the way the invoice API returns them", () => {
    assert.equal(
      expectedPayout({ amount: 100, yieldBps: 800, currency: "USDC" }),
      money.parse("108", "USDC"),
    );
  });

  test("a zero amount pays out zero", () => {
    assert.equal(expectedPayout({ amount: "0", yieldBps: 800, currency: "USDC" }), 0n);
  });

  test("rejects malformed or negative amounts and unsupported currencies", () => {
    for (const amount of ["", "-1", "abc", "1.00000001", NaN]) {
      assert.throws(() => expectedPayout({ amount, yieldBps: 800, currency: "USDC" }));
    }
    assert.throws(() => expectedPayout({ amount: "10", yieldBps: 800, currency: "USD" }), RangeError);
  });

  test("rejects invalid basis points", () => {
    for (const yieldBps of [-1, 800.5, NaN, Infinity, "abc"]) {
      assert.throws(() => expectedPayout({ amount: "10", yieldBps, currency: "USDC" }), RangeError);
    }
  });
});

describe("daysToDue", () => {
  const now = Date.UTC(2026, 11, 22); // 2026-12-22T00:00:00Z

  test("counts whole UTC calendar days", () => {
    assert.equal(daysToDue("2027-01-03", now), 12);
    assert.equal(daysToDue("2026-12-23", now), 1);
  });

  test("ignores the time of day", () => {
    assert.equal(daysToDue("2026-12-23", Date.UTC(2026, 11, 22, 23, 59)), 1);
  });

  test("returns 0 for a date due today", () => {
    assert.equal(daysToDue("2026-12-22", now), 0);
  });

  test("returns 0 for past-due dates", () => {
    assert.equal(daysToDue("2026-12-21", now), 0);
    assert.equal(daysToDue("2020-01-01", now), 0);
  });

  test("returns 0 for invalid dates instead of NaN", () => {
    for (const dueDate of ["not-a-date", "2026-13-45", "", null, undefined]) {
      assert.equal(daysToDue(dueDate, now), 0);
    }
  });

  test("returns 0 when the clock is not finite", () => {
    assert.equal(daysToDue("2027-01-03", NaN), 0);
  });
});

describe("annualizedRate", () => {
  test("uses simple interest ACT/365", () => {
    assert.equal(annualizedRate({ yieldBps: 800, days: 73 }), 40);
    assert.equal(annualizedRate({ yieldBps: 500, days: 365 }), 5);
    assert.ok(Math.abs(annualizedRate({ yieldBps: 800, days: 90 }) - 32.44444444444444) < 1e-9);
  });

  test("returns null for zero, negative and non-finite days", () => {
    for (const days of [0, -1, NaN, Infinity, -Infinity, "abc"]) {
      assert.equal(annualizedRate({ yieldBps: 800, days }), null);
    }
  });

  test("returns null for an invalid yield", () => {
    for (const yieldBps of [-1, NaN, Infinity, "abc", undefined]) {
      assert.equal(annualizedRate({ yieldBps, days: 90 }), null);
    }
  });

  test("a zero yield is a valid 0% rate", () => {
    assert.equal(annualizedRate({ yieldBps: 0, days: 90 }), 0);
  });
});

describe("worked example (matches docs/invoice-data.md)", () => {
  test("1,000 USDC at 800 bps with 73 days left", () => {
    const days = 73;
    const payout = expectedPayout({ amount: "1000", yieldBps: 800, currency: "USDC" });
    const profit = money.sub(payout, money.parse("1000", "USDC"));

    assert.equal(money.format(payout, "USDC", { maxFractionDigits: 7 }), "1,080 USDC");
    assert.equal(money.format(profit, "USDC", { maxFractionDigits: 7 }), "80 USDC");
    assert.equal(annualizedRate({ yieldBps: 800, days }), 40);
  });

  test("past-due invoices have a payout but no annualized rate", () => {
    const now = Date.UTC(2026, 11, 22);
    const dueDate = new Date(now - 5 * DAY_MS).toISOString().slice(0, 10);
    const days = daysToDue(dueDate, now);

    assert.equal(days, 0);
    assert.equal(annualizedRate({ yieldBps: 800, days }), null);
    assert.equal(
      expectedPayout({ amount: "1000", yieldBps: 800, currency: "USDC" }),
      money.parse("1080", "USDC"),
    );
  });
});
