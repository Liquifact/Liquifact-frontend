/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 *
 * @file app/invest/lib.validation.test.js
 *
 * Validation-boundary tests for app/invest/lib.js (ISSUE-3).
 *
 * Covers accepted input, rejected input, duplicate submissions, and boundary
 * values for every exported function:
 *
 *   isValidDateStr    — format, roll-over, boundary, non-string inputs
 *   loadMockInvoices  — options coercion, signal type guard
 *   daysUntilMaturity — valid/invalid dateStr, valid/invalid now, boundaries
 *   getInvoiceById    — string/non-string id, empty string, duplicate calls
 */

import {
  loadMockInvoices,
  daysUntilMaturity,
  getInvoiceById,
  isValidDateStr,
  MOCK_INVOICES,
} from "./lib";

beforeEach(() => {
  jest.useFakeTimers();
  delete window.__TEST_MOCK_INVOICES__;
});

afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

// ── isValidDateStr ────────────────────────────────────────────────────────────

describe("isValidDateStr — accepted inputs", () => {
  it.each([
    "2026-06-15",
    "2025-01-01",
    "2000-02-29", // leap year
    "1999-12-31",
    "2026-09-30",
  ])('accepts valid date string "%s"', (str) => {
    expect(isValidDateStr(str)).toBe(true);
  });
});

describe("isValidDateStr — rejected inputs", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["number 0", 0],
    ["empty string", ""],
    ["wrong format YYYY/MM/DD", "2026/06/15"],
    ["ISO datetime", "2026-06-15T00:00:00Z"],
    ["partial date", "2026-06"],
    ["non-existent month 13", "2026-13-01"],
    ["non-existent day 32", "2026-01-32"],
    ["roll-over day 99", "2026-09-99"],
    ["invalid Feb 30", "2025-02-30"],
    ["plain object", {}],
    ["array", []],
  ])('rejects invalid input: %s', (_label, val) => {
    expect(isValidDateStr(val)).toBe(false);
  });
});

// ── loadMockInvoices — options validation ─────────────────────────────────────

