/**
 * @file lib/idempotency/index.js
 *
 * Idempotency key utilities for the funding submission flow.
 *
 * Design rationale
 * ────────────────
 * A double-click or browser/wallet retry must not result in two competing
 * submissions for the same funding intent.  We enforce this at the client
 * layer in two complementary ways:
 *
 * 1. **In-memory guard** (`submissionGuardRef` in `useFundingSubmit`) — blocks
 *    a second call while a request is in-flight within the same React component
 *    instance.
 *
 * 2. **Session-persisted idempotency key** (`getOrCreateIdempotencyKey`) —
 *    the key survives component remounts (e.g. React StrictMode double-invoke,
 *    user clicking a "retry" link).  On retry the same key is re-sent, so if
 *    the server already processed the request it can return the cached result
 *    without double-charging.
 *
 *    `sessionStorage` is deliberately chosen over `localStorage`:
 *    - Cleared automatically when the tab is closed → no stale keys from
 *      previous sessions confusing the server.
 *    - Scoped per tab → a second tab for the same invoice will use its own
 *      key (the BroadcastChannel lock in `useFundingSubmit` handles cross-tab
 *      deduplication separately).
 *
 * Security note
 * ─────────────
 * The key is a random UUID — it carries no sensitive information about the
 * user, wallet, or invoice.  It is only sent as a request header so the
 * backend can deduplicate within the same session.
 *
 * @module lib/idempotency
 */

/** Prefix for all sessionStorage idempotency keys. */
const KEY_PREFIX = "liquifact-idem-";

/**
 * Build the sessionStorage key for a given (walletAddress, invoiceId, amount)
 * triple.  Amount is included so that two different partial-fund attempts on
 * the same invoice (e.g. $100 then $200) each get an independent idempotency
 * key.
 *
 * @param {string}         invoiceId     - The invoice being funded
 * @param {string | null}  walletAddress - Connected wallet address (or null)
 * @param {number}         amount        - Funding amount
 * @returns {string}
 */
export function buildStorageKey(invoiceId, walletAddress, amount) {
  // walletAddress may be absent before connection; treat null / undefined as
  // "anonymous" so a key is always generated and can be stored before the
  // wallet is fully connected.
  const wallet = walletAddress ?? "anon";
  return `${KEY_PREFIX}${wallet}-${invoiceId}-${amount}`;
}

/**
 * Return the existing idempotency key for this (wallet, invoice, amount)
 * triple from `sessionStorage`, or generate and persist a fresh UUID if none
 * exists yet.
 *
 * Calling this function multiple times with the same arguments is safe —
 * it always returns the same key for the same triple within a browser tab
 * session.
 *
 * @param {string}         invoiceId
 * @param {string | null}  walletAddress
 * @param {number}         amount
 * @returns {string}  A v4 UUID string
 */
export function getOrCreateIdempotencyKey(invoiceId, walletAddress, amount) {
  const storageKey = buildStorageKey(invoiceId, walletAddress, amount);

  // SSR / test environments may not have sessionStorage.
  if (typeof sessionStorage === "undefined") {
    return crypto.randomUUID();
  }

  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const fresh = crypto.randomUUID();
  try {
    sessionStorage.setItem(storageKey, fresh);
  } catch {
    // sessionStorage full or blocked (e.g. private-browsing quota exceeded).
    // Fall back to a fresh key that won't be persisted — the in-memory guard
    // still prevents double-submit within the same React lifecycle.
  }
  return fresh;
}

/**
 * Remove the persisted idempotency key for this triple.
 *
 * Call this on confirmed SUCCESS so that a fresh invoice funding attempt
 * (same invoice, same amount) in a later session gets a new key rather than
 * re-using a key the server already marked as processed.
 *
 * On FAILURE / ROLLBACK the key is intentionally kept so that a user retry
 * re-uses the same key and the server can return a cached idempotent response
 * if it already partially processed the request.
 *
 * @param {string}         invoiceId
 * @param {string | null}  walletAddress
 * @param {number}         amount
 */
export function clearIdempotencyKey(invoiceId, walletAddress, amount) {
  if (typeof sessionStorage === "undefined") return;
  const storageKey = buildStorageKey(invoiceId, walletAddress, amount);
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore — key was never stored or storage is unavailable.
  }
}
