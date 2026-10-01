"use client";

/**
 * @file app/invest/MarketplaceShell.jsx
 *
 * Client-boundary wrapper that owns the shared invoice state for all
 * `/invest` routes and provides it via `MarketplaceProvider`.
 *
 * Extracted from layout.js so the Server Component layout can compose a
 * client boundary without pulling all state-management logic into the layout.
 *
 * Invariants enforced here:
 *   1. The `invoices` state is initialised to `null` (loading sentinel) and
 *      may only hold `null` or a plain Array. Any setter call with an invalid
 *      value is rejected via `guardedSetInvoices` — the state stays at its
 *      last valid value and a dev-time warning is emitted.
 *   2. `guardedSetInvoices` accepts both a direct value and a functional
 *      updater (matching the React `setState` contract), so all callers can
 *      use either form safely.
 *   3. Children are always rendered inside MarketplaceProvider, preserving
 *      the context boundary for every /invest sub-route.
 */

import { useCallback, useState } from "react";
import { MarketplaceProvider } from "./MarketplaceContext";

/**
 * Returns true when `value` satisfies the invariant for the `invoices` slot:
 * must be `null` (loading sentinel) or a plain Array.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isValidInvoicesValue(value) {
  return value === null || Array.isArray(value);
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default function MarketplaceShell({ children }) {
  // Invariant: invoices is always null | Array — never undefined or another type.
  const [invoices, setInvoicesRaw] = useState(null);

  /**
   * Guarded setter for the `invoices` state.
   *
   * Accepts the same call signatures as React's `setState`:
   *   - Direct value:      setInvoices(newArray)
   *   - Functional updater: setInvoices(prev => newArray)
   *
   * Any call whose resolved value violates the `null | Array` invariant is
   * rejected: the state remains unchanged and a warning is logged in
   * non-production environments so the violation is easy to diagnose.
   */
  const guardedSetInvoices = useCallback((valueOrUpdater) => {
    setInvoicesRaw((prev) => {
      // Resolve functional updaters the same way React would.
      const next =
        typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;

      if (!isValidInvoicesValue(next)) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error(
            "[MarketplaceShell] setInvoices called with an invalid value (%s). " +
              "Only `null` or an Array are accepted. " +
              "The state has NOT been updated to protect the invariant.",
            typeof next === "object" ? JSON.stringify(next) : String(next),
          );
        }
        // Return the previous value unchanged — no state mutation.
        return prev;
      }

      return next;
    });
  }, []);

  return (
    <MarketplaceProvider invoices={invoices} setInvoices={guardedSetInvoices}>
      {children}
    </MarketplaceProvider>
  );
}
