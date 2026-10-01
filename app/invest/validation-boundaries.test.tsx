/**
 * @file validation-boundaries.test.tsx
 *
 * Focused tests for the validation boundaries defined in app/invest/page.js.
 *
 * Coverage map:
 *   - parseFiltersFromSearchParams  — valid, invalid, duplicate, boundary inputs
 *   - buildSearchParams             — valid, edge, round-trip identity
 *   - filterInvoices                — search, currency, yield, maturity, status, sort
 *   - applySortToList               — all sort columns × both directions, ties, edge inputs
 *   - validateFilterRanges          — valid ranges, equal bounds, crossed bounds, bad formats
 *   - validateLoadInvoicesArgs      — valid args, wrong types, unknown sort/sortDir, nullability
 *   - normalizeInvoicePageResult    — array shorthand, object contract, invalid-cursor flag
 *   - mergeInvoicePages             — deduplication, order preservation, empty inputs
 *
 * None of these tests mount any React component; they exercise pure functions only.
 * This keeps them fast, deterministic, and free of DOM / router dependencies.
 */

import {
  parseFiltersFromSearchParams,
  buildSearchParams,
  filterInvoices,
  applySortToList,
  validateFilterRanges,
  validateLoadInvoicesArgs,
  normalizeInvoicePageResult,
  mergeInvoicePages,
  getInvoiceLoadAnnouncement,
  getPaginationAnnouncement,
  toExportRecord,
} from "./page";
import { DEFAULT_FILTERS } from "@/components/InvoiceFilters";
import { copy } from "../copy/en";

// ─────────────────────────────────────────────────────────────────────────────
// Shared test fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "inv-001",
    issuer: "Acme Corp",
    amount: "1,000",
    currency: "USD",
    dueDate: "2026-06-15",
    yield: "5%",
    status: "Open",
    ...overrides,
  };
}

const INVOICES = [
  makeInvoice({ id: "inv-001", issuer: "Acme Corp",      currency: "USD", dueDate: "2026-06-15", yield: "5%",  status: "Open"   }),
  makeInvoice({ id: "inv-002", issuer: "Beta GmbH",       currency: "EUR", dueDate: "2026-08-01", yield: "8%",  status: "Open"   }),
  makeInvoice({ id: "inv-003", issuer: "Gamma Ltd",       currency: "USD", dueDate: "2026-10-20", yield: "12%", status: "Funded" }),
  makeInvoice({ id: "inv-004", issuer: "Delta Exports",   currency: "GBP", dueDate: "2026-12-31", yield: "3%",  status: "Settled"}),
  makeInvoice({ id: "inv-005", issuer: "Epsilon Finance", currency: "USD", dueDate: "2027-01-15", yield: "9%",  status: "Overdue"}),
];

// ─────────────────────────────────────────────────────────────────────────────
// parseFiltersFromSearchParams
// ─────────────────────────────────────────────────────────────────────────────

