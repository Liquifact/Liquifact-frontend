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
      page: DEFAULTS.page,
      pageSize: DEFAULTS.pageSize,
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
    for (const s of ["due_asc", "due_desc", "yield_desc", "yield_asc", "funded_desc", "amount_desc"]) {
      assert.equal(parseQuery(sp({ sort: s })).sort, s);
    }
  });

  test("drops unknown sort", () => {
    assert.equal(parseQuery(sp({ sort: "magic" })).sort, DEFAULTS.sort);
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
      page: 2,
    };
    const qs = serializeQuery(state);
    const parsed = parseQuery(new URLSearchParams(qs));
    assert.equal(parsed.status, state.status);
    assert.equal(parsed.currency, state.currency);
    assert.equal(parsed.minYieldBps, state.minYieldBps);
    assert.equal(parsed.q, state.q);
    assert.equal(parsed.sort, state.sort);
    assert.equal(parsed.page, state.page);
  });

  test("round-trips defaults without adding params", () => {
    const qs = serializeQuery(DEFAULTS);
    const parsed = parseQuery(new URLSearchParams(qs));
    assert.deepEqual(parsed, DEFAULTS);
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
