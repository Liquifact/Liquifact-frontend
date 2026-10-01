"sever only";

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

// Deterministic storage key for persisted settings.
const SETTINGS_STORAGE_KEY = "liquifact-settings-v1";

const DEFAULT_SETTINGS = {
  displayName: "",
  email: "",
};

const DISPLAY_NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

const MAX_SETTINGS_ITEMS = 500;

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_FILTERS = { category: "all", query: "" };

function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  return {
    // Preserve only known string fields to keep persisted state deterministic.
    displayName:
      typeof raw.displayName === "string" ? raw.displayName : DEFAULT_SETTINGS.displayName,
    email: typeof raw.email === "string" ? raw.email : DEFAULT_SETTINGS.email,
  };
}

/**
 * Validation boundary for settings items loaded from an external source.
 *
 * Invariants enforced:
 * - Only plain objects with a non-empty string `id` are accepted.
 * - Duplicate `id` values are rejected (first occurrence wins) to keep
 *   React list keys stable and prevent inconsistent state transitions.
 * - `label` and `value` are coerced to strings; missing labels fall back
 *   to the id so the UI never renders an empty row.
 * - The total number of accepted items is capped at MAX_SETTINGS_ITEMS to
 *   bound memory and render cost.
 *
 * Returns an array of normalized items. Never throws.
 */
export function sanitizeSettingsItems(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (out.length >= MAX_SETTINGS_ITEMS) break;
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      ...item,
      id,
      label: typeof item.label === "string" && item.label.length > 0 ? item.label : id,
      value: typeof item.value === "string" ? item.value : "",
    });
  }
  return out;
}

const validateDisplayName = (value) => {
  const trimmed = (value ?? "").trim();
  // Required, minimum, and maximum length invariants.
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
  // Conservative email shape check; server remains source of truth.
  const EMAIL_RE = /^[^\s]+@[^\s]+\.[^\s]{2,}$/;
  if (!EMAIL_RE.test(trimmed)) {
    return copy.settings.errors.invalidEmail;
  }
  return null;
};

// Pure helper: deterministic backoff schedule for retry attempt N (1-indexed).
export function getLoadRetryDelayMs(attempt) {
  if (!Number.isFinite(attempt) || attempt < 1) return 0;
  const capped = Math.min(attempt, 10);
  // Exponential backoff with a hard cap to avoid unbounded delays.
  return LOAD_BASE_BACKOFF_MS * Math.pow(2, capped - 1);
}

// Pure helper: decide whether another retry is allowed.
export function shouldRetryLoad(attempt, error) {
  if (attempt >= LOAD_MAX_ATTEMPTS) return false;
  if (!error) return false;
  // Non-retryable: caller aborted or explicit validation-style failures.
  if (error.name === "AbortError") return false;
  if (error.retryable === false) return false;
  return true;
}

// Pure helper: normalize any loader rejection into a stable, loggable shape.
export function normalizeLoadError(error) {
  if (error instanceof Error) {
    // Preserve retryability flag when explicitly set to false.
    return {
      name: error.name || "Error",
      message: error.message || "Unknown error",
      retryable: error.retryable !== false,
    };
  }
  return {
    name: "Error",
    message: typeof error === "string" ? error : "Unknown error",
    retryable: true,
  };
}

export function applyFiltersToSettings(settings, filters) {
  if (!Array.isArray(settings)) return [];
  let result = settings;
  // Category filter is exact-match; "all" is a passthrough.
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
  // Filter-aware announcements keep screen readers in sync with the UI.
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

  // Field updates always merge through normalizeSettings to keep shape stable.
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
      className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-6"
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
  // Local error state is scoped to the row and reset on cancel/save.
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
      // Reject empty values deterministically; do not mutate parent state.
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
          className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          type="button"
          onClick={save}
          className="rounded bg-cyan-600 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-500 focus-ring"
        >
          Save
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded border border-slate-600 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 focus-ring"
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
        {/* Wallet values are read-only here; edit is gated by category. */}
        <span className="text-sm text-slate-100">{value}</span>
        <button
          type="button"
          onClick=enterEdit}
          aria-label={`Edit ${label}`}
          className="rounded border border-cyan-700/60 bg-cyan-900/20 px-3 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-900/40 focus-ring"
        >
          Edit
        </button>
      </div>
    );
  }

  if (typeof value === "string" && value.length > 0) {
    if (value === "enabled" || value === "disabled") {
      return (
        <span className={`text-sm ${value === "enabled" ? "text-green-400" : "text-slate-500"}`}>
          {value}
        </span>
      );
    }
    return <span className="text-sm text-slate-100">{value}</span>;
  }

  return <span className="text-sm text-slate-500">Not set</span>;
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    // Zero-delay short-circuits to avoid scheduling a needless timer.
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
  // loadAttempt tracks the current retry attempt (1-indexed).
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [exportAnnouncement, setExportAnnouncement] = useState("");
  const { success: toastSuccess, error: toastError } = useToast();

  const loadRequestIdRef = useRef(0);

  const debouncedQuery = useDebounce(filters.query, SEARCH_DEBOUNCE_MS);
  const activeFilters = useMemo(
    () => ({ category: filters.category, query: debouncedQuery }),
    [filters.category, debouncedQuery]
  );

  const loadRef = useRef(loadSettings);
  loadRef.current = loadSettings;
  const requestIdRef = useRef(0);

  const runLoad = useCallback(() => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setLoadError(null);
    setSettings(null);
    setVisibleCount(PAGE_SIZE);

    const loader = loadRef.current;
    if (typeof loader !== "function") {
      setLoading(false);
      return;
    }

    let result;
    try {
      result = loader();
    } catch (err) {
      if (requestId === loadRequestIdRef.current) {
        setLoadError(err instanceof Error ? err : new Error("Failed to load settings"));
        setSettings(null);
        setLoading(false);
      }
      return;
    }

    Promise.resolve(result).then(
      (data) => {
        if (requestId !== loadRequestIdRef.current) return;
        setSettings(sanitizeSettingsItems(data));
        setLoading(false);
      },
      (err) => {
        if (requestId !== loadRequestIdRef.current) return;
        setLoadError(err instanceof Error ? err : new Error("Failed to load settings"));
        setSettings(null);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    runLoad();
    return () => {
      // Invalidate any in-flight request so late resolutions cannot
      // overwrite state after unmount.
      loadRequestIdRef.current += 1;
    };
  }, [runLoad]);

  return (
    <div className="flex flex-col gap-4">
      <Nav
