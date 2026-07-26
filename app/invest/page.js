"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ErrorBanner from "@/components/ErrorBanner";
import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";
import InvoiceSearch from "@/components/InvoiceSearch";
import InvoiceFilters, {
  DEFAULT_FILTERS,
  StatusLegendFilter,
  hasAnyActiveFilters,
  parseSortState,
} from "@/components/InvoiceFilters";
import BulkActionsToolbar from "@/components/BulkActionsToolbar";
import ConfirmDialog from "@/components/ConfirmDialog";
import NavMenu from "@/components/NavMenu";
import useBulkSelection from "@/lib/hooks/useBulkSelection";
import { copy } from "../copy/en";
// Mock data is sourced exclusively from lib.js (single source of truth until the API client lands).
import { loadMockInvoices } from "./lib";
import { useMarketplace } from "./MarketplaceContext";

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;

// Delay before an async load/retry outcome reaches the polite live region.
// Debouncing coalesces a burst of rapid results (e.g. mashing "Try again")
// into a single announcement of the latest outcome instead of flooding
// screen readers with every intermediate state. Filter/pagination/search
// text changes are not async results and stay immediate — see the
// `announcedMessage` effect below.
export const ANNOUNCE_DEBOUNCE_MS = 200;

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
 * Build the JSON-serializable subset of an invoice used for the bulk-export
 * download. We strip any internal-only fields so the export is safe to
 * share with counterparties.\n * @param {{id:string,issuer:string,amount:string,currency:string,dueDate:string,yield:string,status:string}} inv\n * @returns {string,amount:string,currency:string,dueDate:string,yield:string,status:string}}\n */
export function toExportRecord(inv) {
  return {
    id: inv.id,
    issuer: inv.issuer,
    amount: inv.amount,
    currency: inv.currency,
    dueDate: inv.dueDate,
    yield: inv.yield,
    status: inv.status,
  };
}

/**
 * Parse a numeric amount string like "12,500" → 12500.\n * @param {string} str\n * @returns {number}\n */
function parseAmount(str) {
  return parseFloat(String(str).replace(/,/g, "")) || 0;
}

/**
 * Parse a yield string like "8.2%" → 8.2.\n * @param {string} str\n * @returns {number}\n */
function parseYield(str) {
  return parseFloat(String(str).replace(/%/g, "")) || 0;
}

/**
 * Sort a copy of `list` according to the sort column + direction in `filters`.\n *\n * Supported columns: "amount", "yield", "maturity".\n * Direction: "asc" | "desc".\n *\n * @param {Array}  list\n * @param {object} filters\n * @returns {Array}\n */
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
 * Trigger a browser download of `text` as `filename` using a transient\n * `<a>` element + `URL.createObjectURL`. Fell back to throwing rather than\n * returning a Promise so failures are easy to assert in tests.\n * @param {string} text\n * @param {string} filename\n * @param {string} mimeType
 * @returns {void}\n */
function triggerDownload(text, filename, mimeType = "application/json") {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Downloads are only supported in browser environments");
  }
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Default bulk-export implementation: write a JSON blob to disk via the\n * browser download mechanism. The page wires `onBulkExport` to this helper\n * unless a custom exporter is provided.\n * @param {Array} selectedInvoices
 * @returns {{count: number}}\n */
export function defaultBulkExport(selectedInvoices) {
  const safeRecords = Array.isArray(selectedInvoices) ? selectedInvoices.map(toExportRecord) : [];
  // Defensive: if the browser download sink is missing (jsdom test env,
  // SSR builds, or first-render before hydration), degrade to a silent no-op
  // rather than throwing. The page can still surface the file via a custom
  // `onBulkExport` injection if it needs to.
  if (
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof document === "undefined"
  ) {
    return { count: safeRecords.length };
  }
  const json = JSON.stringify(
    { exportedAt: new Date().toISOString(), invoices: safeRecords },
    null,
    2
  );
  triggerDownload(json, `liquifact-invoices-${Date.now()}.json`);
  return { count: safeRecords.length };
}

