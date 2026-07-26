"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ErrorBanner from "@/components/ErrorBanner";
import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";
import InvoiceSearch from "@/components/InvoiceSearch";
import InvoiceFilters, {
  DEFAULT_FILTERS,
  StatusLegendFilter,
  hasAnyActiveFilters,
  parseSortState,
} from "@/components/InvoiceFilters";
import NavMenu from "@/components/NavMenu";
import { INVOICE_STATUSES } from "@/lib/types/invoice";
import { copy } from "../copy/en";
// Mock data is sourced exclusively from lib.js (single source of truth until the API client lands).
import { loadMockInvoices } from "./lib";

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;
export const URL_SYNC_DEBOUNCE_MS = 200;

const VALID_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "CHF"]);
const VALID_SORT_COLUMNS = new Set(["amount", "yield", "maturity"]);
const VALID_SORT_DIRS = new Set(["asc", "desc"]);
const VALID_STATUSES = new Set(Object.values(INVOICE_STATUSES));

function isValidISODate(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  // new Date("2026-09-99") rolls over in some engines, so verify round-trip.
  return d.toISOString().slice(0, 10) === str;
}

function isValidYieldString(value) {
  if (typeof value !== "string" || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

/**
 * Parse a shareable URL query into validated marketplace filters and search.
 * Unknown/invalid params are ignored and fall back to defaults.
 *
 * @param {URLSearchParams} searchParams
 * @param {object} [defaults=DEFAULT_FILTERS]
 * @returns {{ filters: object, searchQuery: string }}
 */
export function parseFiltersFromSearchParams(searchParams, defaults = DEFAULT_FILTERS) {
  const params = searchParams ?? new URLSearchParams();

  const rawSort = params.get("sort") ?? "";
  const rawSortDir = params.get("sortDir") ?? "";
  let sort = "";
  let sortDir = "desc";
  const compound = rawSort.match(/^(amount|yield|maturity)_(asc|desc)$/);
  if (compound) {
    sort = compound[1];
    sortDir = compound[2];
  } else if (VALID_SORT_COLUMNS.has(rawSort)) {
    sort = rawSort;
  }
  if (VALID_SORT_DIRS.has(rawSortDir)) {
    sortDir = rawSortDir;
  }

  const currency = VALID_CURRENCIES.has(params.get("currency")) ? params.get("currency") : "";
  const yieldMin = isValidYieldString(params.get("yieldMin")) ? params.get("yieldMin") : "";
  const yieldMax = isValidYieldString(params.get("yieldMax")) ? params.get("yieldMax") : "";
  const maturityFrom = isValidISODate(params.get("maturityFrom")) ? params.get("maturityFrom") : "";
  const maturityTo = isValidISODate(params.get("maturityTo")) ? params.get("maturityTo") : "";

  const statuses = (params.get("statuses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => VALID_STATUSES.has(s));

  const searchQuery = (params.get("q") ?? "").trim();

  return {
    filters: {
      ...defaults,
      currency,
      yieldMin,
      yieldMax,
      maturityFrom,
      maturityTo,
      sort,
      sortDir,
      statuses,
    },
    searchQuery,
  };
}

/**
 * Build a shareable URLSearchParams object from the current filters and search.
 * Empty/default values are omitted so the URL stays clean.
 *
 * @param {object} filters
 * @param {string} [searchQuery=""]
 * @returns {URLSearchParams}
 */
export function buildSearchParams(filters, searchQuery = "") {
  const params = new URLSearchParams();
  const trimmedSearch = (searchQuery ?? "").trim();
  if (trimmedSearch) params.set("q", trimmedSearch);

  if (filters.currency) params.set("currency", filters.currency);
  if (filters.yieldMin !== "") params.set("yieldMin", filters.yieldMin);
  if (filters.yieldMax !== "") params.set("yieldMax", filters.yieldMax);
  if (filters.maturityFrom) params.set("maturityFrom", filters.maturityFrom);
  if (filters.maturityTo) params.set("maturityTo", filters.maturityTo);

  if (filters.sort) {
    params.set("sort", filters.sort);
    params.set("sortDir", filters.sortDir || "desc");
  }

  if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    params.set("statuses", filters.statuses.join(","));
  }

  return params;
}

/**
 * Returns the screen-reader announcement text for the initial invoice load.
 *
 * @param {Array} invoices - The resolved invoice array (may be empty).
 * @param {object} [options]
 * @param {boolean} [options.filterActive] - Whether an issuer filter is active.
 * @param {number} [options.filteredCount] - Number of invoices matching the active filter.
 * @returns {string}
 */
export function getInvoiceLoadAnnouncement(invoices, { filterActive, filteredCount } = {}) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return copy.invest.announceNoInvoices;
  }

  if (filterActive) {
    if (filteredCount === 0) {
      return copy.invest.announceNoMatch;
    }
    return copy.invest.announceFilteredCount
      .replace("{matched}", filteredCount)
      .replace("{total}", invoices.length);
  }

  return copy.invest.announceInvoicesLoaded.replace("{count}", invoices.length);
}

export function getPaginationAnnouncement(shown, total) {
  if (total === 0) return copy.invest.announceNoInvoices;
  return copy.invest.announceShowing.replace("{shown}", shown).replace("{total}", total);
}

/**
 * Parse a numeric amount string like "12,500" → 12500.
 * @param {string} str
 * @returns {number}
 */
function parseAmount(str) {
  return parseFloat(String(str).replace(/,/g, "")) || 0;
}

/**
 * Parse a yield string like "8.2%" → 8.2.
 * @param {string} str
 * @returns {number}
 */
function parseYield(str) {
  return parseFloat(String(str).replace(/%/g, "")) || 0;
}

/**
 * Sort a copy of `list` according to the sort column + direction in `filters`.
 *
 * Supported columns: "amount", "yield", "maturity".
 * Direction: "asc" | "desc".
 *
 * @param {Array}  list
 * @param {object} filters
 * @returns {Array}
 */
export function applySortToList(list, filters) {
  if (!Array.isArray(list) || list.length === 0) return list;

  const { column, dir } = parseSortState(filters);
  if (!column) return list;

  const multiplier = dir === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    let diff = 0;
    if (column === "amount") {
      diff = parseAmount(a.amount) - parseAmount(b.amount);
    } else if (column === "yield") {
      diff = parseYield(a.yield) - parseYield(b.yield);
    } else if (column === "maturity") {
      diff = new Date(a.dueDate) - new Date(b.dueDate);
    }
    return multiplier * diff;
  });
}

