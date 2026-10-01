"tuse client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
 * @returns {{filters: object, searchQuery: string}}
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

  // INVARIANT: Reject unknown status values to prevent silent filter failures.
  // Only include statuses that exist in the canonical INVOICE_STATUSES enum.
  const rawStatuses = (params.get("statuses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && VALID_STATUSES.has(s));

  const unknownStatuses = (params.get("statuses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !VALID_STATUSES.has(s));

  if (unknownStatuses.length > 0) {
    console.warn(
      `[Invariant Violation] URL contains unknown invoice status values (filtered out):`,
      unknownStatuses
    );
  }

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
      statuses: rawStatuses,
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
    params.set(
      "statuses",
      filters.statuses.filter((status) => VALID_STATUSES.has(status)).join(",")
    );
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

/**
 * Validate cross-field range invariants for the marketplace filters.
 *
 * Returns a map of field → error message for every violated invariant.
 * An empty object means all range constraints are satisfied.
 *
 * Rules enforced:
 *   - yieldMin must be a non-negative number when present
 *   - yieldMax must be a non-negative number when present
 *   - yieldMin must not exceed yieldMax when both are present
 *   - maturityFrom must be a valid ISO date when present
 *   - maturityTo must be a valid ISO date when present
 *   - maturityFrom must not be after maturityTo when both are present
 *
 * @param {object} filters
 * @returns {Record<string, string>} field → error message (empty when valid)
 */
export function validateFilterRanges(filters) {
  /** @type {Record<string, string>} */
  const errors = {};

  if (filters == null || typeof filters !== "object") return errors;

  const { yieldMin, yieldMax, maturityFrom, maturityTo } = filters;

  // Yield bounds
  const hasYieldMin = yieldMin !== "" && yieldMin !== undefined && yieldMin !== null;
  const hasYieldMax = yieldMax !== "" && yieldMax !== undefined && yieldMax !== null;

  if (hasYieldMin && !isValidYieldString(String(yieldMin))) {
    errors.yieldMin = copy.invest.filters.errorYieldMin;
  }
  if (hasYieldMax && !isValidYieldString(String(yieldMax))) {
    errors.yieldMax = copy.invest.filters.errorYieldMax;
  }
  if (
    hasYieldMin &&
    hasYieldMax &&
    !errors.yieldMin &&
    !errors.yieldMax &&
    parseFloat(yieldMin) > parseFloat(yieldMax)
  ) {
    errors.yieldRange = copy.invest.filters.errorYieldRange;
  }

  // Maturity bounds
  const hasMaturityFrom =
    maturityFrom !== "" && maturityFrom !== undefined && maturityFrom !== null;
  const hasMaturityTo = maturityTo !== "" && maturityTo !== undefined && maturityTo !== null;

  if (hasMaturityFrom && !isValidISODate(String(maturityFrom))) {
    errors.maturityFrom = copy.invest.filters.errorMaturityFrom;
  }
  if (hasMaturityTo && !isValidISODate(String(maturityTo))) {
    errors.maturityTo = copy.invest.filters.errorMaturityTo;
  }
  if (
    hasMaturityFrom &&
    hasMaturityTo &&
    !errors.maturityFrom &&
    !errors.maturityTo &&
    String(maturityFrom) > String(maturityTo)
  ) {
    errors.maturityRange = copy.invest.filters.errorMaturityRange;
  }

  return errors;
}

/**
 * Validate the arguments object passed to `loadInvoices`.
 *
 * Returns `null` when the args are fully valid, or a short error string
 * describing the first violation found. This is the gate that prevents
 * malformed pagination or filter state from reaching the data layer.
 *
 * Valid args contract:
 *   - cursor must be a string or null (not undefined / wrong type)
 *   - filters must be a plain object (may be empty)
 *   - search must be a string
 *   - sort must be a recognised column name or empty string / null
 *   - sortDir must be "asc" | "desc" or empty string / null
 *
 * @param {object} args
 * @returns {string | null} error message, or null when valid
 */
export function validateLoadInvoicesArgs(args) {
  if (args == null || typeof args !== "object" || Array.isArray(args)) {
    return "loadInvoices args must be a plain object.";
  }

  const { cursor, filters, search, sort, sortDir } = args;

  // cursor: must be a non-empty string or null — never undefined or wrong type
  if (cursor !== null && cursor !== undefined) {
    if (typeof cursor !== "string" || cursor === "") {
      return "cursor must be a non-empty string or null.";
    }
  }

  // filters: must be a plain object when provided
  if (filters !== undefined && filters !== null) {
    if (typeof filters !== "object" || Array.isArray(filters)) {
      return "filters must be a plain object.";
    }
  }

  // search: must be a string when provided
  if (search !== undefined && typeof search !== "string") {
    return "search must be a string.";
  }

  // sort: must be a recognised column or empty / null / undefined
  if (sort !== undefined && sort !== null && sort !== "") {
    if (!VALID_SORT_COLUMNS.has(sort)) {
      return `sort must be one of: ${[...VALID_SORT_COLUMNS].join(", ")}.`;
    }
  }

  // sortDir: must be "asc" | "desc" or empty / null / undefined
  if (sortDir !== undefined && sortDir !== null && sortDir !== "") {
    if (!VALID_SORT_DIRS.has(sortDir)) {
      return 'sortDir must be "asc" or "desc".';
    }
  }

  return null;
}

/**
 * Apply filter criteria and sort order to a list of invoices.
 *
 * This is the pure, exportable counterpart to the inline `filteredInvoices`
 * memo inside `InvestMarketplace`. Having it as a standalone function lets
 * callers (tests, utility scripts) invoke the full filter + sort pipeline
 * without mounting the component.
 *
 * @param {Array<object> | null | undefined} invoices
 * @param {string} searchQuery - Free-text issuer search (case-insensitive substring)
 * @param {object} filters - Structured filter state (see DEFAULT_FILTERS shape)
 * @param {Array<{invoiceIds: string[]}>} [watchlists=[]] - Watchlist sets for watchlistOnly filter
 * @returns {Array<object>}
 */
export function filterInvoices(invoices, searchQuery, filters, watchlists = []) {
  if (!Array.isArray(invoices)) return [];

  let list = invoices;

  const q = typeof searchQuery === "string" ? searchQuery.trim().toLowerCase() : "";
  if (q) {
    list = list.filter((inv) => inv.issuer?.toLowerCase().includes(q));
  }

  if (filters.currency) {
    list = list.filter((inv) => inv.currency === filters.currency);
  }
  if (filters.yieldMin !== "" && filters.yieldMin !== undefined) {
    const min = parseFloat(filters.yieldMin);
    if (Number.isFinite(min)) {
      list = list.filter((inv) => parseYield(inv.yield) >= min);
    }
  }
  if (filters.yieldMax !== "" && filters.yieldMax !== undefined) {
    const max = parseFloat(filters.yieldMax);
    if (Number.isFinite(max)) {
      list = list.filter((inv) => parseYield(inv.yield) <= max);
    }
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
    const allStarredIds = new Set(
      Array.isArray(watchlists) ? watchlists.flatMap((wl) => wl.invoiceIds ?? []) : []
    );
    list = list.filter((inv) => allStarredIds.has(inv.id));
  }

  return applySortToList(list, filters);
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

export function normalizeInvoicePageResult(payload) {
  if (Array.isArray(payload)) {
    return { items: payload, nextCursor: null, hasMore: false, invalidCursor: false };
  }

  const result = payload ?? {};
  const items = Array.isArray(result.items) ? result.items : [];
  const nextCursor = typeof result.nextCursor === "string" ? result.nextCursor : null;

  // INVARIANT: Defensive validation of pagination state. If nextCursor is present
  // but hasMore is false, that's an inconsistent state — hasMore should be true.
  const hasMore = Boolean(result.hasMore) || nextCursor !== null;
  if (nextCursor && !hasMore) {
    console.warn(
      "[Invariant Violation] Pagination state inconsistency: nextCursor present but hasMore=false. Correcting to hasMore=true"
    );
  }

  return {
    items,
    nextCursor,
    hasMore,
    invalidCursor: Boolean(result.invalidCursor),
  };
}

export function mergeInvoicePages(current = [], incoming = []) {
  const merged = new Map();

  for (const invoice of current) {
    if (invoice && invoice.id) merged.set(invoice.id, invoice);
  }

  for (const invoice of incoming) {
    if (invoice && invoice.id) merged.set(invoice.id, invoice);
  }

  return Array.from(merged.values());
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
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursorError, setCursorError] = useState("");
  const [pageLoading, setPageLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadGeneration, setLoadGeneration] = useState(0);
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState(initialUrlState.filters);
  const [debouncedSearch, setDebouncedSearch] = useState(initialUrlState.searchQuery);

  /**
   * Cross-field range validation for the filter panel.
   * Re-computed on every render so the UI always reflects the latest filter
   * state without needing a separate useEffect. An empty object means no
   * active violations.
   */
  const filterErrors = useMemo(() => validateFilterRanges(filters), [filters]);

  const committedSearchRef = useRef(
    buildSearchParams(initialUrlState.filters, initialUrlState.searchQuery).toString()
  );
  const urlUpdateTimerRef = useRef(null);

  /**
   * Monotonic token identifying the latest load attempt. Any async result
   * whose token does not match the current value is stale and must be
   * discarded. This makes recovery deterministic under retries, concurrent
   * loads, and unmount: only the newest attempt may commit state.
   */
  const loadTokenRef = useRef(0);

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
    // searchParamsValue is intentionally omitted; searchParamsString is the
    // stable identity used to detect external URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString]);

  // Debounce the search input before committing it to filters.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync committed filters/search back into the URL (debounced).
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const next = buildSearchParams(filters, debouncedSearch).toString();
    if (next === committedSearchRef.current) return undefined;

    if (urlUpdateTimerRef.current) clearTimeout(urlUpdateTimerRef.current);
    urlUpdateTimerRef.current = setTimeout(() => {
      committedSearchRef.current = next;
      const suffix = next ? `?${next}` : "";
      try {
        router.replace(`/invest${suffix}`, { scroll: false });
      } catch {
        // Navigation failures must not break the marketplace; the in-memory
        // filter state remains the source of truth for the current session.
        reportError(new Error("marketplace url sync failed"), {
          scope: "invest.urlSync",
        });
      }
    }, URL_SYNC_DEBOUNCE_MS);

    return () => {
      if (urlUpdateTimerRef.current) clearTimeout(urlUpdateTimerRef.current);
    };
  }, [filters, debouncedSearch, router]);

  // Load the first page of invoices.
  useEffect(() => {
    let cancelled = false;
    const generation = loadGeneration;

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
  const handleLoadMore = useCallback(async () => {
    if (pageLoadInFlightRef.current || pageLoading || !hasMore || !nextCursor || cursorError)
      return;

    pageLoadInFlightRef.current = true;
    const currentInvoices = Array.isArray(invoices) ? invoices : [];
    setPageLoading(true);
    setCursorError("");

    try {
      const pageResponse = await loadInvoices({
        signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
        cursor: nextCursor,
        filters,
        search: debouncedSearch,
        sort: filters.sort || null,
        sortDir: filters.sortDir || "desc",
      });

      const normalized = normalizeInvoicePageResult(pageResponse);
      if (normalized.invalidCursor) {
        setCursorError(copy.invest.invalidCursorDescription);
        setNextCursor(null);
        setHasMore(false);
        setPageLoading(false);
        return;
      }

      const merged = mergeInvoicePages(currentInvoices, normalized.items);
      setInvoices(merged);
      setNextCursor(normalized.nextCursor ?? null);
      setHasMore(Boolean(normalized.hasMore) || normalized.nextCursor !== null);
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, merged.length));
    } catch {
      setLoadError(copy.invest.errorDescription);
      setCursorError("");
      try {
        const payload = await loadInvoices();
        if (cancelled || generation !== loadGeneration) return;
        const normalized = normalizeInvoicePageResult(payload);
        setInvoices(normalized.items);
        setNextCursor(normalized.nextCursor);
        setHasMore(normalized.hasMore);
      } catch (error) {
        if (cancelled || generation !== loadGeneration) return;
        setInvoices([]);
        setLoadError(copy.invest.loadError);
        reportError(error, { scope: "invest.loadInvoices" });
      }
    }
  }, [
    pageLoading,
    hasMore,
    nextCursor,
    cursorError,
    invoices,
    loadInvoices,
    filters,
    debouncedSearch,
  ]);

    run();

    return () => {
      cancelled = true;
    };
  }, [loadInvoices, loadGeneration]);

  const retryLoad = useCallback(() => {
    setLoadGeneration((n) => n + 1);
  }, []);

  const loadMore = useCallback(async () => {
    if (pageLoading || !hasMore || !nextCursor) return;
    setPageLoading(true);
    setCursorError("");
    try {
      const payload = await loadInvoices({ cursor: nextCursor });
      const normalized = normalizeInvoicePageResult(payload);
      if (normalized.invalidCursor) {
        setCursorError(copy.invest.invalidCursor);
        setNextCursor(null);
        setHasMore(false);
        return;
      }
      setInvoices((current) => mergeInvoicePages(current ?? [], normalized.items));
      setNextCursor(normalized.nextCursor);
      setHasMore(normalized.hasMore);
    } catch (error) {
      setCursorError(copy.invest.loadError);
      reportError(error, { scope: "invest.loadMore" });
    } finally {
      setPageLoading(false);
    }
  }, [pageLoading, hasMore, nextCursor, loadInvoices]);

  const filteredList = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = invoices.filter((inv) => {
      if (q) {
        const hay = `${inv.id} ${inv.issuer} ${inv.currency}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.currency && inv.currency !== filters.currency) return false;
      if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
        if (!filters.statuses.includes(inv.status)) return false;
      }
      return true;
    });
    return applySortToList(filtered, filters);
  }, [invoices, debouncedSearch, filters]);

  const visibleInvoices = useMemo(
    () => filteredList.slice(0, visibleCount),
    [filteredList, visibleCount]
  );

  const { selectedIds, toggleSelection, clearSelection, selectAll, isSelected } = useBulkSelection(
    visibleInvoices
  );

  const selectedInvoices = useMemo(
    () => visibleInvoices.filter((inv) => selectedIds.has(inv.id)),
    [visibleInvoices, selectedIds]
  );

  const filterActive = hasAnyActiveFilters(filters) || debouncedSearch.trim() !== "";

  const announce = useSettingsAnnouncer();

  useEffect(() => {
    if (!Array.isArray(invoices)) return undefined;
    const timer = setTimeout(() => {
      announce(
        getInvoiceLoadAnnouncement(invoices, {
          filterActive,
          filteredCount: filteredList.length,
        })
      );
    }, ANNOUNCE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [invoices, filterActive, filteredList.length, announce]);

  const handleExport = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkRunning((prev) => ({ ...prev, export: true }));
    try {
      const result = await onBulkExport(selectedInvoices);
      toastApi?.success?.(
        (bulkLabels.exportSuccess ?? "Exported {count} invoices").replace(
          "{count}",
          String(result?.count ?? selectedIds.size)
        )
      );
    } catch (error) {
      toastApi?.error?.(bulkLabels.exportError ?? "Export failed");
      reportError(error, { scope: "invest.bulkExport" });
    } finally {
      setBulkRunning((prev) => ({ ...prev, export: false }));
    }
  }, [selectedIds, selectedInvoices, onBulkExport, toastApi, bulkLabels]);

  const handleDeleteRequest = useCallback(() => {
    if (selectedIds.size === 0) return;
    setPendingDeleteIds(Array.from(selectedIds));
  }, [selectedIds]);

  const handleDeleteConfirm = useCallback(async () => {
    const ids = pendingDeleteIds ?? [];
    setPendingDeleteIds(null);
    if (ids.length === 0) return;
    setBulkRunning((prev) => ({ ...prev, delete: true }));
    try {
      await onBulkDelete(ids);
      setInvoices((current) =>
        Array.isArray(current) ? current.filter((cur) => !ids.includes(cur.id)) : current
      );
      clearSelection();
      toastApi?.success?.(
        (bulkLabels.deleteSuccess ?? "Deleted {count} invoices").replace(
          "{count}",
          String(ids.length)
        )
      );
    } catch (error) {
      toastApi?.error?.(bulkLabels.deleteError ?? "Delete failed");
      reportError(error, { scope: "invest.bulkDelete" });
    } finally {
      setBulkRunning((prev) => ({ ...prev, delete: false }));
    }
  }, [pendingDeleteIds, onBulkDelete, clearSelection, toastApi, bulkLabels]);

  const handleExportCsv = useCallback(() => {
    try {
      exportAsCSV(filteredList.map(toExportRecord), `liquifact-invoices-${Date.now()}.csv`);
    } catch (error) {
      reportError(error, { scope: "invest.exportCsv" });
    }
  }, [filteredList]);

  const handleExportJson = useCallback(() => {
    try {
      exportAsJSON(filteredList.map(toExportRecord), `liquifact-invoices-${Date.now()}.json`);
    } catch (error) {
      reportError(error, { scope: "invest.exportJson" });
    }
  }, [filteredList]);

  const handleFiltersChange = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
    setDebouncedSearch("");
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const loading = invoices === null;
  const isEmpty = !loading && filteredList.length === 0;

  return (
    <MarketplaceErrorBoundary>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">{copy.invest.title}</h1>
              <NavMenu />
            </div>

            {loadError && (
              <ErrorBanner
                message={loadError}
                onRetry={retryLoad}
                retryLabel={copy.invest.retry}
              />
            )}

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <InvoiceSearch value={searchQuery} onChange={handleSearchChange} />
              <DensityToggle density={density} onChange={setDensity} />
            </div>

            <InvoiceFilters
              filters={filters}
              onChange={handleFiltersChange}
              onReset={handleResetFilters}
            />

            <StatusLegendFilter
              statuses={filters.statuses}
              onChange={(nextStatuses) => handleFiltersChange({ statuses: nextStatuses })}
            />

            <BulkActionsToolbar
              selectedCount={selectedIds.size}
              onClear={clearSelection}
              onExport={handleExport}
              onDelete={handleDeleteRequest}
              busy={bulkRunning}
            />

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={handleExportCsv}>
                {copy.invest.exportCsv}
              </button>
              <button type="button" onClick={handleExportJson}>
                {copy.invest.exportJson}
              </button>
            </div>

            {cursorError && (
              <div className="mt-4 text-sm text-red-600">{cursorError}</div>
            )}

            {loading ? (
              <InvoiceListSkeleton />
            ) : isEmpty ? (
              <div className="mt-6 text-center text-gray-500">
                {filterActive ? copy.invest.noMatch : copy.invest.noInvoices}
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {visibleInvoices.map((inv) => (
                  <li key={inv.id} className="rounded bg-white p-4 shadow">
                    <div className="flex items-center justify-between">
                      <input
                        type="checkbox"
                        checked={isSelected(inv.id)}
                        onChange={() => toggleSelection(inv.id)}
                        aria-label={`Select invoice ${inv.id}`}
                      />
                      <Link href={getInvoiceDetailHref(inv.id)}>
                        {inv.id}
                      </Link>
                      <span className="text-sm text-gray-500">{inv.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <div className="mt-6 text-center">
                <button type="button" onClick={loadMore} disabled={pageLoading}>
                  {pageLoading ? copy.invest.loading : copy.invest.loadMore}
                </button>
              </div>
            )}

            <WatchlistSection watchlists={watchlists} />
          </div>
        </div>

        {pendingDeleteIds && (
          <ConfirmDialog
            title={bulkLabels.deleteConfirmTitle ?? "Delete invoices"}
            message={(bulkLabels.deleteConfirmMessage ?? "Delete {count} selected invoices?").replace(
              "{count}",
              String(pendingDeleteIds.length)
            )}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setPendingDeleteIds(null)}
          />
        )}
      </ErrorBoundary>
    </MarketplaceErrorBoundary>
  );
}

export default InvestMarketplace;
