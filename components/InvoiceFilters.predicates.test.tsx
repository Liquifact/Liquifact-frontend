/**
 * @file InvoiceFilters.predicates.test.tsx
 *
 * Pure-predicate unit tests for the filter exports added to
 * `components/InvoiceFilters.jsx`.  These cover **boundary behaviour** that
 * the higher-level hook tests in `lib/hooks/useInvoiceFilters.test.tsx` leave
 * implicit (off-boundary samples only): inclusive yield / maturity bounds,
 * exact-equality currency match, empty-filter passthrough, and the
 * intersection of the three predicates for a single invoice.
 *
 * IMPORTANT — STRICT NaN-DEFENCE CONTRACT
 * ─────────────────────────────────────────
 * These predicates are intentionally **stricter** than
 * `lib/hooks/useInvoiceFilters.js`.  When `yieldMin`/`yieldMax` are both
 * empty the hook short-circuits the entire yield filter (`if
 * (filters.yieldMin || filters.yieldMax)`), so a malformed invoice yield
 * parses to `NaN` and **still passes** in production today.  The predicate,
 * by contrast, parses the invoice yield up front and returns `false` for
 * any `NaN` invoice value — even when both bounds are empty.
 *
 * The expected resolution of this divergence is a follow-up PR that
 * refactors the hook to consume the new predicate exports; this test file
 * is the golden copy of the intended strict contract and should be carried
 * forward unchanged.  See `FILTER_CONTRACTS.md` § 2 for the full predicate
 * contract and discussion.
 *
 * Areas covered
 * ─────────────
 * 1. matchesYieldRange
 *    a. empty / undefined bounds      → every parseable yield passes
 *    b. lower bound INCLUSIVE         → value === min passes, value < min fails
 *    c. upper bound INCLUSIVE         → value === max passes, value > max fails
 *    d. both bounds together          → inclusive window
 *    e. non-numeric / non-parseable   → defensive `false` (no accidental passthrough)
 *    f. inverted range (min > max)    → never matches
 * 2. matchesCurrency
 *    a. empty filter                  → every invoice passes
 *    b. exact equal                   → passes
 *    c. any mismatch (case, value)    → fails
 *    d. defensive `null` invoice field → fails
 * 3. matchesMaturityRange
 *    a. empty bounds                  → every invoice passes
 *    b. inclusive lower               → dueDate === from passes, before fails
 *    c. inclusive upper               → dueDate === to passes, after fails
 *    d. ISO lexicographic comparison  → "2026-09-01" ≥ "2026-09" semantics
 * 4. matchesFilters (combined intersection)
 *    a. empty `DEFAULT_FILTERS`       → every invoice passes
 *    b. one filter set, others empty  → only that filter applies
 *    c. multiple filters set          → AND intersection
 *    d. picking the single match      → exact-set intersection
 * 5. Deterministic fixtures
 *    a. five invoices spanning yields / currencies / dates
 *    b. boundary invoices at exactly min, max, before, after
 *    c. assertions are exact-set equality (no off-by-one)
 */

import "@testing-library/jest-dom";
import {
  DEFAULT_FILTERS,
  matchesCurrency,
  matchesFilters,
  matchesMaturityRange,
  matchesYieldRange,
} from "./InvoiceFilters";

// ─── Fixtures ───────────────────────────────────────────────────────────────

/** A canonical invoice record used across the matchers. */
type Invoice = {
  id: string;
  issuer: string;
  amount: string;
  currency: string;
  dueDate: string;
  yield: string;
  status: string;
};

/**
 * Five invoices carefully picked to exercise the predicate boundaries:
 *
 * | id             | yield   | currency | dueDate    |
 * | -------------- | ------- | -------- | ---------- |
 * | inv-low-yield  |  4.2%   | USD      | 2027-01-15 |
 * | inv-mid-yield  |  6.0%   | USD      | 2026-07-01 |
 * | inv-eur        |  8.2%   | EUR      | 2026-09-15 |
 * | inv-high-yield |  9.1%   | USD      | 2026-11-30 |
 * | inv-gbp        | 10.5%   | GBP      | 2026-05-30 |
 */
