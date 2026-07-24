/**
 * @file app/invest/sort.test.tsx
 *
 * Deterministic tests for the marketplace sort logic exposed by
 * `applySortToList` in `app/invest/page.js`.
 *
 * Coverage
 * ────────
 * 1. No-op paths — empty array, non-array input, no column selected
 * 2. Amount   — asc / desc, tie-break stable order preserved
 * 3. Yield    — asc / desc, tie-break stable order preserved
 * 4. Maturity — asc / desc, tie-break stable order preserved
 * 5. Edge cases — single-item list, unknown column, does not mutate input
 * 6. Large data set — ordering is correct at scale (50 items)
 */

import { applySortToList } from "./page";
import { DEFAULT_FILTERS } from "@/components/InvoiceFilters";

// ─── Type helper ────────────────────────────────────────────────────────────

type Invoice = {
  id: string;
  issuer: string;
  amount: string;
  currency: string;
  dueDate: string;
  yield: string;
  status: string;
};

// ─── Filter factory ──────────────────────────────────────────────────────────

function filtersFor(
  sort: string,
  sortDir: "asc" | "desc" = "desc"
): typeof DEFAULT_FILTERS {
  return { ...DEFAULT_FILTERS, sort, sortDir };
}

// ─── Shared fixtures ─────────────────────────────────────────────────────────

/** Three invoices with clearly distinct amount / yield / maturity values. */
const THREE: Invoice[] = [
  {
    id: "a",
    issuer: "Alpha",
    amount: "5,000",
    currency: "USD",
    dueDate: "2026-09-01",
    yield: "6.0%",
    status: "Open",
  },
  {
    id: "b",
    issuer: "Beta",
    amount: "12,500",
    currency: "USD",
    dueDate: "2026-07-15",
    yield: "9.5%",
    status: "Open",
  },
  {
    id: "c",
    issuer: "Gamma",
    amount: "800",
    currency: "EUR",
    dueDate: "2026-11-30",
    yield: "4.2%",
    status: "Open",
  },
];

// ─── 1. No-op paths ──────────────────────────────────────────────────────────

