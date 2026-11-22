import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_COMPARE,
  buildComparison,
  parseCompareIds,
  serializeCompareIds,
} from "../lib/compare.js";

const NOW_MS = Date.parse("2026-06-01T00:00:00Z");

const SAMPLE_INVOICES = [
  {
    id: "INV-101",
    sme: "Alpha Logistics",
    debtor: "Global Retail",
    amount: 10000,
    fundedAmount: 4000,
    currency: "USDC",
    yieldBps: 850,
    dueDate: "2026-07-01T00:00:00Z", // 30 days
    createdAt: "2026-05-15T00:00:00Z",
    status: "open",
    onChain: true,
    smeAddress: "GALPHA123",
  },
  {
    id: "INV-102",
    sme: "Beta Foods",
    debtor: "Metro Mart",
    amount: 20000,
    fundedAmount: 5000,
    currency: "USDC",
    yieldBps: 650,
    dueDate: "2026-06-16T00:00:00Z", // 15 days
    createdAt: "2026-05-15T00:00:00Z",
    status: "open",
    onChain: false,
  },
  {
    id: "INV-103",
    sme: "Gamma Textiles",
    debtor: "Nordic Apparel",
    amount: 15000,
    fundedAmount: 15000,
    currency: "USDC",
    yieldBps: 720,
    dueDate: "2026-08-01T00:00:00Z", // 61 days
    createdAt: "2026-05-01T00:00:00Z",
    status: "funded",
    onChain: true,
    smeAddress: "GGAMMA456",
  },
];

describe("parseCompareIds", () => {
  it("parses comma-separated ids from URLSearchParams and caps at max=3", () => {
    const sp = new URLSearchParams("ids=INV-1,INV-2,INV-3,INV-4");
    assert.deepEqual(parseCompareIds(sp), ["INV-1", "INV-2", "INV-3"]);
  });

  it("deduplicates ids while preserving first-seen order", () => {
    const sp = new URLSearchParams("ids=INV-2,INV-1,INV-2,INV-3,INV-1");
    assert.deepEqual(parseCompareIds(sp), ["INV-2", "INV-1", "INV-3"]);
  });

  it("supports repeated ids query params and trims whitespace", () => {
    const sp = new URLSearchParams("ids= INV-1 &ids=INV-2, ,INV-3,INV-4");
    assert.deepEqual(parseCompareIds(sp), ["INV-1", "INV-2", "INV-3"]);
  });

  it("accepts plain objects, raw strings, and empty/null inputs", () => {
    assert.deepEqual(parseCompareIds({ ids: "INV-A,INV-B" }), ["INV-A", "INV-B"]);
    assert.deepEqual(parseCompareIds("?ids=INV-X,INV-Y"), ["INV-X", "INV-Y"]);
    assert.deepEqual(parseCompareIds("INV-Z"), ["INV-Z"]);
    assert.deepEqual(parseCompareIds(null), []);
    assert.deepEqual(parseCompareIds(undefined), []);
    assert.deepEqual(parseCompareIds({}), []);
  });

  it("respects custom max parameter", () => {
    assert.deepEqual(parseCompareIds({ ids: "A,B,C,D" }, 2), ["A", "B"]);
    assert.equal(MAX_COMPARE, 3);
  });

  it("serializes ids cleanly without duplicates or extras", () => {
    assert.equal(serializeCompareIds(["INV-1", "INV-2", "INV-1", "INV-3", "INV-4"]), "INV-1,INV-2,INV-3");
    assert.equal(serializeCompareIds([]), "");
  });
});

describe("buildComparison", () => {
  it("computes yield %, days to due, remaining capacity, and risk band with best-value flags", () => {
    const result = buildComparison(SAMPLE_INVOICES, NOW_MS);

    assert.equal(result.mixedCurrencies, false);
    assert.deepEqual(result.currencies, ["USDC"]);
    assert.equal(result.items.length, 3);

    // Check computed metrics
    assert.equal(result.items[0].yieldPct, 8.5);
    assert.equal(result.items[0].daysToDue, 30);
    assert.equal(result.items[0].remainingCapacity, 6000);
    assert.equal(result.items[1].daysToDue, 15);
    assert.equal(result.items[1].remainingCapacity, 15000);
    assert.equal(result.items[2].remainingCapacity, 0);

    const byKey = Object.fromEntries(result.rows.map((r) => [r.key, r]));

    // Yield: INV-101 (8.5%) is highest
    assert.deepEqual(
      byKey.yield.cells.map((c) => c.best),
      [true, false, false],
    );

    // Days to due: INV-102 (15 days) is shortest non-negative tenor
    assert.deepEqual(
      byKey.daysToDue.cells.map((c) => c.best),
      [false, true, false],
    );

    // Remaining capacity: INV-102 (15000) is highest
    assert.deepEqual(
      byKey.remainingCapacity.cells.map((c) => c.best),
      [false, true, false],
    );

    // Risk band: INV-103 (funded + onChain + SME + comfortable maturity) has lowest risk score
    const minRiskScore = Math.min(...result.items.map((i) => i.riskScore));
    assert.deepEqual(
      byKey.riskBand.cells.map((c) => c.best),
      result.items.map((i) => i.riskScore === minRiskScore),
    );
  });

  it("disables all best-value highlights across mixed currencies", () => {
    const mixed = [
      SAMPLE_INVOICES[0],
      { ...SAMPLE_INVOICES[1], currency: "EURC" },
    ];
    const result = buildComparison(mixed, NOW_MS);

    assert.equal(result.mixedCurrencies, true);
    assert.deepEqual(result.currencies, ["USDC", "EURC"]);

    for (const row of result.rows) {
      assert.ok(
        row.cells.every((c) => c.best === false),
        `Expected no best-value highlight on row "${row.key}" for mixed currencies`,
      );
    }
  });

  it("does not apply best-value highlights for a single invoice or empty list", () => {
    const single = buildComparison([SAMPLE_INVOICES[0]], NOW_MS);
    assert.equal(single.items.length, 1);
    for (const row of single.rows) {
      assert.deepEqual(row.cells.map((c) => c.best), [false]);
    }

    const empty = buildComparison([], NOW_MS);
    assert.equal(empty.items.length, 0);
    assert.equal(empty.mixedCurrencies, false);
  });

  it("does not mark overdue invoices as best tenor", () => {
    const overdueList = [
      { ...SAMPLE_INVOICES[0], dueDate: "2026-05-20T00:00:00Z" }, // -12 days (overdue)
      { ...SAMPLE_INVOICES[1], dueDate: "2026-06-20T00:00:00Z" }, // +19 days
      { ...SAMPLE_INVOICES[2], dueDate: "2026-07-10T00:00:00Z" }, // +39 days
    ];
    const result = buildComparison(overdueList, NOW_MS);
    const tenorRow = result.rows.find((r) => r.key === "daysToDue");

    assert.equal(result.items[0].daysToDue < 0, true);
    assert.deepEqual(
      tenorRow.cells.map((c) => c.best),
      [false, true, false],
    );
  });
});
