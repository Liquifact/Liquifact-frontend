import test from "node:test";
import assert from "node:assert/strict";
import { buildPortfolio, exitStatusFor, EXIT_STATUS } from "../lib/portfolio.js";
import { parse } from "../lib/money.js";

const invoices = [
  { id: "INV-1", status: "open", currency: "USDC", amount: 1000 },
  { id: "INV-2", status: "funded", currency: "USDC", amount: 500 },
  { id: "INV-3", status: "open", currency: "XLM", amount: 100 },
  { id: "INV-4", status: "cancelled", currency: "XLM", amount: 80 },
  { id: "INV-5", status: "settled", currency: "EURC", amount: 50 },
  { id: "INV-6", status: "open", currency: "USDC", amount: 10 },
];

test("hides zero-contribution and unread invoices", () => {
  const { rows, totals } = buildPortfolio({
    invoices,
    contributions: { "INV-1": parse("10", "USDC"), "INV-3": 0n, "INV-6": "0" },
  });
  assert.deepEqual(rows.map((r) => r.id), ["INV-1"]);
  assert.equal(totals.length, 1);
});

test("groups totals per currency with exact BigInt minor-unit sums", () => {
  const { rows, totals } = buildPortfolio({
    invoices,
    contributions: {
      "INV-1": parse("0.1", "USDC"),
      "INV-2": parse("0.2", "USDC"),
      "INV-3": parse("12.5", "XLM"),
      "INV-5": parse("7", "EURC"),
    },
  });

  assert.deepEqual(rows.map((r) => r.id), ["INV-1", "INV-2", "INV-3", "INV-5"]);
  assert.deepEqual(
    totals.map((t) => t.currency),
    ["EURC", "USDC", "XLM"]
  );
  const usdc = totals.find((t) => t.currency === "USDC");
  // 0.1 + 0.2 must be exactly 0.3 (no float drift)
  assert.equal(usdc.contributed, parse("0.3", "USDC"));
  assert.equal(typeof usdc.contributed, "bigint");
  assert.equal(usdc.count, 2);
  assert.equal(totals.find((t) => t.currency === "XLM").contributed, 125_000_000n);
});

test("refunded positions count toward contributed but not outstanding", () => {
  const { rows, totals } = buildPortfolio({
    invoices,
    contributions: { "INV-3": 10_000_000n, "INV-4": 20_000_000n },
    refunded: { "INV-4": true },
  });
  const cancelled = rows.find((r) => r.id === "INV-4");
  assert.equal(cancelled.refunded, true);
  assert.equal(cancelled.exitStatus, EXIT_STATUS.REFUNDED);
  const xlm = totals.find((t) => t.currency === "XLM");
  assert.equal(xlm.contributed, 30_000_000n);
  assert.equal(xlm.outstanding, 10_000_000n);
});

test("keeps per-row read errors visible but excludes them from totals", () => {
  const { rows, totals } = buildPortfolio({
    invoices,
    contributions: new Map([
      ["INV-1", new Error("rpc down")],
      ["INV-2", parse("5", "USDC")],
      ["INV-3", { error: "timeout" }],
    ]),
  });
  assert.deepEqual(rows.map((r) => [r.id, r.error]), [
    ["INV-1", true],
    ["INV-2", false],
    ["INV-3", true],
  ]);
  assert.equal(rows[0].contributed, null);
  assert.deepEqual(totals.map((t) => [t.currency, t.contributed]), [["USDC", 5_0000000n]]);
});

test("deduplicates invoices and tolerates empty or malformed input", () => {
  assert.deepEqual(buildPortfolio(), { rows: [], totals: [] });
  assert.deepEqual(buildPortfolio({ invoices: null, contributions: null }), { rows: [], totals: [] });
  const { rows } = buildPortfolio({
    invoices: [invoices[0], invoices[0], null, { status: "open" }],
    contributions: { "INV-1": 1n },
  });
  assert.equal(rows.length, 1);
});

test("defaults missing currency to XLM and flags unsupported currencies as errors", () => {
  const { rows, totals } = buildPortfolio({
    invoices: [
      { id: "A", status: "open" },
      { id: "B", status: "open", currency: "DOGE" },
    ],
    contributions: { A: 1n, B: 1n },
  });
  assert.equal(rows[0].currency, "XLM");
  assert.equal(rows[1].error, true);
  assert.deepEqual(totals.map((t) => t.currency), ["XLM"]);
});

test("exitStatusFor maps escrow status and refund flag", () => {
  assert.equal(exitStatusFor("open", false), EXIT_STATUS.ACTIVE);
  assert.equal(exitStatusFor("funded", false), EXIT_STATUS.ACTIVE);
  assert.equal(exitStatusFor("settled", false), EXIT_STATUS.SETTLED);
  assert.equal(exitStatusFor("withdrawn", false), EXIT_STATUS.SETTLED);
  assert.equal(exitStatusFor("cancelled", false), EXIT_STATUS.REFUNDABLE);
  assert.equal(exitStatusFor("cancelled", true), EXIT_STATUS.REFUNDED);
});