describe("loadMockInvoices — options boundary validation", () => {
  it("accepts no arguments (options defaults to {})", async () => {
    const p = loadMockInvoices();
    jest.runAllTimers();
    await expect(p).resolves.toHaveLength(MOCK_INVOICES.length);
  });

  it("accepts a plain empty object", async () => {
    const p = loadMockInvoices({});
    jest.runAllTimers();
    await expect(p).resolves.toHaveLength(MOCK_INVOICES.length);
  });

  it("treats a null options argument as {} (no throw)", async () => {
    const p = loadMockInvoices(null);
    jest.runAllTimers();
    await expect(p).resolves.toHaveLength(MOCK_INVOICES.length);
  });

  it("treats a string options argument as {} (no throw)", async () => {
    const p = loadMockInvoices("bad");
    jest.runAllTimers();
    await expect(p).resolves.toHaveLength(MOCK_INVOICES.length);
  });

  it("treats an array options argument as {} (no throw)", async () => {
    const p = loadMockInvoices([]);
    jest.runAllTimers();
    await expect(p).resolves.toHaveLength(MOCK_INVOICES.length);
  });

  it("treats a number options argument as {} (no throw)", async () => {
    const p = loadMockInvoices(42);
    jest.runAllTimers();
    await expect(p).resolves.toHaveLength(MOCK_INVOICES.length);
  });

  it("ignores a non-AbortSignal truthy signal value", async () => {
    // A plain object is not an AbortSignal — should be ignored, not throw.
    const p = loadMockInvoices({ signal: { aborted: false } });
    jest.runAllTimers();
    await expect(p).resolves.toHaveLength(MOCK_INVOICES.length);
  });

  it("ignores a string signal value", async () => {
    const p = loadMockInvoices({ signal: "abort" });
    jest.runAllTimers();
    await expect(p).resolves.toHaveLength(MOCK_INVOICES.length);
  });

  it("accepts a genuine pre-aborted AbortSignal and rejects", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      loadMockInvoices({ signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

// ── daysUntilMaturity — valid input ───────────────────────────────────────────

describe("daysUntilMaturity — valid inputs", () => {
  it("returns 0 for today", () => {
    const now = new Date("2025-06-15T12:00:00Z");
    expect(daysUntilMaturity("2025-06-15", now)).toBe(0);
  });

  it("returns positive for a future date", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    expect(daysUntilMaturity("2025-01-11", now)).toBe(10);
  });

  it("returns negative for a past date", () => {
    const now = new Date("2025-01-11T00:00:00Z");
    expect(daysUntilMaturity("2025-01-01", now)).toBe(-10);
  });

  it("is time-of-day insensitive (midnight UTC boundary)", () => {
    const now = new Date("2025-06-15T23:59:59Z");
    expect(daysUntilMaturity("2025-06-15", now)).toBe(0);
  });

  it("handles boundary: exactly 1 day ahead", () => {
    const now = new Date("2025-03-01T00:00:00Z");
    expect(daysUntilMaturity("2025-03-02", now)).toBe(1);
  });

  it("handles boundary: exactly 1 day behind", () => {
    const now = new Date("2025-03-02T00:00:00Z");
    expect(daysUntilMaturity("2025-03-01", now)).toBe(-1);
  });

  it("uses new Date() as default when now is omitted", () => {
    // Just check it doesn't throw and returns a number.
    const result = daysUntilMaturity("2026-12-31");
    expect(typeof result === "number" || Number.isNaN(result)).toBe(true);
  });
});

// ── daysUntilMaturity — invalid / boundary dateStr ───────────────────────────

describe("daysUntilMaturity — invalid dateStr returns NaN", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["plain number", 20260615],
    ["wrong format YYYY/MM/DD", "2026/06/15"],
    ["ISO datetime string", "2026-06-15T00:00:00Z"],
    ["month 13 (out-of-range)", "2026-13-01"],
    ["day 99 (roll-over)", "2026-09-99"],
    ["Feb 30 non-leap", "2025-02-30"],
    ["partial date", "2026-06"],
    ["plain object", {}],
    ["boolean true", true],
  ])('returns NaN for invalid dateStr: %s', (_label, val) => {
    const now = new Date("2025-01-01T00:00:00Z");
    expect(Number.isNaN(daysUntilMaturity(val, now))).toBe(true);
  });
});

// ── daysUntilMaturity — invalid now ──────────────────────────────────────────

describe("daysUntilMaturity — invalid `now` returns NaN", () => {
  it("returns NaN when now is a string", () => {
    expect(Number.isNaN(daysUntilMaturity("2026-06-15", "2025-01-01"))).toBe(true);
  });

  it("returns NaN when now is null", () => {
    expect(Number.isNaN(daysUntilMaturity("2026-06-15", null))).toBe(true);
  });

  it("returns NaN when now is an invalid Date", () => {
    expect(Number.isNaN(daysUntilMaturity("2026-06-15", new Date("invalid")))).toBe(true);
  });

  it("returns NaN when now is a plain number", () => {
    expect(Number.isNaN(daysUntilMaturity("2026-06-15", 1234567890))).toBe(true);
  });
});

// ── getInvoiceById — accepted inputs ─────────────────────────────────────────

describe("getInvoiceById — accepted inputs", () => {
  it("returns the matching invoice for a known id", () => {
    const inv = getInvoiceById("inv-001");
    expect(inv).toBeDefined();
    expect(inv.issuer).toBe("Acme Supplies Ltd");
  });

  it("returns the correct object for every fixture id", () => {
    for (const inv of MOCK_INVOICES) {
      expect(getInvoiceById(inv.id)).toBe(inv);
    }
  });

  it("is idempotent — duplicate calls with the same id return the same reference", () => {
    const a = getInvoiceById("inv-002");
    const b = getInvoiceById("inv-002");
    expect(a).toBe(b);
  });
});

// ── getInvoiceById — rejected / boundary inputs ───────────────────────────────

describe("getInvoiceById — invalid inputs return undefined (no throw)", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["number", 1],
    ["boolean true", true],
    ["boolean false", false],
    ["plain object", {}],
    ["array", []],
    ["unknown string id", "inv-999"],
  ])('returns undefined for input: %s', (_label, val) => {
    expect(getInvoiceById(val)).toBeUndefined();
  });

  it("does not mutate MOCK_INVOICES on any call", () => {
    const before = MOCK_INVOICES.length;
    getInvoiceById("inv-001");
    getInvoiceById("inv-999");
    getInvoiceById(null);
    expect(MOCK_INVOICES.length).toBe(before);
  });
});