const FIXTURE: Invoice[] = [
  {
    id: "inv-low-yield",
    issuer: "Low Yield Inc",
    amount: "5,000",
    currency: "USD",
    dueDate: "2027-01-15",
    yield: "4.2%",
    status: "Open",
  },
  {
    id: "inv-mid-yield",
    issuer: "Mid Yield Co",
    amount: "7,800",
    currency: "USD",
    dueDate: "2026-07-01",
    yield: "6.0%",
    status: "Open",
  },
  {
    id: "inv-eur",
    issuer: "Euro Group",
    amount: "12,500",
    currency: "EUR",
    dueDate: "2026-09-15",
    yield: "8.2%",
    status: "Open",
  },
  {
    id: "inv-high-yield",
    issuer: "High Yield BV",
    amount: "22,000",
    currency: "USD",
    dueDate: "2026-11-30",
    yield: "9.1%",
    status: "Open",
  },
  {
    id: "inv-gbp",
    issuer: "Top Yield Pty",
    amount: "3,000",
    currency: "GBP",
    dueDate: "2026-05-30",
    yield: "10.5%",
    status: "Open",
  },
];

// ─── 1. matchesYieldRange ──────────────────────────────────────────────────

describe("matchesYieldRange (inclusive boundaries)", () => {
  describe("empty / undefined bounds (passthrough)", () => {
    it('passes any parseable yield when both bounds are ""', () => {
      expect(matchesYieldRange("8.2%", "", "")).toBe(true);
      expect(matchesYieldRange("100%", "", "")).toBe(true);
      expect(matchesYieldRange("0.01%", "", "")).toBe(true);
    });

    it("treats `undefined` and `null` bounds as empty", () => {
      expect(matchesYieldRange("8.2%", undefined, undefined)).toBe(true);
      expect(matchesYieldRange("8.2%", null as unknown as string, "")).toBe(true);
      expect(matchesYieldRange("8.2%", "", null as unknown as string)).toBe(true);
    });

    // STRICT NaN-defence: empty bounds do NOT absolve the predicate from
    // validating the invoice yield.  This diverges from
    // `useInvoiceFilters.js` (which would let a malformed yield slip
    // through) and is the inteded contract for a follow-up hook refactor.
    it("still rejects unparseable invoice yield when both bounds are empty", () => {
      expect(matchesYieldRange("not-a-number", "", "")).toBe(false);
      expect(matchesYieldRange("", "", "")).toBe(false);
      expect(matchesYieldRange(null as unknown as string, "", "")).toBe(false);
      expect(matchesYieldRange(undefined as unknown as string, "", "")).toBe(false);
    });
  });

  describe("lower-bound inclusivity", () => {
    it("passes when invoice yield equals yieldMin exactly", () => {
      expect(matchesYieldRange("8.0%", "8.0", "")).toBe(true);
      expect(matchesYieldRange("8%", "8", "")).toBe(true);
    });

    it("passes when invoice yield is strictly above yieldMin", () => {
      expect(matchesYieldRange("8.1%", "8.0", "")).toBe(true);
      expect(matchesYieldRange("12.5%", "8.0", "")).toBe(true);
    });

    it("fails when invoice yield is below yieldMin", () => {
      expect(matchesYieldRange("7.9%", "8.0", "")).toBe(false);
      expect(matchesYieldRange("0%", "8.0", "")).toBe(false);
    });

    it("passes when invoice yield is a bare number (no `%` suffix)", () => {
      expect(matchesYieldRange(8.0 as unknown as string, "8.0", "")).toBe(true);
      expect(matchesYieldRange(8.4 as unknown as string, "8.0", "")).toBe(true);
    });
  });

  describe("upper-bound inclusivity", () => {
    it("passes when invoice yield equals yieldMax exactly", () => {
      expect(matchesYieldRange("8.0%", "", "8.0")).toBe(true);
    });

    it("passes when invoice yield is strictly below yieldMax", () => {
      expect(matchesYieldRange("7.9%", "", "8.0")).toBe(true);
    });

    it("fails when invoice yield is above yieldMax", () => {
      expect(matchesYieldRange("8.1%", "", "8.0")).toBe(false);
      expect(matchesYieldRange("20%", "", "8.0")).toBe(false);
    });
  });

  describe("both bounds together", () => {
    it("passes when invoice yield is inside the [min, max] window", () => {
      expect(matchesYieldRange("8.2%", "8.0", "9.0")).toBe(true);
      expect(matchesYieldRange("8.0%", "8.0", "9.0")).toBe(true);
      expect(matchesYieldRange("9.0%", "8.0", "9.0")).toBe(true);
    });

    it("fails when invoice yield is outside the window in either direction", () => {
      expect(matchesYieldRange("7.9%", "8.0", "9.0")).toBe(false);
      expect(matchesYieldRange("9.1%", "8.0", "9.0")).toBe(false);
    });

    it("never matches when min > max (degenerate range)", () => {
      expect(matchesYieldRange("8.5%", "9.0", "7.0")).toBe(false);
    });
  });

  describe("defensive parsing", () => {
    it("returns false when invoice yield is not parseable", () => {
      expect(matchesYieldRange("", "8.0", "")).toBe(false);
      expect(matchesYieldRange("not-a-number", "8.0", "")).toBe(false);
      expect(matchesYieldRange(null as unknown as string, "", "")).toBe(false);
      expect(matchesYieldRange(undefined as unknown as string, "", "")).toBe(false);
    });

    it("returns false when a filter bound is not parseable", () => {
      expect(matchesYieldRange("8.0%", "abc", "")).toBe(false);
      expect(matchesYieldRange("8.0%", "8.0", "xyz")).toBe(false);
      expect(matchesYieldRange("8.0%", "abc", "xyz")).toBe(false);
    });
  });
});

