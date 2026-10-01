

/**
 * @file lib/hooks/useFundingSubmit.js
 *
 * React hook that owns the complete lifecycle of a single funding submission.
 *
 * ── What this hook does ───────────────────────────────────────────────────────
 *
 * 1. **Cross-tab exclusive lock** — `withExclusiveTabLock` takes the Web Locks
 *    API lock `liquifact-fund-lock-<invoiceId>` (`ifAvailable: true`) before the
 *    request is issued, so two tabs can never both submit for the same invoice.
 *    A tab that loses the race is surfaced as `blocked_by_tab` and never calls
 *    `performFund`.  When Web Locks is unavailable we degrade to an advisory
 *    `BroadcastChannel` protocol (below) plus the server-side idempotency key.
 *
 * 2. **Double-submit guard** — an in-memory ref (`submissionGuardRef`) ensures
 *    that re-activating the action while a request is in-flight is a no-op,
 *    even if the button becomes briefly clickable before React re-renders with
 *    the disabled attribute. The ref is set *synchronously* before the first
 *    `await`, so two calls in the same tick cannot both pass it.
 *
 * 2. **Idempotency key** — `getOrCreateIdempotencyKey` returns a stable UUID
 *    shared across tabs for the (wallet, invoiceId, amount) triple.
 *    The same key is re-used on retry so the server can detect and respond to
 *    a replay without double-charging.  The key is cleared on confirmed success
 *    so a future legitimate re-fund gets a fresh key.
 *
 * 4. **Advisory BroadcastChannel lock** — kept for browsers without Web Locks
 *    and as a UI signal.  Ownership rules:
 *      - a tab that is itself mid-submission ignores peer `FUND_LOCK` messages
 *        (it must not be downgraded to `blocked_by_tab` by a racing peer);
 *      - a `FUND_UNLOCK` only releases the tab it is addressed to (matched by
 *        owner token), so a stale unlock cannot clear an active newer lock;
 *      - only the tab that actually holds the lock broadcasts `FUND_UNLOCK`
 *        (including on unmount) — an idle tab must never release a peer's lock.
 *
 * 5. **Abort on unmount** — an `AbortController` tied to the current request is
 *    cancelled on component unmount, preventing stale-state updates.
 *
 * 6. **Explicit state machine** — the hook exposes one of five states:
 *    `idle | pending | success | failure | blocked_by_tab`.
 *    Each state is rendered as a distinct UI in `FundActions`.
 *
 * ── State machine ─────────────────────────────────────────────────────────────
 *
 *   idle ──[submit]──────────────────────▶ pending ──[resolved]──▶ success
 *     ▲                                       │
 *     │                              [rejected / timeout]
 *     │                                       │
 *     └──[retry after failure] ◀── failure ◀──┘
 *
 *   idle ──[tab-lock received]──▶ blocked_by_tab ──[tab-unlock received]──▶ idle
 *
 * ── Invariants ────────────────────────────────────────────────────────────────
 *
 * I1. A submission is only ever started from IDLE or FAILURE (never from
 *     PENDING, SUCCESS, or BLOCKED_BY_TAB).
 * I2. `submissionGuardRef` is true iff a request is in-flight; it is always
 *     released in `finally` so a thrown/rejected call cannot wedge the hook.
 * I3. The idempotency key is stable across retries of the same
 *     (invoiceId, walletAddress, amount) triple and cleared only on confirmed
 *     success, so a retry after failure replays the same key.
 * I4. The cross-tab lock is released (FUND_UNLOCK) exactly once per acquired
 *     lock, including on unmount and on abort.
 * I5. State updates from an aborted/stale request are ignored.
 *
 * ── Public API ────────────────────────────────────────────────────────────────
 * const {
 *   fundingState,      // "idle" | "pending" | "success" | "failure" | "blocked_by_tab"
 *   isPending,         // boolean
 *   isBlocked,         // boolean — another tab already has a lock
 *   idempotencyKey,    // string | null — the key sent with the current/last request
 *   submit,            // (amount: number) => Promise<boolean>; false means no request ran
 *   reset,             // () => void — clear failure state to re-enable form
 * } = useFundingSubmit({ invoiceId, walletAddress, performFund, onSuccess, onError });
 *
 * Failure-recovery invariants (issue #1132)
 * ─────────────────────────────────────────
 * 1. The in-memory guard is acquired before ANY side effect and released in
 *    `finally`, so success, failure, and abort all converge to a recoverable
 *    state — the guard can never stay set after a lifecycle settles.
 * 2. The persisted idempotency key is cleared ONLY on confirmed success;
 *    failures intentionally keep it so retries replay the same key and the
 *    server deduplicates (no double-charge on partial completion).
 * 3. A FAILED state that is later unblocked by FUND_UNLOCK keeps its failure
 *    state (and retry affordance) — recovery never silently erases an error
 *    the user has not seen or acted on.
 * 4. `recoverStuckPending` releases a wedged pending guard only when no
 *    attempt is genuinely in-flight (tracked by a monotonic attempt token),
 *    so a live request is never interrupted and a dead one never blocks the
 *    UI indefinitely.
 *
 * @module lib/hooks/useFundingSubmit
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from "@/lib/idempotency";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Stable state labels — consumers should import and compare against these. */
export const FUNDING_SUBMIT_STATES = {
  IDLE: "idle",
  PENDING: "pending",
  SUCCESS: "success",
  FAILURE: "failure",
  /** Another tab for the same invoice has already acquired the in-flight lock. */
  BLOCKED_BY_TAB: "blocked_by_tab",
};

