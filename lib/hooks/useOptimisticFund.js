/**
 * @file lib/hooks/useOptimisticFund.js
 *
 * React hook that adds optimistic UI updates to the "fund invoice" flow.
 *
 * ── Design goals ───────────────────────────────────────────────────────────────
 * 1. **Instant feedback** — the invoice status flips to "Funded" in the UI the
 *    moment the user submits, before the server responds.
 * 2. **Reliable rollback** — if the server call fails (or the component unmounts
 *    before it completes), the previous status is restored automatically.
 * 3. **Concurrent-action safety** — only one funding operation may be in-flight
 *    per hook instance; the button is disabled while a request is pending.
 * 4. **Abort on unmount** — the internal AbortController ensures we never call
 *    `setState` on an unmounted component, and the pending fetch is cancelled.
 *
 * ── State machine ──────────────────────────────────────────────────────────────
 *
 *   idle ──[submit]──▶ pending ──[success]──▶ confirmed
 *                          │
 *                          └──[failure / unmount]──▶ rolled_back
 *
 * ── Public API ─────────────────────────────────────────────────────────────────
 * const {
 *   optimisticStatus,  // string — current invoice status (may be optimistically updated)
 *   fundingState,      // "idle" | "pending" | "confirmed" | "rolled_back"
 *   isFunding,         // boolean — true while a request is in-flight
 *   submitFund,        // (amount: number) => Promise<void>
 * } = useOptimisticFund({ id, status, currency, onSuccess, onError });
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fundInvoice, FundInvoiceError } from "@/lib/api/fundInvoice";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Stable state labels that consumers can match against. */
export const FUNDING_STATES = {
  IDLE: "idle",
  PENDING: "pending",
  CONFIRMED: "confirmed",
  ROLLED_BACK: "rolled_back",
};

/**
 * The optimistic status we apply to the invoice the moment the user submits.
 * The server is the source of truth; we roll back to the original on failure.
 */
const OPTIMISTIC_STATUS = "Funded";

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the optimistic fund flow for a single invoice.
 *
 * @param {object}    options
 * @param {string}    options.id          - Invoice id
 * @param {string}    options.status      - Current confirmed invoice status
 * @param {string}    options.currency    - Invoice currency (e.g. "USD")
 * @param {Function}  [options.onSuccess] - Called with server result on success
 * @param {Function}  [options.onError]   - Called with the FundInvoiceError on failure / rollback
 * @param {Function}  [options.fundFn]    - Injectable funding function (defaults to fundInvoice)
 *                                          Useful for testing without mocking the whole module.
 *
 * @returns {{
 *   optimisticStatus: string,
 *   fundingState: string,
 *   isFunding: boolean,
 *   submitFund: (amount: number) => Promise<void>,
 * }}
 */
export function useOptimisticFund({
  id,
  status,
  currency,
  onSuccess,
  onError,
  fundFn = fundInvoice,
} = {}) {
  // The status we show in the UI — starts as the server-confirmed value.
  const [optimisticStatus, setOptimisticStatus] = useState(status);
  const [fundingState, setFundingState] = useState(FUNDING_STATES.IDLE);

  // Keep optimisticStatus in sync whenever the upstream `status` prop changes
  // (e.g. a page re-fetch confirms the new state), but only when we are not
  // mid-flight so we do not stomp on an in-progress optimistic update.
  useEffect(() => {
    setOptimisticStatus((prev) => {
      // If currently pending, keep the optimistic value — the server will
      // confirm or deny it; we should not revert while the request is live.
      // fundingState is captured via the ref below to avoid adding it to the
      // dep array (which would cause the effect to re-run on every transition).
      return prev;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync confirmed status from parent when NOT in a pending/confirmed flight
  const fundingStateRef = useRef(fundingState);
  useEffect(() => {
    fundingStateRef.current = fundingState;
  }, [fundingState]);

  useEffect(() => {
    if (
      fundingStateRef.current === FUNDING_STATES.IDLE ||
      fundingStateRef.current === FUNDING_STATES.ROLLED_BACK
    ) {
      setOptimisticStatus(status);
    }
  }, [status]);

  // AbortController ref — replaced on every new call, cancelled on unmount.
  const abortRef = useRef(null);

  // Cancel any in-flight request when the component unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  /**
   * Submit the funding request with optimistic UI.
   *
   * @param {number} amount - Validated positive amount from the form
   */
  const submitFund = useCallback(
    async (amount) => {
      // Guard: prevent double-submit
      if (fundingStateRef.current === FUNDING_STATES.PENDING) return;

      // Snapshot the current confirmed status so we can roll back to it.
      const previousStatus = optimisticStatus;

      // ── Optimistic update ────────────────────────────────────────────────
      setOptimisticStatus(OPTIMISTIC_STATUS);
      setFundingState(FUNDING_STATES.PENDING);

      // Fresh controller for this attempt
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await fundFn({
          id,
          amount,
          currency,
          signal: controller.signal,
        });

        // ── Success ──────────────────────────────────────────────────────
        // The optimistic update is now confirmed — keep the status.
        setFundingState(FUNDING_STATES.CONFIRMED);
        onSuccess?.(result);
      } catch (err) {
        // ── Rollback ─────────────────────────────────────────────────────
        // Ignore AbortErrors caused by unmount — the component is gone and
        // there is nothing to roll back to.
        if (err?.name === "AbortError" && controller.signal.aborted) {
          return;
        }

        setOptimisticStatus(previousStatus);
        setFundingState(FUNDING_STATES.ROLLED_BACK);
        onError?.(err instanceof FundInvoiceError ? err : new FundInvoiceError(err?.message ?? "Unknown error"));
      }
    },
    [id, currency, fundFn, onSuccess, onError, optimisticStatus]
  );

  return {
    optimisticStatus,
    fundingState,
    isFunding: fundingState === FUNDING_STATES.PENDING,
    submitFund,
  };
}
