"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages optimistic UI state for marketplace funding actions.
 *
 * Pattern:
 *   1. Call `fund(invoiceId, amount, performAction, options?)`.
 *   2. The invoice is immediately marked as pending in local state (optimistic).
 *   3. If `options.optimisticUpdate` is provided it is called with
 *      `(invoiceId, amount)` and its return value is captured as the snapshot.
 *   4. `performAction()` is awaited.
 *   5a. On success — the pending entry is committed (cleared from in-flight map).
 *   5b. On failure — the pending entry is rolled back and the error is re-thrown
 *       so the caller can show an error toast.  If `options.rollback` is provided
 *       it is called with `(invoiceId, snapshot)` so the caller can restore any
 *       external state (e.g. invoice list data).
 *
 * Concurrent actions on different invoices are each tracked independently.
 * A second fund call on the same invoice while one is already in-flight is
 * ignored (returns false) so the UI button can stay disabled.
 *
 * @param {object}   [opts]
 * @param {Function} [opts.onSettled] - Called after every fund attempt (success or
 *   failure) with `(invoiceId, { ok: boolean })`.  Useful for analytics.
 * @returns {{
 *   pendingIds: Set<string>,
 *   fund: (invoiceId: string, amount: number, performAction: () => Promise<void>,
 *          options?: { optimisticUpdate?: Function, rollback?: Function }) => Promise<boolean>
 * }}
 */
export function useMarketplaceActions({ onSettled } = {}) {
  // Set of invoice ids currently being funded optimistically.
  const [pendingIds, setPendingIds] = useState(() => new Set());

  // Ref-based in-flight tracker so concurrent guards don't need a re-render.
  const inFlight = useRef(new Set());
  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  });

  const fund = useCallback(
    async (invoiceId, amount, performAction, { optimisticUpdate, rollback } = {}) => {
      // Guard: reject a second action on the same invoice while one is in-flight.
      if (inFlight.current.has(invoiceId)) {
        return false;
      }

      // Optimistic update — apply external state change and capture snapshot.
      const snapshot = optimisticUpdate?.(invoiceId, amount);

      // Mark invoice as pending immediately.
      inFlight.current.add(invoiceId);
      setPendingIds((prev) => new Set([...prev, invoiceId]));

      try {
        await performAction(invoiceId, amount);

        // Commit: remove from pending on success.
        inFlight.current.delete(invoiceId);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(invoiceId);
          return next;
        });

        settledRef.current?.(invoiceId, { ok: true });
        return true;
      } catch (err) {
        // Rollback: revert optimistic update and surface the error.
        rollback?.(invoiceId, snapshot);

        inFlight.current.delete(invoiceId);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(invoiceId);
          return next;
        });

        settledRef.current?.(invoiceId, { ok: false });
        throw err;
      }
    },
    []
  );

  return { pendingIds, fund };
}