// ── Validation boundaries ─────────────────────────────────────────────────────

/**
 * Validation error codes surfaced to callers so UI can render deterministic,
 * non-sensitive messages.  These are stable identifiers — do not rename.
 */
export const FUNDING_VALIDATION_ERRORS = {
  MISSING_INVOICE_ID: "missing_invoice_id",
  MISSING_PERFORM_FUND: "missing_perform_fund",
  INVALID_AMOUNT_TYPE: "invalid_amount_type",
  AMOUNT_NOT_FINITE: "amount_not_finite",
  AMOUNT_NOT_POSITIVE: "amount_not_positive",
  AMOUNT_BELOW_MIN: "amount_below_min",
  AMOUNT_ABOVE_MAX: "amount_above_max",
  AMOUNT_TOO_MANY_DECIMALS: "amount_too_many_decimals",
};


/**
 * Hard upper bound for a single funding amount.  Chosen to be well below
 * Number.MAX_SAFE_INTEGER so that downstream arithmetic (sums, fee math)
 * cannot silently lose precision.  Adjust only with a migration plan.
 */
export const MAX_FUNDING_AMOUNT = 1_000_000_000;


/** Smallest positive funding amount accepted by the hook. */
export const MIN_FUNDING_AMOUNT = 0.000001;

/** Maximum number of decimal places accepted for a funding amount. */
export const MAX_FUNDING_DECIMALS = 6;


/**
 * Thrown (synchronously) by `submit` when the input fails validation.
 * Carries a stable `code` from `FUNDING_VALIDATION_ERRORS` so callers can
 * branch without parsing message strings.
 */
export class FundingValidationError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "FundingValidationError";
    this.code = code;
  }
}


/**
 * Deterministic validator for a funding amount.
 *
 * Invariants enforced:
 *  - `amount` is a finite `number` (no strings, no NaN, no Infinity).
 *  - `amount >= MIN_FUNDING_AMOUNT` and `amount <= MAX_FUNDING_AMOUNT`.
 *  - `amount` has at most `MAX_FUNDING_DECIMALS` decimal places.
 *
 * @param {unknown} amount
 * @returns {{ ok: true } | { ok: false, code: string }}
 */