// ─── 2. matchesCurrency ─────────────────────────────────────────────────────

describe("matchesCurrency (strict equality)", () => {
  it("passes any currency when filter is empty", () => {
    expect(matchesCurrency("USD", "")).toBe(true);
    expect(matchesCurrency("EUR", "")).toBe(true);
    expect(matchesCurrency("anything", "")).toBe(true);
  });

  it("treats `undefined` and `null` filter as empty", () => {
    expect(matchesCurrency("USD", undefined)).toBe(true);
    expect(matchesCurrency("USD", null as unknown as string)).toBe(true);
  });

  it("passes when invoice currency exactly equals filter (case-sensitive)", () => {
    expect(matchesCurrency("USD", "USD")).toBe(true);
    expect(matchesCurrency("EUR", "EUR")).toBe(true);
    expect(matchesCurrency("GBP", "GBP")).toBe(true);
  });

  it("fails on case mismatch (lowercase filter does not match uppercase code)", () => {
    expect(matchesCurrency("USD", "usd")).toBe(false);
    expect(matchesCurrency("EUR", "eur")).toBe(false);
  });

  it("fails on any other-mismatch value", () => {
    expect(matchesCurrency("USD", "EUR")).toBe(false);
    expect(matchesCurrency("EUR", "USD")).toBe(false);
    expect(matchesCurrency("GBP", "JPY")).toBe(false);
  });

  it("fails when invoice currency is missing / `null` / empty", () => {
    expect(matchesCurrency(null as unknown as string, "USD")).toBe(false);
    expect(matchesCurrency(undefined as unknown as string, "USD")).toBe(false);
    expect(matchesCurrency("", "USD")).toBe(false);
  });
});

// ─── 3. matchesMaturityRange ───────────────────────────────────────────────

