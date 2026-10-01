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
 *    The in-flight flag is latched **synchronously** (in `fundingStateRef`)
 *    before the first `await`, so two calls in the same tick cannot both pass
 *    the guard — a state-only guard would not have committed yet.
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
  // Optimistic override while a request is active.
  const [optimisticOverride, setOptimisticOverride] = useState(null);
  const [fundingState, setFundingState] = useState(FUNDING_STATES.IDLE);

  // Mirrors `fundingState` for synchronous reads. The effect keeps it in sync
  // with state, while `submitFund` writes it *synchronously* before awaiting so
  // the guard cannot be raced by a second call in the same tick.
  const fundingStateRef = useRef(fundingState);
  useEffect(() => {
    fundingStateRef.current = fundingState;
  }, [fundingState]);

  // AbortController ref — replaced on every new call, cancelled on unmount.
  const abortRef = useRef(null);

  // Monotonic attempt id — used to ignore stale responses from superseded calls.
  const attemptIdRef = useRef(0);

  // Tracks whether the component is still mounted so we never setState after unmount.
  const mountedRef = useRef(true);

  // Cancel any in-flight request when the component unmounts.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
      // Guard: prevent double-submit. Latch the ref synchronously — the state
      // update below is asynchronous and would not block a second call in the
      // same tick.
      if (fundingStateRef.current === FUNDING_STATES.PENDING) return;
      fundingStateRef.current = FUNDING_STATES.PENDING;

      // Validate the amount before mutating any state. Invalid input must
      // never produce an optimistic update or a network call.
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        const validationError = new FundInvoiceError(
          "Invalid funding amount: must be a positive finite number"
        );
        onError?.(validationError);
        return;
      }

      // Snapshot the current confirmed status so we can roll back to it.
      const previousStatus = status;

      // Claim this attempt. Any earlier in-flight attempt becomes stale and
      // its eventual resolution will be ignored.
      const attemptId = ++attemptIdRef.current;

      // ── Optimistic update ────────────────────────────────────────────────
      setOptimisticOverride(OPTIMISTIC_STATUS);
      setFundingState(FUNDING_STATES.PENDING);
      fundingStateRef.current = FUNDING_STATES.PENDING;

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

        // Ignore stale responses from superseded attempts or after unmount.
        if (attemptId !== attemptIdRef.current || !mountedRef.current) return;

        // ── Success ──────────────────────────────────────────────────────
        // The optimistic update is now confirmed — keep the status.
        fundingStateRef.current = FUNDING_STATES.CONFIRMED;
        setFundingState(FUNDING_STATES.CONFIRMED);
        fundingStateRef.current = FUNDING_STATES.CONFIRMED;
        setOptimisticOverride(null);
        onSuccess?.(result);
      } catch (err) {
        // Ignore stale failures from superseded attempts or after unmount.
        if (attemptId !== attemptIdRef.current || !mountedRef.current) return;

        // ── Rollback ─────────────────────────────────────────────────────
        // Ignore AbortErrors caused by unmount — the component is gone and
        // there is nothing to roll back to.
        if (err?.name === "AbortError" && controller.signal.aborted) {
          return;
        }

        fundingStateRef.current = FUNDING_STATES.ROLLED_BACK;
        setOptimisticOverride(previousStatus);
        setFundingState(FUNDING_STATES.ROLLED_BACK);
        fundingStateRef.current = FUNDING_STATES.ROLLED_BACK;
        onError?.(
          err instanceof FundInvoiceError
            ? err
            : new FundInvoiceError(err?.message ?? "Unknown error")
        );
      }
    },
    [id, currency, fundFn, onSuccess, onError, status]
  );

  const optimisticStatus = optimisticOverride ?? status;

  return {
    optimisticStatus,
    fundingState,
    isFunding: fundingState === FUNDING_STATES.PENDING,
    submitFund,
  };
}
