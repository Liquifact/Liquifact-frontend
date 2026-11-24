/**
 * tests/marketplaceQuery.test.mjs
 *
 * Pure unit tests for lib/marketplaceQuery.js using node:test (no JSX, no DOM).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseQuery,
  serializeQuery,
  applyQuery,
  DEFAULTS,
  DUE_WINDOW_OPTIONS,
} from "../lib/marketplaceQuery.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const INVOICES = [
  {
    id: "INV_0001",
    sme: "Acme Components Ltd",
    debtor: "Globex Retail",
    amount: 100,
    currency: "XLM",
    fundedAmount: 0,
    yieldBps: 800,
    dueDate: "2027-01-17",
    status: "open",
  },
  {
    id: "INV_0002",
    sme: "Northwind Textiles",
    debtor: "Initech Wholesale",
    amount: 25000,
    currency: "USDC",
    fundedAmount: 18000,
    yieldBps: 650,
    dueDate: "2026-12-30",
    status: "open",
  },
  {
    id: "INV_0003",
    sme: "Blue Harbor Logistics",
    debtor: "Umbrella Foods",
    amount: 42000,
    currency: "USDC",
    fundedAmount: 42000,
    yieldBps: 720,
    dueDate: "2026-11-28",
    status: "funded",
  },
  {
    id: "INV_0004",
    sme: "Sunrise Agritech",
    debtor: "Stark Industries",
    amount: 12500,
    currency: "USDC",
    fundedAmount: 12500,
    yieldBps: 900,
    dueDate: "2026-09-30",
    status: "settled",
  },
  {
    id: "INV_0005",
    sme: "Delta Freight",
    debtor: "North Star Exports",
    amount: 5000,
    currency: "USDC",
    fundedAmount: 0,
    yieldBps: 1000,
    dueDate: "2026-10-15",
    status: "cancelled",
  },
];

// Helper: build a plain-object searchParams (no URLSearchParams needed)
function sp(obj) {
  return obj;
}

// ---------------------------------------------------------------------------
// parseQuery
// ---------------------------------------------------------------------------
describe("parseQuery", () => {
  test("returns all defaults for empty params", () => {
    const q = parseQuery(sp({}));
    assert.deepEqual(q, {
      status: DEFAULTS.status,
      currency: DEFAULTS.currency,
      minYieldBps: DEFAULTS.minYieldBps,
      q: DEFAULTS.q,
      sort: DEFAULTS.sort,
      view: DEFAULTS.view,
      page: DEFAULTS.page,
      pageSize: DEFAULTS.pageSize,
      due: DEFAULTS.due,
    });
  });

  test("accepts valid status values", () => {
    for (const s of ["open", "funded", "settled", "cancelled"]) {
      assert.equal(parseQuery(sp({ status: s })).status, s);
    }
  });

  test("drops unknown status", () => {
    assert.equal(parseQuery(sp({ status: "bogus" })).status, "");
    assert.equal(parseQuery(sp({ status: "OPEN" })).status, "open"); // case-insensitive accepted
  });

  test("normalises currency to uppercase and drops invalid chars", () => {
    assert.equal(parseQuery(sp({ currency: "usdc" })).currency, "USDC");
    assert.equal(parseQuery(sp({ currency: "XLM!" })).currency, "XLM");
  });

  test("drops currency longer than 10 chars", () => {
    assert.equal(parseQuery(sp({ currency: "TOOLONGTOKEN" })).currency, "");
  });

  test("accepts whitelisted minYield values", () => {
    assert.equal(parseQuery(sp({ minYield: "500" })).minYieldBps, 500);
    assert.equal(parseQuery(sp({ minYield: "700" })).minYieldBps, 700);
    assert.equal(parseQuery(sp({ minYield: "900" })).minYieldBps, 900);
  });

  test("drops non-whitelisted minYield", () => {
    assert.equal(parseQuery(sp({ minYield: "600" })).minYieldBps, 0);
    assert.equal(parseQuery(sp({ minYield: "abc" })).minYieldBps, 0);
  });

  test("accepts valid sort values", () => {
    for (const s of ["due_asc", "due_desc", "yield_desc", "yield_asc", "apr_desc", "funded_desc", "amount_desc"]) {
      assert.equal(parseQuery(sp({ sort: s })).sort, s);
    }
  });

  test("drops unknown sort", () => {
    assert.equal(parseQuery(sp({ sort: "magic" })).sort, DEFAULTS.sort);
  });

  test("accepts table view and defaults invalid values to cards", () => {
    assert.equal(parseQuery(sp({ view: "table" })).view, "table");
    assert.equal(parseQuery(sp({ view: "grid" })).view, "cards");
    assert.equal(parseQuery(sp({})).view, "cards");
  });

  test("page clamped to >= 1", () => {
    assert.equal(parseQuery(sp({ page: "3" })).page, 3);
    assert.equal(parseQuery(sp({ page: "0" })).page, 1);
    assert.equal(parseQuery(sp({ page: "-5" })).page, 1);
    assert.equal(parseQuery(sp({ page: "abc" })).page, 1);
  });

  test("works with real URLSearchParams", () => {
    const params = new URLSearchParams("status=open&sort=yield_desc&page=2");
    const q = parseQuery(params);
    assert.equal(q.status, "open");
    assert.equal(q.sort, "yield_desc");
    assert.equal(q.page, 2);
  });

  test("trims and truncates q to 200 chars", () => {
    assert.equal(parseQuery(sp({ q: "  hello  " })).q, "hello");
    const long = "a".repeat(300);
    assert.equal(parseQuery(sp({ q: long })).q.length, 200);
  });
});

// ---------------------------------------------------------------------------
// serializeQuery
// ---------------------------------------------------------------------------
describe("serializeQuery", () => {
  test("empty string for all-defaults", () => {
    assert.equal(serializeQuery(DEFAULTS), "");
  });

  test("omits default values", () => {
    const qs = serializeQuery({ ...DEFAULTS, status: "open" });
    assert.match(qs, /status=open/);
    assert.doesNotMatch(qs, /sort=/);
    assert.doesNotMatch(qs, /page=/);
  });

  test("includes non-default page", () => {
    const qs = serializeQuery({ ...DEFAULTS, page: 3 });
    assert.match(qs, /page=3/);
  });

  test("round-trips through parseQuery", () => {
    const state = {
      ...DEFAULTS,
      status: "open",
      currency: "USDC",
      minYieldBps: 700,
      q: "north",
      sort: "yield_desc",
      view: "table",
      page: 2,
    };
    const qs = serializeQuery(state);
    const parsed = parseQuery(new URLSearchParams(qs));
    assert.equal(parsed.status, state.status);
    assert.equal(parsed.currency, state.currency);
    assert.equal(parsed.minYieldBps, state.minYieldBps);
    assert.equal(parsed.q, state.q);
    assert.equal(parsed.sort, state.sort);
    assert.equal(parsed.view, state.view);
    assert.equal(parsed.page, state.page);
  });

  test("round-trips defaults without adding params", () => {
    const qs = serializeQuery(DEFAULTS);
    const parsed = parseQuery(new URLSearchParams(qs));
    assert.deepEqual(parsed, DEFAULTS);
  });

  test("omits the default cards view", () => {
    assert.equal(serializeQuery({ ...DEFAULTS, view: "cards" }), "");
  });
});

// ---------------------------------------------------------------------------
// applyQuery — filtering
// ---------------------------------------------------------------------------
describe("applyQuery — filtering", () => {
  test("no filters returns all invoices on first page", () => {
    const { items, total } = applyQuery(INVOICES, { ...DEFAULTS });
    assert.equal(total, INVOICES.length);
    assert.equal(items.length, INVOICES.length); // all fit on one page with pageSize=9
  });

  test("status filter", () => {
    const { items, total } = applyQuery(INVOICES, { ...DEFAULTS, status: "open" });
    assert.equal(total, 2);
    assert.ok(items.every((i) => i.status === "open"));
  });

  test("status=cancelled only reachable via explicit filter", () => {
    const { total } = applyQuery(INVOICES, { ...DEFAULTS, status: "cancelled" });
    assert.equal(total, 1);
  });

  test("currency filter (case-insensitive normalised by parseQuery)", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, currency: "XLM" });
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "INV_0001");
  });

  test("minYieldBps filter", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, minYieldBps: 900 });
    assert.ok(items.every((i) => i.yieldBps >= 900));
    assert.equal(items.length, 2); // INV_0004 (900) and INV_0005 (1000)
  });

  test("combined status + currency filter", () => {
    const { items } = applyQuery(INVOICES, {
      ...DEFAULTS,
      status: "open",
      currency: "USDC",
    });
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "INV_0002");
  });

  test("search by sme (case-insensitive)", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, q: "northwind" });
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "INV_0002");
  });

  test("search by debtor", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, q: "umbrella" });
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "INV_0003");
  });

  test("search by id", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, q: "INV_0001" });
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "INV_0001");
  });

  test("search matches across fields — 'north' hits sme AND debtor", () => {
    // INV_0002: sme=Northwind, INV_0005: debtor=North Star Exports
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, q: "north" });
    const ids = items.map((i) => i.id);
    assert.ok(ids.includes("INV_0002"));
    assert.ok(ids.includes("INV_0005"));
  });

  test("search with no match returns empty", () => {
    const { items, total } = applyQuery(INVOICES, { ...DEFAULTS, q: "zzznomatch" });
    assert.equal(total, 0);
    assert.equal(items.length, 0);
  });

  test("empty invoices array returns empty result", () => {
    const { items, total, pages } = applyQuery([], { ...DEFAULTS });
    assert.equal(items.length, 0);
    assert.equal(total, 0);
    assert.equal(pages, 1);
  });
});

// ---------------------------------------------------------------------------
// applyQuery — sorting
// ---------------------------------------------------------------------------
describe("applyQuery — sorting", () => {
  test("due_asc (default): ascending due date", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, sort: "due_asc" });
    const dates = items.map((i) => i.dueDate);
    const sorted = [...dates].sort();
    assert.deepEqual(dates, sorted);
  });

  test("due_desc: descending due date", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, sort: "due_desc" });
    const dates = items.map((i) => i.dueDate);
    const sorted = [...dates].sort().reverse();
    assert.deepEqual(dates, sorted);
  });

  test("yield_desc: highest yield first", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, sort: "yield_desc" });
    const yields = items.map((i) => i.yieldBps);
    for (let i = 0; i < yields.length - 1; i++) {
      assert.ok(yields[i] >= yields[i + 1], `${yields[i]} should be >= ${yields[i + 1]}`);
    }
  });

  test("yield_asc: lowest yield first", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, sort: "yield_asc" });
    const yields = items.map((i) => i.yieldBps);
    for (let i = 0; i < yields.length - 1; i++) {
      assert.ok(yields[i] <= yields[i + 1], `${yields[i]} should be <= ${yields[i + 1]}`);
    }
  });

  test("funded_desc: most funded first", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, sort: "funded_desc" });
    const pcts = items.map((i) =>
      Math.round((i.fundedAmount / i.amount) * 100),
    );
    for (let i = 0; i < pcts.length - 1; i++) {
      assert.ok(pcts[i] >= pcts[i + 1]);
    }
  });

  test("amount_desc: largest amount first", () => {
    const { items } = applyQuery(INVOICES, { ...DEFAULTS, sort: "amount_desc" });
    const amounts = items.map((i) => i.amount);
    for (let i = 0; i < amounts.length - 1; i++) {
      assert.ok(amounts[i] >= amounts[i + 1]);
    }
  });

  test("sort is stable — id tiebreak", () => {
    // Two invoices with identical yieldBps, sorted by id
    const dupes = [
      { id: "B", sme: "B", debtor: "B", amount: 1, currency: "USDC", fundedAmount: 0, yieldBps: 700, dueDate: "2027-01-01", status: "open" },
      { id: "A", sme: "A", debtor: "A", amount: 1, currency: "USDC", fundedAmount: 0, yieldBps: 700, dueDate: "2027-01-01", status: "open" },
    ];
    const { items } = applyQuery(dupes, { ...DEFAULTS, sort: "yield_desc" });
    assert.equal(items[0].id, "A");
    assert.equal(items[1].id, "B");
  });
});

// ---------------------------------------------------------------------------
// applyQuery — pagination
// ---------------------------------------------------------------------------
describe("applyQuery — pagination", () => {
  // Build 22 invoices to test pagination math
  const MANY = Array.from({ length: 22 }, (_, i) => ({
    id: `INV_${String(i + 1).padStart(4, "0")}`,
    sme: `SME ${i}`,
    debtor: `Debtor ${i}`,
    amount: 1000,
    currency: "USDC",
    fundedAmount: 0,
    yieldBps: 500,
    dueDate: "2027-01-01",
    status: "open",
  }));

  test("page 1 returns first pageSize items", () => {
    const { items, total, pages, from, to } = applyQuery(MANY, {
      ...DEFAULTS,
      page: 1,
    });
    assert.equal(total, 22);
    assert.equal(pages, 3); // ceil(22/9) = 3
    assert.equal(items.length, 9);
    assert.equal(from, 1);
    assert.equal(to, 9);
  });

  test("page 3 is the last partial page (4 items)", () => {
    const { items, from, to } = applyQuery(MANY, { ...DEFAULTS, page: 3 });
    assert.equal(items.length, 4); // 22 - 9 - 9
    assert.equal(from, 19);
    assert.equal(to, 22);
  });

  test("page beyond range clamps to last page", () => {
    const { items, pages } = applyQuery(MANY, { ...DEFAULTS, page: 999 });
    assert.equal(pages, 3);
    assert.equal(items.length, 4); // last page
  });

  test("page 0 clamps to page 1", () => {
    const { from } = applyQuery(MANY, { ...DEFAULTS, page: 0 });
    assert.equal(from, 1);
  });

  test("empty result has pages=1, from=0, to=0", () => {
    const { total, pages, from, to } = applyQuery(MANY, {
      ...DEFAULTS,
      q: "zzznomatch",
    });
    assert.equal(total, 0);
    assert.equal(pages, 1);
    assert.equal(from, 0);
    assert.equal(to, 0);
  });

  test("combined filters + sort + pagination", () => {
    // Open USDC invoices sorted by yield_desc, page 1
    const { items, total } = applyQuery(
      [
        ...MANY,
        {
          id: "EXTRA",
          sme: "Extra",
          debtor: "Extra",
          amount: 1000,
          currency: "XLM",
          fundedAmount: 0,
          yieldBps: 500,
          dueDate: "2027-01-01",
          status: "open",
        },
      ],
      { ...DEFAULTS, status: "open", currency: "USDC", sort: "yield_desc" },
    );
    // Only the 22 USDC open invoices, not EXTRA
    assert.equal(total, 22);
    assert.equal(items.length, 9);
  });
});

// ---------------------------------------------------------------------------
// applyQuery — apr_desc (annualized rate) sorting
// ---------------------------------------------------------------------------
describe("applyQuery — apr_desc", () => {
  const DAY_MS = 86400000;

  // Whole UTC days from today, so the fixture stays deterministic as time passes.
  function inDays(days) {
    return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
  }

  function inv(id, yieldBps, days) {
    return {
      id,
      sme: id,
      debtor: id,
      amount: 1000,
      currency: "USDC",
      fundedAmount: 0,
      yieldBps,
      dueDate: inDays(days),
      status: "open",
    };
  }

  // APR = (yieldBps / 100) * 365 / days
  const APR_INVOICES = [
    inv("APR_A", 800, 73), // 40.00%
    inv("APR_B", 500, 100), // 18.25%
    inv("APR_C", 300, 30), // 36.50%
    inv("APR_PAST", 1000, -5), // past due -> no rate
    inv("APR_TODAY", 1000, 0), // zero days -> no rate
  ];

  test("orders by annualized rate, highest first", () => {
    const { items } = applyQuery(APR_INVOICES, { ...DEFAULTS, sort: "apr_desc" });
    assert.deepEqual(items.map((i) => i.id), ["APR_A", "APR_C", "APR_B", "APR_PAST", "APR_TODAY"]);
  });

  test("invoices with no valid rate sort last, with the id tiebreak", () => {
    const { items } = applyQuery(APR_INVOICES, { ...DEFAULTS, sort: "apr_desc" });
    const ids = items.map((i) => i.id);
    assert.deepEqual(ids.slice(-2), ["APR_PAST", "APR_TODAY"]);
  });

  test("equal rates fall back to the stable id tiebreak", () => {
    const dupes = [
      { ...inv("Z_INV", 1600, 146), id: "Z_INV" }, // 40.00%
      inv("A_INV", 800, 73), // 40.00%
    ];
    const { items } = applyQuery(dupes, { ...DEFAULTS, sort: "apr_desc" });
    assert.deepEqual(items.map((i) => i.id), ["A_INV", "Z_INV"]);
  });

  test("missing or invalid due dates sort last without throwing", () => {
    const fixtures = [
      { ...inv("BAD_DATE", 900, 90), dueDate: "not-a-date" },
      inv("GOOD_DATE", 400, 90),
    ];
    const { items } = applyQuery(fixtures, { ...DEFAULTS, sort: "apr_desc" });
    assert.deepEqual(items.map((i) => i.id), ["GOOD_DATE", "BAD_DATE"]);
  });

  test("existing sorts are unchanged", () => {
    const yieldDesc = applyQuery(INVOICES, { ...DEFAULTS, sort: "yield_desc" });
    assert.deepEqual(yieldDesc.items.map((i) => i.id), [
      "INV_0005",
      "INV_0004",
      "INV_0001",
      "INV_0003",
      "INV_0002",
    ]);

    const dueAsc = applyQuery(INVOICES, { ...DEFAULTS, sort: "due_asc" });
    assert.deepEqual(dueAsc.items.map((i) => i.id), [
      "INV_0004",
      "INV_0005",
      "INV_0003",
      "INV_0002",
      "INV_0001",
    ]);

    const defaultSort = applyQuery(INVOICES, { ...DEFAULTS });
    assert.equal(defaultSort.items.length, INVOICES.length);
  });
});

// ---------------------------------------------------------------------------
// parseQuery — due-window filter
// ---------------------------------------------------------------------------
describe("parseQuery — due filter", () => {
  test("defaults due to empty string (any)", () => {
    assert.equal(parseQuery(sp({})).due, "");
  });

  test("accepts all valid due values", () => {
    for (const v of ["lte14", "15to30", "31to90", "gt90"]) {
      assert.equal(parseQuery(sp({ due: v })).due, v, `due=${v}`);
    }
  });

  test("accepts empty string explicitly", () => {
    assert.equal(parseQuery(sp({ due: "" })).due, "");
  });

  test("drops unknown due value silently", () => {
    assert.equal(parseQuery(sp({ due: "1year" })).due, "");
    assert.equal(parseQuery(sp({ due: "LTE14" })).due, "");   // case-sensitive
    assert.equal(parseQuery(sp({ due: "14" })).due, "");
  });

  test("works with real URLSearchParams", () => {
    assert.equal(parseQuery(new URLSearchParams("due=31to90")).due, "31to90");
  });
});

// ---------------------------------------------------------------------------
// serializeQuery — due round-trip
// ---------------------------------------------------------------------------
describe("serializeQuery — due round-trip", () => {
  test("omits due when it equals the default (empty string)", () => {
    const qs = serializeQuery({ ...DEFAULTS });
    assert.doesNotMatch(qs, /due=/);
  });

  test("includes due when non-default", () => {
    for (const v of ["lte14", "15to30", "31to90", "gt90"]) {
      const qs = serializeQuery({ ...DEFAULTS, due: v });
      assert.match(qs, new RegExp(`due=${v}`), `should include due=${v}`);
    }
  });

  test("round-trips through parseQuery for every option", () => {
    for (const v of ["", "lte14", "15to30", "31to90", "gt90"]) {
      const qs = serializeQuery({ ...DEFAULTS, due: v });
      const parsed = parseQuery(new URLSearchParams(qs));
      assert.equal(parsed.due, v, `round-trip failed for due=${v}`);
    }
  });
});

// ---------------------------------------------------------------------------
// applyQuery — due-window filtering (UTC day boundaries)
// ---------------------------------------------------------------------------
describe("applyQuery — due filter", () => {
  // Fix the clock to 2026-11-01 00:00:00 UTC
  //   = 1762041600000 ms
  const NOW = Date.UTC(2026, 10, 1); // month is 0-indexed

  function inv(id, dueDate) {
    return {
      id,
      sme: id,
      debtor: id,
      amount: 1000,
      currency: "USDC",
      fundedAmount: 0,
      yieldBps: 500,
      dueDate,
      status: "open",
    };
  }

  // Relative to 2026-11-01:
  //   day 0  = 2026-11-01  (due today   → daysToDue = 0)
  //   day 1  = 2026-11-02  (1 day away  → daysToDue = 1)
  //   day 14 = 2026-11-15  (14 days     → daysToDue = 14)
  //   day 15 = 2026-11-16  (15 days     → daysToDue = 15)
  //   day 30 = 2026-12-01  (30 days     → daysToDue = 30)
  //   day 31 = 2026-12-02  (31 days     → daysToDue = 31)
  //   day 90 = 2027-01-30  (90 days     → daysToDue = 90)
  //   day 91 = 2027-01-31  (91 days     → daysToDue = 91)
  // past     = 2026-10-01  (past due    → daysToDue = 0)

  const PAST   = inv("PAST",   "2026-10-01");
  const TODAY  = inv("TODAY",  "2026-11-01");
  const DAY1   = inv("DAY1",   "2026-11-02");
  const DAY14  = inv("DAY14",  "2026-11-15");
  const DAY15  = inv("DAY15",  "2026-11-16");
  const DAY30  = inv("DAY30",  "2026-12-01");
  const DAY31  = inv("DAY31",  "2026-12-02");
  const DAY90  = inv("DAY90",  "2027-01-30");
  const DAY91  = inv("DAY91",  "2027-01-31");

  const ALL = [PAST, TODAY, DAY1, DAY14, DAY15, DAY30, DAY31, DAY90, DAY91];

  test("due='' returns all invoices (no filter applied)", () => {
    const { total } = applyQuery(ALL, { ...DEFAULTS, due: "" }, { nowMs: NOW });
    assert.equal(total, ALL.length);
  });

  test("due=lte14 includes today and past-due (daysToDue=0) through day 14", () => {
    const { items } = applyQuery(ALL, { ...DEFAULTS, due: "lte14" }, { nowMs: NOW });
    const ids = items.map((i) => i.id);
    // days 0 (PAST, TODAY, DAY1 not past yet — PAST daysToDue=0, TODAY daysToDue=0)
    // PAST→0, TODAY→0, DAY1→1, DAY14→14: all ≤14
    assert.ok(ids.includes("PAST"),  "PAST (overdue, days=0) should be included");
    assert.ok(ids.includes("TODAY"), "TODAY (days=0) should be included");
    assert.ok(ids.includes("DAY1"),  "DAY1 (days=1) should be included");
    assert.ok(ids.includes("DAY14"), "DAY14 (days=14) should be included");
    assert.ok(!ids.includes("DAY15"), "DAY15 (days=15) should be excluded");
    assert.ok(!ids.includes("DAY91"), "DAY91 (days=91) should be excluded");
  });

  test("due=lte14 boundary: exactly day 14 is included, day 15 is excluded", () => {
    const fixtures = [DAY14, DAY15];
    const { items } = applyQuery(fixtures, { ...DEFAULTS, due: "lte14" }, { nowMs: NOW });
    assert.deepEqual(items.map((i) => i.id).sort(), ["DAY14"]);
  });

  test("due=15to30 includes days 15 through 30 inclusive", () => {
    const { items } = applyQuery(ALL, { ...DEFAULTS, due: "15to30" }, { nowMs: NOW });
    const ids = items.map((i) => i.id);
    assert.ok(ids.includes("DAY15"), "DAY15 (days=15) should be included");
    assert.ok(ids.includes("DAY30"), "DAY30 (days=30) should be included");
    assert.ok(!ids.includes("DAY14"), "DAY14 (days=14) should be excluded");
    assert.ok(!ids.includes("DAY31"), "DAY31 (days=31) should be excluded");
  });

  test("due=15to30 boundary: day 15 and day 30 are both included", () => {
    const fixtures = [DAY14, DAY15, DAY30, DAY31];
    const { items } = applyQuery(fixtures, { ...DEFAULTS, due: "15to30" }, { nowMs: NOW });
    assert.deepEqual(items.map((i) => i.id).sort(), ["DAY15", "DAY30"]);
  });

  test("due=31to90 includes days 31 through 90 inclusive", () => {
    const { items } = applyQuery(ALL, { ...DEFAULTS, due: "31to90" }, { nowMs: NOW });
    const ids = items.map((i) => i.id);
    assert.ok(ids.includes("DAY31"), "DAY31 (days=31) should be included");
    assert.ok(ids.includes("DAY90"), "DAY90 (days=90) should be included");
    assert.ok(!ids.includes("DAY30"), "DAY30 (days=30) should be excluded");
    assert.ok(!ids.includes("DAY91"), "DAY91 (days=91) should be excluded");
  });

  test("due=31to90 boundary: day 31 and day 90 are both included", () => {
    const fixtures = [DAY30, DAY31, DAY90, DAY91];
    const { items } = applyQuery(fixtures, { ...DEFAULTS, due: "31to90" }, { nowMs: NOW });
    assert.deepEqual(items.map((i) => i.id).sort(), ["DAY31", "DAY90"]);
  });

  test("due=gt90 includes only days > 90", () => {
    const { items } = applyQuery(ALL, { ...DEFAULTS, due: "gt90" }, { nowMs: NOW });
    const ids = items.map((i) => i.id);
    assert.ok(ids.includes("DAY91"), "DAY91 (days=91) should be included");
    assert.ok(!ids.includes("DAY90"), "DAY90 (days=90) should be excluded");
    assert.ok(!ids.includes("PAST"),  "PAST should be excluded");
  });

  test("due=gt90 boundary: day 90 is excluded, day 91 is included", () => {
    const fixtures = [DAY90, DAY91];
    const { items } = applyQuery(fixtures, { ...DEFAULTS, due: "gt90" }, { nowMs: NOW });
    assert.deepEqual(items.map((i) => i.id), ["DAY91"]);
  });

  test("due filter combines correctly with status filter", () => {
    const mixed = [
      { ...DAY14, status: "funded" },
      { ...DAY30, status: "open" },
      { ...DAY91, status: "open" },
    ];
    const { items } = applyQuery(mixed, { ...DEFAULTS, status: "open", due: "15to30" }, { nowMs: NOW });
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "DAY30");
  });

  test("nowMs is injectable and shifts all boundaries correctly", () => {
    // Move clock forward 7 days: DAY14 is now only 7 days away → still lte14
    // DAY1 from new clock perspective would have already passed
    const LATER = Date.UTC(2026, 10, 8); // 2026-11-08
    const fixtures = [DAY14, DAY30];
    // DAY14=2026-11-15 → 7 days from 2026-11-08 → lte14 ✓
    // DAY30=2026-12-01 → 23 days from 2026-11-08 → 15to30 ✓
    const lte14Result = applyQuery(fixtures, { ...DEFAULTS, due: "lte14" }, { nowMs: LATER });
    assert.deepEqual(lte14Result.items.map((i) => i.id), ["DAY14"]);

    const range15Result = applyQuery(fixtures, { ...DEFAULTS, due: "15to30" }, { nowMs: LATER });
    assert.deepEqual(range15Result.items.map((i) => i.id), ["DAY30"]);
  });

  test("invoice with missing dueDate is treated as 0 days (included in lte14)", () => {
    const noDate = { ...inv("NODATE", ""), dueDate: undefined };
    const { items } = applyQuery([noDate], { ...DEFAULTS, due: "lte14" }, { nowMs: NOW });
    // daysToDue(undefined) → 0 → satisfies ≤14
    assert.equal(items.length, 1);
  });

  test("invoice with invalid dueDate string is treated as 0 days", () => {
    const badDate = inv("BADDATE", "not-a-date");
    const { items } = applyQuery([badDate], { ...DEFAULTS, due: "lte14" }, { nowMs: NOW });
    assert.equal(items.length, 1);
    const { items: items2 } = applyQuery([badDate], { ...DEFAULTS, due: "gt90" }, { nowMs: NOW });
    assert.equal(items2.length, 0);
  });

  test("clear filters (due='') after active due filter returns all invoices", () => {
    // Simulate: apply filter, get subset; then reset due to '' → all back
    const filtered = applyQuery(ALL, { ...DEFAULTS, due: "gt90" }, { nowMs: NOW });
    assert.equal(filtered.total, 1);

    const cleared = applyQuery(ALL, { ...DEFAULTS, due: "" }, { nowMs: NOW });
    assert.equal(cleared.total, ALL.length);
  });
});

// ---------------------------------------------------------------------------
// DUE_WINDOW_OPTIONS export
// ---------------------------------------------------------------------------

describe("DUE_WINDOW_OPTIONS", () => {
  test("has exactly 5 options with correct values", () => {
    const values = DUE_WINDOW_OPTIONS.map((o) => o.value);
    assert.deepEqual(values, ["", "lte14", "15to30", "31to90", "gt90"]);
  });

  test("every option has a labelKey string", () => {
    for (const o of DUE_WINDOW_OPTIONS) {
      assert.ok(typeof o.labelKey === "string" && o.labelKey.length > 0, `option ${o.value} missing labelKey`);
    }
  });
});