/**
 * Default bulk-delete implementation: optimistically updates the supplied\n * list with a no-op filter (parent owns the actual mutation so the data\n * source of truth stays outside the export helper). The handler is a\n * documented opt-in behaviour: callers that already expose a delete API\n * inject their own `onBulkDelete`.\n * @param {Set<string>|Array<string>} ids
 * @returns {Promise<{count: number}>}
 */
export async function defaultBulkDelete(ids) {
  const count = ids instanceof Set ? ids.size : Array.isArray(ids) ? ids.length : 0;
  return { count };
}

/**
 * Resolve the toast API when supplied, otherwise null. We accept it as a\n * prop instead of importing the ToastProvider context directly so the\n * component is testable without a wrapping provider.\n */
function safeToast(toast) {
  if (!toast) return null;
  return {
    success: (msg, title) => toast.success?.(msg, title),
    error: (msg, title) => toast.error?.(msg, title),
    info: (msg, title) => toast.info?.(msg, title),
  };
}

/**
 * InvestMarketplace – main component for the invest page.\n *\n * Fetches invoices via `loadInvoices`, renders them PAGE_SIZE at a time,\n * and exposes a "Load more" control to append the next batch.  Paging\n * resets whenever a new invoice set arrives so filter changes stay\n * non-breaking.\n *\n * On load failure, an ErrorBanner is rendered with a "Try again" action\n * that re-runs the load. The retry resets state to loading, cancels any\n * stale in-flight request via AbortController, and re-announces via the\n * polite status region once the new load settles.\n *\n * @param {object}   props\n * @param {Function} [props.loadInvoices] - Async function that resolves to an\n *   invoice array.  Defaults to the mock loader; injectable for testing.\n * @param {Function} [props.onBulkDelete] - Async delete handler. Receives a\n *   Set<string> of selected ids. Defaults to a no-op pass-through.\n * @param {Function} [props.onBulkExport] - Bulk export handler. Receives the\n *   selected-invoice array; defaults to `defaultBulkExport`.\n * @param {object}   [props.toast] - Optional `{ success, error, info }`\n *   API. When provided, results are announced through it (and the toast\n *   region's `aria-live` ensures screen-reader users hear them).\n * @returns {JSX.Element}\n */