describe("applySortToList – no-op paths", () => {
  it("returns the same empty array reference when list is empty", () => {
    const empty: Invoice[] = [];
    expect(applySortToList(empty, filtersFor("amount", "asc"))).toBe(empty);
  });

  it("returns the input unchanged when it is not an array", () => {
    // @ts-expect-error — deliberately passing a non-array to test the guard
    expect(applySortToList(null, filtersFor("amount"))).toBeNull();
    // @ts-expect-error
    expect(applySortToList(undefined, filtersFor("yield"))).toBeUndefined();
  });

  it("returns the original list when no sort column is selected", () => {
    const result = applySortToList(THREE, { ...DEFAULT_FILTERS, sort: "" });
    expect(result).toBe(THREE);
  });

  it("returns the original list when sort column is unrecognised", () => {
    // parseSortState returns the column verbatim; the comparator falls through
    // to diff=0 for unknown columns, so the order must be unchanged.
    const result = applySortToList(THREE, filtersFor("unknown_column", "asc"));
    expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

// ─── 2. Amount sorting ───────────────────────────────────────────────────────

describe("applySortToList – amount column", () => {
  it("sorts ascending: 800 < 5,000 < 12,500", () => {
    const result = applySortToList(THREE, filtersFor("amount", "asc"));
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts descending: 12,500 > 5,000 > 800", () => {
    const result = applySortToList(THREE, filtersFor("amount", "desc"));
    expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("preserves original relative order for equal amounts (tie-break stable)", () => {
    const tied: Invoice[] = [
      { id: "x", issuer: "X", amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "y", issuer: "Y", amount: "1,000", currency: "USD", dueDate: "2026-02-01", yield: "6%", status: "Open" },
      { id: "z", issuer: "Z", amount: "1,000", currency: "USD", dueDate: "2026-03-01", yield: "7%", status: "Open" },
    ];
    const asc = applySortToList(tied, filtersFor("amount", "asc"));
    const desc = applySortToList(tied, filtersFor("amount", "desc"));
    // All amounts equal — original insertion order must be preserved.
    expect(asc.map((i) => i.id)).toEqual(["x", "y", "z"]);
    expect(desc.map((i) => i.id)).toEqual(["x", "y", "z"]);
  });

  it("handles amounts without comma separators", () => {
    const noComma: Invoice[] = [
      { id: "p", issuer: "P", amount: "500", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "q", issuer: "Q", amount: "2000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
    ];
    const result = applySortToList(noComma, filtersFor("amount", "asc"));
    expect(result.map((i) => i.id)).toEqual(["p", "q"]);
  });

  it("treats unparseable amount strings as 0", () => {
    const withGarbage: Invoice[] = [
      { id: "g", issuer: "G", amount: "N/A", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "h", issuer: "H", amount: "500", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
    ];
    const result = applySortToList(withGarbage, filtersFor("amount", "asc"));
    // "N/A" → 0 < 500, so g comes first ascending
    expect(result.map((i) => i.id)).toEqual(["g", "h"]);
  });
});

// ─── 3. Yield sorting ────────────────────────────────────────────────────────

describe("applySortToList – yield column", () => {
  it("sorts ascending: 4.2% < 6.0% < 9.5%", () => {
    const result = applySortToList(THREE, filtersFor("yield", "asc"));
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts descending: 9.5% > 6.0% > 4.2%", () => {
    const result = applySortToList(THREE, filtersFor("yield", "desc"));
    expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("preserves original relative order for equal yields (tie-break stable)", () => {
    const tied: Invoice[] = [
      { id: "x", issuer: "X", amount: "100", currency: "USD", dueDate: "2026-01-01", yield: "7.0%", status: "Open" },
      { id: "y", issuer: "Y", amount: "200", currency: "USD", dueDate: "2026-02-01", yield: "7.0%", status: "Open" },
      { id: "z", issuer: "Z", amount: "300", currency: "USD", dueDate: "2026-03-01", yield: "7.0%", status: "Open" },
    ];
    const asc = applySortToList(tied, filtersFor("yield", "asc"));
    const desc = applySortToList(tied, filtersFor("yield", "desc"));
    expect(asc.map((i) => i.id)).toEqual(["x", "y", "z"]);
    expect(desc.map((i) => i.id)).toEqual(["x", "y", "z"]);
  });

  it("handles yield strings without percent sign", () => {
    const noPct: Invoice[] = [
      { id: "p", issuer: "P", amount: "100", currency: "USD", dueDate: "2026-01-01", yield: "3.5", status: "Open" },
      { id: "q", issuer: "Q", amount: "100", currency: "USD", dueDate: "2026-01-01", yield: "8.1", status: "Open" },
    ];
    const result = applySortToList(noPct, filtersFor("yield", "asc"));
    expect(result.map((i) => i.id)).toEqual(["p", "q"]);
  });

  it("treats unparseable yield strings as 0", () => {
    const withGarbage: Invoice[] = [
      { id: "g", issuer: "G", amount: "100", currency: "USD", dueDate: "2026-01-01", yield: "TBD", status: "Open" },
      { id: "h", issuer: "H", amount: "100", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
    ];
    const result = applySortToList(withGarbage, filtersFor("yield", "asc"));
    expect(result.map((i) => i.id)).toEqual(["g", "h"]);
  });
});

// ─── 4. Maturity sorting ─────────────────────────────────────────────────────

describe("applySortToList – maturity column", () => {
  it("sorts ascending: earliest date first (Jul < Sep < Nov)", () => {
    const result = applySortToList(THREE, filtersFor("maturity", "asc"));
    expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts descending: latest date first (Nov > Sep > Jul)", () => {
    const result = applySortToList(THREE, filtersFor("maturity", "desc"));
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("preserves original relative order for equal maturity dates (tie-break stable)", () => {
    const tied: Invoice[] = [
      { id: "x", issuer: "X", amount: "100", currency: "USD", dueDate: "2026-06-01", yield: "5%", status: "Open" },
      { id: "y", issuer: "Y", amount: "200", currency: "USD", dueDate: "2026-06-01", yield: "6%", status: "Open" },
      { id: "z", issuer: "Z", amount: "300", currency: "USD", dueDate: "2026-06-01", yield: "7%", status: "Open" },
    ];
    const asc = applySortToList(tied, filtersFor("maturity", "asc"));
    const desc = applySortToList(tied, filtersFor("maturity", "desc"));
    expect(asc.map((i) => i.id)).toEqual(["x", "y", "z"]);
    expect(desc.map((i) => i.id)).toEqual(["x", "y", "z"]);
  });

  it("correctly orders across year boundaries", () => {
    const crossYear: Invoice[] = [
      { id: "a", issuer: "A", amount: "100", currency: "USD", dueDate: "2027-01-01", yield: "5%", status: "Open" },
      { id: "b", issuer: "B", amount: "100", currency: "USD", dueDate: "2026-12-31", yield: "5%", status: "Open" },
    ];
    const asc = applySortToList(crossYear, filtersFor("maturity", "asc"));
    expect(asc.map((i) => i.id)).toEqual(["b", "a"]);
  });
});

// ─── 5. Edge cases ───────────────────────────────────────────────────────────

describe("applySortToList – edge cases", () => {
  it("returns a single-element list unchanged for every column and direction", () => {
    const single: Invoice[] = [
      { id: "only", issuer: "Solo", amount: "1,000", currency: "USD", dueDate: "2026-06-01", yield: "5%", status: "Open" },
    ];
    for (const col of ["amount", "yield", "maturity"]) {
      for (const dir of ["asc", "desc"] as const) {
        const result = applySortToList(single, filtersFor(col, dir));
        expect(result.map((i) => i.id)).toEqual(["only"]);
      }
    }
  });

  it("does not mutate the original array", () => {
    const original = [...THREE];
    applySortToList(THREE, filtersFor("amount", "asc"));
    expect(THREE).toEqual(original);
  });

  it("returns a new array reference (not the same object) when a column is active", () => {
    const result = applySortToList(THREE, filtersFor("yield", "desc"));
    expect(result).not.toBe(THREE);
  });

  it("returns the same reference when no column is active (no-copy fast path)", () => {
    const result = applySortToList(THREE, { ...DEFAULT_FILTERS, sort: "" });
    expect(result).toBe(THREE);
  });
});

// ─── 6. Large data set ───────────────────────────────────────────────────────

describe("applySortToList – large data set (50 items)", () => {
  /**
   * Build 50 invoices with deterministic but shuffled values so the sort
   * has real work to do and the result can be verified precisely.
   */
  function makeLargeSet(count: number): Invoice[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `inv-${String(i).padStart(3, "0")}`,
      issuer: `Issuer ${i}`,
      // Shuffle amounts: reverse index so i=0 gets the largest value
      amount: String((count - i) * 100),
      currency: "USD",
      // Maturity: spread across the year
      dueDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      // Yield: ascending with index
      yield: `${(i % 10) + 1}.0%`,
      status: "Open",
    }));
  }

  const LARGE = makeLargeSet(50);

  it("amount asc — first item has smallest amount, last has largest", () => {
    const result = applySortToList(LARGE, filtersFor("amount", "asc"));
    const amounts = result.map((i) => parseFloat(i.amount.replace(/,/g, "")));
    for (let i = 0; i < amounts.length - 1; i++) {
      expect(amounts[i]).toBeLessThanOrEqual(amounts[i + 1]);
    }
  });

  it("amount desc — first item has largest amount, last has smallest", () => {
    const result = applySortToList(LARGE, filtersFor("amount", "desc"));
    const amounts = result.map((i) => parseFloat(i.amount.replace(/,/g, "")));
    for (let i = 0; i < amounts.length - 1; i++) {
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i + 1]);
    }
  });

  it("yield asc — values are non-decreasing", () => {
    const result = applySortToList(LARGE, filtersFor("yield", "asc"));
    const yields = result.map((i) => parseFloat(i.yield));
    for (let i = 0; i < yields.length - 1; i++) {
      expect(yields[i]).toBeLessThanOrEqual(yields[i + 1]);
    }
  });

  it("yield desc — values are non-increasing", () => {
    const result = applySortToList(LARGE, filtersFor("yield", "desc"));
    const yields = result.map((i) => parseFloat(i.yield));
    for (let i = 0; i < yields.length - 1; i++) {
      expect(yields[i]).toBeGreaterThanOrEqual(yields[i + 1]);
    }
  });

  it("maturity asc — dates are non-decreasing", () => {
    const result = applySortToList(LARGE, filtersFor("maturity", "asc"));
    const dates = result.map((i) => new Date(i.dueDate).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i + 1]);
    }
  });

  it("maturity desc — dates are non-increasing", () => {
    const result = applySortToList(LARGE, filtersFor("maturity", "desc"));
    const dates = result.map((i) => new Date(i.dueDate).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });

  it("result contains all original items — no items dropped or duplicated", () => {
    for (const col of ["amount", "yield", "maturity"]) {
      const result = applySortToList(LARGE, filtersFor(col, "asc"));
      expect(result).toHaveLength(LARGE.length);
      const ids = new Set(result.map((i) => i.id));
      expect(ids.size).toBe(LARGE.length);
    }
  });
});