describe("parseFiltersFromSearchParams", () => {
  // ── Valid inputs ─────────────────────────────────────────────────────────

  it("returns defaults for empty params", () => {
    const { filters, searchQuery } = parseFiltersFromSearchParams(new URLSearchParams());
    expect(searchQuery).toBe("");
    expect(filters.currency).toBe("");
    expect(filters.yieldMin).toBe("");
    expect(filters.yieldMax).toBe("");
    expect(filters.maturityFrom).toBe("");
    expect(filters.maturityTo).toBe("");
    expect(filters.statuses).toEqual([]);
    expect(filters.sort).toBe("");
  });

  it("parses a valid search query", () => {
    const { searchQuery } = parseFiltersFromSearchParams(new URLSearchParams("q=Acme"));
    expect(searchQuery).toBe("Acme");
  });

  it("trims whitespace from the search query", () => {
    const { searchQuery } = parseFiltersFromSearchParams(new URLSearchParams("q=  Acme  "));
    expect(searchQuery).toBe("Acme");
  });

  it("parses a valid currency", () => {
    const { filters } = parseFiltersFromSearchParams(new URLSearchParams("currency=EUR"));
    expect(filters.currency).toBe("EUR");
  });

  it("parses valid yield bounds", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("yieldMin=3.5&yieldMax=10")
    );
    expect(filters.yieldMin).toBe("3.5");
    expect(filters.yieldMax).toBe("10");
  });

  it("parses yieldMin=0 as a valid boundary value", () => {
    const { filters } = parseFiltersFromSearchParams(new URLSearchParams("yieldMin=0"));
    expect(filters.yieldMin).toBe("0");
  });

  it("parses valid ISO maturity bounds", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("maturityFrom=2026-01-01&maturityTo=2026-12-31")
    );
    expect(filters.maturityFrom).toBe("2026-01-01");
    expect(filters.maturityTo).toBe("2026-12-31");
  });

  it("parses equal maturity bounds (boundary: same-day range)", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("maturityFrom=2026-06-15&maturityTo=2026-06-15")
    );
    expect(filters.maturityFrom).toBe("2026-06-15");
    expect(filters.maturityTo).toBe("2026-06-15");
  });

  it("parses valid statuses and deduplicates them", () => {
    // "Open,Open,Funded" should collapse to ["Open","Funded"]
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("statuses=Open,Open,Funded")
    );
    expect(filters.statuses).toEqual(["Open", "Funded"]);
  });

  it("parses a compound sort param (yield_desc)", () => {
    const { filters } = parseFiltersFromSearchParams(new URLSearchParams("sort=yield_desc"));
    expect(filters.sort).toBe("yield");
    expect(filters.sortDir).toBe("desc");
  });

  it("parses separate sort + sortDir params", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("sort=amount&sortDir=asc")
    );
    expect(filters.sort).toBe("amount");
    expect(filters.sortDir).toBe("asc");
  });

  it("preserves caller-supplied defaults for fields absent from params", () => {
    const customDefaults = { ...DEFAULT_FILTERS, currency: "GBP" };
    const { filters } = parseFiltersFromSearchParams(new URLSearchParams("q=test"), customDefaults);
    // currency is not in params, so the default applies
    expect(filters.currency).toBe("GBP");
  });

  // ── Invalid / rejected inputs ────────────────────────────────────────────

  it("rejects an unrecognised currency and falls back to empty string", () => {
    const { filters } = parseFiltersFromSearchParams(new URLSearchParams("currency=XYZ"));
    expect(filters.currency).toBe("");
  });

  it("rejects a negative yieldMin and falls back to empty string", () => {
    const { filters } = parseFiltersFromSearchParams(new URLSearchParams("yieldMin=-1"));
    expect(filters.yieldMin).toBe("");
  });

  it("rejects a non-numeric yieldMax and falls back to empty string", () => {
    const { filters } = parseFiltersFromSearchParams(new URLSearchParams("yieldMax=abc"));
    expect(filters.yieldMax).toBe("");
  });

  it("rejects an invalid maturityFrom date and falls back to empty string", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("maturityFrom=not-a-date")
    );
    expect(filters.maturityFrom).toBe("");
  });

  it("rejects a rolled-over calendar date (2026-02-30)", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("maturityTo=2026-02-30")
    );
    expect(filters.maturityTo).toBe("");
  });

  it("rejects an unknown sort column", () => {
    const { filters } = parseFiltersFromSearchParams(new URLSearchParams("sort=unknown"));
    expect(filters.sort).toBe("");
  });

  it("rejects an unknown sortDir and falls back to desc", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("sort=yield&sortDir=sideways")
    );
    // A valid sort column with an invalid dir → dir falls back to "desc"
    expect(filters.sort).toBe("yield");
    expect(filters.sortDir).toBe("desc");
  });

  it("strips unknown statuses and keeps only valid ones", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("statuses=Open,Unknown,Funded")
    );
    expect(filters.statuses).toEqual(["Open", "Funded"]);
  });

  it("returns empty statuses array when all supplied statuses are invalid", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("statuses=Pending,Closed")
    );
    expect(filters.statuses).toEqual([]);
  });

  it("ignores completely unknown parameter keys", () => {
    const { filters, searchQuery } = parseFiltersFromSearchParams(
      new URLSearchParams("foo=bar&hack=<script>")
    );
    expect(searchQuery).toBe("");
    expect(filters.currency).toBe("");
  });

  // ── Duplicate / concurrent inputs ────────────────────────────────────────

  it("uses the first occurrence when a key is duplicated in URLSearchParams", () => {
    // URLSearchParams.get() returns the first value; subsequent ones are ignored
    const params = new URLSearchParams();
    params.append("currency", "USD");
    params.append("currency", "EUR");
    const { filters } = parseFiltersFromSearchParams(params);
    expect(filters.currency).toBe("USD");
  });

  it("deduplicates statuses across separate status chips and comma-list", () => {
    const { filters } = parseFiltersFromSearchParams(
      new URLSearchParams("statuses=Open,Funded,Open,Open")
    );
    const unique = new Set(filters.statuses);
    expect(unique.size).toBe(filters.statuses.length);
  });

  // ── Null / undefined / edge inputs ───────────────────────────────────────

  it("handles null searchParams gracefully (falls back to defaults)", () => {
    const { filters, searchQuery } = parseFiltersFromSearchParams(
      null as unknown as URLSearchParams
    );
    expect(searchQuery).toBe("");
    expect(filters.currency).toBe("");
  });

  it("handles undefined searchParams gracefully", () => {
    const { filters } = parseFiltersFromSearchParams(
      undefined as unknown as URLSearchParams
    );
    expect(filters.currency).toBe("");
  });

  it("treats an empty statuses string as no statuses", () => {
    const { filters } = parseFiltersFromSearchParams(new URLSearchParams("statuses="));
    expect(filters.statuses).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSearchParams
// ─────────────────────────────────────────────────────────────────────────────

describe("buildSearchParams", () => {
  it("produces an empty string for default / blank filters", () => {
    const params = buildSearchParams(DEFAULT_FILTERS, "");
    expect(params.toString()).toBe("");
  });

  it("includes the search query when non-empty", () => {
    const params = buildSearchParams(DEFAULT_FILTERS, "Acme");
    expect(params.get("q")).toBe("Acme");
  });

  it("omits the search query when only whitespace", () => {
    const params = buildSearchParams(DEFAULT_FILTERS, "   ");
    expect(params.has("q")).toBe(false);
  });

  it("includes currency when set", () => {
    const params = buildSearchParams({ ...DEFAULT_FILTERS, currency: "EUR" }, "");
    expect(params.get("currency")).toBe("EUR");
  });

  it("omits currency when empty", () => {
    const params = buildSearchParams({ ...DEFAULT_FILTERS, currency: "" }, "");
    expect(params.has("currency")).toBe(false);
  });

  it("includes both yield bounds", () => {
    const params = buildSearchParams({ ...DEFAULT_FILTERS, yieldMin: "2", yieldMax: "8" }, "");
    expect(params.get("yieldMin")).toBe("2");
    expect(params.get("yieldMax")).toBe("8");
  });

  it("omits yield bounds when empty string", () => {
    const params = buildSearchParams({ ...DEFAULT_FILTERS, yieldMin: "", yieldMax: "" }, "");
    expect(params.has("yieldMin")).toBe(false);
    expect(params.has("yieldMax")).toBe(false);
  });

  it("includes maturity bounds when set", () => {
    const params = buildSearchParams(
      { ...DEFAULT_FILTERS, maturityFrom: "2026-01-01", maturityTo: "2026-12-31" },
      ""
    );
    expect(params.get("maturityFrom")).toBe("2026-01-01");
    expect(params.get("maturityTo")).toBe("2026-12-31");
  });

  it("includes sort and sortDir when sort is set", () => {
    const params = buildSearchParams({ ...DEFAULT_FILTERS, sort: "yield", sortDir: "asc" }, "");
    expect(params.get("sort")).toBe("yield");
    expect(params.get("sortDir")).toBe("asc");
  });

  it("defaults sortDir to desc when sort is set but sortDir is empty", () => {
    const params = buildSearchParams({ ...DEFAULT_FILTERS, sort: "amount", sortDir: "" }, "");
    expect(params.get("sortDir")).toBe("desc");
  });

  it("omits sort and sortDir when sort is empty", () => {
    const params = buildSearchParams({ ...DEFAULT_FILTERS, sort: "", sortDir: "asc" }, "");
    expect(params.has("sort")).toBe(false);
    expect(params.has("sortDir")).toBe(false);
  });

  it("includes valid statuses", () => {
    const params = buildSearchParams(
      { ...DEFAULT_FILTERS, statuses: ["Open", "Funded"] },
      ""
    );
    expect(params.get("statuses")).toBe("Open,Funded");
  });

  it("strips invalid statuses before encoding", () => {
    const params = buildSearchParams(
      { ...DEFAULT_FILTERS, statuses: ["Open", "Bogus" as string] },
      ""
    );
    expect(params.get("statuses")).toBe("Open");
  });

  it("omits statuses when the array is empty", () => {
    const params = buildSearchParams({ ...DEFAULT_FILTERS, statuses: [] }, "");
    expect(params.has("statuses")).toBe(false);
  });

  // ── Round-trip identity ───────────────────────────────────────────────────

  it("round-trips a fully-populated filter state through parse → build", () => {
    const original = new URLSearchParams(
      "q=Acme&currency=USD&yieldMin=3&yieldMax=9&maturityFrom=2026-01-01&maturityTo=2026-12-31&sort=yield&sortDir=asc&statuses=Open,Funded"
    );
    const { filters, searchQuery } = parseFiltersFromSearchParams(original);
    const rebuilt = buildSearchParams(filters, searchQuery);
    // Re-parse the rebuilt params and compare
    const { filters: filters2, searchQuery: sq2 } = parseFiltersFromSearchParams(rebuilt);
    expect(filters2).toEqual(filters);
    expect(sq2).toBe(searchQuery);
  });

  it("produces a deterministic string for the same input regardless of call order", () => {
    const filters = { ...DEFAULT_FILTERS, currency: "USD", sort: "yield", sortDir: "desc", statuses: ["Open"] };
    expect(buildSearchParams(filters, "test").toString()).toBe(
      buildSearchParams({ ...filters }, "test").toString()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// filterInvoices
// ─────────────────────────────────────────────────────────────────────────────

describe("filterInvoices", () => {
  // ── Valid / accepted inputs ───────────────────────────────────────────────

  it("returns all invoices when no filters are active", () => {
    expect(filterInvoices(INVOICES, "", DEFAULT_FILTERS)).toHaveLength(INVOICES.length);
  });

  it("filters by case-insensitive issuer search", () => {
    const result = filterInvoices(INVOICES, "acme", DEFAULT_FILTERS);
    expect(result).toHaveLength(1);
    expect(result[0].issuer).toBe("Acme Corp");
  });

  it("filters by partial issuer match", () => {
    const result = filterInvoices(INVOICES, "a", DEFAULT_FILTERS);
    // Acme, Gamma, Delta, Epsilon all contain 'a' (case-insensitive)
    expect(result.length).toBeGreaterThan(1);
    result.forEach((inv) => expect(inv.issuer.toLowerCase()).toContain("a"));
  });

  it("filters by currency", () => {
    const result = filterInvoices(INVOICES, "", { ...DEFAULT_FILTERS, currency: "USD" });
    expect(result.every((inv) => inv.currency === "USD")).toBe(true);
  });

  it("filters by minimum yield (inclusive lower bound)", () => {
    // inv-002: 8%, inv-003: 12%, inv-005: 9% ≥ 8
    const result = filterInvoices(INVOICES, "", { ...DEFAULT_FILTERS, yieldMin: "8" });
    expect(result.every((inv) => parseFloat(inv.yield) >= 8)).toBe(true);
  });

  it("includes invoices at exactly yieldMin (boundary inclusive)", () => {
    const result = filterInvoices(INVOICES, "", { ...DEFAULT_FILTERS, yieldMin: "5" });
    expect(result.some((inv) => inv.id === "inv-001")).toBe(true);
  });

  it("filters by maximum yield (inclusive upper bound)", () => {
    const result = filterInvoices(INVOICES, "", { ...DEFAULT_FILTERS, yieldMax: "6" });
    expect(result.every((inv) => parseFloat(inv.yield) <= 6)).toBe(true);
  });

  it("includes invoices at exactly yieldMax (boundary inclusive)", () => {
    const result = filterInvoices(INVOICES, "", { ...DEFAULT_FILTERS, yieldMax: "5" });
    expect(result.some((inv) => inv.id === "inv-001")).toBe(true);
  });

  it("applies both yield bounds together (range filter)", () => {
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      yieldMin: "5",
      yieldMax: "9",
    });
    result.forEach((inv) => {
      const y = parseFloat(inv.yield);
      expect(y).toBeGreaterThanOrEqual(5);
      expect(y).toBeLessThanOrEqual(9);
    });
  });

  it("returns empty array when yieldMin === yieldMax and no invoice matches exactly", () => {
    // No invoice has exactly 7%
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      yieldMin: "7",
      yieldMax: "7",
    });
    expect(result).toHaveLength(0);
  });

  it("returns the single matching invoice when yieldMin === yieldMax === exact yield", () => {
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      yieldMin: "5",
      yieldMax: "5",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("inv-001");
  });

  it("filters by maturityFrom (inclusive)", () => {
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      maturityFrom: "2026-10-20",
    });
    result.forEach((inv) => expect(inv.dueDate >= "2026-10-20").toBe(true));
  });

  it("includes invoices whose dueDate === maturityFrom (boundary inclusive)", () => {
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      maturityFrom: "2026-10-20",
    });
    expect(result.some((inv) => inv.dueDate === "2026-10-20")).toBe(true);
  });

  it("filters by maturityTo (inclusive)", () => {
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      maturityTo: "2026-08-01",
    });
    result.forEach((inv) => expect(inv.dueDate <= "2026-08-01").toBe(true));
  });

  it("applies both maturity bounds together", () => {
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      maturityFrom: "2026-06-15",
      maturityTo: "2026-10-20",
    });
    result.forEach((inv) => {
      expect(inv.dueDate >= "2026-06-15").toBe(true);
      expect(inv.dueDate <= "2026-10-20").toBe(true);
    });
  });

  it("filters by a single status", () => {
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      statuses: ["Funded"],
    });
    expect(result.every((inv) => inv.status === "Funded")).toBe(true);
  });

  it("filters by multiple statuses (OR semantics)", () => {
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      statuses: ["Open", "Funded"],
    });
    result.forEach((inv) => {
      expect(["Open", "Funded"]).toContain(inv.status);
    });
  });

  it("combines search + currency + status filters correctly", () => {
    const result = filterInvoices(INVOICES, "acme", {
      ...DEFAULT_FILTERS,
      currency: "USD",
      statuses: ["Open"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("inv-001");
  });

  // ── Rejected / empty results ──────────────────────────────────────────────

  it("returns empty array when no invoice matches the search query", () => {
    expect(filterInvoices(INVOICES, "zzznoexist", DEFAULT_FILTERS)).toHaveLength(0);
  });

  it("returns empty array when currency filter matches nothing", () => {
    const result = filterInvoices(INVOICES, "", { ...DEFAULT_FILTERS, currency: "JPY" });
    expect(result).toHaveLength(0);
  });

  it("returns empty array when status filter matches nothing", () => {
    const result = filterInvoices(INVOICES, "", {
      ...DEFAULT_FILTERS,
      statuses: ["Settled"],
    });
    const settledInvoices = INVOICES.filter((i) => i.status === "Settled");
    expect(result).toHaveLength(settledInvoices.length);
  });

  it("returns empty array when yieldMin exceeds all invoice yields", () => {
    const result = filterInvoices(INVOICES, "", { ...DEFAULT_FILTERS, yieldMin: "999" });
    expect(result).toHaveLength(0);
  });

  // ── Boundary / edge inputs ────────────────────────────────────────────────

  it("returns empty array for null invoice input", () => {
    expect(filterInvoices(null as unknown as never[], "", DEFAULT_FILTERS)).toEqual([]);
  });

  it("returns empty array for undefined invoice input", () => {
    expect(filterInvoices(undefined as unknown as never[], "", DEFAULT_FILTERS)).toEqual([]);
  });

  it("returns empty array for non-array invoice input", () => {
    expect(filterInvoices("not-an-array" as unknown as never[], "", DEFAULT_FILTERS)).toEqual([]);
  });

  it("returns empty array for an empty invoice list", () => {
    expect(filterInvoices([], "Acme", DEFAULT_FILTERS)).toHaveLength(0);
  });

  it("handles invoices that are missing the issuer field gracefully", () => {
    const noIssuer = [makeInvoice({ issuer: undefined })];
    // Should not throw; issuer check uses optional chaining
    expect(() => filterInvoices(noIssuer, "acme", DEFAULT_FILTERS)).not.toThrow();
  });

  it("treats a whitespace-only search query as no search filter", () => {
    const result = filterInvoices(INVOICES, "   ", DEFAULT_FILTERS);
    expect(result).toHaveLength(INVOICES.length);
  });

  // ── Watchlist filter ──────────────────────────────────────────────────────

  it("applies watchlistOnly filter using supplied watchlists", () => {
    const watchlists = [{ invoiceIds: ["inv-001", "inv-003"] }];
    const result = filterInvoices(INVOICES, "", { ...DEFAULT_FILTERS, watchlistOnly: true }, watchlists);
    expect(result.map((i) => i.id).sort()).toEqual(["inv-001", "inv-003"].sort());
  });

  it("returns empty array for watchlistOnly with no watchlist entries", () => {
    const result = filterInvoices(INVOICES, "", { ...DEFAULT_FILTERS, watchlistOnly: true }, []);
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applySortToList
// ─────────────────────────────────────────────────────────────────────────────

describe("applySortToList", () => {
  const list = [
    makeInvoice({ id: "a", amount: "2,000", yield: "8%",  dueDate: "2026-08-01" }),
    makeInvoice({ id: "b", amount: "1,000", yield: "5%",  dueDate: "2026-06-15" }),
    makeInvoice({ id: "c", amount: "5,000", yield: "12%", dueDate: "2027-01-15" }),
  ];

  it("sorts by amount ascending", () => {
    const result = applySortToList(list, { ...DEFAULT_FILTERS, sort: "amount", sortDir: "asc" });
    expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by amount descending", () => {
    const result = applySortToList(list, { ...DEFAULT_FILTERS, sort: "amount", sortDir: "desc" });
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by yield ascending", () => {
    const result = applySortToList(list, { ...DEFAULT_FILTERS, sort: "yield", sortDir: "asc" });
    expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by yield descending", () => {
    const result = applySortToList(list, { ...DEFAULT_FILTERS, sort: "yield", sortDir: "desc" });
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by maturity ascending", () => {
    const result = applySortToList(list, { ...DEFAULT_FILTERS, sort: "maturity", sortDir: "asc" });
    expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by maturity descending", () => {
    const result = applySortToList(list, { ...DEFAULT_FILTERS, sort: "maturity", sortDir: "desc" });
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("returns the list unchanged when no sort column is set", () => {
    const result = applySortToList(list, { ...DEFAULT_FILTERS, sort: "" });
    expect(result.map((i) => i.id)).toEqual(list.map((i) => i.id));
  });

  it("does not mutate the original array", () => {
    const original = [...list];
    applySortToList(list, { ...DEFAULT_FILTERS, sort: "yield", sortDir: "asc" });
    expect(list.map((i) => i.id)).toEqual(original.map((i) => i.id));
  });

  it("returns the list as-is for a single-element array", () => {
    const single = [makeInvoice({ id: "only" })];
    const result = applySortToList(single, { ...DEFAULT_FILTERS, sort: "yield", sortDir: "desc" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("only");
  });

  it("returns an empty array for an empty input", () => {
    expect(applySortToList([], { ...DEFAULT_FILTERS, sort: "yield", sortDir: "asc" })).toEqual([]);
  });

  it("returns null/undefined input unchanged", () => {
    expect(applySortToList(null as unknown as never[], DEFAULT_FILTERS)).toBeNull();
    expect(applySortToList(undefined as unknown as never[], DEFAULT_FILTERS)).toBeUndefined();
  });

  it("handles tied amounts stably (does not throw)", () => {
    const tied = [
      makeInvoice({ id: "x", amount: "1,000" }),
      makeInvoice({ id: "y", amount: "1,000" }),
    ];
    expect(() =>
      applySortToList(tied, { ...DEFAULT_FILTERS, sort: "amount", sortDir: "asc" })
    ).not.toThrow();
  });

  it("handles comma-formatted amounts correctly (12,500 > 1,000)", () => {
    const withCommas = [
      makeInvoice({ id: "big",   amount: "12,500" }),
      makeInvoice({ id: "small", amount: "1,000" }),
    ];
    const result = applySortToList(withCommas, { ...DEFAULT_FILTERS, sort: "amount", sortDir: "asc" });
    expect(result[0].id).toBe("small");
    expect(result[1].id).toBe("big");
  });

  it("handles percentage-formatted yield strings correctly (12% > 5%)", () => {
    const yields = [
      makeInvoice({ id: "high", yield: "12%" }),
      makeInvoice({ id: "low",  yield: "5%" }),
    ];
    const result = applySortToList(yields, { ...DEFAULT_FILTERS, sort: "yield", sortDir: "asc" });
    expect(result[0].id).toBe("low");
    expect(result[1].id).toBe("high");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateFilterRanges
// ─────────────────────────────────────────────────────────────────────────────

describe("validateFilterRanges", () => {
  // ── Valid / accepted inputs ───────────────────────────────────────────────

  it("returns an empty errors object for default filters", () => {
    expect(validateFilterRanges(DEFAULT_FILTERS)).toEqual({});
  });

  it("accepts yieldMin = 0 (boundary: zero is valid)", () => {
    expect(validateFilterRanges({ ...DEFAULT_FILTERS, yieldMin: "0" })).not.toHaveProperty("yieldMin");
  });

  it("accepts yieldMin === yieldMax (equal boundary)", () => {
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, yieldMin: "5", yieldMax: "5" });
    expect(errors).not.toHaveProperty("yieldRange");
  });

  it("accepts maturityFrom === maturityTo (single-day range)", () => {
    const errors = validateFilterRanges({
      ...DEFAULT_FILTERS,
      maturityFrom: "2026-06-15",
      maturityTo: "2026-06-15",
    });
    expect(errors).not.toHaveProperty("maturityRange");
  });

  it("accepts valid yield range (min < max)", () => {
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, yieldMin: "3", yieldMax: "10" });
    expect(errors).toEqual({});
  });

  it("accepts valid maturity range (from < to)", () => {
    const errors = validateFilterRanges({
      ...DEFAULT_FILTERS,
      maturityFrom: "2026-01-01",
      maturityTo: "2026-12-31",
    });
    expect(errors).toEqual({});
  });

  it("ignores absent fields (empty string = not set)", () => {
    // Only yieldMin is set; yieldMax is absent — no range error possible
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, yieldMin: "5", yieldMax: "" });
    expect(errors).toEqual({});
  });

  // ── Invalid / rejected inputs ────────────────────────────────────────────

  it("flags yieldMin when it is a negative number", () => {
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, yieldMin: "-1" });
    expect(errors.yieldMin).toBe(copy.invest.filters.errorYieldMin);
  });

  it("flags yieldMin when it is non-numeric text", () => {
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, yieldMin: "abc" });
    expect(errors.yieldMin).toBe(copy.invest.filters.errorYieldMin);
  });

  it("flags yieldMax when it is negative", () => {
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, yieldMax: "-0.01" });
    expect(errors.yieldMax).toBe(copy.invest.filters.errorYieldMax);
  });

  it("flags yieldRange when yieldMin > yieldMax", () => {
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, yieldMin: "10", yieldMax: "5" });
    expect(errors.yieldRange).toBe(copy.invest.filters.errorYieldRange);
  });

  it("does not add yieldRange error when yieldMin is already individually invalid", () => {
    // If yieldMin is not a number we can't compare, so range error should be absent
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, yieldMin: "bad", yieldMax: "5" });
    expect(errors.yieldMin).toBeDefined();
    expect(errors.yieldRange).toBeUndefined();
  });

  it("flags maturityFrom for an invalid date string", () => {
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, maturityFrom: "not-a-date" });
    expect(errors.maturityFrom).toBe(copy.invest.filters.errorMaturityFrom);
  });

  it("flags maturityTo for a rolled-over calendar date", () => {
    const errors = validateFilterRanges({ ...DEFAULT_FILTERS, maturityTo: "2026-02-30" });
    expect(errors.maturityTo).toBe(copy.invest.filters.errorMaturityTo);
  });

  it("flags maturityRange when maturityFrom is after maturityTo", () => {
    const errors = validateFilterRanges({
      ...DEFAULT_FILTERS,
      maturityFrom: "2026-12-31",
      maturityTo: "2026-01-01",
    });
    expect(errors.maturityRange).toBe(copy.invest.filters.errorMaturityRange);
  });

  it("does not add maturityRange error when maturityFrom is individually invalid", () => {
    const errors = validateFilterRanges({
      ...DEFAULT_FILTERS,
      maturityFrom: "bad",
      maturityTo: "2026-12-31",
    });
    expect(errors.maturityFrom).toBeDefined();
    expect(errors.maturityRange).toBeUndefined();
  });

  it("can report multiple independent errors simultaneously", () => {
    const errors = validateFilterRanges({
      ...DEFAULT_FILTERS,
      yieldMin: "-1",      // invalid yieldMin
      maturityFrom: "x",   // invalid maturityFrom
    });
    expect(errors.yieldMin).toBeDefined();
    expect(errors.maturityFrom).toBeDefined();
  });

  // ── Edge / boundary inputs ────────────────────────────────────────────────

  it("returns empty object for null input", () => {
    expect(validateFilterRanges(null as unknown as typeof DEFAULT_FILTERS)).toEqual({});
  });

  it("returns empty object for undefined input", () => {
    expect(validateFilterRanges(undefined as unknown as typeof DEFAULT_FILTERS)).toEqual({});
  });

  it("handles a filters object with only numeric yieldMin (no other fields)", () => {
    const errors = validateFilterRanges({ yieldMin: "5" } as typeof DEFAULT_FILTERS);
    expect(errors).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateLoadInvoicesArgs
// ─────────────────────────────────────────────────────────────────────────────

describe("validateLoadInvoicesArgs", () => {
  // ── Valid / accepted inputs ───────────────────────────────────────────────

  it("accepts a fully-populated valid args object", () => {
    expect(
      validateLoadInvoicesArgs({
        cursor: null,
        filters: DEFAULT_FILTERS,
        search: "acme",
        sort: "yield",
        sortDir: "desc",
      })
    ).toBeNull();
  });

  it("accepts cursor = null (first-page load)", () => {
    expect(validateLoadInvoicesArgs({ cursor: null })).toBeNull();
  });

  it("accepts a valid non-empty cursor string", () => {
    expect(validateLoadInvoicesArgs({ cursor: "page-token-abc" })).toBeNull();
  });

  it("accepts cursor = undefined (treated as absent)", () => {
    expect(validateLoadInvoicesArgs({ cursor: undefined })).toBeNull();
  });

  it("accepts all three valid sort columns", () => {
    for (const sort of ["amount", "yield", "maturity"]) {
      expect(validateLoadInvoicesArgs({ sort })).toBeNull();
    }
  });

  it("accepts both valid sortDir values", () => {
    expect(validateLoadInvoicesArgs({ sortDir: "asc" })).toBeNull();
    expect(validateLoadInvoicesArgs({ sortDir: "desc" })).toBeNull();
  });

  it("accepts empty string sort (no sort)", () => {
    expect(validateLoadInvoicesArgs({ sort: "" })).toBeNull();
  });

  it("accepts empty string sortDir (no direction)", () => {
    expect(validateLoadInvoicesArgs({ sortDir: "" })).toBeNull();
  });

  it("accepts an empty filters object", () => {
    expect(validateLoadInvoicesArgs({ filters: {} })).toBeNull();
  });

  it("accepts filters = null (treated as absent)", () => {
    expect(validateLoadInvoicesArgs({ filters: null })).toBeNull();
  });

  it("accepts an empty args object (all fields optional)", () => {
    expect(validateLoadInvoicesArgs({})).toBeNull();
  });

  // ── Invalid / rejected inputs ────────────────────────────────────────────

  it("rejects null args (must be a plain object)", () => {
    expect(validateLoadInvoicesArgs(null as unknown as Record<string, unknown>)).not.toBeNull();
  });

  it("rejects a non-object args argument", () => {
    expect(validateLoadInvoicesArgs("string" as unknown as Record<string, unknown>)).not.toBeNull();
    expect(validateLoadInvoicesArgs(42 as unknown as Record<string, unknown>)).not.toBeNull();
  });

  it("rejects an array args argument", () => {
    expect(validateLoadInvoicesArgs([] as unknown as Record<string, unknown>)).not.toBeNull();
  });

  it("rejects a numeric cursor", () => {
    expect(validateLoadInvoicesArgs({ cursor: 123 })).not.toBeNull();
  });

  it("rejects an empty-string cursor (ambiguous — use null for first page)", () => {
    expect(validateLoadInvoicesArgs({ cursor: "" })).not.toBeNull();
  });

  it("rejects a boolean cursor", () => {
    expect(validateLoadInvoicesArgs({ cursor: true })).not.toBeNull();
  });

  it("rejects an array as the filters value", () => {
    expect(validateLoadInvoicesArgs({ filters: [] })).not.toBeNull();
  });

  it("rejects a numeric search value", () => {
    expect(validateLoadInvoicesArgs({ search: 42 })).not.toBeNull();
  });

  it("rejects an unknown sort column", () => {
    const err = validateLoadInvoicesArgs({ sort: "unknown" });
    expect(err).not.toBeNull();
    expect(err).toContain("amount");
  });

  it("rejects an invalid sortDir", () => {
    const err = validateLoadInvoicesArgs({ sortDir: "sideways" });
    expect(err).not.toBeNull();
    expect(err).toContain("asc");
  });

  // ── Boundary ─────────────────────────────────────────────────────────────

  it("returns a non-empty string on failure (always diagnosable)", () => {
    const err = validateLoadInvoicesArgs(null as unknown as Record<string, unknown>);
    expect(typeof err).toBe("string");
    expect(err!.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// normalizeInvoicePageResult
// ─────────────────────────────────────────────────────────────────────────────

describe("normalizeInvoicePageResult", () => {
  const inv = makeInvoice();

  // ── Valid inputs ──────────────────────────────────────────────────────────

  it("handles a raw array (legacy shorthand)", () => {
    const result = normalizeInvoicePageResult([inv]);
    expect(result.items).toEqual([inv]);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
    expect(result.invalidCursor).toBe(false);
  });

  it("handles a well-formed page object", () => {
    const result = normalizeInvoicePageResult({
      items: [inv],
      nextCursor: "page-2",
      hasMore: true,
    });
    expect(result.items).toEqual([inv]);
    expect(result.nextCursor).toBe("page-2");
    expect(result.hasMore).toBe(true);
    expect(result.invalidCursor).toBe(false);
  });

  it("infers hasMore=true from a non-null nextCursor even when hasMore is false", () => {
    const result = normalizeInvoicePageResult({
      items: [inv],
      nextCursor: "some-token",
      hasMore: false,
    });
    expect(result.hasMore).toBe(true);
  });

  it("recognises the invalidCursor flag", () => {
    const result = normalizeInvoicePageResult({
      invalidCursor: true,
      items: [],
      nextCursor: null,
      hasMore: false,
    });
    expect(result.invalidCursor).toBe(true);
    expect(result.items).toEqual([]);
  });

  it("handles the last page (nextCursor=null, hasMore=false)", () => {
    const result = normalizeInvoicePageResult({
      items: [inv],
      nextCursor: null,
      hasMore: false,
    });
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  // ── Invalid / edge inputs ─────────────────────────────────────────────────

  it("handles null payload gracefully", () => {
    const result = normalizeInvoicePageResult(null);
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.invalidCursor).toBe(false);
  });

  it("handles undefined payload gracefully", () => {
    const result = normalizeInvoicePageResult(undefined);
    expect(result.items).toEqual([]);
  });

  it("treats a non-array items value as an empty array", () => {
    const result = normalizeInvoicePageResult({ items: "not-an-array" });
    expect(result.items).toEqual([]);
  });

  it("treats a non-string nextCursor as null", () => {
    const result = normalizeInvoicePageResult({ items: [], nextCursor: 42, hasMore: false });
    expect(result.nextCursor).toBeNull();
  });

  it("handles an empty items array on the first page", () => {
    const result = normalizeInvoicePageResult({ items: [], nextCursor: null, hasMore: false });
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mergeInvoicePages
// ─────────────────────────────────────────────────────────────────────────────

describe("mergeInvoicePages", () => {
  const page1 = [
    makeInvoice({ id: "inv-001" }),
    makeInvoice({ id: "inv-002" }),
    makeInvoice({ id: "inv-003" }),
  ];
  const page2 = [
    makeInvoice({ id: "inv-004" }),
    makeInvoice({ id: "inv-005" }),
  ];

  // ── Valid inputs ──────────────────────────────────────────────────────────

  it("combines two non-overlapping pages in insertion order", () => {
    const merged = mergeInvoicePages(page1, page2);
    expect(merged.map((i) => i.id)).toEqual([
      "inv-001", "inv-002", "inv-003", "inv-004", "inv-005",
    ]);
  });

  it("deduplicates a row that appears in both pages (incoming wins)", () => {
    const updated = makeInvoice({ id: "inv-002", issuer: "Updated GmbH" });
    const merged = mergeInvoicePages(page1, [updated]);
    // The id appears once
    const ids = merged.map((i) => i.id);
    expect(ids.filter((id) => id === "inv-002")).toHaveLength(1);
    // The incoming (newer) value wins
    const row = merged.find((i) => i.id === "inv-002");
    expect(row?.issuer).toBe("Updated GmbH");
  });

  it("deduplicates when new invoices arrive between pages (classic pagination race)", () => {
    // inv-002 appears on both pages — a row that arrived after page 1 was fetched
    const overlap = [makeInvoice({ id: "inv-002" }), makeInvoice({ id: "inv-006" })];
    const merged = mergeInvoicePages(page1, overlap);
    const ids = merged.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
  });

  it("returns an empty array when both pages are empty", () => {
    expect(mergeInvoicePages([], [])).toEqual([]);
  });

  it("handles an empty current page (first append is identity)", () => {
    const merged = mergeInvoicePages([], page2);
    expect(merged.map((i) => i.id)).toEqual(["inv-004", "inv-005"]);
  });

  it("handles an empty incoming page (no change)", () => {
    const merged = mergeInvoicePages(page1, []);
    expect(merged.map((i) => i.id)).toEqual(["inv-001", "inv-002", "inv-003"]);
  });

  it("skips items that have no id field (defensive guard)", () => {
    const withNull = [{ issuer: "No ID" } as ReturnType<typeof makeInvoice>];
    const merged = mergeInvoicePages(withNull, page2);
    // The id-less item should not appear
    expect(merged.every((i) => !!i.id)).toBe(true);
  });

  it("handles default parameters (both default to [])", () => {
    expect(mergeInvoicePages()).toEqual([]);
  });

  // ── Boundary ──────────────────────────────────────────────────────────────

  it("preserves the insertion order from current then incoming for unique ids", () => {
    const a = [makeInvoice({ id: "a" }), makeInvoice({ id: "b" })];
    const b = [makeInvoice({ id: "c" })];
    const merged = mergeInvoicePages(a, b);
    expect(merged.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("does not duplicate when the same item is fetched on three consecutive pages", () => {
    const shared = makeInvoice({ id: "shared" });
    let acc = mergeInvoicePages([], [shared]);
    acc = mergeInvoicePages(acc, [shared]);
    acc = mergeInvoicePages(acc, [shared]);
    expect(acc.filter((i) => i.id === "shared")).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getInvoiceLoadAnnouncement
// ─────────────────────────────────────────────────────────────────────────────

describe("getInvoiceLoadAnnouncement", () => {
  it("returns the no-invoices copy for an empty list", () => {
    expect(getInvoiceLoadAnnouncement([])).toBe(copy.invest.announceNoInvoices);
  });

  it("returns the no-invoices copy for null input", () => {
    expect(getInvoiceLoadAnnouncement(null as unknown as never[])).toBe(copy.invest.announceNoInvoices);
  });

  it("returns the loaded count announcement for a non-empty list with no filter", () => {
    const msg = getInvoiceLoadAnnouncement([makeInvoice(), makeInvoice()]);
    expect(msg).toContain("2");
  });

  it("returns no-match copy when filter is active but filteredCount is 0", () => {
    const msg = getInvoiceLoadAnnouncement([makeInvoice()], { filterActive: true, filteredCount: 0 });
    expect(msg).toBe(copy.invest.announceNoMatch);
  });

  it("returns filtered count template when filter is active and some invoices match", () => {
    const msg = getInvoiceLoadAnnouncement(
      [makeInvoice(), makeInvoice(), makeInvoice()],
      { filterActive: true, filteredCount: 1 }
    );
    expect(msg).toContain("1");
    expect(msg).toContain("3");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPaginationAnnouncement
// ─────────────────────────────────────────────────────────────────────────────

describe("getPaginationAnnouncement", () => {
  it("returns the no-invoices copy when total is 0", () => {
    expect(getPaginationAnnouncement(0, 0)).toBe(copy.invest.announceNoInvoices);
  });

  it("returns the showing template with both counts interpolated", () => {
    const msg = getPaginationAnnouncement(10, 25);
    expect(msg).toContain("10");
    expect(msg).toContain("25");
  });

  it("handles shown === total (end of list)", () => {
    const msg = getPaginationAnnouncement(15, 15);
    expect(msg).toContain("15");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toExportRecord
// ─────────────────────────────────────────────────────────────────────────────

describe("toExportRecord", () => {
  it("projects only the seven public fields", () => {
    const full = { ...makeInvoice(), events: [{ id: "e1" }], amountValue: 1000, extra: "secret" };
    const record = toExportRecord(full);
    expect(Object.keys(record).sort()).toEqual(
      ["id", "issuer", "amount", "currency", "dueDate", "yield", "status"].sort()
    );
  });

  it("preserves the field values exactly", () => {
    const inv = makeInvoice();
    const record = toExportRecord(inv);
    expect(record.id).toBe(inv.id);
    expect(record.issuer).toBe(inv.issuer);
    expect(record.amount).toBe(inv.amount);
    expect(record.currency).toBe(inv.currency);
    expect(record.dueDate).toBe(inv.dueDate);
    expect(record.yield).toBe(inv.yield);
    expect(record.status).toBe(inv.status);
  });

  it("does not include internal fields (events, amountValue, etc.)", () => {
    const full = { ...makeInvoice(), events: [], amountValue: 1000 };
    const record = toExportRecord(full);
    expect(record).not.toHaveProperty("events");
    expect(record).not.toHaveProperty("amountValue");
  });
});
