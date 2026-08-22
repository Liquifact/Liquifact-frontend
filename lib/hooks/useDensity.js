/**
 * @file lib/hooks/useDensity.js
 *
 * SSR-safe hook for persisting the invoice-detail density preference to
 * localStorage.  Mirrors the same guard pattern used by `useLocalStorage`
 * and `ThemeToggle` — **no storage read ever happens during render** so
 * React hydration is always deterministic.
 *
 * Contract
 * ────────
 * • Valid values: "compact" | "comfortable"
 * • Default (no stored value, or invalid stored value): "comfortable"
 * • Storage key: "liquifact-invoice-density"  (follows project convention)
 * • The stored value is read inside a `useEffect` after mount; the initial
 *   render always returns the default.
 * • Invalid stored values (anything not in DENSITY_VALUES) are silently
 *   discarded and the default is kept.
 * • localStorage read / write failures (private browsing, quota, SSR) are
 *   swallowed — the hook continues to work with in-memory state.
 * • The returned setter is referentially stable (wrapped in `useCallback`)
 *   so it is safe to put in dependency arrays.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The two supported density modes.
 * @type {readonly string[]}
 */
export const DENSITY_VALUES = /** @type {const} */ (["compact", "comfortable"]);

/** @type {"compact"|"comfortable"} */
export const DENSITY_DEFAULT = "comfortable";

/** localStorage key for the invoice-detail density preference. */
export const DENSITY_STORAGE_KEY = "liquifact-invoice-density";

/**
 * Return true when `value` is a valid density string.
 *
 * @param {unknown} value
 * @returns {value is "compact"|"comfortable"}
 */
export function isValidDensity(value) {
  return typeof value === "string" && DENSITY_VALUES.includes(value);
}

/**
 * Read the persisted density preference from `localStorage`.
 * Silently falls back to `DENSITY_DEFAULT` for any error or invalid value.
 * **Browser-only** — never call from SSR or the initial render phase.
 *
 * @returns {"compact"|"comfortable"}
 */
export function readStoredDensity() {
  try {
    const raw = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (raw !== null) {
      // localStorage stores plain strings without JSON-encoding for this
      // simple scalar, but we guard with a JSON.parse round-trip just in
      // case a future refactor swaps in the generic useLocalStorage hook.
      let value;
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw; // treat raw string as the value when not valid JSON
      }
      if (isValidDensity(value)) return value;
    }
  } catch {
    // localStorage access denied (private browsing, SSR, etc.)
  }
  return DENSITY_DEFAULT;
}

/**
 * Persist a density preference to `localStorage`.
 * Silently swallows write errors.
 * **Browser-only** — never call during SSR.
 *
 * @param {"compact"|"comfortable"} density
 */
export function writeStoredDensity(density) {
  try {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  } catch {
    // QuotaExceededError / SecurityError — ignore, in-memory state is fine
  }
}

/**
 * Hook that manages and persists the invoice-detail density preference.
 *
 * @returns {["compact"|"comfortable", (d: "compact"|"comfortable") => void]}
 *   A `[density, setDensity]` tuple.  `setDensity` validates the value and
 *   ignores anything that is not in `DENSITY_VALUES`.
 *
 * @example
 * const [density, setDensity] = useDensity();
 * // density === "comfortable" on first render (SSR + CSR parity)
 * // after mount the stored value is rehydrated
 * setDensity("compact"); // persists to localStorage
 */
export function useDensity() {
  // Initial value is always the default — never read localStorage during
  // render to keep SSR and client hydration consistent.
  const [density, setDensityInternal] = useState(DENSITY_DEFAULT);

  // Rehydrate from storage after mount (client-only, safe for SSR).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = readStoredDensity();
    if (stored !== DENSITY_DEFAULT) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setDensityInternal(stored);
    }
  }, []);

  const setDensity = useCallback((next) => {
    if (!isValidDensity(next)) return; // guard: reject unknown values
    setDensityInternal(next);
    if (typeof window !== "undefined") {
      writeStoredDensity(next);
    }
  }, []);

  return [density, setDensity];
}
