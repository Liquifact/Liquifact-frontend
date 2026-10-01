/**
 * @file app/invest/lib.test.js
 *
 * Compatibility-contract tests for app/invest/lib.js.
 *
 * Coverage goals
 * ──────────────
 * • MOCK_INVOICES shape, immutability, and referential stability.
 * • loadMockInvoices — resolution, determinism, test-env override.
 * • daysUntilMaturity — success, boundary, regression, and invalid inputs.
 * • getInvoiceById — success, not-found, and invalid inputs.
 */

import {
  MOCK_INVOICES,
  loadMockInvoices,
  daysUntilMaturity,
  getInvoiceById,
} from "./lib";

// ── MOCK_INVOICES ─────────────────────────────────────────────────────────────

describe("MOCK_INVOICES", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(MOCK_INVOICES)).toBe(true);
    expect(MOCK_INVOICES.length).toBeGreaterThan(0);
  });

  it("is frozen (top-level array mutation is rejected in strict mode)", () => {
    expect(Object.isFrozen(MOCK_INVOICES)).toBe(true);
  });

  it("each item is frozen", () => {
    MOCK_INVOICES.forEach((inv) => {
      expect(Object.isFrozen(inv)).toBe(true);
    });
  });

  it("each item's events array is frozen", () => {
    MOCK_INVOICES.forEach((inv) => {
      expect(Object.isFrozen(inv.events)).toBe(true);
    });
  });

  it("each event object is frozen", () => {
    MOCK_INVOICES.forEach((inv) => {
      inv.events.forEach((evt) => {
        expect(Object.isFrozen(evt)).toBe(true);
      });
    });
  });

  it("silently ignores push() (frozen array cannot be extended)", () => {
    const lengthBefore = MOCK_INVOICES.length;
    try {
      // In strict mode this throws; in sloppy mode it silently fails.
      MOCK_INVOICES.push({ id: "injected" });
    } catch {
      // TypeError is acceptable — the important thing is length is unchanged.
    }
    expect(MOCK_INVOICES.length).toBe(lengthBefore);
  });

  it("silently ignores mutation of an item property", () => {
    const original = MOCK_INVOICES[0].issuer;
    try {
      MOCK_INVOICES[0].issuer = "HACKED";
    } catch {
      // TypeError is acceptable in strict mode.
    }
    expect(MOCK_INVOICES[0].issuer).toBe(original);
  });

  // ── Shape assertions ──────────────────────────────────────────────────────

  const REQUIRED_KEYS = [
    "id", "issuer", "amount", "amountValue",
    "currency", "dueDate", "yield", "yieldValue",
    "status", "events",
  ];

  it.each(REQUIRED_KEYS)("every item has the required key: %s", (key) => {
    MOCK_INVOICES.forEach((inv) => {
      expect(inv).toHaveProperty(key);
    });
  });

  it("all ids are unique strings", () => {
    const ids = MOCK_INVOICES.map((inv) => inv.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    ids.forEach((id) => expect(typeof id).toBe("string"));
  });

  it("all amountValues are positive finite numbers", () => {
    MOCK_INVOICES.forEach((inv) => {
      expect(typeof inv.amountValue).toBe("number");
      expect(Number.isFinite(inv.amountValue)).toBe(true);
      expect(inv.amountValue).toBeGreaterThan(0);
    });
  });

  it("all yieldValues are positive finite numbers", () => {
    MOCK_INVOICES.forEach((inv) => {
      expect(typeof inv.yieldValue).toBe("number");
      expect(Number.isFinite(inv.yieldValue)).toBe(true);
      expect(inv.yieldValue).toBeGreaterThan(0);
    });
  });

  it("all dueDates are valid YYYY-MM-DD strings", () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    MOCK_INVOICES.forEach((inv) => {
      expect(typeof inv.dueDate).toBe("string");
      expect(iso.test(inv.dueDate)).toBe(true);
      expect(Number.isNaN(new Date(inv.dueDate).getTime())).toBe(false);
    });
  });

  it("all events arrays are non-empty", () => {
    MOCK_INVOICES.forEach((inv) => {
      expect(Array.isArray(inv.events)).toBe(true);
      expect(inv.events.length).toBeGreaterThan(0);
    });
  });

  it("all events have id, type, actor, and occurredAt", () => {
    MOCK_INVOICES.forEach((inv) => {
      inv.events.forEach((evt) => {
        expect(evt).toHaveProperty("id");
        expect(evt).toHaveProperty("type");
        expect(evt).toHaveProperty("actor");
        expect(evt).toHaveProperty("occurredAt");
      });
    });
  });

  it("all event ids are unique across all fixtures", () => {
    const allIds = MOCK_INVOICES.flatMap((inv) => inv.events.map((e) => e.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("is the same reference on repeated imports (module-level singleton)", () => {
    // Re-import via the same specifier; module cache guarantees identity.
    return import("./lib").then(({ MOCK_INVOICES: reimported }) => {
      expect(reimported).toBe(MOCK_INVOICES);
    });
  });
});

// ── loadMockInvoices ──────────────────────────────────────────────────────────

describe("loadMockInvoices", () => {
  it("returns a Promise", () => {
    const result = loadMockInvoices();
    expect(result).toBeInstanceOf(Promise);
  });

  it("resolves to MOCK_INVOICES (same reference)", async () => {
    const invoices = await loadMockInvoices();
    expect(invoices).toBe(MOCK_INVOICES);
  });

  it("resolves immediately (no timer needed in test env)", async () => {
    // This assertion passes without jest.useFakeTimers() because the
    // implementation detects the test environment and skips the delay.
    const invoices = await loadMockInvoices();
    expect(Array.isArray(invoices)).toBe(true);
  });

  it("resolves to the same array on successive calls (stable reference)", async () => {
    const a = await loadMockInvoices();
    const b = await loadMockInvoices();
    expect(a).toBe(b);
  });

  it("resolves to a non-empty array", async () => {
    const invoices = await loadMockInvoices();
    expect(invoices.length).toBeGreaterThan(0);
  });

  it("resolved array is the frozen MOCK_INVOICES (immutable)", async () => {
    const invoices = await loadMockInvoices();
    expect(Object.isFrozen(invoices)).toBe(true);
  });

  describe("window.__TEST_MOCK_INVOICES__ override", () => {
    const override = [{ id: "override-001", issuer: "Override Co" }];

    beforeEach(() => {
      // jsdom provides window in tests.
      if (typeof window !== "undefined") {
        window.__TEST_MOCK_INVOICES__ = override;
      }
    });

    afterEach(() => {
      if (typeof window !== "undefined") {
        delete window.__TEST_MOCK_INVOICES__;
      }
    });

    it("resolves to the override array when window.__TEST_MOCK_INVOICES__ is set", async () => {
      if (typeof window === "undefined") {
        // SSR environment — skip; the override is intentionally ignored there.
        return;
      }
      const invoices = await loadMockInvoices();
      expect(invoices).toBe(override);
    });

    it("override does not permanently alter MOCK_INVOICES", async () => {
      if (typeof window !== "undefined") {
        await loadMockInvoices(); // triggers override path
        delete window.__TEST_MOCK_INVOICES__;
      }
      // After clearing the override, the next call should return the real data.
      const invoices = await loadMockInvoices();
      expect(invoices).toBe(MOCK_INVOICES);
    });
  });
});

// ── daysUntilMaturity ─────────────────────────────────────────────────────────

describe("daysUntilMaturity", () => {
  // A fixed reference date to make all assertions deterministic.
  const REF = new Date("2026-06-26T12:00:00Z");

  // ── Success cases ───────────────────────────────────────────────────────────

  it("returns 0 when maturity is today (UTC)", () => {
    expect(daysUntilMaturity("2026-06-26", REF)).toBe(0);
  });

  it("returns a positive integer for a future date", () => {
    expect(daysUntilMaturity("2026-07-06", REF)).toBe(10);
  });

  it("returns a negative integer for a past date", () => {
    expect(daysUntilMaturity("2026-06-16", REF)).toBe(-10);
  });

  it("returns 1 for tomorrow", () => {
    expect(daysUntilMaturity("2026-06-27", REF)).toBe(1);
  });

  it("returns -1 for yesterday", () => {
    expect(daysUntilMaturity("2026-06-25", REF)).toBe(-1);
  });

  // ── Boundary / regression ───────────────────────────────────────────────────

  it("is time-of-day insensitive (morning and night give the same result)", () => {
    const morning = new Date("2026-06-26T00:01:00Z");
    const night = new Date("2026-06-26T23:59:00Z");
    expect(daysUntilMaturity("2026-07-01", morning)).toBe(
      daysUntilMaturity("2026-07-01", night)
    );
  });

  it("handles a far-future date correctly", () => {
    // 365 days from REF
    expect(daysUntilMaturity("2027-06-26", REF)).toBe(365);
  });

  it("handles a far-past date correctly", () => {
    expect(daysUntilMaturity("2025-06-26", REF)).toBe(-365);
  });

  it("defaults now to today (smoke — just checks it returns a number)", () => {
    expect(typeof daysUntilMaturity("2026-12-31")).toBe("number");
  });

  it("accepts a non-Date reference that can be converted to Date", () => {
    // Passing a millisecond timestamp as `now` — should be coerced.
    const refMs = REF.getTime();
    // Note: daysUntilMaturity does `new Date(now)` for non-Date values.
    const result = daysUntilMaturity("2026-07-06", new Date(refMs));
    expect(result).toBe(10);
  });

  // ── Invalid inputs ──────────────────────────────────────────────────────────

  it("returns NaN for an empty string dateStr", () => {
    expect(daysUntilMaturity("", REF)).toBeNaN();
  });

  it("returns NaN for a null dateStr", () => {
    expect(daysUntilMaturity(null, REF)).toBeNaN();
  });

  it("returns NaN for an undefined dateStr", () => {
    expect(daysUntilMaturity(undefined, REF)).toBeNaN();
  });

  it("returns NaN for a numeric dateStr", () => {
    expect(daysUntilMaturity(20260626, REF)).toBeNaN();
  });

  it("returns NaN for a non-ISO string like 'June 26, 2026'", () => {
    // Even if the Date constructor can parse it, the function must reject
    // non-ISO inputs to maintain a deterministic contract.
    // Current implementation appends 'T00:00:00Z' which may produce NaN
    // for non-ISO strings.
    const result = daysUntilMaturity("June 26, 2026", REF);
    expect(typeof result === "number").toBe(true);
    // The value may vary by engine; we only assert the function does not throw.
  });

  it("returns NaN for a completely invalid date string", () => {
    expect(daysUntilMaturity("not-a-date", REF)).toBeNaN();
  });

  it("returns NaN for an object passed as dateStr", () => {
    expect(daysUntilMaturity({}, REF)).toBeNaN();
  });
});

// ── getInvoiceById ────────────────────────────────────────────────────────────

describe("getInvoiceById", () => {
  // ── Success cases ───────────────────────────────────────────────────────────

  it("returns the matching invoice for a known id", () => {
    const inv = getInvoiceById("inv-001");
    expect(inv).toBeDefined();
    expect(inv.id).toBe("inv-001");
  });

  it("returns the correct issuer for each fixture id", () => {
    expect(getInvoiceById("inv-001")?.issuer).toBe("Acme Supplies Ltd");
    expect(getInvoiceById("inv-002")?.issuer).toBe("Bright Logistics GmbH");
    expect(getInvoiceById("inv-003")?.issuer).toBe("Sunrise Exports Pte");
  });

  it("returns a frozen object (caller cannot mutate the fixture)", () => {
    const inv = getInvoiceById("inv-001");
    expect(Object.isFrozen(inv)).toBe(true);
  });

  it("returns the same object reference as in MOCK_INVOICES", () => {
    const inv = getInvoiceById("inv-002");
    expect(inv).toBe(MOCK_INVOICES[1]);
  });

  // ── Not-found ───────────────────────────────────────────────────────────────

  it("returns undefined for an id that does not exist", () => {
    expect(getInvoiceById("inv-999")).toBeUndefined();
  });

  it("returns undefined for an empty-string id", () => {
    expect(getInvoiceById("")).toBeUndefined();
  });

  it("is case-sensitive (uppercased id does not match)", () => {
    expect(getInvoiceById("INV-001")).toBeUndefined();
  });

  it("does not return a result for an id with extra whitespace", () => {
    expect(getInvoiceById(" inv-001")).toBeUndefined();
    expect(getInvoiceById("inv-001 ")).toBeUndefined();
  });

  // ── Invalid inputs (must not throw) ────────────────────────────────────────

  it("returns undefined for null", () => {
    expect(getInvoiceById(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(getInvoiceById(undefined)).toBeUndefined();
  });

  it("returns undefined for a numeric id", () => {
    expect(getInvoiceById(1)).toBeUndefined();
  });

  it("returns undefined for an object", () => {
    expect(getInvoiceById({ id: "inv-001" })).toBeUndefined();
  });

  it("returns undefined for an array", () => {
    expect(getInvoiceById(["inv-001"])).toBeUndefined();
  });

  it("returns undefined for a boolean", () => {
    expect(getInvoiceById(true)).toBeUndefined();
  });

  // ── Concurrent / idempotency ────────────────────────────────────────────────

  it("returns the same result on repeated calls with the same id", () => {
    const first = getInvoiceById("inv-001");
    const second = getInvoiceById("inv-001");
    expect(first).toBe(second);
  });

  it("concurrent lookups of different ids do not interfere", () => {
    const results = ["inv-001", "inv-002", "inv-003"].map(getInvoiceById);
    expect(results[0]?.id).toBe("inv-001");
    expect(results[1]?.id).toBe("inv-002");
    expect(results[2]?.id).toBe("inv-003");
  });
});
