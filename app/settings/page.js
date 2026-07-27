"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NavMenu from "@/components/NavMenu";
import ThemeInputs from "@/components/ThemeInputs";
import { copy } from "../copy/en";
import { loadMockSettings, getCategoryList, MOCK_SETTINGS } from "./lib";
import CopyButton from "@/components/CopyButton";

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 200;

export const DEFAULT_FILTERS = Object.freeze({
  category: "all",
  query: "",
});

/**
 * Compose the polite-region announcement for the initial settings load.
 *
 * @param {Array}  settings
 * @param {object} [options]
 * @param {boolean} [options.filterActive]
 * @param {number}  [options.filteredCount]
 * @returns {string}
 */
export function getSettingsLoadAnnouncement(settings, { filterActive, filteredCount } = {}) {
  if (!Array.isArray(settings) || settings.length === 0) {
    return copy.settings.announceNoSettings;
  }
  if (filterActive) {
    if (filteredCount === 0) return copy.settings.announceNoMatch;
    return copy.settings.announceFiltered
      .replace("{matched}", String(filteredCount))
      .replace("{total}", String(settings.length));
  }
  return copy.settings.announceLoaded.replace("{count}", String(settings.length));
}

/**
 * Compose the polite-region announcement for a paging transition
 * ("Showing N of M preferences").
 */
export function getSettingsShowingAnnouncement(shown, total) {
  if (total === 0) return copy.settings.announceNoSettings;
  return copy.settings.announceShowing
    .replace("{shown}", String(shown))
    .replace("{total}", String(total));
}

/**
 * Apply the active filters to `list`.
 *
 * - `category === "all"` keeps every row.
 * - Free-text `query` matches case-insensitively against `label` or
 *   `description`.
 */
export function applyFiltersToSettings(list, filters) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const { category, query } = filters;
  const needle = (query ?? "").trim().toLowerCase();

  return list.filter((row) => {
    if (category && category !== "all" && row.category !== category) return false;
    if (needle) {
      const label = (row.label ?? "").toLowerCase();
      const desc = (row.description ?? "").toLowerCase();
      if (!label.includes(needle) && !desc.includes(needle)) return false;
    }
    return true;
  });
}

/**
 * `SettingsPage` — settings list with category filter and "Load more"
 * pagination (issue #743).  Mock data is loaded via the injectable
 * `loadSettings` so tests can swap it deterministically.  Paging is
 * declared state — not an effect — using the React-recommended
 * "adjust state during render" pattern so filter changes never reset
 * paging via a cascading effect.
 *
 * @param {object}   props
 * @param {Function} [props.loadSettings] - Async loader; defaults to the
 *   mock loader.  Tests pass their own deterministic loader.
 * @returns {JSX.Element}
 */