/**
 * InvestMarketplace – main component for the invest page.
 *
 * Fetches invoices via `loadInvoices`, renders them PAGE_SIZE at a time,
 * and exposes a "Load more" control to append the next batch.  Paging
 * resets whenever a new invoice set arrives so filter changes stay
 * non-breaking.
 *
 * On load failure, an ErrorBanner is rendered with a "Try again" action
 * that re-runs the load. The retry resets state to loading, cancels any
 * stale in-flight request via AbortController, and re-announces via the
 * polite status region once the new load settles.
 *
 * @param {object}   props
 * @param {Function} [props.loadInvoices] - Async function that resolves to an
 *   invoice array.  Defaults to the mock loader; injectable for testing.
 * @returns {JSX.Element}
 */
export function InvestMarketplace({ loadInvoices = loadMockInvoices }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsValue = searchParams ?? new URLSearchParams();
  const searchParamsString = searchParamsValue.toString();

  const initialUrlState = parseFiltersFromSearchParams(searchParamsValue, DEFAULT_FILTERS);

  const [invoices, setInvoices] = useState(null); // null = loading
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState(initialUrlState.searchQuery);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState(initialUrlState.filters);
  const [debouncedSearch, setDebouncedSearch] = useState(initialUrlState.searchQuery);

  const committedSearchRef = useRef(
    buildSearchParams(initialUrlState.filters, initialUrlState.searchQuery).toString()
  );
  const urlUpdateTimerRef = useRef(null);

  /**
   * When the URL query changes (back/forward, shared link), parse and apply
   * validated filters. committedSearchRef prevents overwriting our own writes.
   */
  useEffect(() => {
    if (searchParamsString === committedSearchRef.current) return;
    const parsed = parseFiltersFromSearchParams(searchParamsValue, DEFAULT_FILTERS);
    setFilters(parsed.filters);
    setSearchQuery(parsed.searchQuery);
    setDebouncedSearch(parsed.searchQuery);
    committedSearchRef.current = buildSearchParams(parsed.filters, parsed.searchQuery).toString();
    // searchParamsValue is intentionally omitted; searchParamsString is the stable signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString]);

  /**
   * Incrementing retryKey causes the load effect to re-run, implementing
   * the retry behaviour. It is the only mechanism used to trigger a reload —
   * the effect itself is otherwise idempotent for the same loadInvoices ref.
   */
  const [retryKey, setRetryKey] = useState(0);

  // Reset paging whenever the raw invoice data changes (new fetch, retry, etc.).
  // Compared during render per the React-recommended pattern:
  // https://react.dev/learn/you-might-not-need-an-effect
  const [pagingResetFor, setPagingResetFor] = useState(invoices);
  if (invoices !== pagingResetFor) {
    setPagingResetFor(invoices);
    setVisibleCount(PAGE_SIZE);
  }

  /** Ref forwarded to the "Load more" button for focus management. */
  const loadMoreRef = useRef(null);

  /**
   * Resets error/loading state and re-runs the load effect.
   *
   * Sets invoices back to null (loading skeleton) and clears loadError so the
   * error banner disappears immediately on click. Bumping retryKey causes the
   * effect below to re-run; its cleanup will abort any still-in-flight stale
   * request from a previous attempt before starting a fresh one.
   */
  const reload = useCallback(() => {
    setInvoices(null);
    setLoadError("");
    setRetryKey((k) => k + 1);
  }, [setInvoices, setLoadError, setRetryKey]);

  /** Toggle a status chip: add if absent, remove if present. */
  const handleStatusToggle = useCallback((status) => {
    setFilters((prev) => {
      const current = Array.isArray(prev.statuses) ? prev.statuses : [];
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return { ...prev, statuses: next };
    });
  }, [setFilters]);

  /** Clear all status chips. */
  const handleClearStatuses = useCallback(() => {
    setFilters((prev) => ({ ...prev, statuses: [] }));
  }, [setFilters]);

  // Debounced search term
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Persist active filters/sort/search in the URL so the view is shareable and
  // survives reloads. router.replace keeps the back button friendly (no new
  // history entries for every filter keystroke) and a debounce prevents rapid
  // successive updates.
  useEffect(() => {
    const next = buildSearchParams(filters, debouncedSearch).toString();
    if (next === committedSearchRef.current) return;
    clearTimeout(urlUpdateTimerRef.current);
    urlUpdateTimerRef.current = setTimeout(() => {
      committedSearchRef.current = next;
      router.replace(`?${next}`, { scroll: false });
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(urlUpdateTimerRef.current);
  }, [filters, debouncedSearch, router]);

  // Reset the visible page count to PAGE_SIZE whenever the filters or debounced
  // search term change, using the React-sanctioned "adjust state during render"
  // pattern so the user always starts at the top of the newly filtered list
  // (avoids a setState-in-effect cascading render).
  const filterSignature = JSON.stringify([debouncedSearch, filters]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setVisibleCount(PAGE_SIZE);
  }

  // Filtered + sorted invoice list
  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    let list = invoices;

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((inv) => inv.issuer?.toLowerCase().includes(q));
    }
    if (filters.currency) {
      list = list.filter((inv) => inv.currency === filters.currency);
    }
    if (filters.yieldMin !== "") {
      const min = parseFloat(filters.yieldMin);
      list = list.filter((inv) => parseYield(inv.yield) >= min);
    }
    if (filters.yieldMax !== "") {
      const max = parseFloat(filters.yieldMax);
      list = list.filter((inv) => parseYield(inv.yield) <= max);
    }
    if (filters.maturityFrom) {
      list = list.filter((inv) => inv.dueDate >= filters.maturityFrom);
    }
    if (filters.maturityTo) {
      list = list.filter((inv) => inv.dueDate <= filters.maturityTo);
    }
    if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
      list = list.filter((inv) => filters.statuses.includes(inv.status));
    }
    return applySortToList(list, filters);
  }, [invoices, debouncedSearch, filters]);

  const filterActive = hasAnyActiveFilters(filters, debouncedSearch);

  /**
   * Effect: fetch invoices on mount and on every retry.
   *
   * - Uses AbortController so unmount or a new retry cancels the in-flight
   *   request cleanly (no stale state updates, no React warnings).
   * - isActive guards the setState calls so a slow prior attempt that resolves
   *   after a retry has already started is silently discarded.
   * - retryKey is the sole dependency that forces a re-run on retry; it does
   *   not interact with the abort/isActive logic in any racy way because the
   *   cleanup always runs before the next effect body executes.
   */
  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const announceLoadCompletion = async () => {
      try {
        const nextInvoices = await loadInvoices({ signal: controller.signal });

        if (!isActive) return;

        const normalizedInvoices = Array.isArray(nextInvoices) ? nextInvoices : [];

        setInvoices(normalizedInvoices);
        setLoadError("");
      } catch {
        if (!isActive) return;

        setInvoices(null);
        setLoadError(copy.invest.errorDescription);
      }
    };

    void announceLoadCompletion();

    return () => {
      isActive = false;
      controller.abort();
    };
    // retryKey triggers a fresh load on retry without changing loadInvoices.
  }, [loadInvoices, retryKey]);

  // Derive the polite live-region announcement directly from reactive state.
  // Using useMemo (rather than a useEffect + setState) avoids a cascading
  // re-render and satisfies the react-hooks/set-state-in-effect lint rule.
  const statusMessage = useMemo(() => {
    // Loading or error states — error copy is announced by the ErrorBanner role="alert";
    // the status region is cleared so screen readers only hear one announcement.
    if (!Array.isArray(invoices)) {
      return loadError ? copy.invest.errorStatus : "";
    }
    if (filterActive) {
      return getInvoiceLoadAnnouncement(invoices, {
        filterActive: true,
        filteredCount: filteredInvoices.length,
      });
    }
    if (visibleCount < filteredInvoices.length) {
      return getPaginationAnnouncement(visibleCount, filteredInvoices.length);
    }
    if (visibleCount > PAGE_SIZE) {
      // After Load more reaches the last page, keep pagination format.
      return getPaginationAnnouncement(filteredInvoices.length, filteredInvoices.length);
    }
    return getInvoiceLoadAnnouncement(invoices);
  }, [filteredInvoices, filterActive, invoices, visibleCount, loadError]);

  // ── Load-more handler ──────────────────────────────────────────────────────
  /**
   * Appends the next PAGE_SIZE items and updates the live-region status.
   * Focus is moved back to the "Load more" button (if it still exists) so
   * keyboard users do not lose their place in the page.
   */
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => {
      return Math.min(prev + PAGE_SIZE, filteredInvoices.length);
    });
    setTimeout(() => {
      loadMoreRef.current?.focus();
    }, 0);
  }, [filteredInvoices.length, setVisibleCount]);

  // const visibleInvoices = filteredInvoices.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* <header className="border-b border-slate-800 px-6 py-4">
        <Link
          href="/"
          className="inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline"
        >
          ← LiquiFact
        </Link>
      </header> */}
      <NavMenu />

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Polite live region – announced to screen readers on every state change */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </div>

        <h1 className="text-2xl font-bold mb-2">{copy.invest.title}</h1>
        <p className="text-slate-400 mb-8">{copy.invest.subtext}</p>

        {/*
          ACCESSIBILITY DESIGN (Issue #91):
          - We wrap the filter group in a <fieldset> with `aria-disabled="true"` to announce the preview/disabled
            state to screen readers while keeping all controls discoverable in the tab order (unlike native `disabled`).
          - `aria-describedby` programmatically links the fieldset to the visible "Soon" badge, ensuring that
            assistive technologies announce the "coming soon" status when users navigate to the filters.
          - We use a no-op handler structure (passing empty handlers) and CSS `pointer-events-none` to prevent
            interaction while keeping the controls focusable.
          - `opacity-60` is applied only to the inner controls container to ensure the "Soon" label itself stays
            fully opaque for maximum contrast (WCAG AA compliant).
        */}
        <div className="mb-4">
          <InvoiceSearch
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={copy.invest.searchPlaceholder}
          />
        </div>

        {/* Status legend filter chip row */}
        <StatusLegendFilter
          selectedStatuses={Array.isArray(filters.statuses) ? filters.statuses : []}
          onStatusToggle={handleStatusToggle}
          onClearStatuses={handleClearStatuses}
        />

        <fieldset
          className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6"
          aria-disabled="true"
          aria-describedby="filters-coming-soon"
        >
          <legend className="sr-only">{copy.invest.filterLegend}</legend>
          <div
            id="filters-coming-soon"
            className="mb-4 inline-block rounded bg-slate-800 px-2 py-1 text-xs font-semibold tracking-wide text-slate-300"
          >
            {copy.invest.filterSoonLabel}
          </div>
          <div className="flex flex-wrap gap-4 items-center opacity-60 pointer-events-none">
            {/* InvoiceFilters only — search moved above */}
            <InvoiceFilters
              filters={filters}
              onFilterChange={setFilters}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
            />
          </div>
        </fieldset>

        {/* Error state – retryable */}
        {loadError ? (
          <ErrorBanner
            title={copy.invest.errorTitle}
            description={loadError}
            actionLabel={copy.invest.retryAction}
            onAction={reload}
          />
        ) : invoices === null ? (
          <InvoiceListSkeleton rows={3} />
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            {copy.invest.emptyState}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            {copy.invest.noMatchFilter}
          </div>
        ) : (
          <>
            <ul aria-label={copy.invest.listAriaLabel} className="space-y-4">
              {filteredInvoices.slice(0, visibleCount).map((inv) => (
                <li key={inv.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      href={`/invest/${inv.id}`}
                      className="font-medium text-slate-100 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
                    >
                      {inv.issuer}
                    </Link>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-300">
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex gap-6 text-sm text-slate-400">
                    <span>
                      {inv.currency}&nbsp;{inv.amount}
                    </span>
                    <span>
                      {copy.invest.labelYield}
                      {inv.yield}
                    </span>
                    <span>
                      {copy.invest.labelMaturity}
                      {inv.dueDate}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {visibleCount < filteredInvoices.length && (
              <button
                ref={loadMoreRef}
                type="button"
                onClick={handleLoadMore}
                aria-label={copy.invest.loadMoreAriaLabel}
                className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-900/30 py-3 text-sm text-cyan-400 hover:bg-slate-800/50"
              >
                {copy.invest.loadMore}
              </button>
            )}
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-400">
              {copy.invest.yieldDisclaimer}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function InvestPage() {
  return <InvestMarketplace />;
}
