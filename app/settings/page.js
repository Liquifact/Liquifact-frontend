"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NavMenu from "@/components/NavMenu";
import DensityToggle from "@/components/DensityToggle";
import { useDensity } from "@/lib/hooks/useDensity";
import { copy } from "../copy/en";
import NavMenu from "../../components/NavMenu";
import { formatRelativeTime } from "../../lib/format/date";
import {
  DEFAULT_SETTINGS,
  readStoredSettings,
  writeStoredSettings,
  readStoredSettingsUpdatedAt,
  writeStoredSettingsUpdatedAt,
} from "../../lib/settingsStore";

export function SettingsRow({ row, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(row.value);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const isWallet = row.category === "wallet";

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(row.value);
    setError("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(row.value);
    setError("");
    setAnnouncement("Edit cancelled");
  };

  const handleSave = () => {
    if (!editValue || editValue.trim() === "") {
      setError("Value cannot be empty");
      setAnnouncement("Validation failed: Value cannot be empty");
      return;
    }
    onSave(row.id, editValue);
    setIsEditing(false);
    setError("");
    setAnnouncement("Saved successfully");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="sr-only" aria-live="polite">{announcement}</div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-100">{row.label}</p>
          <p className="mt-1 text-sm text-slate-400">{row.description}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-slate-300">
            {row.category}
          </span>
          <span className="rounded-md bg-cyan-900/40 px-2 py-1 font-mono text-cyan-300">
            {row.type}
          </span>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
                aria-label={`Edit ${row.label}`}
                aria-invalid={!!error}
                aria-describedby={error ? `error-${row.id}` : undefined}
                autoFocus
              />
              <button
                onClick={handleSave}
                className="rounded bg-cyan-600 px-2 py-1 text-white hover:bg-cyan-500"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="rounded bg-slate-700 px-2 py-1 text-white hover:bg-slate-600"
              >
                Cancel
              </button>
              {error && (
                <span id={`error-${row.id}`} className="text-red-400 sr-only">
                  {error}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-slate-700 px-2 py-1 text-slate-300">
                {row.value}
              </span>
              {isWallet && (
                <button
                  onClick={handleEdit}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300 hover:text-white"
                  aria-label={`Edit ${row.label}`}
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {isEditing && error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </li>
  );
}

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 200;

/** How often (ms) the relative label re-renders itself while mounted. */
const RELATIVE_LABEL_REFRESH_MS = 60_000;

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    return readStoredSettings();
  });
  const [updatedAt, setUpdatedAt] = useState(() => {
    if (typeof window === "undefined") return null;
    return readStoredSettingsUpdatedAt();
  });
  const [hydrated] = useState(() => typeof window !== "undefined");

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
  const [density, setDensity] = useDensity();

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
    const id = setInterval(() => forceRefresh((n) => n + 1), RELATIVE_LABEL_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const handleSaveSetting = useCallback((id, newValue) => {
    setSettings((prev) => 
      prev ? prev.map(row => row.id === id ? { ...row, value: newValue } : row) : prev
    );
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
    setUpdatedAt(now);
    writeStoredSettingsUpdatedAt(now);
  };

  const relativeLabel = hydrated ? formatRelativeTime(updatedAt) : null;
  const absoluteLabel = updatedAt ? new Date(updatedAt).toLocaleString() : null;

  return (
    <div data-density={density} className="min-h-screen bg-slate-950 text-slate-100">
      <NavMenu />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              {copy.settings.title}
            </h1>
            <p className="text-lg text-slate-400">{copy.settings.description}</p>
          </div>

          {relativeLabel && (
            <span
              data-testid="settings-updated-at"
              title={`Settings last changed: ${absoluteLabel}`}
              className="text-xs text-slate-500"
            >
              <span aria-hidden="true">
                {copy.settings.lastUpdatedPrefix} {relativeLabel}
              </span>
              <span className="sr-only">{`Settings last changed ${absoluteLabel}`}</span>
            </span>
          )}
        </div>

        <h1 className="mb-2 text-2xl font-bold">{copy.settings.title}</h1>
        <p className="mb-8 text-slate-400">{copy.settings.subtext}</p>

        {/* Density toggle */}
        <section
          data-testid="settings-density-section"
          className="mb-6 rounded-xl border border-slate-800 bg-slate-900/30"
          style={{ padding: "var(--settings-section-padding)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-100">{copy.settings.densityLabel}</p>
              <p className="mt-1 text-sm text-slate-400">{copy.settings.densityDescription}</p>
            </div>
              <DensityToggle density={density} onDensityChange={setDensity} />
          </div>
        </section>

        {/* Filters */}
        <fieldset
          aria-label={copy.settings.filterLegend}
          aria-describedby="settings-filters-help"
          className="mb-6 rounded-xl border border-slate-800 bg-slate-900/30"
          style={{ padding: "var(--settings-section-padding)", marginBottom: "var(--settings-section-gap)" }}
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
            <select
              id="settings-currency"
              value={settings.currency}
              onChange={(e) => applyChange({ currency: e.target.value })}
              className="focus-ring w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
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

            <ul aria-label={copy.settings.listAriaLabel} style={{ gap: "var(--settings-list-gap)" }} className="flex flex-col">
              {visibleSettings.map((row) => (
                <SettingsRow key={row.id} row={row} onSave={handleSaveSetting} />
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-6">
            <div>
              <p className="text-sm font-medium text-slate-200">
                {copy.settings.emailNotificationsLabel}
              </p>
              <p className="text-xs text-slate-500">{copy.settings.emailNotificationsHint}</p>
            </div>
            <button
              id="settings-email-toggle"
              type="button"
              role="switch"
              aria-checked={settings.emailNotifications}
              aria-label={copy.settings.emailNotificationsLabel}
              onClick={() => applyChange({ emailNotifications: !settings.emailNotifications })}
              className={[
                "focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                settings.emailNotifications ? "bg-cyan-500" : "bg-slate-700",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  settings.emailNotifications ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}