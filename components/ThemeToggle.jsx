"use client";

import { useEffect, useState } from "react";

/**
 * The three theme options the user can cycle through.
 * @type {readonly string[]}
 */
export const THEMES = /** @type {const} */ (["light", "dark", "system"]);

/** localStorage key where the preference is persisted. */
export const THEME_STORAGE_KEY = "liquifact-theme";

/**
 * Determine the effective visual theme from a stored preference.
 * 'system' resolves to whatever the OS prefers at that moment.
 *
 * @param {string} pref  – one of THEMES
 * @returns {'light'|'dark'}
 */
export function resolveTheme(pref) {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  // 'system' – query the OS preference; default to 'dark' in SSR/test env
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

/**
 * Read the stored preference from localStorage, falling back to 'system'.
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
  return "system";
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
 * A button that cycles through light → dark → system preference.
 * The current preference is persisted to localStorage and applied via
 * `data-theme` on `<html>`. An inline pre-paint script in `app/layout.js`
 * reads localStorage before React hydrates to prevent the flash of
 * incorrect theme.
 *
 * @param {object}  [props]
 * @param {string}  [props.className]  – Extra classes on the root button
 */
export default function ThemeToggle({ className = "" }) {
  // Initialise from localStorage only on the client (avoids SSR mismatch).
  // Using a lazy initializer avoids calling setState synchronously inside an
  // effect, which would trigger a cascading render warning.
  const [preference, setPreference] = useState(() => {
    if (typeof window === "undefined") return "system";
    try {
      return readStoredTheme();
    } catch {
      return "system";
    }
  });

  // Keep data-theme in sync whenever the preference state changes
  useEffect(() => {
    applyTheme(preference);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // ignore write failures (private browsing, quota exceeded)
    }
  }, [preference]);

  // Also re-resolve when the OS preference changes while 'system' is active
  useEffect(() => {
    if (preference !== "system") return;
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const handleClick = () => {
    setPreference((prev) => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

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
    system: (
      // Monitor
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

  const LABELS = {
    light: "Theme: Light (click for Dark)",
    dark: "Theme: Dark (click for System)",
    system: "Theme: System (click for Light)",
  };

  const nextPref = THEMES[(THEMES.indexOf(preference) + 1) % THEMES.length];
  const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <button
      id="theme-toggle"
      type="button"
      onClick={handleClick}
      aria-label={LABELS[preference]}
      aria-pressed={preference !== "system"}
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
  );
}