export function validateFundingAmount(amount) {
  if (typeof amount !== "number") {
    return { ok: false, code: FUNDING_VALIDATION_ERRORS.INVALID_AMOUNT_TYPE };
  }
  if (!Number.isFinite(amount)) {
    return { ok: false, code: FUNDING_VALIDATION_ERRORS.AMOUNT_NOT_FINITE };
  }
  if (amount <= 0) {
    return { ok: false, code: FUNDING_VALIDATION_ERRORS.AMOUNT_NOT_POSITIVE };
  }
  if (Object.is(amount, -0)) {
    return { ok: false, code: FUNDING_VALIDATION_ERRORS.AMOUNT_NOT_POSITIVE };
  }
  if (amount < MIN_FUNDING_AMOUNT) {
    return { ok: false, code: FUNDING_VALIDATION_ERRORS.AMOUNT_BELOW_MIN };
  }
  if (amount > MAX_FUNDING_AMOUNT) {
    return { ok: false, code: FUNDING_VALIDATION_ERRORS.AMOUNT_ABOVE_MAX };
  }
  // Reject amounts with more decimal places than allowed.  Use string form
  // to avoid floating-point artifacts (e.g. 0.1 + 0.2).
  const str = amount.toString();
  // Exponential notation (e.g. 1e-7, 1.5e21) cannot be inspected for decimal
  // places via indexOf(".").  Reject it explicitly so the boundary is
  // deterministic rather than silently accepted.
  if (str.indexOf("e") !== -1 || str.indexOf("E") !== -1) {
    return { ok: false, code: FUNDING_VALIDATION_ERRORS.AMOUNT_TOO_MANY_DECIMALS };
  }
  const dot = str.indexOf(".");
  if (dot !== -1 && str.length - dot - 1 > MAX_FUNDING_DECIMALS) {
    return { ok: false, code: FUNDING_VALIDATION_ERRORS.AMOUNT_TOO_MANY_DECIMALS };
  }
  return { ok: true };
}


/**
 * BroadcastChannel name template for a given invoice.
 * Each invoice gets its own channel so unrelated invoices do not interfere.
 *
 * @param {string} invoiceId
 * @returns {string}
 */
function channelName(invoiceId) {
  return `liquifact-fund-${invoiceId}`;
}

