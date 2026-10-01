/* eslint-disable react-hooks/exhaustive-deps */
"use client";

/**
 * @file MarketplaceContext.jsx
 *
 * React Context that owns the invoice list state for the invest (marketplace)
 * routes.  It wraps both the list page (`/invest`) and the detail page
 * (`/invest/[id]`) so that optimistic updates applied on the detail page
 * (e.g. funding an invoice)) are immediately visible when the user navigates
 * back to the list.
 *
 * The provider exposes:
 *   - `invoices`    — current invoice array (may be null while loading)
 *   - `setInvoices`   — setter for replacing the full list (used by the loader)
 *   - `pendingIds`    — Set of invoice ids with in-flight fund actions
 *   - `fundInvoice`   — orchestrates optimistic status update + server action +
 *                        rollback on failure with toast feedback
 *
 * Invariants enforced here:
 *   1. `invoices` prop must be `null` or a plain Array; other values are
 *      treated as `null` (loading sentinel) and a dev-time warning is emitted.
 *   2. `setInvoices` prop must be a function; a missing or invalid value is
 *      replaced with a no-op in development so callers don't crash silently.
 *   3. `fundInvoice` guards against a non-Array `invoices` state before
 *      attempting an optimistic update — it bails out early rather than
 *      corrupting state.
 *   4. The optimistic update is applied and the snapshot captured in a single
 *      synchronous pass to avoid partial-update windows.
 *   5. Rollback is atomic: it replaces only the targeted invoice and leaves
 *      the rest of the list untouched, even if `invoices` has changed during
 *      the async action.
 *   6. `useMarketplace` throws a descriptive error when called outside a
 *      provider so misconfigured trees are caught immediately.
 */

import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { useMarketplaceActions } from "@/lib/hooks/useMarketplaceActions";

const MarketplaceContext = createContext(null);

// ─── Invariant helpers ────────────────────────────────────────────────────────

/**
 * Validate the `invoices` prop.  Returns the value when valid, or `null` with
 * a dev-time warning when the value violates the `null | Array` invariant.
 *
 * @param {*} value
 * @returns {Array|null}
 */
function assertInvoicesProp(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value;

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(
      "[MarketplaceProvider] Invalid `invoices` prop: expected null or Array, got %s. " +
        "Treating as null (loading sentinel) to preserve the state invariant.",
      typeof value,
    );
  }
  return null;
}

/**
 * Validate the `setInvoices` prop.  Returns the function when valid, or a
 * no-op with a dev-time warning when the value is not callable.
 *
 * @param {*} value
 * @returns {Function}
 */
function assertSetInvoicesProp(value) {
  if (typeof value === "function") return value;

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(
      "[MarketplaceProvider] Invalid `setInvoices` prop: expected a function, got %s. " +
        "Using a no-op to prevent crashes — invoice state will NOT be updated.",
      typeof value,
    );
  }
  return () => {};
}

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * @param {object}          props
 * @param {React.ReactNode} props.children
 * @param {Array|null}      props.invoices   — invoice array managed by the parent
 * @param {Function}        props.setInvoices — setter to replace the full invoice list
 */
export function MarketplaceProvider({ children, invoices: invoicesProp, setInvoices: setInvoicesProp }) {
  // Invariant: coerce invalid prop values before they reach any consumer.
  const invoices = assertInvoicesProp(invoicesProp);
  const setInvoices = assertSetInvoicesProp(setInvoicesProp);

  const { pendingIds, fund } = useMarketplaceActions();
  const invoicesRef = useRef(invoices);

  /**
   * Fund an invoice with optimistic status change.
   *
   * Invariants:
   *   - Only proceeds when `invoices` is a valid Array; returns false and logs
   *     a warning if the state is not yet initialised (null) or invalid.
   *   - The snapshot and the optimistic flip happen in a single synchronous
   *     call to `setInvoices` to avoid a partial-update race window.
   *   - Rollback is atomic: targets only the invoice matching `invoiceId` and
   *     restores the snapshot, leaving every other invoice untouched.
   *
   * @param {string}   invoiceId
   * @param {number}   amount
   * @param {Function} performAction — async (invoiceId, amount) => void
   * @returns {Promise<boolean>}
   */
  const fundInvoice = useCallback(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    async (invoiceId, amount, performAction) => {
      // Invariant: invoices must be an Array before we can optimistically mutate it.
      if (!Array.isArray(invoices)) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error(
            "[MarketplaceProvider] fundInvoice called while invoices is %s. " +
              "Cannot apply optimistic update — action aborted.",
            invoices === null ? "null (still loading)" : typeof invoices,
          );
        }
        return false;
      }

      return fund(invoiceId, amount, performAction, {
        /**
         * Optimistic update — synchronously flip the target invoice's status
         * to "Funded" and return a deep-enough snapshot for rollback.
         *
         * The snapshot is captured inside the updater function so it reflects
         * the state at the moment the update is applied, not the stale closure
         * value of `invoices`, protecting against concurrent updates.
         *
         * @param {string} id
         * @returns {{snapshot: object|null}}
         */
        optimisticUpdate: (id) => {
          let snapshot = null;

          setInvoices((prev) => {
            if (!Array.isArray(prev)) return prev;

            // Capture snapshot of the current invoice for atomic rollback.
            const current = prev.find((inv) => inv.id === id) ?? null;
            // Shallow-clone is sufficient because we only mutate `status`.
            snapshot = current ? { ...current } : null;

            // Flip status immediately (optimistic).
            return prev.map((inv) =>
              inv.id === id ? { ...inv, status: "Funded" } : inv,
            );
          });

          return snapshot;
        },

        /**
         * Rollback — atomically restore the original invoice object.
         *
         * Uses the functional updater form so it always operates on the latest
         * state, even if other concurrent updates have run since the optimistic
         * flip. Only the targeted invoice is touched; the rest of the list is
         * left exactly as-is.
         *
         * @param {string}      id
         * @param {object|null} snap — snapshot returned by optimisticUpdate
         */
        rollback: (id, snap) => {
          if (!snap) return;
          setInvoices((prev) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((inv) => (inv.id === id ? snap : inv));
          });
        },
      });
    },
    [fund, invoices, setInvoices],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(
    () => ({
      invoices,
      setInvoices,
      pendingIds,
      fundInvoice,
    }),
    [invoices, setInvoices, pendingIds, fundInvoice],
  );

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

/**
 * Access marketplace invoice state and the optimistic fund action.
 *
 * @returns {{
 *   invoices: Array|null,
 *   setInvoices: Function,
 *   pendingIds: Set<string>,
 *   fundInvoice: (invoiceId: string, amount: number, performAction: () => Promise<void>) => Promise<boolean>
 * }}
 * @throws {Error} When called outside a MarketplaceProvider.
 */
export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider");
  }
  return ctx;
}
