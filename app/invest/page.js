"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasAnyActiveFilters, parseSortState } from "@/components/InvoiceFilters";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ErrorBanner from "@/components/ErrorBanner";
import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";
import InvoiceSearch from "@/components/InvoiceSearch";
import InvoiceFilters, { DEFAULT_FILTERS, StatusLegendFilter } from "@/components/InvoiceFilters";
import Pagination from "@/components/Pagination";
import { copy } from "../copy/en";
import { fetchInvestableInvoices } from "../../lib/api/invoices";
import NavMenu from "@/components/NavMenu";

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;

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
    return "No invoices available";
  }

  if (filterActive) {
    if (filteredCount === 0) {
      return "No invoices match";
    }
    return `${filteredCount} of ${invoices.length} invoices match`;
  }

  return `${invoices.length} investable invoices loaded`;
}

export function getPaginationAnnouncement(shown, total) {
  if (total === 0) return "No invoices available";
  return `Showing ${shown} of ${total} investable invoices`;
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
export function InvestMarketplace({ loadInvoices = fetchInvestableInvoices }) {
  const searchParams = useSearchParams();
  const searchParamsValue = searchParams ?? new URLSearchParams();

  const [invoices, setInvoices] = useState(null); // null = loading
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");

  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  /**
   * Incrementing retryKey causes the load effect to re-run, implementing
   * the retry behaviour. It is the only mechanism used to trigger a reload —
   * the effect itself is otherwise idempotent for the same loadInvoices ref.
   */
  const [retryKey, setRetryKey] = useState(0);

  // Tracks the invoices reference paging was last reset for. Compared during
  // render (rather than in an effect) per the React-recommended pattern for
  // resetting state when a prop/value changes: https://react.dev/learn/you-might-not-need-an-effect
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
  }, []);

  /** Toggle a status chip: add if absent, remove if present. */
  const handleStatusToggle = useCallback((status) => {
    setFilters((prev) => {
      const current = Array.isArray(prev.statuses) ? prev.statuses : [];
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return { ...prev, statuses: next };
    });
  }, []);

  /** Clear all status chips. */
  const handleClearStatuses = useCallback(() => {
    setFilters((prev) => ({ ...prev, statuses: [] }));
  }, []);

  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

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

  // Derive the live-region status from current state rather than calling setState
  // inside an effect, which avoids triggering cascading renders.
  const statusMessage = useMemo(() => {
    if (loadError) return copy.invest.errorStatus;
    if (!Array.isArray(invoices)) return "";
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
      return getPaginationAnnouncement(filteredInvoices.length, filteredInvoices.length);
    }
    return getInvoiceLoadAnnouncement(invoices);
  }, [filteredInvoices, filterActive, invoices, loadError, visibleCount]);

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
  }, [filteredInvoices.length]);

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

        <h1 className="text-2xl font-bold mb-2">Invest</h1>
        <p className="text-slate-400 mb-8">
          Browse tokenized invoices and fund them. Estimated yield is shown for educational
          purposes; actual payment is received at invoice maturity.
        </p>

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
            aria-label="Search by issuer name"
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
          <legend className="sr-only">Marketplace Filters</legend>
          <div
            id="filters-coming-soon"
            className="mb-4 inline-block rounded bg-slate-800 px-2 py-1 text-xs font-semibold tracking-wide text-slate-300"
          >
            Soon: These filter controls are currently unavailable.
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
            actionLabel="Try again"
            onAction={reload}
          />
        ) : invoices === null ? (
          <InvoiceListSkeleton rows={3} />
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            No investable invoices. Connect wallet to see the marketplace.
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            No invoices match your filters.
          </div>
        ) : (
          <>
            <ul aria-label="Investable invoices" className="space-y-4">
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
                    <span>Est. yield&nbsp;{inv.yield}</span>
                    <span>Maturity&nbsp;{inv.dueDate}</span>
                  </div>
                </li>
              ))}
            </ul>
            {visibleCount < filteredInvoices.length && (
              <button
                ref={loadMoreRef}
                type="button"
                onClick={handleLoadMore}
                aria-label="Load more invoices"
                className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-900/30 py-3 text-sm text-cyan-400 hover:bg-slate-800/50"
              >
                Load more
              </button>
            )}
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-400">
              Note: Yield references are educational only and reflect on-chain basis-point
              assumptions. Invoice contracts settle at maturity.
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