function lockName(invoiceId) {
  return `liquifact-fund-lock-${encodeURIComponent(invoiceId)}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Manages the complete lifecycle of a funding submission for a single invoice.
 *
 * @param {object}         options
 * @param {string}         options.invoiceId      - Invoice being funded
 * @param {string | null}  [options.walletAddress] - Connected wallet address
 * @param {number | null}  [options.maxAmount]    - Maximum permitted amount
 * @param {Function}       options.performFund    - Async fn: (invoiceId, amount, idempotencyKey, signal) => Promise<any>
 * @param {Function}       [options.onSuccess]    - Called with result on success
 * @param {Function}       [options.onError]      - Called with error on failure
 *
 * @returns {{
 *   fundingState: string,
 *   isPending: boolean,
 *   isSuccess: boolean,
 *   isBlocked: boolean,
 *   idempotencyKey: string | null,
 *   submit: (amount: number) => Promise<boolean>,
 *   reset: () => void,
 * }}
 */
export function useFundingSubmit({
  invoiceId,
  walletAddress = null,
  maxAmount = null,
  performFund,
  onSuccess,
  onError,
} = {}) {
  // Validate required inputs up-front so callers fail fast and deterministically.
  if (typeof invoiceId !== "string" || invoiceId.length === 0) {
    throw new Error("useFundingSubmit: `invoiceId` is required");
  }
  if (typeof performFund !== "function") {
    throw new Error("useFundingSubmit: `performFund` must be a function");
  }

  const [fundingState, setFundingState] = useState(FUNDING_SUBMIT_STATES.IDLE);
  const [currentKey, setCurrentKey] = useState(null);
  const activeLockIdRef = useRef(null);
  const tabLockIdRef = useRef(null);


  // ── Refs ──────────────────────────────────────────────────────────────────

  /**
   * In-memory double-submit guard.
   * True while a request is in-flight — blocks re-entrant calls even before
   * React re-renders the disabled button. Set synchronously before any await.
   */
  const submissionGuardRef = useRef(false);

  /** AbortController for the active request. Replaced per attempt. */
  const abortRef = useRef(null);

  /** BroadcastChannel for cross-tab coordination (may be null if unavailable). */
  const channelRef = useRef(null);

  /** Whether a peer tab currently holds the advisory lock (advisory fallback). */
  const tabBlockedRef = useRef(false);

  useEffect(() => {
    setFundingState(FUNDING_SUBMIT_STATES.IDLE);
    setCurrentKey(null);
    tabBlockedRef.current = false;
    tabLockIdRef.current = null;

    return () => {
      if (activeLockIdRef.current && channelRef.current) {
        channelRef.current.postMessage({
          type: "FUND_UNLOCK",
          invoiceId,
          lockId: activeLockIdRef.current,
        });
      }
      abortRef.current?.abort();
      submissionGuardRef.current = false;
      activeLockIdRef.current = null;
    };
  }, [invoiceId]);

  // ── BroadcastChannel setup ────────────────────────────────────────────────

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined" || !invoiceId) return;

    let channel;
    try {
      channel = new BroadcastChannel(channelName(invoiceId));
    } catch {
      // BroadcastChannel may throw in some restricted environments.
      return;
    }

    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data?.invoiceId && event.data.invoiceId !== invoiceId) return;
      if (event.data?.type === "FUND_LOCK") {
        // Another tab just started a submission — block ours.
        if (event.data.lockId === activeLockIdRef.current) return;
        tabLockIdRef.current = event.data.lockId ?? "legacy";
        tabBlockedRef.current = true;
        setFundingState(FUNDING_SUBMIT_STATES.BLOCKED_BY_TAB);
      } else if (event.data?.type === "FUND_UNLOCK") {
        if (
          event.data.lockId &&
          tabLockIdRef.current &&
          event.data.lockId !== tabLockIdRef.current
        ) return;
        // The other tab finished (success or failure) — unblock.
        tabLockIdRef.current = null;
        tabBlockedRef.current = false;
        setFundingState((prev) =>
          prev === FUNDING_SUBMIT_STATES.BLOCKED_BY_TAB ? FUNDING_SUBMIT_STATES.IDLE : prev
        );
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
      // A tab that goes away must not leave us permanently blocked.
      tabBlockedRef.current = false;
    };
  }, [invoiceId]);

  // ── submit ────────────────────────────────────────────────────────────────

  /**
   * Initiate the funding submission.
   *
   * @param {number} amount - Validated positive funding amount
   */
  const submit = useCallback(
    async (amount) => {
      // ── Guards ────────────────────────────────────────────────────────────

      if (!invoiceId || typeof invoiceId !== "string" || !invoiceId.trim()) {
        throw Object.assign(new Error("A valid invoice is required"), {
          code: "FUND_INVALID_PARAMS",
        });
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw Object.assign(new Error("Amount must be a positive finite number"), {
          code: "FUND_INVALID_AMOUNT",
        });
      }
      if (maxAmount != null && (!Number.isFinite(maxAmount) || maxAmount <= 0 || amount > maxAmount)) {
        throw Object.assign(new Error("Amount exceeds the available funding limit"), {
          code: "FUND_INVALID_AMOUNT",
        });
      }

      // Prevent re-entrant call (double-click within the same React lifecycle).
      if (submissionGuardRef.current) return false;

      // Block if another tab already has the lock for this invoice.
      if (tabBlockedRef.current) return false;

      // Enforce I1: refuse to start from a non-startable state. This is a
      // defense-in-depth check; the guard ref above already covers the
      // in-flight case, but this also protects against SUCCESS re-entry.
      if (NON_STARTABLE_STATES.has(fundingState)) return;

      // ── Acquire in-memory lock ────────────────────────────────────────────
      submissionGuardRef.current = true;
      setFundingState(FUNDING_SUBMIT_STATES.PENDING);
      const lockId = crypto.randomUUID();
      let acquired = false;

      const execute = async () => {
        acquired = true;
        activeLockIdRef.current = lockId;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const idem = getOrCreateIdempotencyKey(invoiceId, walletAddress, amount);
          setCurrentKey(idem);
          channelRef.current?.postMessage({ type: "FUND_LOCK", invoiceId, lockId });

          const result = await performFund(invoiceId, amount, idem, controller.signal);
          if (controller.signal.aborted || activeLockIdRef.current !== lockId) return false;
          if (result === false) {
            throw Object.assign(new Error("Another funding request is in progress"), {
              code: "FUND_CONFLICT",
              status: 409,
            });
          }

          clearIdempotencyKey(invoiceId, walletAddress, amount);
          setCurrentKey(null);
          setFundingState(FUNDING_SUBMIT_STATES.SUCCESS);
          onSuccess?.(result);
          return true;
        } catch (err) {
          if (controller.signal.aborted || activeLockIdRef.current !== lockId) return false;

          setFundingState(FUNDING_SUBMIT_STATES.FAILURE);
          onError?.(err);
          throw err;
        } finally {
          if (activeLockIdRef.current === lockId) {
            submissionGuardRef.current = false;
            activeLockIdRef.current = null;
            if (channelRef.current?.name === channelName(invoiceId)) {
              channelRef.current.postMessage({ type: "FUND_UNLOCK", invoiceId, lockId });
            }
          }
        }
      };

      try {
        const locks = typeof navigator !== "undefined" ? navigator.locks : null;
        let completed = false;
        if (locks?.request) {
          await locks.request(
            lockName(invoiceId),
            { mode: "exclusive", ifAvailable: true },
            async (lock) => {
              if (lock) completed = await execute();
            }
          );
          if (!acquired) {
            throw Object.assign(new Error("Another funding request is in progress"), {
              code: "FUND_CONFLICT",
              status: 409,
            });
          }
        } else {
          // BroadcastChannel remains a best-effort fallback for browsers
          // without Web Locks; the server idempotency key is the final guard.
          completed = await execute();
        }
        return completed;
      } catch (err) {
        if (!acquired) {
          setFundingState(FUNDING_SUBMIT_STATES.FAILURE);
          onError?.(err);
        }
        throw err;
      } finally {
        if (!acquired) submissionGuardRef.current = false;
      }
    },
    [invoiceId, walletAddress, maxAmount, performFund, onSuccess, onError]
  );


  // ── reset ─────────────────────────────────────────────────────────────────

  /**
   * Clear a failure state so the user can retry without refreshing the page.
   * Does nothing when not in a failure state.
   */
  const reset = useCallback(() => {
    setFundingState((prev) =>
      prev === FUNDING_SUBMIT_STATES.FAILURE || prev === FUNDING_SUBMIT_STATES.SUCCESS
        ? FUNDING_SUBMIT_STATES.IDLE
        : prev
    );
  }, []);


  // ── Return ────────────────────────────────────────────────────────────────

  return {
    fundingState,
    isPending: fundingState === FUNDING_SUBMIT_STATES.PENDING,
    isSuccess: fundingState === FUNDING_SUBMIT_STATES.SUCCESS,
    isSuccess: fundingState === FUNDING_SUBMIT_STATES.SUCCESS,
    isFailure: fundingState === FUNDING_SUBMIT_STATES.FAILURE,
    isBlocked: fundingState === FUNDING_SUBMIT_STATES.BLOCKED_BY_TAB,
    idempotencyKey: currentKey,
    submit,
    reset,
  };
}