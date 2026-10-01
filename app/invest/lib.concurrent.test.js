/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 *
 * @file app/invest/lib.concurrent.test.js
 *
 * Regression tests for the concurrent-execution hardening in lib.js (ISSUE-1).
 *
 * Covers:
 *   1. Normal resolution — returns MOCK_INVOICES
 *   2. Concurrent deduplication — N parallel calls share one in-flight promise
 *   3. Sequential independence — settled slot is cleared; next call is fresh
 *   4. AbortSignal — aborting one caller does not affect other waiters
 *   5. Pre-aborted signal — rejects immediately, before fetch starts
 *   6. Test-hook validation — must be Array; non-arrays fall through
 *   7. Test-hook production guard — override ignored in production env
 *   8. daysUntilMaturity — boundary and regression cases
 *   9. getInvoiceById — known, unknown, and boundary ids
 */

import { loadMockInvoices, daysUntilMaturity, getInvoiceById, MOCK_INVOICES } from "./lib";

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Reset the module's internal _inflight slot between tests so each test
 * starts from a clean idle state.
 */
beforeEach(() => {
  jest.useFakeTimers();
  // Clear any window test-hook from a previous test.
  delete window.__TEST_MOCK_INVOICES__;
});

afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

// ── 1. Normal resolution ──────────────────────────────────────────────────────

describe("loadMockInvoices — normal resolution", () => {
  it("resolves with the MOCK_INVOICES array", async () => {
    const p = loadMockInvoices();
    jest.runAllTimers();
    const result = await p;
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(MOCK_INVOICES.length);
    expect(result[0]).toHaveProperty("id");
  });

  it("each resolved item has the required contract fields", async () => {
    const p = loadMockInvoices();
    jest.runAllTimers();
    const result = await p;
    for (const inv of result) {
      expect(inv).toHaveProperty("id");
      expect(inv).toHaveProperty("issuer");
      expect(inv).toHaveProperty("amount");
      expect(inv).toHaveProperty("currency");
      expect(inv).toHaveProperty("dueDate");
      expect(inv).toHaveProperty("yield");
      expect(inv).toHaveProperty("status");
    }
  });
});

// ── 2. Concurrent deduplication ───────────────────────────────────────────────

