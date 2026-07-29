"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "../lib/format/date";
import CopyButton from "./CopyButton";

/**
 * The three theme options the user can cycle through.
 *
 * - "light"  – always renders the light palette
 * - "dark"   – always renders the dark palette
 * - "auto"   – follows the OS `prefers-color-scheme` media query and updates
 *              live when the OS preference changes
 *
 * @type {readonly string[]}
 */
export const THEMES = /** @type {const} */ (["light", "dark", "auto"]);

/** localStorage key where the preference is persisted. */
export const THEME_STORAGE_KEY = "liquifact-theme";

/** Stable identifier for the theme preference setting. */
export const THEME_IDENTIFIER = THEME_STORAGE_KEY;

/** localStorage key where the last-changed timestamp (epoch ms) is persisted. */
export const THEME_UPDATED_STORAGE_KEY = "liquifact-theme-updated-at";

/** How often the displayed "last updated" text re-renders to stay fresh, in ms. */
export const THEME_UPDATED_TICK_MS = 60_000;

/**
 * Stable identifier string used by the "Copy theme identifier" button.
 * Consumers (e.g. tests) can import this to assert the clipboard payload.
 */
export const THEME_IDENTIFIER = "liquifact-theme-identifier";

/**
 * Read the persisted "theme last changed" timestamp from localStorage.
 * Safe to call from the browser only.
 *
 * @returns {Date|null}  – null when nothing valid is stored
 */
export function readStoredThemeUpdatedAt() {
  try {
    const stored = localStorage.getItem(THEME_UPDATED_STORAGE_KEY);
    if (stored !== null) {
      const ms = Number(stored);
      if (!Number.isNaN(ms)) return new Date(ms);
    }
  } catch {
    // localStorage unavailable (private browsing, SSR, etc.)
  }
  return null;
}

/**
 * Persist the "theme last changed" timestamp to localStorage.
 *
 * @param {Date} date
 */
export function writeThemeUpdatedAt(date) {
  try {
    localStorage.setItem(THEME_UPDATED_STORAGE_KEY, String(date.getTime()));
  } catch {
    // ignore write failures (private browsing, quota exceeded)
  }
}

/**
 * Determine the effective visual theme from a stored preference.
 * 'auto' resolves to whatever the OS prefers at that moment.
 *
 * @param {string} pref  – one of THEMES
 * @returns {'light'|'dark'}
 */
export function resolveTheme(pref) {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  // 'auto' – query the OS preference; default to 'dark' in SSR/test env
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

/**
 * Read the stored preference from localStorage, falling back to 'auto'.
 * Safe to call from the browser only.
 *
 * @returns {string}
 */
export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEMES.includes(stored)) return stored;
  } catch {
    // localStorage unavailable (private browsing, SSR, etc.)
  }
  return "auto";
}

/**
 * Apply `data-theme` attribute to the document root.
 * Called both from the pre-paint inline script and from the React component.
 *
 * @param {string} pref  – one of THEMES
 */
export function applyTheme(pref) {
  const effective = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", effective);
}

/**
 * ThemeToggle
 *
 * A button that cycles through light → dark → auto (system preference).
 * The current preference is persisted to localStorage via `useLocalStorage`
 * and applied via `data-theme` on `<html>`. An inline pre-paint script in
 * `app/layout.js` reads localStorage before React hydrates to prevent the
 * flash of incorrect theme.
 *
 * While in "auto" mode the component subscribes to the OS
 * `prefers-color-scheme` media query change event so the applied theme
 * updates live without a page reload. The listener is removed on unmount.
 *
 * @param {object}  [props]
 * @param {string}  [props.className]  – Extra classes on the root button
 */