describe("matchesMaturityRange (ISO date lexicographic, inclusive)", () => {
  it("passes when both bounds are empty", () => {
    expect(matchesMaturityRange("2026-08-15", "", "")).toBe(true);
  });

  describe("lower-bound inclusivity", () => {
    it("passes when dueDate equals maturityFrom", () => {
      expect(matchesMaturityRange("2026-08-15", "2026-08-15", "")).toBe(true);
    });

    it("passes when dueDate is after maturityFrom", () => {
      expect(matchesMaturityRange("2026-08-16", "2026-08-15", "")).toBe(true);
      expect(matchesMaturityRange("2027-01-01", "2026-08-15", "")).toBe(true);
    });

    it("fails when dueDate is before maturityFrom", () => {
      expect(matchesMaturityRange("2026-08-14", "2026-08-15", "")).toBe(false);
      expect(matchesMaturityRange("2025-01-01", "2026-08-15", "")).toBe(false);
    });
  });

  describe("upper-bound inclusivity", () => {
    it("passes when dueDate equals maturityTo", () => {
      expect(matchesMaturityRange("2026-08-15", "", "2026-08-15")).toBe(true);
    });

    it("passes when dueDate is before maturityTo", () => {
      expect(matchesMaturityRange("2026-08-14", "", "2026-08-15")).toBe(true);
    });

    it("fails when dueDate is after maturityTo", () => {
      expect(matchesMaturityRange("2026-08-16", "", "2026-08-15")).toBe(false);
      expect(matchesMaturityRange("2027-01-01", "", "2026-08-15")).toBe(false);
    });
  });

  describe("both bounds together", () => {
    it("passes when dueDate is inside the [from, to] window", () => {
      expect(matchesMaturityRange("2026-07-01", "2026-06-01", "2026-09-01")).toBe(true);
      expect(matchesMaturityRange("2026-06-01", "2026-06-01", "2026-09-01")).toBe(true);
      expect(matchesMaturityRange("2026-09-01", "2026-06-01", "2026-09-01")).toBe(true);
    });

    it("fails when dueDate is outside the window in either direction", () => {
      expect(matchesMaturityRange("2026-05-31", "2026-06-01", "2026-09-01")).toBe(false);
      expect(matchesMaturityRange("2026-09-02", "2026-06-01", "2026-09-01")).toBe(false);
    });

    it("treats ISO dates with full and partial year-month consistently", () => {
      // ISO lexicographic ordering: "2026-09" sorts before "2026-09-15" but
      // "2026-09-99" sorts after "2026-09-15".  Maturity filters always use the
      // full YYYY-MM-DD form so this is exercised for completeness.
      expect(matchesMaturityRange("2026-09-15", "2026-09-01", "2026-09-30")).toBe(true);
      expect(matchesMaturityRange("2026-09-15", "", "2026-09-99")).toBe(false);
    });
  });

  // STRICT NaN-defence: empty bounds do NOT absolve the predicate from
  // validating the dueDate.  Mirrors the yield-level NaN-defence case so
  // behaviour is symmetric across the two range predicates.
  describe("empty bounds still reject malformed dueDate", () => {
    it('returns false when dueDate is "" and both bounds are empty', () => {
      expect(matchesMaturityRange("", "", "")).toBe(false);
    });

    it("returns false when dueDate is non-ISO and both bounds are empty", () => {
      expect(matchesMaturityRange("not-a-date", "", "")).toBe(false);
      expect(matchesMaturityRange("2026/09/15", "", "")).toBe(false);
    });
  });
});

// ─── 4. matchesFilters (combined intersection) ─────────────────────────────

