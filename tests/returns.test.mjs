import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMinor, parseAmount, projectReturn } from "../lib/returns.js";

const NOW = Date.parse("2026-10-19T00:00:00Z");
const DUE = "2027-01-01T00:00:00Z";

test("parses decimal strings into minor units", () => {
  assert.equal(parseAmount("2"), 20_000_000n);
  assert.equal(parseAmount(" 1.50 "), 15_000_000n);
  assert.equal(parseAmount("0.0000001"), 1n);
});

test("rejects invalid amounts", () => {
  assert.throws(() => parseAmount("0.00000001"), /7 decimal/);
  assert.throws(() => parseAmount("1e5"), /decimal/);
  assert.throws(() => parseAmount("1,5"), /decimal/);
  assert.throws(() => parseAmount(2), /string/);
});

test("formats minor units without trailing zeros", () => {
  assert.equal(formatMinor(21_600_000n), "2.16");
  assert.equal(formatMinor(26n), "0.0000026");
  assert.equal(formatMinor(0n), "0");
});

test("projects a flat coupon for the invoice term", () => {
  const result = projectReturn({
    principal: "2",
    yieldBps: 800,
    dueDate: DUE,
    nowMs: NOW,
  });

  assert.deepEqual(result, {
    coupon: "0.16",
    payout: "2.16",
    termDays: 74,
    annualisedPct: "39.46",
  });
});

test("floors the coupon like the escrow contract", () => {
  const result = projectReturn({
    principal: "0.0000333",
    yieldBps: 800,
    dueDate: DUE,
    nowMs: NOW,
  });

  assert.equal(result.coupon, "0.0000026");
  assert.equal(result.payout, "0.0000359");
});

test("rounds term days up around UTC midnight", () => {
  const exact = projectReturn({
    principal: "1",
    yieldBps: 800,
    dueDate: "2026-01-02T00:00:00Z",
    nowMs: Date.parse("2026-01-01T00:00:00Z"),
  });
  const justOver = projectReturn({
    principal: "1",
    yieldBps: 800,
    dueDate: "2026-01-02T00:00:01Z",
    nowMs: Date.parse("2026-01-01T00:00:00Z"),
  });

  assert.equal(exact.termDays, 1);
  assert.equal(justOver.termDays, 2);
});

test("reports overdue invoices", () => {
  const result = projectReturn({
    principal: "2",
    yieldBps: 800,
    dueDate: "2026-10-18T23:59:59Z",
    nowMs: NOW,
  });

  assert.deepEqual(result, { overdue: true });
});

test("handles a 10^12 principal without precision loss", () => {
  const result = projectReturn({
    principal: "1000000000000",
    yieldBps: 800,
    dueDate: DUE,
    nowMs: NOW,
  });

  assert.equal(result.coupon, "80000000000");
  assert.equal(result.payout, "1080000000000");
});

test("rejects invalid yield and due date", () => {
  assert.throws(
    () => projectReturn({ principal: "2", yieldBps: 10_001, dueDate: DUE, nowMs: NOW }),
    /Yield/,
  );
  assert.throws(
    () => projectReturn({ principal: "2", yieldBps: 800, dueDate: "not-a-date", nowMs: NOW }),
    /due date/,
  );
});
