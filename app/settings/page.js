"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import NavMenu from "../../components/NavMenu";
import InlineEditRow from "../../components/InlineEditRow";
import { copyToClipboard } from "../../components/CopyButton";
import { useToast } from "../../components/ToastProvider";
import DensityToggle from "../../components/DensityToggle";
import { useDensity } from "../../lib/hooks/useDensity";
import ErrorBanner from "../../components/ErrorBanner";
import EmptyState from "../../components/EmptyState";
import { copy } from "../copy/en";
import { useLocalStorage } from "../../lib/hooks/useLocalStorage";
import { loadMockSettings, getCategoryList } from "./lib";
import { exportAsCSV, exportAsJSON } from "../../utils/export";

export { getCategoryList, getCategoryList as getCategories };

const SETTINGS_STORAGE_KEY = "liquifact-settings-v1";

const DEFAULT_SETTINGS = {
  displayName: "",
  email: "",
};

const DISPLAY_NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_FILTERS = { category: "all", query: "" };

function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  return {
    displayName:
      typeof raw.displayName === "string" ? raw.displayName : DEFAULT_SETTINGS.displayName,
    email: typeof raw.email === "string" ? raw.email : DEFAULT_SETTINGS.email,
  };
}

const validateDisplayName = (value) => {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    return copy.settings.errors.required;
  }
  if (trimmed.length < 2) {
    return copy.settings.errors.displayNameTooShort;
  }
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return copy.settings.errors.displayNameTooLong;
  }
  return null;
};

const validateEmail = (value) => {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    return copy.settings.errors.required;
  }
  if (trimmed.length > EMAIL_MAX_LENGTH) {
    return copy.settings.errors.emailTooLong;
  }
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!EMAIL_RE.test(trimmed)) {
    return copy.settings.errors.invalidEmail;
  }
  return null;
};

