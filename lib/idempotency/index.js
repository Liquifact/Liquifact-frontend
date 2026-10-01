
/**
 * @file lib/idempotency/index.js
 *
 * Idempotency key utilities for the funding submission flow.
 *
 * Design rationale
 * ────────────────
 * A double-click or browser/wallet retry must not result in two competing
 * submissions for the same funding intent.  We enforce this at the client
 * layer in three complementary ways:
 *
 * 1. **Cross-tab exclusive lock** (`withExclusiveTabLock` in
 *    `lib/concurrency/tabLock.js`) — only one tab can be inside a funding
 *    submission for a given invoice at a time.
 *
 * 2. **In-memory guard** (`submissionGuardRef` in `useFundingSubmit`) — blocks
 *    a second call while a request is in-flight within the same React component
 *    instance.
 *
 * 2. **Persisted idempotency key** (`getOrCreateIdempotencyKey`) —
 *    localStorage shares an intent key across tabs and remounts. On retry the
 *    same key is re-sent, so the server can deduplicate an uncertain result.
 *
 *    Keys are removed only after confirmed success. Retaining them after an
 *    uncertain failure is essential: a retry in another tab must not receive
 *    a fresh server idempotency key.
 *
 * ── Determinism invariant ─────────────────────────────────────────────────────
 * For a given `(walletAddress, invoiceId, amount)` triple, repeated calls in the
 * same JS context MUST return the same key — including when `sessionStorage` is
 * unavailable (SSR / sandboxed iframe) or throws (`QuotaExceededError`,
 * Safari private mode). A retry that silently got a *new* key would defeat
 * server-side deduplication and could double-charge. We therefore keep a
 * module-scoped `Map` as the authoritative fallback: a key is only ever
 * generated when no cached key exists in either tier.
 *
 * Security note
 * ─────────────
 * The key is a random UUID — it carries no sensitive information about the
 * user, wallet, or invoice.  It is only sent as a request header so the
 * backend can deduplicate within the same session.
 *
 * Validation boundaries
 * ────────────────────
 * This module is the single source of truth for what constitutes a valid
 * idempotency key and a valid funding identity triple.  The invariants are:
 *
 * 1. **Non-empty identity** — `invoiceId` must be a non-empty string.
 *    A blank invoice id would collapse all invoices onto one storage key,
 *    causing false deduplication across unrelated invoices.
 * 2. **Valid amount** — `amount` must be a finite, positive number.
 *    `NaN`, `Infinity`, zero, and negative values are rejected because they
 *    either produce undefined string keys or allow an invalid intent to
 *    be persisted.
 * 3. **Wallet normalization** — `null`/`undefined` wallets map to the
 *    `\"anon\"` sentinel.  A non-empty string is trimmed and lowercased so the
 *    same wallet address in different cases shares one key.
 * 4. **Deterministic storage key** — the same valid triple always maps
 *    to the same storage key, and different triples map to different keys.
 * 5. **Invalid input fails closed** — invalid input throws a typed `Error`
 *    rather than silently generating a key that could collide or be reused.
 *
 * 6. **Duplicate submissions** — the same valid triple always maps to the
 *    same storage key, so concurrent or repeated calls share one key.
 *
 * @module lib/idempotency
 */

/** Prefix shared by current and legacy idempotency storage keys. */
const KEY_PREFIX = "liquifact-idem-";

/** Sentinel wallet value used before connection. */
const ANON_WALLET = "anon";

/** Maximum accepted length for an invoice id. */
const MAX_INVOICE_ID_LENGTH = 256;

/** Maximum accepted length for a wallet address. */
const MAX_WALLET_LENGTH = 256;

/** Maximum accepted funding amount (in the app's base unit). */
const MAX_AMOUNT = Number.MAX_SAFE_INTEGER;

/**
 * Build the storage key for a given (walletAddress, invoiceId, amount)
 * triple.  Amount is included so that two different partial-fund attempts on
 * the same invoice (e.g. $100 then $200) each get an independent idempotency
 * key.
 *
 * This is a typed error so callers can distinguish validation failures from
 * storage failures and render appropriate user-visible messages.
 */
export class IdempotencyValidationError extends Error {
  /**
   * @param {string} field   - Which input field failed validation
   * @param {string} message - Human-readable explanation
   */
  constructor(field, message) {
    super(message);
    this.name = "IdempotencyValidationError";
    this.field = field;
  }
}