describe("matchesFilters (combined intersection of all three predicates)", () => {
  describe("empty / default filters (passthrough)", () => {
    it("passes every fixture invoice when DEFAULT_FILTERS is used", () => {
      FIXTURE.forEach((inv) => {
        expect(matchesFilters(inv, DEFAULT_FILTERS)).toBe(true);
      });
    });

    it("passes when filters object has every key set to '' explicitly", () => {
      const emptyFilters = {
        yieldMin: "",
        yieldMax: "",
        currency: "",
        maturityFrom: "",
        maturityTo: "",
      };
      FIXTURE.forEach((inv) => {
        expect(matchesFilters(inv, emptyFilters)).toBe(true);
      });
    });
  });

  describe("single-filter slices", () => {
    it("currency filter alone", () => {
      const f = { ...DEFAULT_FILTERS, currency: "EUR" };
      const matched = FIXTURE.filter((inv) => matchesFilters(inv, f)).map((i) => i.id);
      expect(matched).toEqual(["inv-eur"]);
    });

    it("yieldMin filter alone (lower inclusive)", () => {
      const f = { ...DEFAULT_FILTERS, yieldMin: "8.0" };
      const matched = FIXTURE.filter((inv) => matchesFilters(inv, f)).map((i) => i.id);
      // Yield ≥ 8.0:  inv-eur (8.2), inv-high-yield (9.1), inv-gbp (10.5)
      expect(matched).toEqual(["inv-eur", "inv-high-yield", "inv-gbp"]);
    });

    it("yieldMax filter alone (upper inclusive)", () => {
      const f = { ...DEFAULT_FILTERS, yieldMax: "8.0" };
      const matched = FIXTURE.filter((inv) => matchesFilters(inv, f)).map((i) => i.id);
      // Yield ≤ 8.0: inv-low-yield (4.2), inv-mid-yield (6.0).  Note: 8.2 would
      // also match if test used a separate fixture, but in FIXTURE above 8.2% is
      // above 8.0% so it is excluded — confirming strict > max.
      expect(matched).toEqual(["inv-low-yield", "inv-mid-yield"]);
    });

    it("maturityFrom filter alone (lower inclusive)", () => {
      const f = { ...DEFAULT_FILTERS, maturityFrom: "2026-09-01" };
      const matched = FIXTURE.filter((inv) => matchesFilters(inv, f)).map((i) => i.id);
      // Date ≥ 2026-09-01:  inv-low-yield (2027-01-15), inv-eur (09-15),
      // inv-high-yield (11-30) — in FIXTURE definition order
      expect(matched).toEqual(["inv-low-yield", "inv-eur", "inv-high-yield"]);
    });

    it("maturityTo filter alone (upper inclusive)", () => {
      const f = { ...DEFAULT_FILTERS, maturityTo: "2026-07-01" };
      const matched = FIXTURE.filter((inv) => matchesFilters(inv, f)).map((i) => i.id);
      // Date ≤ 2026-07-01:  inv-mid-yield (2026-07-01), inv-gbp (2026-05-30)
      // — in FIXTURE definition order
      expect(matched).toEqual(["inv-mid-yield", "inv-gbp"]);
    });
  });

  describe("intersection of multiple filters (AND)", () => {
    it("currency + yieldMin intersect to single invoice", () => {
      const f = { ...DEFAULT_FILTERS, currency: "USD", yieldMin: "9.0" };
      const matched = FIXTURE.filter((inv) => matchesFilters(inv, f)).map((i) => i.id);
      // USD AND yield ≥ 9.0: inv-high-yield (9.1%)
      expect(matched).toEqual(["inv-high-yield"]);
    });

    it("yield range + maturity range intersect correctly", () => {
      // Yield in [6.0, 9.1] AND maturity in [2026-07-01, 2026-11-30]
      const f = {
        ...DEFAULT_FILTERS,
        yieldMin: "6.0",
        yieldMax: "9.1",
        maturityFrom: "2026-07-01",
        maturityTo: "2026-11-30",
      };
      const matched = FIXTURE.filter((inv) => matchesFilters(inv, f)).map((i) => i.id);
      // Intersection: inv-mid-yield (6.0%, 2026-07-01), inv-eur (8.2%, 2026-09-15),
      // inv-high-yield (9.1%, 2026-11-30)
      expect(matched).toEqual(["inv-mid-yield", "inv-eur", "inv-high-yield"]);
    });

    it("all three filter types simultaneously narrow down to a single match", () => {
      // USD + yield range [9.0, 10.0] + maturity [2026-11-01, 2026-12-31]
      const f = {
        ...DEFAULT_FILTERS,
        currency: "USD",
        yieldMin: "9.0",
        yieldMax: "10.0",
        maturityFrom: "2026-11-01",
        maturityTo: "2026-12-31",
      };
      const matched = FIXTURE.filter((inv) => matchesFilters(inv, f)).map((i) => i.id);
      expect(matched).toEqual(["inv-high-yield"]);
    });

    it("intersection yields the empty set when no invoice satisfies every predicate", () => {
      const f = {
        ...DEFAULT_FILTERS,
        currency: "EUR",
        yieldMin: "20.0", // higher than any EUR yield in the fixture
      };
      expect(FIXTURE.filter((inv) => matchesFilters(inv, f))).toEqual([]);
    });
  });

  describe("boundary samples", () => {
    /**
     * Special-purpose fixtures at the exact predicate boundaries.  These
     * exist **separately** from FIXTURE because they isolate the boundary
     * semantics (an invoice set to value === min / === max / just below / just
     * above) and are easier to read than computing offsets against FIXTURE.
     */
    const invBelow: Invoice = {
      ...FIXTURE[0],
      id: "boundary-below",
      yield: "7.9%",
    };
    const invAtMin: Invoice = {
      ...FIXTURE[0],
      id: "boundary-at-min",
      yield: "8.0%",
    };
    const invAtMax: Invoice = {
      ...FIXTURE[0],
      id: "boundary-at-max",
      yield: "9.0%",
    };
    const invAbove: Invoice = {
      ...FIXTURE[0],
      id: "boundary-above",
      yield: "9.1%",
    };

    it("yield [8.0, 9.0] accepts boundary-at-min and boundary-at-max, rejects the rest", () => {
      const f = { ...DEFAULT_FILTERS, yieldMin: "8.0", yieldMax: "9.0" };
      expect(matchesFilters(invBelow, f)).toBe(false);
      expect(matchesFilters(invAtMin, f)).toBe(true);
      expect(matchesFilters(invAtMax, f)).toBe(true);
      expect(matchesFilters(invAbove, f)).toBe(false);
    });

    it("yieldMin-only [8.0] accepts boundary-at-min inclusive", () => {
      const f = { ...DEFAULT_FILTERS, yieldMin: "8.0" };
      expect(matchesFilters(invBelow, f)).toBe(false);
      expect(matchesFilters(invAtMin, f)).toBe(true);
      expect(matchesFilters(invAbove, f)).toBe(true);
    });

    it("yieldMax-only [9.0] accepts boundary-at-max inclusive", () => {
      const f = { ...DEFAULT_FILTERS, yieldMax: "9.0" };
      expect(matchesFilters(invBelow, f)).toBe(true);
      expect(matchesFilters(invAtMax, f)).toBe(true);
      expect(matchesFilters(invAbove, f)).toBe(false);
    });
  });

  describe("defensive cases", () => {
    it("returns false when invoice is nullish", () => {
      expect(
        matchesFilters(null as unknown as Invoice, { ...DEFAULT_FILTERS, currency: "USD" })
      ).toBe(false);
      expect(
        matchesFilters(undefined as unknown as Invoice, { ...DEFAULT_FILTERS, currency: "USD" })
      ).toBe(false);
    });

    it("short-circuits on first failing predicate when the others are empty", () => {
      // currency failing should make the whole match `false` even if yield + maturity pass
      const usdInvoice: Invoice = { ...FIXTURE[0], currency: "USD" };
      const f = { ...DEFAULT_FILTERS, currency: "EUR" }; // EUR ≠ USD → fails at currency
      expect(matchesFilters(usdInvoice, f)).toBe(false);
    });
  });
});

