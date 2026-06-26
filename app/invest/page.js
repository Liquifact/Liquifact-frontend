"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import InvoiceListSkeleton from "../../components/InvoiceListSkeleton";
import Pagination from "../../components/Pagination";
import InvoiceSearch from "../../components/InvoiceSearch";
import InvoiceFilters from "../../components/InvoiceFilters";
import { copy } from "../copy/en";
import { fetchInvestableInvoices } from "../../lib/api/invoices";
import ErrorBanner from "../../components/ErrorBanner";

/**
 * Number of invoices rendered per page. Export allows tests to reference
 * the same constant without hard-coding a magic number.
 */
export const PAGE_SIZE = 10;

/**
 * Debounce delay (ms) for the issuer search field.
 */
export const SEARCH_DEBOUNCE_MS = 200;

/**
 * Default filter state — all filters cleared.
 */
const DEFAULT_FILTERS = {
  currency: "",
  minYield: "",
  dateFrom: "",
  dateTo: "",
  sort: "",
};

/**
 * Returns the screen-reader announcement text for the initial invoice load.
 *
 * @param {Array} invoices - The resolved invoice array (may be empty).
 * @param {object} [options]
 * @param {boolean} [options.filterActive=false] - Whether an issuer filter is applied.
 * @param {number} [options.filteredCount=0] - Number of invoices matching the current filter.
 * @returns {string}
 */
export function getInvoiceLoadAnnouncement(invoices, { filterActive = false, filteredCount = 0 } = {}) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return "No invoices available";
  }

  if (filterActive) {
    return filteredCount === 0 ? "No invoices match" : `${filteredCount} of ${invoices.length} invoices match`;
  }

  return `${invoices.length} investable invoices loaded`;
}

/**
 * Returns the screen-reader announcement text for the current pagination state.
 *
 * @param {number} shown - Number of invoices currently visible.
 * @param {number} total - Total number of invoices available.
 * @returns {string}
 */
export function getPaginationAnnouncement(shown, total) {
  return `Showing ${shown} of ${total} investable invoices`;
}

/**
 * InvestMarketplace — main component for the invest page.
 *
 * Fetches invoices via `loadInvoices`, renders them PAGE_SIZE at a time,
 * and exposes a "Load more" control to append the next batch. Paging
 * resets whenever a new invoice set arrives so filter changes stay
 * non-breaking.
 *
 * Retry behaviour:
 *   - Clicking "Try again" in the ErrorBanner calls reload(), which increments
 *     retryKey and re-triggers the load useEffect.
 *   - State is reset to loading (invoices=null) and loadError is cleared before
 *     the new request starts.
 *   - The previous AbortController is aborted via the effect cleanup before the
 *     new effect runs, so a stale request can never overwrite fresh state.
 *
 * @param {object}   props
 * @param {Function} [props.loadInvoices] - Async function that resolves to an
 *   invoice array. Defaults to fetchInvestableInvoices; injectable for testing.
 * @returns {JSX.Element}
 */