export function applyFiltersToSettings(settings, filters) {
  if (!Array.isArray(settings)) return [];
  let result = settings;
  if (filters.category && filters.category !== "all") {
    result = result.filter((s) => s.category === filters.category);
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    result = result.filter(
      (s) =>
        (s.label && s.label.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }
  return result;
}

export function getSettingsLoadAnnouncement(settings, filterInfo) {
  if (!Array.isArray(settings) || settings.length === 0) {
    return "No settings available";
  }
  if (filterInfo) {
    if (filterInfo.filterActive && filterInfo.filteredCount === 0) {
      return "No preferences match the active filters";
    }
    if (filterInfo.filterActive) {
      return `${filterInfo.filteredCount} of ${settings.length} preferences match`;
    }
  }
  return `${settings.length} preferences loaded`;
}

export function getSettingsShowingAnnouncement(shown, total) {
  if (total === 0) {
    return "No settings available";
  }
  return `Showing ${shown} of ${total} preferences`;
}

function ProfileSection({ settings, setSettings }) {
  const safeSettings = useMemo(() => normalizeSettings(settings), [settings]);

  const updateField = useCallback(
    (key) => (next) => {
      const merged = normalizeSettings({
        ...safeSettings,
        [key]: next,
      });
      setSettings(merged);
    },
    [safeSettings, setSettings]
  );

  return (
    <section
      aria-labelledby="settings-rows-heading"
      className="settings-profile-card rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-6"
    >
      <h2 id="settings-rows-heading" className="sr-only">
        {copy.settings.pageTitle}
      </h2>
      <ul className="flex flex-col gap-4 list-none p-0 m-0">
        <InlineEditRow
          id="settings-display-name"
          label={copy.settings.fields.displayName.label}
          description={copy.settings.fields.displayName.description}
          placeholder={copy.settings.fields.displayName.placeholder}
          value={safeSettings.displayName}
          validate={validateDisplayName}
          onSave={updateField("displayName")}
          savedAnnouncement={copy.settings.savedAnnouncement}
          cancelledAnnouncement={copy.settings.cancelledAnnouncement}
        />
        <InlineEditRow
          id="settings-email"
          type="email"
          label={copy.settings.fields.email.label}
          description={copy.settings.fields.email.description}
          placeholder={copy.settings.fields.email.placeholder}
          value={safeSettings.email}
          validate={validateEmail}
          onSave={updateField("email")}
          savedAnnouncement={copy.settings.savedAnnouncement}
          cancelledAnnouncement={copy.settings.cancelledAnnouncement}
        />
      </ul>
    </section>
  );
}

function InlineEditRowSimple({ value, label, category, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const enterEdit = () => {
    setDraft(value);
    setError(null);
    setIsEditing(true);
  };

  const cancel = () => {
    setIsEditing(false);
    setDraft(value);
    setError(null);
  };

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setError("Value cannot be empty");
      return;
    }
    onSave(trimmed);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      cancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2" data-editing="true">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={`Edit ${label}`}
          className="settings-search-input w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          type="button"
          onClick={save}
          className="settings-action-btn rounded bg-cyan-600 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-500 focus-ring"
        >
          Save
        </button>
        <button
          type="button"
          onClick={cancel}
          className="settings-action-btn rounded border border-slate-600 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 focus-ring"
        >
          Cancel
        </button>
        {error && (
          <span role="alert" className="text-xs text-red-400">
            {error}
          </span>
        )}
      </div>
    );
  }

  if (category === "wallet") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-100">{value}</span>
        <button
          type="button"
          onClick={enterEdit}
          aria-label={`Edit ${label}`}
          className="settings-action-btn rounded border border-cyan-700/60 bg-cyan-900/20 px-3 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-900/40 focus-ring"
        >
          Edit
        </button>
      </div>
    );
  }

  if (typeof value === "string" && value.length > 0) {
    if (value === "enabled" || value === "disabled") {
      return (
        <span className={`settings-muted-text text-sm ${value === "enabled" ? "text-green-400" : "text-slate-500"}`}>
          {value}
        </span>
      );
    }
    return <span className="settings-muted-text text-sm text-slate-100">{value}</span>;
  }

  return <span className="settings-muted-text text-sm text-slate-500">Not set</span>;
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (delay <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => {
      flushSync(() => {
        setDebounced(value);
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SettingsPage({ loadSettings }) {
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [exportAnnouncement, setExportAnnouncement] = useState("");
  const { success: toastSuccess, error: toastError } = useToast();

  const debouncedQuery = useDebounce(filters.query, SEARCH_DEBOUNCE_MS);
  const activeFilters = useMemo(
    () => ({ category: filters.category, query: debouncedQuery }),
    [filters.category, debouncedQuery]
  );

  const loadRef = useRef(loadSettings);
  loadRef.current = loadSettings;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSettings(null);
    setVisibleCount(PAGE_SIZE);

    const loader = loadRef.current;
    if (typeof loader !== "function") {
      cancelled = true;
      return;
    }
    loader().then(
      (data) => {
        if (!cancelled) {
          setSettings(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      },
      (err) => {
        if (!cancelled) {
          setLoadError(err);
          setSettings(null);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [loadSettings]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilters.category, activeFilters.query]);

  const filteredSettings = useMemo(
    () => applyFiltersToSettings(settings, activeFilters),
    [settings, activeFilters]
  );

  const visibleSettings = useMemo(
    () => filteredSettings.slice(0, visibleCount),
    [filteredSettings, visibleCount]
  );

  const hasMore = visibleCount < filteredSettings.length;
  const isFilterActive = activeFilters.category !== "all" || activeFilters.query.trim().length > 0;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  const statusMessage = useMemo(() => {
    if (loading && settings === null) return "";
    if (loadError) return copy.settings.errorStatus;
    if (settings === null) return "";
    if (settings.length === 0) return copy.settings.empty;
    if (isFilterActive && filteredSettings.length === 0) return "";
    if (isFilterActive) {
      return getSettingsLoadAnnouncement(settings, {
        filterActive: true,
        filteredCount: filteredSettings.length,
      });
    }
    if (hasMore) {
      return getSettingsShowingAnnouncement(visibleCount, filteredSettings.length);
    }
    if (visibleCount < filteredSettings.length) {
      return getSettingsShowingAnnouncement(visibleCount, filteredSettings.length);
    }
    if (visibleCount > PAGE_SIZE) {
      return getSettingsShowingAnnouncement(filteredSettings.length, filteredSettings.length);
    }
    return getSettingsLoadAnnouncement(settings);
  }, [loading, settings, loadError, filteredSettings, visibleCount, hasMore, isFilterActive]);

  const handleExportCSV = useCallback(() => {
    if (filteredSettings.length === 0) {
      setExportAnnouncement(copy.settings.exportEmpty);
      return;
    }
    exportAsCSV(filteredSettings, "settings-export.csv");
    setExportAnnouncement(copy.settings.exportAnnounceCSV);
  }, [filteredSettings]);

  const handleExportJSON = useCallback(() => {
    if (filteredSettings.length === 0) {
      setExportAnnouncement(copy.settings.exportEmpty);
      return;
    }
    exportAsJSON(filteredSettings, "settings-export.json");
    setExportAnnouncement(copy.settings.exportAnnounceJSON);
  }, [filteredSettings]);

  const handleEditSave = useCallback(
    (itemId) => (newValue) => {
      setSettings((prev) => {
        if (!prev) return prev;
        return prev.map((item) =>
          item.id === itemId ? { ...item, value: newValue } : item
        );
      });
    },
    []
  );

  const handleCopy = useCallback(
    async (text) => {
      try {
        await copyToClipboard(text);
        toastSuccess(copy.settings.toastCopySuccessMsg, copy.settings.toastCopySuccessTitle);
      } catch {
        toastError(copy.settings.toastCopyErrorMsg, copy.settings.toastCopyErrorTitle);
      }
    },
    [toastSuccess, toastError]
  );

  const handleFilterChange = useCallback(
    (key) => (e) => {
      setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const categories = useMemo(
    () => (Array.isArray(settings) ? getCategoryList(settings) : ["all"]),
    [settings]
  );

  const [density, setDensity] = useDensity();
  const settingsListLabel = "Settings list";
  const isLoading = loading && settings === null && !loadError;
  const isError = loadError;
  const isEmpty = settings !== null && settings.length === 0;
  const hasNoMatch = !isEmpty && filteredSettings.length === 0;

  return (
    <div className="settings-page space-y-8" data-density={density}>
      {!isLoading && !isError && (
        <section data-testid="settings-density-section" aria-label="Display density" className="settings-card" style={{ padding: "var(--settings-section-padding)" }}>
          <h3 className="settings-section-heading text-lg font-semibold text-slate-100">{copy.settings.densityLabel}</h3>
          <p className="settings-section-description mt-1 text-sm text-slate-400">{copy.settings.densityDescription}</p>
          <div className="mt-3">
            <DensityToggle density={density} onDensityChange={setDensity} />
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label={copy.settings.exportGroupLabel} className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            data-testid="export-csv-btn"
            aria-label={copy.settings.exportCSVLabel}
            className="settings-action-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 focus-ring transition-colors"
          >
            <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            data-testid="export-json-btn"
            aria-label={copy.settings.exportJSONLabel}
            className="settings-action-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 focus-ring transition-colors"
          >
            <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
        </div>
        <div aria-live="polite" data-testid="export-announce" className="settings-status-text text-sm text-slate-400">
          {exportAnnouncement}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <select
          data-testid="settings-category-filter"
          value={filters.category}
          onChange={handleFilterChange("category")}
          aria-label="Filter by category"
          className="settings-select rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <input
          type="search"
          data-testid="settings-search-filter"
          value={filters.query}
          onChange={handleFilterChange("query")}
          placeholder="Search settings..."
          aria-label="Search settings"
          className="settings-search-input rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        {isFilterActive && (
          <button
            type="button"
            onClick={handleResetFilters}
            aria-label="Reset filters"
            className="settings-action-btn rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 focus-ring transition-colors"
          >
            Reset filters
          </button>
        )}
      </div>

      {isLoading ? (
        <div data-testid="settings-loading" aria-busy="true" className="space-y-4">
          <div className="settings-skeleton h-10 animate-pulse rounded bg-slate-800" />
          <div className="settings-skeleton h-10 animate-pulse rounded bg-slate-800" />
          <div className="settings-skeleton h-10 animate-pulse rounded bg-slate-800" />
        </div>
      ) : isError ? (
        <ErrorBanner
          variant="error"
          title="Unable to load settings"
          description="There was a problem loading your settings. Please try again."
          actionLabel="Try again"
          onAction={() => {
            setLoadError(null);
            setLoading(true);
            loadRef.current().then(
              (data) => {
                setSettings(Array.isArray(data) ? data : []);
                setLoading(false);
              },
              (err) => {
                setLoadError(err);
                setSettings(null);
                setLoading(false);
              }
            );
          }}
        />
      ) : isEmpty ? (
        <EmptyState
          title="No preferences available"
          description="Connect your wallet to manage your preferences."
        />
      ) : hasNoMatch ? (
        <EmptyState
          title="No preferences match the active filters"
          description="Try adjusting your search or filter to find what you are looking for."
        />
      ) : settings !== null ? (
        <>
          <ul aria-label={settingsListLabel} className="flex flex-col gap-3 list-none p-0 m-0" style={{ gap: "var(--settings-list-gap)" }}>
            {visibleSettings.map((item) => (
              <li
                key={item.id}
                className="settings-item flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="settings-label text-sm font-medium text-slate-200">{item.label}</p>
                  {item.description && (
                    <p className="settings-description mt-0.5 text-xs text-slate-500">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <InlineEditRowSimple
                    value={item.value}
                    label={item.label}
                    category={item.category}
                    onSave={handleEditSave(item.id)}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id)}
                    aria-label={`Copy ${copy.settings.copyIdentifier}`}
                    title={`Copy ${copy.settings.copyIdentifier}`}
                    className="settings-copy-btn inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:text-slate-300 focus-ring transition-colors"
                  >
                    <svg aria-hidden="true" focusable="false" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span className="sr-only">Copy</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            {hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                data-testid="settings-load-more"
                aria-label="Load more preferences"
                className="settings-action-btn rounded-lg border border-cyan-700/60 bg-cyan-900/20 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-900/40 focus-ring transition-colors"
              >
                {copy.settings.loadMore}
              </button>
            ) : visibleCount > PAGE_SIZE ? (
              <p data-testid="settings-end-of-list" className="settings-muted-text text-sm text-slate-500">
                All preferences shown
              </p>
            ) : null}
          </div>

          <p
            data-testid="settings-count"
            className="settings-status-text text-sm text-slate-400"
            aria-live="polite"
          >
            {getSettingsShowingAnnouncement(visibleSettings.length, filteredSettings.length)}
          </p>
        </>
      ) : null}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </div>
    </div>
  );
}

export default function SettingsRoute({ loadSettings = loadMockSettings }) {
  const [settings, setSettings] = useLocalStorage(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

  return (
    <div className="settings-page min-h-screen bg-slate-950 text-slate-50">
      <NavMenu />
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8"
        aria-labelledby="settings-heading"
      >
        <header className="mb-8 space-y-2">
          <h1
            id="settings-heading"
            className="settings-heading text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl"
          >
            {copy.settings.pageTitle}
          </h1>
          <p className="settings-subtitle text-base text-slate-400">{copy.settings.pageSub}</p>
        </header>
        <div className="space-y-10">
          <ProfileSection settings={settings} setSettings={setSettings} />
          <SettingsPage loadSettings={loadSettings} />
        </div>
      </main>
    </div>
  );
}

export {
  normalizeSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  validateDisplayName,
  validateEmail,
};
