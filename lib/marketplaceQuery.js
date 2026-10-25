/**
 * lib/marketplaceQuery.js
 *
 * Pure, framework-free helpers for the marketplace URL ↔ filter state machine.
 * All exports are plain functions with no side effects.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STATUSES = ["open", "funded", "settled", "cancelled"];

export const SORT_OPTIONS = [
  { value: "due_asc", label: "Due date ↑" },
  { value: "due_desc", label: "Due date ↓" },
  { value: "yield_desc", label: "Highest yield" },
  { value: "yield_asc", label: "Lowest yield" },
  { value: "funded_desc", label: "Most funded" },
  { value: "amount_desc", label: "Largest amount" },
];

export const MIN_YIELD_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 500, label: "5%" },
  { value: 700, label: "7%" },
  { value: 900, label: "9%" },
];

/** Defaults — values that are omitted from the serialised URL */
export const DEFAULTS = {
  status: "",
  currency: "",
  minYieldBps: 0,
  q: "",
  sort: "due_asc",
  page: 1,
  pageSize: 9,
};

// ---------------------------------------------------------------------------
// parseQuery
// ---------------------------------------------------------------------------

/**
 * Converts a URLSearchParams (or plain object) into a normalised filter state.
 * Unknown / out-of-range values are silently dropped back to defaults.
 *
 * @param {URLSearchParams | Record<string, string>} searchParams
 * @returns {{ status: string, currency: string, minYieldBps: number,
 *             q: string, sort: string, page: number, pageSize: number }}
 */
export function parseQuery(searchParams) {
  const get = (k) =>
    typeof searchParams.get === "function"
      ? (searchParams.get(k) ?? "")
      : (searchParams[k] ?? "");

  // status — whitelist
  const rawStatus = get("status").toLowerCase();
  const status = STATUSES.includes(rawStatus) ? rawStatus : DEFAULTS.status;

  // currency — allow any non-empty alphanumeric string (max 10 chars)
  const rawCurrency = get("currency").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const currency =
    rawCurrency.length > 0 && rawCurrency.length <= 10
      ? rawCurrency
      : DEFAULTS.currency;

  // minYieldBps — must be one of the allowed option values
  const rawMinYield = Number(get("minYield"));
  const minYieldBps = MIN_YIELD_OPTIONS.some((o) => o.value === rawMinYield)
    ? rawMinYield
    : DEFAULTS.minYieldBps;

  // q — free text, trim and truncate to 200 chars
  const q = get("q").trim().slice(0, 200);

  // sort — whitelist
  const rawSort = get("sort");
  const sort = SORT_OPTIONS.some((o) => o.value === rawSort)
    ? rawSort
    : DEFAULTS.sort;

  // page — positive integer, clamped to ≥ 1
  const rawPage = parseInt(get("page"), 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  // pageSize — keep default; callers can override but we don't expose it in the URL
  const pageSize = DEFAULTS.pageSize;

  return { status, currency, minYieldBps, q, sort, page, pageSize };
}

// ---------------------------------------------------------------------------
// serializeQuery
// ---------------------------------------------------------------------------

/**
 * Converts a filter state back to a query-string, omitting any key that equals
 * its default value (keeps URLs minimal).
 *
 * @param {ReturnType<typeof parseQuery>} state
 * @returns {string}  e.g. "status=open&sort=yield_desc"
 */
export function serializeQuery(state) {
  const params = new URLSearchParams();

  if (state.status !== DEFAULTS.status) params.set("status", state.status);
  if (state.currency !== DEFAULTS.currency) params.set("currency", state.currency);
  if (state.minYieldBps !== DEFAULTS.minYieldBps)
    params.set("minYield", String(state.minYieldBps));
  if (state.q !== DEFAULTS.q) params.set("q", state.q);
  if (state.sort !== DEFAULTS.sort) params.set("sort", state.sort);
  if (state.page !== DEFAULTS.page) params.set("page", String(state.page));

  return params.toString();
}

// ---------------------------------------------------------------------------
// applyQuery
// ---------------------------------------------------------------------------

/**
 * Filters, sorts and paginates a flat array of invoice objects.
 *
 * @param {Array<object>} invoices
 * @param {ReturnType<typeof parseQuery>} state
 * @returns {{ items: Array<object>, total: number, pages: number,
 *             from: number, to: number }}
 */
export function applyQuery(invoices, state) {
  const { status, currency, minYieldBps, q, sort, page, pageSize } = state;

  // --- Filter ---
  let filtered = invoices;

  if (status) {
    filtered = filtered.filter((inv) => inv.status === status);
  }

  if (currency) {
    filtered = filtered.filter(
      (inv) => (inv.currency ?? "").toUpperCase() === currency,
    );
  }

  if (minYieldBps > 0) {
    filtered = filtered.filter(
      (inv) => Number(inv.yieldBps ?? 0) >= minYieldBps,
    );
  }

  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter(
      (inv) =>
        (inv.id ?? "").toLowerCase().includes(lower) ||
        (inv.sme ?? "").toLowerCase().includes(lower) ||
        (inv.debtor ?? "").toLowerCase().includes(lower),
    );
  }

  // --- Sort (stable: primary key, then id tiebreak) ---
  filtered = [...filtered].sort((a, b) => {
    let diff = 0;
    switch (sort) {
      case "due_asc":
        diff = _cmpDates(a.dueDate, b.dueDate);
        break;
      case "due_desc":
        diff = _cmpDates(b.dueDate, a.dueDate);
        break;
      case "yield_desc":
        diff = Number(b.yieldBps ?? 0) - Number(a.yieldBps ?? 0);
        break;
      case "yield_asc":
        diff = Number(a.yieldBps ?? 0) - Number(b.yieldBps ?? 0);
        break;
      case "funded_desc": {
        const pctA = _fundedPct(a);
        const pctB = _fundedPct(b);
        diff = pctB - pctA;
        break;
      }
      case "amount_desc":
        diff = Number(b.amount ?? 0) - Number(a.amount ?? 0);
        break;
      default:
        diff = _cmpDates(a.dueDate, b.dueDate);
    }
    // id tiebreak for stable sort
    return diff !== 0 ? diff : (a.id ?? "").localeCompare(b.id ?? "");
  });

  // --- Pagination ---
  const total = filtered.length;
  const pages = total === 0 ? 1 : Math.ceil(total / pageSize);
  // clamp page to [1, pages]
  const clampedPage = Math.min(Math.max(1, page), pages);
  const from = (clampedPage - 1) * pageSize;
  const to = Math.min(from + pageSize, total);
  const items = filtered.slice(from, to);

  return {
    items,
    total,
    pages,
    // 1-based display helpers
    from: total === 0 ? 0 : from + 1,
    to,
  };
}

// ---------------------------------------------------------------------------
// helpers (not exported — internal only)
// ---------------------------------------------------------------------------

function _cmpDates(a, b) {
  const ta = a ? new Date(a).getTime() : Infinity;
  const tb = b ? new Date(b).getTime() : Infinity;
  return ta - tb;
}

function _fundedPct(inv) {
  if (!inv || !inv.amount) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((Number(inv.fundedAmount ?? 0) / Number(inv.amount)) * 100)),
  );
}