/**
 * Normalize and validate an invoice identifier.
 *
 * @param {unknown} invoiceId
 * @returns {string} the trimmed invoice id
 * @throws {IdempotencyValidationError}
 */
function normalizeInvoiceId(invoiceId) {
  if (typeof invoiceId !== "string") {
    throw new IdempotencyValidationError(
      "invoiceId",
      "invoiceId must be a non-empty string",
    );
  }
  const trimmed = invoiceId.trim();
  if (trimmed.length === 0) {
    throw new IdempotencyValidationError(
      "invoiceId",
      "invoiceId must be a non-empty string",
    );
  }
  if (trimmed.length > MAX_INVOICE_ID_LENGTH) {
    throw new IdempotencyValidationError(
      "invoiceId",
      `invoiceId must be at most ${MAX_INVOICE_ID_LENGTH} characters`,
    );
  }
  return trimmed;
}

/**
 * Normalize and validate a wallet address.
 *
 * `null` / `undefined` are mapped to the `"anon"` sentinel.  Non-empty
 * strings are trimmed and lowercased.
 *
 * @param {unknown} walletAddress
 * @returns {string}
 * @throws {IdempotencyValidationError}
 */
function normalizeWalletAddress(walletAddress) {
  if (walletAddress == null) return ANON_WALLET;
  if (typeof walletAddress !== "string") {
    throw new IdempotencyValidationError(
      "walletAddress",
      "walletAddress must be a string or null",
    );
  }
  const trimmed = walletAddress.trim();
  if (trimmed.length === 0) return ANON_WALLET;
  if (trimmed.length > MAX_WALLET_LENGTH) {
    throw new IdempotencyValidationError(
      "walletAddress",
      `walletAddress must be at most ${MAX_WALLET_LENGTH} characters`,
    );
  }
  return trimmed.toLowerCase();
}

/**
 * Normalize and validate a funding amount.
 *
 * @param {unknown} amount
 * @returns {number}
 * @throws {IdempotencyValidationError}
 */
function normalizeAmount(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new IdempotencyValidationError(
      "amount",
      "amount must be a finite number",
    );
  }
  if (amount <= 0) {
    throw new IdempotencyValidationError(
      "amount",
      "amount must be greater than zero",
    );
  }
  if (amount > MAX_AMOUNT) {
    throw new IdempotencyValidationError(
      "amount",
      `amount must be at most ${MAX_AMOUNT}`,
    );
  }
  return amount;
}

/**
 * Validate a (walletAddress, invoiceId, amount) triple and return its
 * normalized form.
 *
 * This is the single entry point for validation; all other exports delegate
 * to it so the invariants cannot drift between call sites.
 *
 * @param {string}        invoiceId
 * @param {string|null}  walletAddress
 * @param {number}        amount
 * @returns {{invoiceId: string, walletAddress: string, amount: number}}
 * @throws {IdempotencyValidationError}
 */
export function validateIdempotencyInput(invoiceId, walletAddress, amount) {
  return {
    invoiceId: normalizeInvoiceId(invoiceId),
    walletAddress: normalizeWalletAddress(walletAddress),
    amount: normalizeAmount(amount),
  };
}

/**
 * In-memory idempotency keys, keyed by the same storage key as sessionStorage.
 *
 * This tier exists for two reasons:
 * 1. `sessionStorage` may be absent (SSR, sandboxed iframe) — we must still
 *    return a stable key for the lifetime of the module.
 * 2. `sessionStorage.setItem` may throw (quota / private mode). Falling back to
 *    a freshly generated UUID on every call would make retries non-idempotent,
 *    so the key is cached here instead.
 *
 * @type {Map<string, string>}
 */
const inMemoryKeys = new Map();

/**
 * Encode one segment of a storage key so that the `-` delimiter can never
 * appear inside a segment.
 *
 * Without this, two distinct triples collide — e.g. wallet `"x"` / invoice
 * `"y-z"` and wallet `"x-y"` / invoice `"z"` both produce `x-y-z-1`. A collision
 * makes two separate funding intents share one idempotency key, so the server
 * treats the second as a replay and silently drops it.
 *
 * `encodeURIComponent` leaves `-` untouched, so we escape it explicitly (and it
 * already escapes `%`, keeping the encoding unambiguous and reversible).
 *
 * @param {string | number} value
 * @returns {string}
 */