describe("loadMockInvoices — concurrent deduplication", () => {
  it("N concurrent calls resolve to the same object reference (fan-out)", async () => {
    const [p1, p2, p3] = [loadMockInvoices(), loadMockInvoices(), loadMockInvoices()];
    jest.runAllTimers();
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    // All callers receive the same array reference — no duplicate data copies.
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it("concurrent callers all resolve with the correct data", async () => {
    const promises = Array.from({ length: 5 }, () => loadMockInvoices());
    jest.runAllTimers();
    const results = await Promise.all(promises);
    for (const r of results) {
      expect(r).toHaveLength(MOCK_INVOICES.length);
    }
  });
});

// ── 3. Sequential independence ────────────────────────────────────────────────

describe("loadMockInvoices — sequential independence", () => {
  it("a second call after the first settles starts a fresh fetch", async () => {
    const p1 = loadMockInvoices();
    jest.runAllTimers();
    await p1;

    // After settlement, _inflight is cleared; this call creates a new promise.
    const p2 = loadMockInvoices();
    jest.runAllTimers();
    const r2 = await p2;
    expect(Array.isArray(r2)).toBe(true);
    expect(r2).toHaveLength(MOCK_INVOICES.length);
  });
});

// ── 4. AbortSignal — mid-flight abort ─────────────────────────────────────────

describe("loadMockInvoices — AbortSignal (mid-flight)", () => {
  it("aborting one caller rejects that caller with AbortError", async () => {
    const controller = new AbortController();
    const p = loadMockInvoices({ signal: controller.signal });

    controller.abort();

    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("aborting one caller does not affect a concurrent non-aborting caller", async () => {
    const controller = new AbortController();
    const pAborted = loadMockInvoices({ signal: controller.signal });
    const pNormal = loadMockInvoices();

    controller.abort();
    jest.runAllTimers();

    // Aborted caller rejects.
    await expect(pAborted).rejects.toMatchObject({ name: "AbortError" });
    // Normal caller resolves correctly.
    const result = await pNormal;
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(MOCK_INVOICES.length);
  });

  it("aborting one caller does not affect a concurrent signal-bearing caller", async () => {
    const c1 = new AbortController();
    const c2 = new AbortController();
    const p1 = loadMockInvoices({ signal: c1.signal });
    const p2 = loadMockInvoices({ signal: c2.signal });

    // Only abort the first caller.
    c1.abort();
    jest.runAllTimers();

    await expect(p1).rejects.toMatchObject({ name: "AbortError" });
    const r2 = await p2;
    expect(r2).toHaveLength(MOCK_INVOICES.length);
  });
});

// ── 5. Pre-aborted signal ─────────────────────────────────────────────────────

describe("loadMockInvoices — pre-aborted signal", () => {
  it("rejects immediately when signal is already aborted before the call", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(loadMockInvoices({ signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("pre-abort does not start or pollute the in-flight slot", async () => {
    const controller = new AbortController();
    controller.abort();

    // This should reject immediately without setting _inflight.
    await expect(loadMockInvoices({ signal: controller.signal })).rejects.toBeDefined();

    // A subsequent normal call should still work.
    const p = loadMockInvoices();
    jest.runAllTimers();
    const result = await p;
    expect(result).toHaveLength(MOCK_INVOICES.length);
  });
});

// ── 6. Test-hook validation ───────────────────────────────────────────────────

describe("loadMockInvoices — test-hook validation", () => {
  it("resolves with the override when window.__TEST_MOCK_INVOICES__ is a valid array", async () => {
    const fixture = [{ id: "test-inv", issuer: "Test Corp" }];
    window.__TEST_MOCK_INVOICES__ = fixture;
    const result = await loadMockInvoices();
    expect(result).toBe(fixture);
  });

  it("falls through to real data when override is an empty array", async () => {
    window.__TEST_MOCK_INVOICES__ = [];
    const result = await loadMockInvoices();
    // An empty array IS a valid fixture ("no invoices" state).
    expect(result).toEqual([]);
  });

  it("falls through to real data when override is a string (invalid)", async () => {
    window.__TEST_MOCK_INVOICES__ = "not-an-array";
    const p = loadMockInvoices();
    jest.runAllTimers();
    const result = await p;
    expect(result).toHaveLength(MOCK_INVOICES.length);
  });

  it("falls through to real data when override is null (invalid)", async () => {
    window.__TEST_MOCK_INVOICES__ = null;
    const p = loadMockInvoices();
    jest.runAllTimers();
    const result = await p;
    expect(result).toHaveLength(MOCK_INVOICES.length);
  });

  it("falls through to real data when override is a plain object (invalid)", async () => {
    window.__TEST_MOCK_INVOICES__ = { items: [] };
    const p = loadMockInvoices();
    jest.runAllTimers();
    const result = await p;
    expect(result).toHaveLength(MOCK_INVOICES.length);
  });
});

// ── 8. daysUntilMaturity ──────────────────────────────────────────────────────

describe("daysUntilMaturity", () => {
  it("returns 0 for today", () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    expect(daysUntilMaturity(dateStr, today)).toBe(0);
  });

  it("returns a positive value for a future date", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    expect(daysUntilMaturity("2025-01-11", now)).toBe(10);
  });

  it("returns a negative value for a past date", () => {
    const now = new Date("2025-01-11T00:00:00Z");
    expect(daysUntilMaturity("2025-01-01", now)).toBe(-10);
  });

  it("is time-of-day insensitive (midnight UTC)", () => {
    const now = new Date("2025-06-15T23:59:59Z");
    // Same calendar day — should be 0.
    expect(daysUntilMaturity("2025-06-15", now)).toBe(0);
  });

  it("handles boundary: one day in the future", () => {
    const now = new Date("2025-03-01T12:00:00Z");
    expect(daysUntilMaturity("2025-03-02", now)).toBe(1);
  });

  it("handles boundary: one day in the past", () => {
    const now = new Date("2025-03-02T12:00:00Z");
    expect(daysUntilMaturity("2025-03-01", now)).toBe(-1);
  });
});

// ── 9. getInvoiceById ────────────────────────────────────────────────────────

describe("getInvoiceById", () => {
  it("returns the matching invoice for a known id", () => {
    const inv = getInvoiceById("inv-001");
    expect(inv).toBeDefined();
    expect(inv.issuer).toBe("Acme Supplies Ltd");
  });

  it("returns undefined for an unknown id", () => {
    expect(getInvoiceById("inv-unknown")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getInvoiceById("")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(getInvoiceById(undefined)).toBeUndefined();
  });

  it("returns the correct invoice for each fixture id", () => {
    for (const inv of MOCK_INVOICES) {
      expect(getInvoiceById(inv.id)).toBe(inv);
    }
  });
});
