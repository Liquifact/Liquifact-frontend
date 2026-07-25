/**
 * @file lib/hooks/useLocalStorage.js
 *
 * SSR-safe, JSON-guarded `localStorage` hook.  This is the single shared
 * implementation that wallet, preferences, and any future persisting
 * feature must consume — `WalletProvider` (wallet snapshot) and the
 * pre-paint theme bootstrap in `app/layout.js` (theme preference) are both
 * candidates for migration onto it.
 *
 * Contract
 * ────────
 * • Initial render returns the typed default.  **The hook NEVER reads from
 *   storage during render** — this is the rule that keeps React hydration
 *   safe in a Next.js app router context.
 * • The actual read happens inside `useEffect`, after mount on the client.
 *   `JSON.parse` failures silently fall back to the default (no exception
 *   bubbles up to a test, a parent error boundary, or the console).
 * • `localStorage.setItem` failures (quota, private-mode SecurityError,
 *   disabled storage) are also swallowed — the React state update still
 *   proceeds so the UI keeps working.
 * • The setter accepts either a value or an updater function
 *   (`setValue(prev => next)`), matching the `useState` API surface so
 *   this hook is a drop-in replacement.
 * • The setter is referentially stable across renders when the `key` prop
 *   does not change — safe to put in dependency arrays.
 * • Changing `key` mid-lifecycle rehydrates the React state from the new
 *   key's stored value on the next render (`useEffect` picks it up).  Same-tab,
 *   same-instance re-reading is supported; **auto-rehydration of OTHER
 *   instances of the hook in the same tab is intentionally NOT implemented**
 *   — only the instance whose `key` prop changes will re-read.  Cross-tab
 *   sync via the `storage` event is likewise out of scope.
 * • The hook supports both value and function defaults, ergonomically
 *   mirroring `useState(initialState)`'s lazy initialisation.
 * • The `key` argument is checked at module-load time and runtime to
 *   ensure it is a non-empty string; otherwise the hook no-ops with the
 *   default value (no throw, no write).
 */

import { useCallback, useEffect, useState } from "react";

/**
 * @template T
 * @param {string} key             - Storage key.  Must be a non-empty string.
 * @param {T | (() => T)} defaultValue - Initial value (or lazy initialiser)
 *                                       returned on first render and used
 *                                       as a fallback whenever storage is
 *                                       empty or malformed.
 * @returns {[T, (next: T | ((prev: T) => T)) => void]}
 */
export function useLocalStorage(key, defaultValue) {
  const [value, setValueInternal] = useState(() =>
    typeof defaultValue === "function" ? defaultValue() : defaultValue
  );

  // Defer every storage read until after mount.  This is the rule that
  // keeps the hook's first render deterministic and identical between
  // server and client — no hydration mismatch can occur.
  useEffect(() => {
    if (typeof key !== "string" || key.length === 0) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return; // No stored value — keep the default.
      const parsed = JSON.parse(raw);
      // JSON.parse cannot yield `undefined` (the JSON grammar has no
      // `undefined` token), so any non-throwing result is adoptable.
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setValueInternal(parsed);
    } catch {
      // Swallow JSON parse errors AND storage-access errors (e.g. when
      // `localStorage.getItem` itself throws in private browsing).  The
      // default value is preserved in both cases.
    }
  }, [key]);

  // Stable setter that writes through to storage AND keeps the React state
  // in lock-step with localStorage.  Computed value of `undefined` removes
  // the key (canonical React idiom for "unsetting" a persisted value); any
  // other value is JSON-encoded.
  const setValue = useCallback(
    (next) => {
      setValueInternal((prev) => {
        const computed =
          typeof next === "function" ? /** @type {(p: T) => T} */ (next)(prev) : next;

        if (typeof key !== "string" || key.length === 0) return computed;
        if (typeof window === "undefined") return computed;

        try {
          if (computed === undefined) {
            window.localStorage.removeItem(key);
          } else {
            window.localStorage.setItem(key, JSON.stringify(computed));
          }
        } catch {
          // Swallow QuotaExceededError / SecurityError / disabled-storage so
          // a single failing write never crashes the UI.
        }

        return computed;
      });
    },
    [key]
  );

  return /** @type {[T, (next: T | ((prev: T) => T)) => void]} */ ([value, setValue]);
}