export default function ThemeToggle({ className = "" }) {
  // useLocalStorage is SSR-safe: it returns the default on the first render
  // and reads from storage inside a useEffect after mount, preventing hydration
  // mismatches. The setter is referentially stable (safe for dep-arrays).
  const [preference, setPreference] = useLocalStorage(THEME_STORAGE_KEY, "auto");

  // Keep data-theme in sync whenever the preference state changes.
  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  // While in "auto" mode, subscribe to the OS prefers-color-scheme change
  // event so the rendered theme follows the OS in real-time. The listener
  // is cleaned up on unmount or whenever the preference leaves "auto".
  useEffect(() => {
    if (preference !== "auto") return;
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  // When the preference was last changed. Bootstrapped to "now" on a user's
  // very first visit (nothing stored yet) so the UI always has a timestamp
  // to show, then only advanced when the user actually clicks the toggle.
  const [updatedAt, setUpdatedAt] = useState(() => {
    if (typeof window === "undefined") return null;
    return readStoredThemeUpdatedAt() ?? new Date();
  });

  // Persist a freshly-bootstrapped timestamp so it stays stable across
  // reloads instead of resetting to "now" every time. Only needs to run
  // once on mount; click-driven updates already call writeThemeUpdatedAt.
  useEffect(() => {
    if (updatedAt !== null && readStoredThemeUpdatedAt() === null) {
      writeThemeUpdatedAt(updatedAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render periodically so "5 minutes ago" keeps advancing without a click.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), THEME_UPDATED_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const cycleTheme = (direction = "next") => {
    setPreference((prev) => {
      const idx = THEMES.indexOf(prev);
      if (direction === "next") {
        return THEMES[(idx + 1) % THEMES.length];
      }
      return THEMES[(idx - 1 + THEMES.length) % THEMES.length];
    });
    const now = new Date();
    setUpdatedAt(now);
    writeThemeUpdatedAt(now);
  };

  const handleClick = () => cycleTheme("next");

  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      cycleTheme("next");
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      cycleTheme("prev");
    }
  };

  // ─── Theme options modal (focus-trap, escape, restore) ──────────────────
  // Additive: does not change the toggle button's existing click-to-cycle
  // behaviour or appearance above.
  const [modalOpen, setModalOpen] = useState(false);
  const optionsButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useId();

  const openModal = useCallback(() => {
    const active = document.activeElement;
    previouslyFocusedRef.current =
      active instanceof HTMLElement && active !== document.body ? active : optionsButtonRef.current;
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSelectFromModal = useCallback((pref) => {
    setPreference(pref);
    setModalOpen(false);
  }, []);

  // Restore focus to whatever triggered the modal once it closes.
  useEffect(() => {
    if (modalOpen) return undefined;
    const target = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    if (
      target &&
      target instanceof HTMLElement &&
      document.body.contains(target) &&
      typeof target.focus === "function"
    ) {
      queueMicrotask(() => target.focus());
    }
    return undefined;
  }, [modalOpen]);

  const ICONS = {
    light: (
      // Sun
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    dark: (
      // Moon
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    auto: (
      // Monitor – signals "follow the system"
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  };

  // Resolved visual theme (only relevant for "auto" mode).
  const resolvedTheme = resolveTheme(preference);

  /**
   * Build the accessible label.  When in "auto" mode we also surface the
   * *resolved* visual theme so screen-reader users know which palette is
   * currently active (e.g. "Theme: Auto (resolved: Dark) – click for Light").
   */
  const nextPref = THEMES[(THEMES.indexOf(preference) + 1) % THEMES.length];
  const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const LABELS = {
    light: `Theme: Light (click for Dark)`,
    dark: `Theme: Dark (click for Auto)`,
    auto: `Theme: Auto (resolved: ${capitalise(resolvedTheme)}) – click for Light`,
  };

  const isDarkActive =
    preference === "dark" ||
    (preference === "auto" && typeof window !== "undefined" && resolvedTheme === "dark");

  const absoluteUpdatedAt = updatedAt ? updatedAt.toLocaleString() : null;

  // ── Copy-theme-identifier handler ─────────────────────────────────────────
  const toast = useToast();

  const handleCopyIdentifier = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(THEME_IDENTIFIER);
      } else {
        // Fallback for environments without the Clipboard API
        const textarea = document.createElement("textarea");
        textarea.value = THEME_IDENTIFIER;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Theme identifier copied to clipboard.", "Copied!");
    } catch {
      toast.error("Failed to copy theme identifier.", "Error");
    }
  };

  return (
    <>
      <button
        id="theme-toggle"
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={LABELS[preference]}
        aria-pressed={isDarkActive}
        title={`Current theme: ${capitalise(preference)}`}
        data-theme-pref={preference}
        data-theme-next={nextPref}
        className={[
          "rounded-lg p-2 transition-colors",
          "text-slate-300 hover:text-cyan-400 hover:bg-slate-800",
          "dark:text-slate-300 dark:hover:text-cyan-400",
          "focus-ring",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {ICONS[preference]}
      </button>
      <CopyButton
        text={THEME_IDENTIFIER}
        label="theme identifier"
        successMessage="Theme identifier copied to clipboard."
        errorMessage="Unable to copy theme identifier. Select and copy it manually."
        className="h-8 w-8 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-400 dark:text-slate-300 dark:hover:text-cyan-400"
      />
      {updatedAt && (
        <span
          id="theme-updated-at"
          className="text-xs text-slate-400 dark:text-slate-400"
          title={`Theme last updated ${absoluteUpdatedAt}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <ThemeOptionsModal
        open={modalOpen}
        onClose={closeModal}
        preference={preference}
        onSelect={handleSelectFromModal}
        titleId={titleId}
      />
    </>
  );
}