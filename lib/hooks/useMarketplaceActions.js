"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportError as defaultReportError } from "../observability/reportError";

/**
 * Manages optimistic UI state for marketplace funding actions.
 *
 * Pattern:
 *   1. Call `fund(invoiceId, amount, performAction, options?)`.
 *   2. The invoice is immediately marked as pending in local state (optimistic).
 *   3. If `options.optimisticUpdate` is provided it is called with
 *      `(invoiceId, amount)` and its return value is captured as the snapshot.
 *   4. `performAction()` **with a deterministic retry policy** is awaited.
 *      Transient failures (aborts from timeouts, network errors, 5xx, 429)
 *      are retried with exponential backoff up to `options.retries`.
 *      The `performAction` callback is invoked with `(invoiceId, amount,
 *      { attempt })` so callers can build idempotent requests (e.g. re-use
 *      the same idempotency key across attempts).
 *   5a. On success — the pending entry is committed (cleared from in-flight map).
 *   5b. On failure — the pending entry is rolled back and the error is re-thrown
 *       so the caller can show an error toast.  If `options.rollback` is provided
 *       it is called with `(invoiceId, snapshot)` so the caller can restore any
 *       external state (e.g. invoice list data).
 *
 * Invariants enforced here:
 *   1. `invoiceId` must be a non-empty string; invalid calls are rejected
 *      with a dev-time warning and return false without touching state.
 *   2. A second `fund` call on the same invoiceId while one is already in
 *      flight is rejected immediately (returns false) — the `inFlight` ref
 *      guard is checked before any state or side-effects, so concurrent
 *      duplicate clicks cannot produce duplicate in-flight actions.
 *   3. The in-flight marker is added synchronously before `performAction` is
 *      awaited and removed in both the success and failure paths (via
 *      try/catch/finally-equivalent) so the Set is never left in a dirty state.
 *   4. Rollback is only attempted when a snapshot exists; a null snapshot
 *      (invoice not found at optimistic-update time) is a safe no-op.
 *   5. `onSettled` is read from a ref so a stale closure never fires the wrong
 *      callback; updates to `onSettled` across renders are always picked up.
 *
 * Concurrent actions on different invoices are each tracked independently.
 *
 * @param {object}   [opts]
 * @param {Function} [opts.onSettled] - Called after every fund attempt (success or
 *   failure) with `(invoiceId, { ok: boolean, attempts: number })`.  Useful for analytics.
 * @param {Function} [opts.reporter] - Optional error reporter injected for
 *   observability.  Defaults to the shared `reportError` sink.
 * @param {Function} [opts.sleep] - Optional sleep implementation (for tests).
 * @returns:
 *   {
 *     pendingIds: Set<string>,
 *     fund: (invoiceId: string, amount: number,
 *            performAction: (invoiceId: string, amount: number,
 *                           context: { attempt: number }) => Promise<void>,
 *            options?: {
 *              optimisticUpdate?: Function,
 *              rollback?: Function,
 *              retries?: number,
 *              backoffMs?: number,
 *            }) => Promise<boolean>
 *   }
 */

/** Default number of retries after the initial attempt. */
const DEFAULT_RETRIES = 2;
/** Base backoff in ms for exponential retry. */
const DEFAULT_BACKOFF_MS = 250;
/** Maximum backoff in ms to keep retries bounded. */
const MAX_BACKOFF_MS = 4_000;

/**
 * Classify an error from a funding attempt into a stable, non-sensitive
 * reason code. This is used for observability and for deciding whether a
 * retry is safe.
 *
 * @param {unknown} err
 * @returns {string}
 */
function classifyFundingError(err) {
  if (!err) return "unknown";
  const name = err.name || "";
  if (name === "AbortError") return "aborted";
  if (name === "InvoiceTimeoutError") return "timeout";
  if (typeof err.status === "number") return `http_${err.status}`;
  if (name === "TypeError") return "network_error";
  return "network_error";
}