export function SettingsPage({ loadSettings = loadMockSettings } = {}) {
  const [settings, setSettings] = useState(null); // null = loading
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [retryKey, setRetryKey] = useState(0);

  // Reset paging when a different list of settings arrives (fetch, retry,
  // or test fixture swap).  Compared during render so no effect is needed.
  const [pagingResetFor, setPagingResetFor] = useState(settings);
  if (settings !== pagingResetFor) {
    setPagingResetFor(settings);
    setVisibleCount(PAGE_SIZE);
  }

  // Reset paging every time the filter signature changes so the user
  // always starts at the first page after a filtering decision.
  const filterSignature = JSON.stringify([filters.category, debouncedQuery]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setVisibleCount(PAGE_SIZE);
  }

  const filtersWithDebounced = useMemo(
    () => ({ category: filters.category, query: debouncedQuery }),
    [filters.category, debouncedQuery]
  );

  // Debounce the free-text query so a flurry of keystrokes does not
  // reset paging back to page 1 on every character.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(filters.query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filters.query]);

  const filteredSettings = useMemo(
    () => applyFiltersToSettings(settings ?? [], filtersWithDebounced),
    [settings, filtersWithDebounced]
  );

  const filterActive =
    filters.category !== "all" || (filters.query ?? "").trim().length > 0;

  // Effect: load settings on mount and on every retry.  Uses an
  // AbortController so unmount or a retry cancels any in-flight load.
  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const run = async () => {
      try {
        const next = await loadSettings({ signal: controller.signal });
        if (!isActive) return;
        setSettings(Array.isArray(next) ? next : []);
        setLoadError("");
      } catch {
        if (!isActive) return;
        // Use `null` (not `[]`) so the polite live-region branch that
        // announces errorStatus can fire alongside the visible alert.
        setSettings(null);
        setLoadError(copy.settings.errorDescription);
      }
    };
    void run();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [loadSettings, retryKey]);

  const reload = useCallback(() => {
    setSettings(null);
    setLoadError("");
    setRetryKey((k) => k + 1);
  }, []);

  // Polite live-region message derived from reactive state.
  const statusMessage = useMemo(() => {
    if (!Array.isArray(settings)) return loadError ? copy.settings.errorStatus : "";
    if (filterActive) {
      return getSettingsLoadAnnouncement(settings, {
        filterActive: true,
        filteredCount: filteredSettings.length,
      });
    }
    if (visibleCount < filteredSettings.length) {
      return getSettingsShowingAnnouncement(visibleCount, filteredSettings.length);
    }
    if (visibleCount > PAGE_SIZE) {
      // After Load more reached the last page we keep the "Showing N
      // of M" format so the announcement remains consistent regardless
      // of how the user advanced.
      return getSettingsShowingAnnouncement(filteredSettings.length, filteredSettings.length);
    }
    return getSettingsLoadAnnouncement(settings);
  }, [settings, filterActive, filteredSettings.length, visibleCount, loadError]);

  const loadMoreRef = useRef(null);

  /**
   * Append the next PAGE_SIZE items.  Focus is restored to the
   * "Load more" button via a microtask so keyboard users do not lose
   * their place after each load.
   */
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => {
      return Math.min(prev + PAGE_SIZE, filteredSettings.length);
    });
    setTimeout(() => {
      loadMoreRef.current?.focus();
    }, 0);
  }, [filteredSettings.length]);

  const visibleSettings = useMemo(
    () => filteredSettings.slice(0, visibleCount),
    [filteredSettings, visibleCount]
  );

  const hasMore = visibleCount < filteredSettings.length;
  const categories = useMemo(() => getCategoryList(MOCK_SETTINGS), []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavMenu />

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Polite live region — announced on filter / paging changes */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </div>

        <h1 className="mb-2 text-2xl font-bold">{copy.settings.title}</h1>
        <p className="mb-8 text-slate-400">{copy.settings.subtext}</p>

        {/* Filters */}
        <fieldset
          aria-label={copy.settings.filterLegend}
          aria-describedby="settings-filters-help"
          className="mb-6 rounded-xl border border-slate-800 bg-slate-900/30 p-6"
        >
          <legend className="sr-only">{copy.settings.filterLegend}</legend>
          <p
            id="settings-filters-help"
            className="mb-4 text-xs text-slate-400"
          >
            {copy.settings.filterHelp}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <span>{copy.settings.filterCategory}</span>
              <select
                data-testid="settings-category-filter"
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, category: e.target.value }))
                }
                aria-label={copy.settings.filterCategory}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? copy.settings.allCategories : c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-1 items-center gap-2 text-sm text-slate-300">
              <span>{copy.settings.filterSearch}</span>
              <input
                type="search"
                data-testid="settings-search-filter"
                value={filters.query}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, query: e.target.value }))
                }
                aria-label={copy.settings.filterSearch}
                placeholder={copy.settings.searchPlaceholder}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </label>

            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              aria-label={copy.settings.clearFilters}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {copy.settings.clearFilters}
            </button>
          </div>
        </fieldset>

        {/* Error state — retryable */}
        {loadError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-red-200"
          >
            <p className="font-semibold">{copy.settings.errorTitle}</p>
            <p className="mt-2 text-sm">{loadError}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg border border-red-400/60 px-3 py-1.5 text-xs font-medium text-red-100 hover:border-red-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {copy.settings.retryAction}
            </button>
          </div>
        ) : !Array.isArray(settings) ? (
          // Loading skeleton — component-agnostic so tests can swap if needed.
          <ul
            data-testid="settings-loading"
            aria-busy="true"
            aria-label={copy.settings.loadingAriaLabel}
            className="space-y-3"
          >
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <li
                key={i}
                className="h-16 animate-pulse rounded-xl border border-slate-800 bg-slate-900/30"
              />
            ))}
          </ul>
        ) : settings.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            {copy.settings.emptyState}
          </div>
        ) : filteredSettings.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            {copy.settings.noMatchFilter}
          </div>
        ) : (
          <>
            {/* Visible count, for sighted users */}
            <p
              id="settings-count"
              data-testid="settings-count"
              className="mb-4 text-sm text-slate-400"
              aria-live="polite"
              aria-atomic="true"
            >
              {getSettingsShowingAnnouncement(visibleSettings.length, filteredSettings.length)}
            </p>

            <div className="mb-6">
              <ThemeInputs
                initialTheme="system"
                initialAccentColour="cyan"
              />
            </div>

            <ul aria-label={copy.settings.listAriaLabel} className="space-y-3">
              {visibleSettings.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-100">{row.label}</p>
                        <CopyButton
                          text={row.id}
                          label={copy.settings.copyIdentifier}
                          successMessage={copy.settings.toastCopySuccessMsg}
                          errorMessage={copy.settings.toastCopyErrorMsg}
                        />
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{row.description}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-slate-300">
                        {row.category}
                      </span>
                      <span className="rounded-md bg-cyan-900/40 px-2 py-1 font-mono text-cyan-300">
                        {row.type}
                      </span>
                      <span className="rounded-md border border-slate-700 px-2 py-1 text-slate-300">
                        {row.value}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {hasMore && (
              <button
                ref={loadMoreRef}
                type="button"
                onClick={handleLoadMore}
                aria-label={copy.settings.loadMoreAriaLabel}
                data-testid="settings-load-more"
                className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-900/30 py-3 text-sm text-cyan-400 hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {copy.settings.loadMore}
              </button>
            )}

            {!hasMore && visibleCount > PAGE_SIZE && (
              <p
                data-testid="settings-end-of-list"
                className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-center text-sm text-slate-500"
              >
                {copy.settings.endOfList}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/**
 * Default Next.js page component.  Props are forwarded to `SettingsPage`
 * so tests can inject a deterministic loader through the same surface the
 * Next.js routing layer uses.
 */
export default function SettingsRoute(props) {
  return <SettingsPage {...props} />;
}