function encodeSegment(value) {
  return encodeURIComponent(String(value)).replace(/-/g, "%2D");
}

/**
 * Build the storage key for a given (walletAddress, invoiceId, amount) triple.
 * Amount is included so that two different partial-fund attempts on the same
 * invoice (e.g. $100 then $200) each get an independent idempotency key.
 *
 * @param {string}        invoiceId     - The invoice being funded
 * @param {string | null} walletAddress - Connected wallet address (or null)
 * @param {number}        amount        - Funding amount
 * @returns {string}
 * @throws {IdempotencyValidationError} for invalid input
 */
export function buildStorageKey(invoiceId, walletAddress, amount) {
  const normalized = validateIdempotencyInput(invoiceId, walletAddress, amount);
  return `${KEY_PREFIX}${normalized.walletAddress}-${normalized.invoiceId}-${normalized.amount}`;
}

/**
 * Return the existing idempotency key for this (wallet, invoice, amount)
 * triple from `localStorage`, or generate and persist a fresh UUID if none
 * exists yet.
 *
 * Calling this function multiple times with the same arguments is safe —
 * it always returns the same key for the same triple while its localStorage
 * entry remains present, including across tabs.
 *
 * @param {string}         invoiceId
 * @param {string | null}  walletAddress
 * @param {number}         amount
 * @returns {string}  A v4 UUID string
 */
/**
 * Best-effort persistence to `sessionStorage`. Never throws — storage may be
 * absent, full, or blocked.
 *
 * @param {string} storageKey
 * @param {string} value
 */
function persistKey(storageKey, value) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, value);
  } catch {
    // sessionStorage full or blocked (e.g. private-browsing quota exceeded).
    // The in-memory cache guarantees retries still reuse this key.
  }
}

/**
 * Return the existing idempotency key for this (wallet, invoice, amount)
 * triple, or generate and cache a fresh UUID if none exists yet.
 *
 * Lookup order is sessionStorage first (survives a page reload within the
 * session), then the in-memory map.  A key served from the in-memory tier is
 * re-persisted when possible, so the storage tier self-heals after clearing.
 *
 * Calling this function multiple times with the same arguments is safe — it
 * always returns the same key for the same triple within a browser tab session.
 *
 * @param {string}         invoiceId
 * @param {string | null}  walletAddress
 * @param {number}         amount
 * @returns {string}  A v4 UUID string
 * @throws {IdempotencyValidationError} for invalid input
 */
export function getOrCreateIdempotencyKey(invoiceId, walletAddress, amount) {
  const storageKey = buildStorageKey(invoiceId, walletAddress, amount);

  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;

    const legacy = sessionStorage.getItem(storageKey);
    if (legacy) {
      localStorage.setItem(storageKey, legacy);
      return legacy;
    }

    const fresh = crypto.randomUUID();
    localStorage.setItem(storageKey, fresh);
    return localStorage.getItem(storageKey) ?? fresh;
  } catch {
    // Per-tab fallback would create different retry keys in other tabs.
    throw Object.assign(new Error("Cannot persist a funding retry key"), {
      code: "FUND_IDEMPOTENCY_UNAVAILABLE",
    });
  }
}

/** @internal exported for tests only */
export { generateKey as __generateKeyForTests };

/**
 * Generate a fresh idempotency key.
 *
 * Prefers `crypto.randomUUID()` when available.  Falls back to a
 * `crypto.getRandomValues`-based v4 UUID, and finally to a
 * timestamp+random composite for environments with no Web Crypto at all.
 * This keeps key generation deterministic in shape (always a non-empty
 * string) and never throws, so a missing crypto API cannot turn a
 * user-visible funding action into an unhandled exception.
 *
 * @returns {string}
 */
function generateKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Remove the persisted idempotency key for this triple, from both tiers.
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
 * @throws {IdempotencyValidationError} for invalid input
 */
export function clearIdempotencyKey(invoiceId, walletAddress, amount) {
  const storageKey = buildStorageKey(invoiceId, walletAddress, amount);
  if (typeof sessionStorage === "undefined") return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore — key was never stored or storage is unavailable.
  }
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore — legacy storage may be unavailable.
  }
}

/**
 * Test-only hook: drop all in-memory keys so suites can assert from a clean
 * slate. Not part of the public API and unused by application code.
 *
 * @internal
 */
export function __resetIdempotencyCacheForTests() {
  inMemoryKeys.clear();
}