export function InvestMarketplace({ loadInvoices = fetchInvestableInvoices }) {
  const [invoices, setInvoices] = useState(null); // null = loading
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [statusMessage, setStatusMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  /**
   * Incrementing retryKey re-triggers the load effect (retry without page
   * reload). Starts at 0 so the reset effect is skipped on initial mount.
   */
  const [retryKey, setRetryKey] = useState(0);

  /** Ref forwarded to the "Load more" button for focus management. */
  const loadMoreRef = useRef(null);

  /**
   * Reset state only when retry is explicitly triggered (retryKey > 0).
   * Keeping this separate prevents the reset from firing on initial mount
   * and avoids a setState-inside-effect loop.
   */
  useEffect(() => {
    if (retryKey === 0) return;
    setInvoices(null);
    setLoadError("");
    setStatusMessage("");
    setVisibleCount(PAGE_SIZE);
  }, [retryKey]);

  useEffect(() => {
    /**
     * Each render cycle that depends on [loadInvoices, retryKey] gets its own
     * AbortController. The cleanup function aborts the previous controller and
     * marks the closure stale (isActive=false) so a slow response that arrives
     * after unmount or after a retry cannot overwrite fresh state.
     */
    const controller = new AbortController();
    let isActive = true;

    const announceLoadCompletion = async () => {
      try {
        const nextInvoices = await loadInvoices({ signal: controller.signal });

        if (!isActive) return;

        const normalizedInvoices = Array.isArray(nextInvoices) ? nextInvoices : [];

        setInvoices(normalizedInvoices);
        setVisibleCount(PAGE_SIZE);
        setStatusMessage(getInvoiceLoadAnnouncement(normalizedInvoices));
      } catch {
        if (!isActive) return;

        setInvoices([]);
        setLoadError(copy.invest.errorDescription);
        setStatusMessage(copy.invest.errorStatus);
      }
    };

    void announceLoadCompletion();

    return () => {
      // Abort any in-flight request and mark this closure stale so a late
      // response from a previous attempt cannot overwrite the fresh state
      // started by the retry.
      isActive = false;
      controller.abort();
    };
    // retryKey triggers a fresh load on retry; loadInvoices is stable between renders.
  }, [loadInvoices, retryKey]);

  // ── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Retry handler ────────────────────────────────────────────────────────
  /**
   * Re-triggers the load effect by incrementing retryKey.
   * The effect's cleanup (isActive=false + controller.abort) fires first,
   * so any in-flight stale request is cancelled before the new one starts.
   * The polite status region is cleared by the reset effect so screen readers
   * re-announce once the fresh load completes.
   */
  const reload = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  // ── Load-more handler ────────────────────────────────────────────────────
  /**
   * Appends the next PAGE_SIZE items and updates the live-region status.
   * Focus is moved back to the "Load more" button (if it still exists) so
   * keyboard users do not lose their place in the page.
   */
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const next = Math.min(prev + PAGE_SIZE, invoices?.length ?? prev);
      const total = invoices?.length ?? 0;
      setStatusMessage(getPaginationAnnouncement(next, total));
      return next;
    });

    // Restore focus on next tick so the button is still in the DOM when focused.
    setTimeout(() => {
      loadMoreRef.current?.focus();
    }, 0);
  }, [invoices]);

  // ── Search change handler ────────────────────────────────────────────────
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const allInvoices = Array.isArray(invoices) ? invoices : [];

  const searchFiltered = debouncedQuery ? allInvoices.filter((inv) => inv.issuer.toLowerCase().includes(debouncedQuery.toLowerCase())) : allInvoices;

  const filteredInvoices = (() => {
    let result = [...searchFiltered];

    if (filters.currency) {
      result = result.filter((inv) => inv.currency === filters.currency);
    }
    if (filters.minYield) {
      const min = parseFloat(filters.minYield);
      if (!Number.isNaN(min)) {
        result = result.filter((inv) => parseFloat(inv.yield) >= min);
      }
    }
    if (filters.dateFrom) {
      result = result.filter((inv) => inv.dueDate >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter((inv) => inv.dueDate <= filters.dateTo);
    }
    if (filters.sort === "yield_desc") {
      result.sort((a, b) => parseFloat(b.yield) - parseFloat(a.yield));
    } else if (filters.sort === "yield_asc") {
      result.sort((a, b) => parseFloat(a.yield) - parseFloat(b.yield));
    } else if (filters.sort === "date_asc") {
      result.sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));
    } else if (filters.sort === "date_desc") {
      result.sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
    }

    return result;
  })();

  const visibleInvoices = filteredInvoices.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link
          href="/"
          className="inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
        >
          {copy.layout.backToHome}
        </Link>
      </header>

      <main id="main-content" className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">{copy.invest.title}</h1>
        <p className="text-slate-400 mb-8">{copy.invest.subtext}</p>

        {/* Polite live region — announces load results and pagination to screen readers */}
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </p>

        {/* Filter Controls */}
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <InvoiceSearch value={searchQuery} onChange={handleSearchChange} />
            <InvoiceFilters filters={filters} onFilterChange={setFilters} onClearFilters={() => setFilters(DEFAULT_FILTERS)} />
          </div>
        </div>

        {loadError ? (
          /*
           * Error state — actionLabel/onAction wire the existing ErrorBanner
           * action button to reload() so the user can retry without a full
           * page reload.
           *
           * Abort/cancellation flow:
           *   1. User clicks "Try again" → reload() increments retryKey.
           *   2. React re-runs the load useEffect cleanup: isActive=false and
           *      controller.abort() cancel any in-flight stale request.
           *   3. The reset useEffect (retryKey > 0) clears loadError and sets
           *      invoices=null so the skeleton reappears immediately.
           *   4. The load useEffect starts a fresh fetch with a new controller.
           */
          <ErrorBanner
            variant="error"
            title={copy.invest.errorTitle}
            description={loadError}
            previewLabel="Marketplace status"
            actionLabel="Try again"
            onAction={reload}
          />
        ) : invoices === null ? (
          <InvoiceListSkeleton rows={3} />
        ) : allInvoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-300">{copy.invest.emptyState}</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-300">No invoices match your filters.</div>
        ) : (
          <>
            <ul className="space-y-4">
              {visibleInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invest/${inv.id}`}
                    className="block rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-cyan-500/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                    aria-label={`View details for ${inv.issuer} invoice ${inv.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-100">{inv.issuer}</span>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-300">{inv.status}</span>
                    </div>
                    <div className="flex gap-6 text-sm text-slate-300">
                      <span>
                        {inv.currency}&nbsp;{inv.amount}
                      </span>
                      <span>Est. yield&nbsp;{inv.yield}</span>
                      <span>Maturity&nbsp;{inv.dueDate}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Pagination ref={loadMoreRef} shown={visibleInvoices.length} total={filteredInvoices.length} onLoadMore={handleLoadMore} />

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
              Note: Yield references are educational only and reflect on-chain basis-point assumptions. Invoice contracts settle at maturity.
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
