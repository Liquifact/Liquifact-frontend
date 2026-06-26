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
 * Key names match InvoiceFilters component's onFilterChange payload:
 *   yieldMin, yieldMax, currency, maturityFrom, maturityTo, sort.
 */
const DEFAULT_FILTERS = {
  currency: "",
  yieldMin: "",
  yieldMax: "",
  maturityFrom: "",
  maturityTo: "",
  sort: "",
};

/**
 * Returns the screen-reader announcement text for the initial invoice load.
 *
 * @param {Array} invoices - The resolved invoice array (may be empty).
 * @param {object} [options]
 * @param {boolean} [options.filterActive=false] - Whether any filter is applied.
 * @param {number} [options.filteredCount=0] - Number of invoices matching the filter.
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
 * and exposes a "Load more" control to append the next batch.
 *
 * Retry behaviour:
 *   - Clicking "Try again" in the ErrorBanner calls reload(), which resets
 *     all state synchronously then increments retryKey to re-trigger the
 *     load effect.
 *   - The previous AbortController is aborted via the effect cleanup before
 *     the new effect runs, so a stale request can never overwrite fresh state.
 *   - statusMessage is derived during render (not stored in a separate effect)
 *     so filter/search changes are announced without an extra render cycle.
 *
 * @param {object}   props
 * @param {Function} [props.loadInvoices] - Async function resolving to an
 *   invoice array. Defaults to fetchInvestableInvoices; injectable for tests.
 * @returns {JSX.Element}
 */
export function InvestMarketplace({ loadInvoices = fetchInvestableInvoices }) {
  const [invoices, setInvoices] = useState(null); // null = loading
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  /**
   * loadStatusMessage holds announcements owned by the async load path:
   * the initial "N invoices loaded" message, the error status, and the
   * "cleared" empty string set on retry. Filter-change announcements are
   * derived synchronously during render (see statusMessage below).
   */
  const [loadStatusMessage, setLoadStatusMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  /**
   * Incrementing retryKey re-triggers the load effect without a page reload.
   * reset state is handled synchronously inside reload() so no separate
   * reset effect is needed (avoids the react-hooks/set-state-in-effect lint rule).
   */
  const [retryKey, setRetryKey] = useState(0);

  /** Ref forwarded to the "Load more" button for focus management. */
  const loadMoreRef = useRef(null);

  // ── Load effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    /**
     * Each run gets its own AbortController. The cleanup aborts the previous
     * controller and marks the closure stale (isActive=false) so a slow
     * response arriving after unmount or after a retry cannot overwrite state.
     */
    const controller = new AbortController();
    let isActive = true;

    const run = async () => {
      try {
        const nextInvoices = await loadInvoices({ signal: controller.signal });
        if (!isActive) return;

        const normalized = Array.isArray(nextInvoices) ? nextInvoices : [];
        setInvoices(normalized);
        setVisibleCount(PAGE_SIZE);
        setLoadStatusMessage(getInvoiceLoadAnnouncement(normalized));
      } catch {
        if (!isActive) return;
        setInvoices([]);
        setLoadError(copy.invest.errorDescription);
        setLoadStatusMessage(copy.invest.errorStatus);
      }
    };

    void run();

    return () => {
      // Abort any in-flight request and mark this closure stale so a late
      // response from a previous attempt cannot overwrite fresh state.
      isActive = false;
      controller.abort();
    };
    // retryKey triggers a fresh load on retry; loadInvoices is stable.
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
   * Resets all load-related state synchronously (no separate reset effect
   * needed, keeping lint clean), then increments retryKey to re-trigger the
   * load effect. The effect cleanup (isActive=false + controller.abort) fires
   * first, so any in-flight stale request is cancelled before the new one starts.
   */
  const reload = useCallback(() => {
    setInvoices(null);
    setLoadError("");
    setLoadStatusMessage("");
    setVisibleCount(PAGE_SIZE);
    setRetryKey((k) => k + 1);
  }, []);

  // ── Load-more handler ────────────────────────────────────────────────────
  /**
   * Appends the next PAGE_SIZE items and updates the live-region status.
   * Focus is moved back to the "Load more" button so keyboard users do not
   * lose their place in the page.
   */
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const next = Math.min(prev + PAGE_SIZE, invoices?.length ?? prev);
      const total = invoices?.length ?? 0;
      setLoadStatusMessage(getPaginationAnnouncement(next, total));
      return next;
    });

    // Restore focus on next tick so the button is still in the DOM.
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

  /**
   * filterActive is true when any filter field or search term is non-empty.
   * Key names match InvoiceFilters' onFilterChange payload.
   */
  const filterActive = !!(debouncedQuery || filters.currency || filters.yieldMin || filters.yieldMax || filters.maturityFrom || filters.maturityTo);

  const searchFiltered = debouncedQuery ? allInvoices.filter((inv) => inv.issuer.toLowerCase().includes(debouncedQuery.toLowerCase())) : allInvoices;

  const filteredInvoices = (() => {
    let result = [...searchFiltered];

    // currency — key matches InvoiceFilters
    if (filters.currency) {
      result = result.filter((inv) => inv.currency === filters.currency);
    }
    // yield minimum — InvoiceFilters key: yieldMin
    if (filters.yieldMin) {
      const min = parseFloat(filters.yieldMin);
      if (!Number.isNaN(min)) {
        result = result.filter((inv) => parseFloat(inv.yield) >= min);
      }
    }
    // yield maximum — InvoiceFilters key: yieldMax
    if (filters.yieldMax) {
      const max = parseFloat(filters.yieldMax);
      if (!Number.isNaN(max)) {
        result = result.filter((inv) => parseFloat(inv.yield) <= max);
      }
    }
    // maturity from — InvoiceFilters key: maturityFrom
    if (filters.maturityFrom) {
      result = result.filter((inv) => inv.dueDate >= filters.maturityFrom);
    }
    // maturity to — InvoiceFilters key: maturityTo
    if (filters.maturityTo) {
      result = result.filter((inv) => inv.dueDate <= filters.maturityTo);
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

  /**
   * statusMessage is derived during render rather than stored in a separate
   * effect, which avoids the react-hooks/set-state-in-effect lint error and
   * ensures filter/search changes are announced in the same render cycle.
   *
   * Priority:
   *   1. Still loading (invoices === null) — empty so screen readers stay silent.
   *   2. Error state — load effect already wrote the error status; honour it.
   *   3. Pagination — load effect wrote "Showing N of M"; honour it.
   *   4. Filter/search active — derive the match count announcement inline.
   *   5. Default — use whatever the load effect wrote (e.g. "N invoices loaded").
   */
  const statusMessage = (() => {
    if (invoices === null) return "";
    if (loadError) return loadStatusMessage;
    // Pagination announcement starts with "Showing"
    if (loadStatusMessage.startsWith("Showing")) return loadStatusMessage;
    // Filter/search active — derive inline so no effect needed
    if (filterActive) {
      return getInvoiceLoadAnnouncement(allInvoices, {
        filterActive: true,
        filteredCount: filteredInvoices.length,
      });
    }
    return loadStatusMessage;
  })();

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

        {/* Polite live region — announces load results and pagination */}
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
           *   1. User clicks "Try again" → reload() resets state synchronously
           *      then increments retryKey.
           *   2. React re-runs the load useEffect cleanup: isActive=false and
           *      controller.abort() cancel any in-flight stale request.
           *   3. invoices=null so the skeleton reappears immediately.
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
