"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ErrorBanner from "@/components/ErrorBanner";
import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";
import Pagination from "@/components/Pagination";
import Button from "@/components/Button";
import InvoiceSearch from "@/components/InvoiceSearch";
import InvoiceFilters, {
  DEFAULT_FILTERS,
  hasActiveFilters,
} from "@/components/InvoiceFilters";
import { copy } from "../copy/en";
import { loadMockInvoices } from "./lib";

/**
 * Number of invoices rendered per page.  Export allows tests to reference
 * the same constant without hard-coding a magic number.
 */
export const PAGE_SIZE = 10;

/**
 * Debounce delay (ms) applied to the issuer search query before filtering.
 * Exported so tests can reference the same value.
 */
export const SEARCH_DEBOUNCE_MS = 200;

/**
 * Returns the screen-reader announcement text for the current invoice state.
 *
 * @param {Array} invoices - The full resolved invoice array (may be empty).
 * @param {object} [options]
 * @param {boolean} [options.filterActive=false] - Whether any filter/search is applied.
 * @param {number} [options.filteredCount=0] - Number of invoices matching the current filter.
 * @returns {string}
 */
export function getInvoiceLoadAnnouncement(
  invoices,
  { filterActive = false, filteredCount = 0 } = {},
) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return "No invoices available";
  }

  if (filterActive) {
    return filteredCount === 0
      ? "No invoices match"
      : `${filteredCount} of ${invoices.length} invoices match`;
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
 * Applies issuer search and filter/sort options to an invoice array.
 *
 * @param {Array} invoices - Full invoice list.
 * @param {string} query - Debounced issuer search string.
 * @param {object} filters - Active filter state (from InvoiceFilters).
 * @returns {Array} Filtered and sorted invoices.
 */
function applyFilters(invoices, query, filters) {
  let result = invoices;

  // Issuer search
  if (query) {
    const lower = query.toLowerCase();
    result = result.filter((inv) =>
      inv.issuer.toLowerCase().includes(lower),
    );
  }

  // Currency filter
  if (filters.currency) {
    result = result.filter((inv) => inv.currency === filters.currency);
  }

  // Yield min/max
  if (filters.yieldMin !== "") {
    const min = parseFloat(filters.yieldMin);
    result = result.filter(
      (inv) => parseFloat(inv.yield) >= min,
    );
  }
  if (filters.yieldMax !== "") {
    const max = parseFloat(filters.yieldMax);
    result = result.filter(
      (inv) => parseFloat(inv.yield) <= max,
    );
  }

  // Maturity date range
  if (filters.maturityFrom) {
    result = result.filter((inv) => inv.dueDate >= filters.maturityFrom);
  }
  if (filters.maturityTo) {
    result = result.filter((inv) => inv.dueDate <= filters.maturityTo);
  }

  // Sort
  if (filters.sort) {
    result = [...result].sort((a, b) => {
      switch (filters.sort) {
        case "yield_desc":
          return parseFloat(b.yield) - parseFloat(a.yield);
        case "yield_asc":
          return parseFloat(a.yield) - parseFloat(b.yield);
        case "amount_desc":
          return (
            parseFloat(b.amount.replace(/,/g, "")) -
            parseFloat(a.amount.replace(/,/g, ""))
          );
        case "amount_asc":
          return (
            parseFloat(a.amount.replace(/,/g, "")) -
            parseFloat(b.amount.replace(/,/g, ""))
          );
        case "maturity_asc":
          return a.dueDate.localeCompare(b.dueDate);
        case "maturity_desc":
          return b.dueDate.localeCompare(a.dueDate);
        default:
          return 0;
      }
    });
  }

  return result;
}

/**
 * InvestMarketplace — main component for the invest page.
 *
 * Fetches invoices via `loadInvoices`, applies issuer search and filters,
 * renders them PAGE_SIZE at a time, and exposes a "Load more" control to
 * append the next batch.  The polite live region announces load completion
 * and filtered counts so screen-reader users stay informed.
 *
 * @param {object}   props
 * @param {Function} [props.loadInvoices] - Async function that resolves to an
 *   invoice array.  Defaults to the mock loader; injectable for testing.
 * @returns {JSX.Element}
 */
export function InvestMarketplace({ loadInvoices = loadMockInvoices }) {
  const [invoices, setInvoices] = useState(null); // null = loading
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // paginationAnnouncement is set from event handlers (load-more), not effects.
  const [paginationAnnouncement, setPaginationAnnouncement] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadErrorAnnouncement, setLoadErrorAnnouncement] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  /** Ref forwarded to the "Load more" button for focus management. */
  const loadMoreRef = useRef(null);

  // ── Fetch invoices ──────────────────────────────────────────────────────
  useEffect(() => {
    let isActive = true;

    const fetchInvoices = async () => {
      try {
        const nextInvoices = await loadInvoices();

        if (!isActive) return;

        const normalizedInvoices = Array.isArray(nextInvoices)
          ? nextInvoices
          : [];

        setInvoices(normalizedInvoices);
        setVisibleCount(PAGE_SIZE);
        setPaginationAnnouncement("");
      } catch {
        if (!isActive) return;

        setInvoices([]);
        setLoadError(copy.invest.errorDescription);
        setLoadErrorAnnouncement("Unable to load investable invoices.");
      }
    };

    void fetchInvoices();

    return () => {
      isActive = false;
    };
  }, [loadInvoices]);

  // ── Debounce the search query ───────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);


  // ── Load-more handler ───────────────────────────────────────────────────
  /**
   * Appends the next PAGE_SIZE items and updates the live-region status.
   * Focus is moved back to the "Load more" button (if it still exists) so
   * keyboard users do not lose their place in the page.
   */
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const filteredInvoices = applyFilters(invoices ?? [], debouncedQuery, filters);
      const next = Math.min(prev + PAGE_SIZE, filteredInvoices.length);
      setPaginationAnnouncement(getPaginationAnnouncement(next, filteredInvoices.length));
      return next;
    });

    // Restore focus on next tick so the button is still in the DOM when we focus it.
    setTimeout(() => {
      loadMoreRef.current?.focus();
    }, 0);
  }, [invoices, debouncedQuery, filters]);

  // ── Search change handler ───────────────────────────────────────────────
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────
  const allInvoices = Array.isArray(invoices) ? invoices : [];
  const filteredInvoices = applyFilters(allInvoices, debouncedQuery, filters);
  const visibleInvoices = filteredInvoices.slice(0, visibleCount);

  /**
   * statusMessage is derived purely from state — no setState inside useEffect.
   * paginationAnnouncement (set from the load-more event handler) takes
   * precedence so "Showing N of M" is heard after each page click.
   */
  const filterActive = debouncedQuery !== "" || hasActiveFilters(filters);
  const loadStatusMessage = loadError
    ? loadErrorAnnouncement
    : invoices === null
    ? ""
    : getInvoiceLoadAnnouncement(allInvoices, {
        filterActive,
        filteredCount: filteredInvoices.length,
      });
  const statusMessage = paginationAnnouncement || loadStatusMessage;

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

        {/* Polite live region — load count, filter count, or pagination progress */}
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </p>

        {/* Filter Controls */}
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <InvoiceSearch
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <InvoiceFilters
              filters={filters}
              onFilterChange={(next) => {
                setFilters(next);
                setVisibleCount(PAGE_SIZE);
              }}
              onClearFilters={() => {
                setFilters(DEFAULT_FILTERS);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          </div>
        </div>

        {loadError ? (
          <ErrorBanner
            variant="error"
            title={copy.invest.errorTitle}
            description={loadError}
            previewLabel="Marketplace status"
          />
        ) : invoices === null ? (
          <InvoiceListSkeleton rows={3} />
        ) : allInvoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-300">
            {copy.invest.emptyState}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-300">
            No invoices match your filters.
          </div>
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
                      <span className="font-medium text-slate-100">
                        {inv.issuer}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-300">
                        {inv.status}
                      </span>
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

            <Pagination
              ref={loadMoreRef}
              shown={visibleInvoices.length}
              total={filteredInvoices.length}
              onLoadMore={handleLoadMore}
            />

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
