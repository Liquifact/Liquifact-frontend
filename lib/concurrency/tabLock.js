/**
 * @file lib/concurrency/tabLock.js
 *
 * Cross-tab mutual exclusion for actions that must run **at most once** at a
 * time across every tab of the same origin (the funding submission is the
 * canonical caller — see `lib/hooks/useFundingSubmit.js`).
 *
 * ── Why this exists ───────────────────────────────────────────────────────────
 * A `BroadcastChannel` message is delivered *after* the fact. Two tabs that
 * call `postMessage({ type: "FUND_LOCK" })` in the same tick both receive the
 * peer's lock and neither can retroactively cancel the request it already
 * started. That leaves a genuine double-submit window: both tabs sign and send,
 * and because `sessionStorage` is per-tab they even generate *different*
 * idempotency keys, so the server cannot deduplicate them.
 *
 * The Web Locks API closes that window: `navigator.locks.request(name,
 * { mode: "exclusive" })` is an atomic, same-origin, cross-tab lock. We request
 * it with `ifAvailable: true` so a tab that loses the race is told immediately
 * (`lock === null`) instead of queueing behind the winner.
 *
 * ── Invariants ────────────────────────────────────────────────────────────────
 * 1. At most one caller within the origin runs the guarded function for a given
 *    `invoiceId` while Web Locks is available.
 * 2. A caller that does not acquire the lock never invokes `fn` (we never issue
 *    a request without the lock).
 * 3. The lock is always released — Web Locks releases it when the callback's
 *    promise settles, including on throw, so there is no lease to expire.
 * 4. When Web Locks is unavailable the caller degrades to an advisory
 *    `BroadcastChannel` protocol (implemented in `useFundingSubmit`). The
 *    server-side idempotency key remains the final safety net in that case.
 *
 * @module lib/concurrency/tabLock
 */

/**
 * Whether the Web Locks API can be used in the current environment.
 * Safari < 15.4 and some embedded webviews do not ship it.
 *
 * @returns {boolean}
 */
export function supportsWebLocks() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.locks &&
    typeof navigator.locks.request === "function"
  );
}

/**
 * Stable, per-invoice lock name. Namespaced so funding locks can never collide
 * with unrelated Web Locks a future feature might take out.
 *
 * @param {string} invoiceId
 * @returns {string}
 */
export function fundLockName(invoiceId) {
  return `liquifact-fund-lock-${invoiceId}`;
}

/**
 * Run `fn` while holding the exclusive same-origin lock for `invoiceId`.
 *
 * Resolves to `{ acquired, value }`:
 * - `acquired: true`  — the lock was held for the whole call (or Web Locks is
 *   unavailable, in which case exclusion is the caller's responsibility) and
 *   `value` is whatever `fn` resolved to.
 * - `acquired: false` — another tab currently holds the lock. `fn` was **not**
 *   called and `value` is `undefined`.
 *
 * If `fn` throws, the returned promise rejects with the same error and the lock
 * is released automatically.
 *
 * @template T
 * @param {string} invoiceId
 * @param {() => Promise<T>} fn
 * @returns {Promise<{ acquired: boolean, value: T | undefined }>}
 */
export async function withExclusiveTabLock(invoiceId, fn) {
  if (!supportsWebLocks()) {
    // No Web Locks — the caller falls back to its advisory protocol. We still
    // return the same shape so callers have a single code path.
    return { acquired: true, value: await fn() };
  }

  let acquired = false;
  const value = await navigator.locks.request(
    fundLockName(invoiceId),
    { mode: "exclusive", ifAvailable: true },
    async (lock) => {
      if (!lock) return undefined;
      acquired = true;
      return await fn();
    }
  );

  return { acquired, value };
}