export function InvestMarketplace({
  loadInvoices = loadMockInvoices,
  onBulkDelete = defaultBulkDelete,
  onBulkExport = defaultBulkExport,
  toast,
}) {
  const searchParams = useSearchParams();
  const searchParamsValue = searchParams ?? new URLSearchParams();

  const { invoices, setInvoices, pendingIds } = useMarketplace();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pendingDeleteIds, setPendingDeleteIds] = useState(null);
  const [bulkRunning, setBulkRunning] = useState({ export: false, delete: false });
  const bulkLabels = copy.invest.bulk;
  const toastApi = useMemo(() => safeToast(toast), [toast]);

  /**
   * Incrementing retryKey causes the load effect to re-run, implementing
   * the retry behaviour. It is the only mechanism used to trigger a reload —
   * the effect itself is otherwise idempotent for the same loadInvoices ref.
   */
  const [retryKey, setRetryKey] = useState(0);

  /**
   * Bumped once per settled load/retry attempt (success or failure) that
   * wasn't superseded by an unmount or a newer retry. Used to distinguish
   * async-load-driven announcement changes (debounced) from filter/
   * pagination/search-driven ones (immediate) — see `announcedMessage` below.
   */
  const [loadGeneration, setLoadGeneration] = useState(0);

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
  }, [setInvoices]);

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

  const handleUpdateInvoice = useCallback((updatedInvoice) => {
    setInvoices((prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv));
    });
  }, []);

  // Debounced search term
  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);


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

  // Filtered + sorted invoice list - computed first so the bulk-selection
  // hook can derive a consistent selectedIds set from the same dataset the
  // UI is rendering.
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

  // Bulk-selection hook — auto-prunes selections when the underlying list
  // changes (filter, optimistic delete, etc.).
  const {
    selectedIds,
    selectedCount,
    visibleCount: selectionVisibleCount,
    allState,
    isSelected,
    toggle: toggleSelection,
    selectAll: selectAllInvoices,
    clear: clearSelection,
  } = useBulkSelection(filteredInvoices);

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
      } finally {
        // Marks this attempt as settled so the announcement effect below can
        // tell an async result apart from a filter/pagination/search change.
        // Skipped when the attempt was aborted/superseded (isActive is false).
        if (isActive) setLoadGeneration((generation) => generation + 1);
      }
    };

    void announceLoadCompletion();

    return () => {
      isActive = false;
      controller.abort();
    };
    // retryKey triggers a fresh load on retry without changing loadInvoices.
  }, [loadInvoices, retryKey, setInvoices]);

  // Derive the polite live-region announcement directly from reactive state.
  // Using useMemo (rather than a useEffect + setState) avoids a cascading
  // re-render and satisfies the react-hooks/set-state-in-effect lint rule.
  // The debounced version is then passed to the live region via
  // useSettingsAnnouncer, which skips the mount announcement and coalesces
  // rapid filter changes before they reach the screen-reader queue.
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

  // Pass statusMessage through useSettingsAnnouncer with delay=0 so the
  // live region updates immediately on each state change, while still
  // honouring the hook's "silent on mount" contract (no spurious announcement
  // when the page first renders).  Rapid search-input updates are already
  // coalesced upstream by the SEARCH_DEBOUNCE_MS delay on debouncedSearch,
  // so no additional debounce is needed at the announcement layer here.
  const debouncedAnnouncement = useSettingsAnnouncer(statusMessage, 0);

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

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleToggleSelectAll = useCallback(() => {
    if (allState === "all") {
      clearSelection();
    } else {
      selectAllInvoices();
    }
  }, [allState, clearSelection, selectAllInvoices]);

  const handleRequestDelete = useCallback(() => {
    // Snapshot the selection so the user can't race the dialog by tapping a
    // row between opening and confirming. The hook will also prune stale
    // ids on the next render, which keeps confirm/cancel honest.
    setPendingDeleteIds(new Set(selectedIds));
  }, [selectedIds]);

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteIds(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const idsToDelete = pendingDeleteIds;
    if (!idsToDelete || idsToDelete.size === 0) {
      setPendingDeleteIds(null);
      return;
    }
    setBulkRunning((prev) => ({ ...prev, delete: true }));
    try {
      await onBulkDelete(idsToDelete);

      // Optimistically remove from the visible list so the UI stays in sync
      // with the (mock) backend. The selection hook will prune selection
      // immediately because the row ids are no longer in the list.
      setInvoices((currentList) => {
        if (!Array.isArray(currentList)) return currentList;
        return currentList.filter((inv) => !idsToDelete.has(inv.id));
      });

      const plural = idsToDelete.size === 1 ? "" : "s";
      const successMsg = bulkLabels.deleteSuccessMsg
        .replace("{count}", String(idsToDelete.size))
        .replace("{plural}", plural);
      toastApi?.success(successMsg, bulkLabels.deleteSuccessTitle);

      setPendingDeleteIds(null);
    } catch {
      toastApi?.error(bulkLabels.deleteErrorMsg, bulkLabels.deleteErrorTitle);
    } finally {
      setBulkRunning((prev) => ({ ...prev, delete: false }));
    }
  }, [pendingDeleteIds, onBulkDelete, bulkLabels, toastApi]);

  const handleExport = useCallback(() => {
    if (selectedIds.size === 0) {
      toastApi?.info(bulkLabels.exportEmptyMsg, bulkLabels.exportSuccessTitle);
      return;
    }
    setBulkRunning((prev) => ({ ...prev, export: true }));
    try {
      // Build the selected-invoice slice in the order they appear in the
      // filtered list so the export matches the visible UI order.
      const selectedSlice = filteredInvoices.filter((inv) => selectedIds.has(inv.id));
      const result = onBulkExport(selectedSlice) || { count: selectedSlice.length };
      const exportCount = result.count ?? selectedSlice.length;
      const plural = exportCount === 1 ? "" : "s";
      const msg = bulkLabels.exportSuccessMsg
        .replace("{count}", String(exportCount))
        .replace("{plural}", plural);
      toastApi?.success(msg, bulkLabels.exportSuccessTitle);
    } finally {
      setBulkRunning((prev) => ({ ...prev, export: false }));
    }
  }, [
    selectedIds,
    filteredInvoices,
    onBulkExport,
    bulkLabels,
    toastApi,
  ]);

  // const visibleInvoices = filteredInvoices.slice(0, visibleCount);

  const deleteDialogOpen = pendingDeleteIds !== null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavMenu />

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Polite live region – announced to screen readers on every state change.
            Async load/retry outcomes are debounced (issue #722); filter,
            pagination, and search text update immediately. */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {debouncedAnnouncement}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">{copy.invest.title}</h1>
            <p className="text-slate-400">{copy.invest.subtext}</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button
              type="button"
              onClick={() => exportAsCSV(filteredInvoices, "wallet-export.csv")}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Export Wallet as CSV
            </button>
            <button
              type="button"
              onClick={() => exportAsJSON(filteredInvoices, "wallet-export.json")}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Export Wallet as JSON
            </button>
          </div>
        </div>

        {/*\n          ACCESSIBILITY DESIGN (Issue #91):\n          - We wrap the filter group in a <fieldset> with `aria-disabled="true"` to announce the preview/disabled\n            state to screen readers while keeping all controls discoverable in the tab order (unlike native `disabled`).\n          - `aria-describedby` programmatically links the fieldset to the visible "Soon" badge, ensuring that\n            assistive technologies announce the "coming soon" status when users navigate to the filters.\n          - We use a no-op handler structure (passing empty handlers) and CSS `pointer-events-none` to prevent\n            interaction while keeping the controls focusable.\n          - `opacity-60` is applied only to the inner controls container to ensure the "Soon" label itself stays\n            fully opaque for maximum contrast (WCAG AA compliant).\n        */}
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
          <div          className="flex flex-wrap gap-4 items-center pointer-events-none opacity-60">
            {/* InvoiceFilters only — search moved above */}
            <InvoiceFilters
              filters={filters}
              onFilterChange={setFilters}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
            />
          </div>
        </fieldset>

        {/* Bulk-action toolbar — renders nothing when no rows are selected */}
        <BulkActionsToolbar
          selectedCount={selectedCount}
          visibleCount={selectionVisibleCount}
          allState={allState}
          onToggleSelectAll={handleToggleSelectAll}
          onClearSelection={clearSelection}
          onExport={handleExport}
          onRequestDelete={handleRequestDelete}
          labels={bulkLabels}
          exporting={bulkRunning.export}
          deleting={bulkRunning.delete}
        />

        {/* Error state – retryable */}
        {loadError ? (
         <div role="alert" aria-live="assertive">
          <ErrorBanner
            title={copy.invest.errorTitle}
            description={loadError}
            actionLabel={copy.invest.retryAction}
            onAction={reload}
          />
         </div>
        ) : invoices === null ? (
          <div role="status" aria-live="polite" aria-label="Loading marketplace invoices">
            <InvoiceListSkeleton rows={3} />
          </div>
        ) : invoices.length === 0 ? (
          <div role="status" aria-live="polite" className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            {copy.invest.emptyState}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div role="status" aria-live="polite" className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
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
                    <div className="flex items-center gap-2">
                      {pendingIds.has(inv.id) && (
                        <span
                          aria-label="Processing"
                          className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"
                        />
                      )}
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-300">
                        {inv.status}
                      </span>
                    </div>
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
                className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-900/30 py-3 text-sm text-cyan-400 hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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

      {/* Confirmation dialog for destructive bulk action */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={bulkLabels.deleteConfirmTitle}
        description={
          pendingDeleteIds
            ? bulkLabels.deleteConfirmBody
                .replace("{count}", String(pendingDeleteIds.size))
                .replace("{plural}", pendingDeleteIds.size === 1 ? "" : "s")
            : ""
        }
        confirmLabel={
          pendingDeleteIds
            ? bulkLabels.deleteConfirmConfirmLabel
                .replace("{count}", String(pendingDeleteIds.size))
                .replace("{plural}", pendingDeleteIds.size === 1 ? "" : "s")
            : "Delete"
        }
        cancelLabel={bulkLabels.deleteConfirmCancelLabel}
        variant="danger"
        confirmLoading={bulkRunning.delete}
      />
    </div>
  );
}

export default function InvestPage() {
  return <InvestMarketplace />;
}