/**
 * Returns true when an error is transient and safe to retry.
 * Client errors (4xx except 429) are not retried because they will not
 * succeed on retry and would only waste time / cause duplicate side
 * effects.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
function isRetryable(err) {
  const reason = classifyFundingError(err);
  if (reason === "aborted") return false;
  if (/^http_4\d\d$/.test(reason)) return reason === "http_429";
  return true;
}

export function useMarketplaceActions({ onSettled, reporter, sleep } = {}) {
  // Set of invoice ids currently being funded optimistically.
  const [pendingIds, setPendingIds] = useState(() => new Set());

  // Ref-based in-flight tracker so concurrent guards don't need a re-render.
  const inFlight = useRef(new Set());
  const settledRef = useRef(onSettled);
  const reporterRef = useRef(reporter);
  const sleepRef = useRef(sleep);
  useEffect(() => {
    settledRef.current = onSettled;
    reporterRef.current = reporter;
    sleepRef.current = sleep;
  });

  const fund = useCallback(
    async (invoiceId, amount, performAction, { optimisticUpdate, rollback } = {}) => {
      // Invariant: invoiceId must be a non-empty string.
      if (typeof invoiceId !== "string" || invoiceId.trim() === "") {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error(
            "[useMarketplaceActions] fund() called with an invalid invoiceId (%s). " +
              "Expected a non-empty string. Action aborted.",
            JSON.stringify(invoiceId),
          );
        }
        return false;
      }

      // Invariant: performAction must be callable.
      if (typeof performAction !== "function") {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error(
            "[useMarketplaceActions] fund() called without a valid performAction (%s). " +
              "Expected a function. Action aborted.",
            typeof performAction,
          );
        }
        return false;
      }

      // Invariant: reject a second action on the same invoice while one is in-flight.
      // The inFlight ref is checked synchronously before any state changes so
      // duplicate clicks cannot slip past the guard.
      if (inFlight.current.has(invoiceId)) {
        return false;
      }

      // Optimistic update — apply external state change and capture snapshot.
      // Called before the in-flight marker is set so it runs synchronously in
      // the same React batch as the pendingIds update below.
      const snapshot = optimisticUpdate?.(invoiceId, amount);

      // Mark invoice as in-flight synchronously.  The ref update is immediate
      // (no re-render needed); the Set state update batches with any React
      // updates triggered by optimisticUpdate above.
      inFlight.current.add(invoiceId);
      setPendingIds((prev) => new Set([...prev, invoiceId]));

      const totalAttempts = Math.max(1, Number(retries) + 1);
      let lastError;
      let attempts = 0;

      try {
        for (let attempt = 1; attempt <= totalAttempts; attempt++) {
          attempts = attempt;
          try {
            await performAction(invoiceId, amount, { attempt });
            lastError = undefined;
            break;
          } catch (err) {
            lastError = err;
            const isLast = attempt === totalAttempts;
            if (isLast || !isRetryable(err)) {
              break;
            }
            const delay = Math.min(backoffMs * Math.pow(2, attempt - 1), MAX_BACKOFF_MS);
            const sleepFn =
              sleepRef.current || ((ms) => new Promise((res) => setTimeout(res, ms)));
            await sleepFn(delay);
          }
        }

        if (lastError) {
          throw lastError;
        }

        // Commit: remove from in-flight tracking on success.
        inFlight.current.delete(invoiceId);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(invoiceId);
          return next;
        });

        settledRef.current?.(invoiceId, { ok: true, attempts });
        return true;
      } catch (err) {
        // Rollback: revert optimistic update and surface the error.
        // Only call rollback when a snapshot was returned — a null/undefined
        // snapshot means the invoice was not found, so there is nothing to restore.
        if (snapshot != null) {
          rollback?.(invoiceId, snapshot);
        }

        // Always clean up the in-flight state, even on error.
        inFlight.current.delete(invoiceId);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(invoiceId);
          return next;
        });

        // Observability: report the failure with a stable reason code and
        // no sensitive data.  Reporter failures must not break the flow.
        try {
          const report = reporterRef.current;
          if (report) {
            report(err, {
              scope: "fund",
              invoiceId: String(invoiceId),
              reason: classifyFundingError(err),
              attempts,
            });
          } else {
            defaultReportError(err, {
              scope: "fund",
              invoiceId: String(invoiceId),
              reason: classifyFundingError(err),
              attempts,
            });
          }
        } catch {
          // Observability must never break the funding flow.
        }

        settledRef.current?.(invoiceId, { ok: false, attempts });
        throw err;
      }
    },
    []
  );

  return { pendingIds, fund };
}