// ─── 5. Determinism / purity ────────────────────────────────────────────────

describe("predicate purity & determinism", () => {
  it("matchesYieldRange does not mutate its inputs", () => {
    const inv = FIXTURE[2];
    const snapshot = JSON.parse(JSON.stringify(inv));
    matchesYieldRange(inv.yield, "8.0", "9.0");
    expect(inv).toEqual(snapshot);
  });

  it("matchesCurrency does not mutate its inputs", () => {
    const inv = FIXTURE[2];
    const snapshot = JSON.parse(JSON.stringify(inv));
    matchesCurrency(inv.currency, "EUR");
    expect(inv).toEqual(snapshot);
  });

  it("matchesFilters does not mutate the invoice", () => {
    const inv = FIXTURE[2];
    const snapshot = JSON.parse(JSON.stringify(inv));
    const filters = { ...DEFAULT_FILTERS, currency: "EUR", yieldMin: "8.0" };
    matchesFilters(inv, filters);
    expect(inv).toEqual(snapshot);
  });

  it("matchesFilters does not mutate the filters", () => {
    const inv = FIXTURE[2];
    const filters = {
      ...DEFAULT_FILTERS,
      currency: "EUR" as string,
      yieldMin: "8.0" as string,
    };
    const snapshotFilters = JSON.parse(JSON.stringify(filters));
    matchesFilters(inv, filters);
    expect(filters).toEqual(snapshotFilters);
  });

  it("repeated calls with the same inputs return the same answer (deterministic)", () => {
    const inputs: { invoice: Invoice; filters: typeof DEFAULT_FILTERS }[] = [
      { invoice: FIXTURE[0], filters: DEFAULT_FILTERS },
      { invoice: FIXTURE[2], filters: { ...DEFAULT_FILTERS, currency: "USD" } },
      {
        invoice: FIXTURE[2],
        filters: { ...DEFAULT_FILTERS, yieldMin: "8.0", yieldMax: "9.0" },
      },
    ];
    inputs.forEach(({ invoice, filters }) => {
      const first = matchesFilters(invoice, filters);
      for (let i = 0; i < 50; i++) {
        expect(matchesFilters(invoice, filters)).toBe(first);
      }
    });
  });
});
