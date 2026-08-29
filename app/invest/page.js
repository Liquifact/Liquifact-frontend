"use client";

import { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import BulkActionsToolbar from "@/components/BulkActionsToolbar";
import ConfirmDialog from "@/components/ConfirmDialog";
import NavMenu from "@/components/NavMenu";
import WatchlistSection from "@/components/WatchlistSection";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { copy } from "../copy/en";
// Mock data is sourced exclusively from lib.js (single source of truth until the API client lands).
import { loadMockInvoices } from "./lib";
import { exportAsCSV, exportAsJSON } from "@/utils/export";
import DensityToggle from "@/components/DensityToggle";
import { useDensity } from "@/lib/hooks/useDensity";
import { INVOICE_STATUSES } from "@/lib/types/invoice";
import useBulkSelection from "@/lib/hooks/useBulkSelection";
import { useSettingsAnnouncer } from "@/components/useSettingsAnnouncer";

import { ToastContext } from "@/components/ToastProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import MarketplaceErrorBoundary from "@/components/MarketplaceErrorBoundary";
import { reportError } from "@/lib/observability/reportError";
import { getInvoiceDetailHref, sanitizeMarketplaceSearchParams } from "@/lib/marketplaceRoute";

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
  const params = sanitizeMarketplaceSearchParams(searchParams ?? new URLSearchParams());

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
    params.set("statuses", filters.statuses.filter((status) => VALID_STATUSES.has(status)).join(","));
  }

  return params;
}

// Delay before an async load/retry outcome reaches the polite live region.
export const ANNOUNCE_DEBOUNCE_MS = 200;

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

function parseAmount(str) {
  return parseFloat(String(str).replace(/,/g, "")) || 0;
}

function parseYield(str) {
  return parseFloat(String(str).replace(/%/g, "")) || 0;
}

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

export function defaultBulkExport(selectedInvoices) {
  const safeRecords = Array.isArray(selectedInvoices) ? selectedInvoices.map(toExportRecord) : [];
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

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return { replace: () => {}, push: () => {}, prefetch: () => {} };
  }
}

function useSafeSearchParams() {
  try {
    return useSearchParams();
  } catch {
    return new URLSearchParams();
  }
}

export function InvestMarketplace({
  loadInvoices = loadMockInvoices,
  onBulkDelete = async () => {},
  onBulkExport = defaultBulkExport,
}) {
  const router = useSafeRouter();
  const searchParams = useSafeSearchParams();
  const searchParamsValue = searchParams ?? new URLSearchParams();
  const searchParamsString = searchParamsValue.toString();

  const initialUrlState = useMemo(
    () => parseFiltersFromSearchParams(searchParamsValue, DEFAULT_FILTERS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [density, setDensity] = useDensity();
  const { watchlists } = useWatchlist();

  const [pendingDeleteIds, setPendingDeleteIds] = useState(null);
  const [bulkRunning, setBulkRunning] = useState({ export: false, delete: false });
  const toastApi = useContext(ToastContext);
  const bulkLabels = useMemo(() => copy.invest?.bulkActions || {}, []);

  const [invoices, setInvoices] = useState(null); // null = loading
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
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
   * Ref for the page heading — the focus target for route-change focus
   * management (see the mount effect below).
   */
  const headingRef = useRef(null);

  // Focus management: Next.js client-side navigation does not reset focus
  // or announce the new view the way a full page load does, so keyboard
  // and screen-reader users who navigate into /invest can be left with
  // focus stranded on a now-removed element (e.g. a nav link). Moving
  // focus to the page heading on mount gives every arrival at this route —
  // whether via link, back/forward, or hard reload — a consistent, sensible
  // focus target and causes the heading to be announced. `tabIndex={-1}` on
  // the heading makes it programmatically focusable without adding it to
  // the natural Tab order; `outline-none` on the heading suppresses the
  // browser's default focus ring since this is not an interactive element,
  // keeping the change invisible to sighted users.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

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
  const handleStatusToggle = useCallback(
    (status) => {
      setFilters((prev) => {
        const current = Array.isArray(prev.statuses) ? prev.statuses : [];
        const next = current.includes(status)
          ? current.filter((s) => s !== status)
          : [...current, status];
        return { ...prev, statuses: next };
      });
    },
    [setFilters]
  );

  /** Clear all status chips. */
  const handleClearStatuses = useCallback(() => {
    setFilters((prev) => ({ ...prev, statuses: [] }));
  }, [setFilters]);

  const handleUpdateInvoice = useCallback((updatedInvoice) => {
    setInvoices((prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv));
    });
  }, []);

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
    if (filters.watchlistOnly) {
      const allStarredIds = new Set(watchlists.flatMap((wl) => wl.invoiceIds));
      list = list.filter((inv) => allStarredIds.has(inv.id));
    }
    return applySortToList(list, filters);
  }, [invoices, debouncedSearch, filters, watchlists]);

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
  }, [filteredInvoices.length, setVisibleCount]);

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
  }, [selectedIds, filteredInvoices, onBulkExport, bulkLabels, toastApi]);

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

        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold mb-2 outline-none">
          {copy.invest.title}
        </h1>
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <InvoiceSearch
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={copy.invest.searchPlaceholder}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportAsCSV(filteredInvoices, "invoices_export.csv")}
              disabled={filteredInvoices.length === 0}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => exportAsJSON(filteredInvoices, "invoices_export.json")}
              disabled={filteredInvoices.length === 0}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Export JSON
            </button>
          </div>
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
          <div className="flex flex-wrap gap-4 items-center pointer-events-none opacity-60">
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
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500"
          >
            {copy.invest.emptyState}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500"
          >
            {copy.invest.noMatchFilter}
          </div>
        ) : (
          <ErrorBoundary
            onError={(err, info) => reportError(err, { where: "invest.watchlist", info })}
            fallbackTitle="Error loading watchlist"
            fallbackDescription="An error occurred while rendering the watchlist. We logged the error — you can retry loading this section."
            retryLabel="Retry loading watchlist"
          >
            <>
              <ul
                aria-label={copy.invest.listAriaLabel}
                data-density={density}
                className={density === "compact" ? "space-y-2" : "space-y-4"}
              >
                {filteredInvoices.slice(0, visibleCount).map((inv) => (
                  <li
                    key={inv.id}
                    className={`rounded-xl border border-slate-800 bg-slate-900/50 ${
                      density === "compact" ? "p-3" : "p-5"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between ${
                        density === "compact" ? "mb-1.5" : "mb-3"
                      }`}
                    >
                      <Link
                        href={getInvoiceDetailHref(inv.id, searchParamsValue)}
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

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/60 pt-4">
                <DensityToggle density={density} onDensityChange={setDensity} />
              </div>
            </>
          </ErrorBoundary>
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
  return (
    <MarketplaceErrorBoundary>
      <InvestMarketplace />
    </MarketplaceErrorBoundary>
  );
}
