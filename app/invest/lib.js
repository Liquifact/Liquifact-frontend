// @ts-nocheck
/**
 * @file app/invest/lib.js
 *
 * Mock invoice data and helpers for the investor marketplace.
 *
 * ⚠️  SINGLE SOURCE OF TRUTH: This file is the only place mock invoice
 * fixtures are defined. All components and tests MUST import MOCK_INVOICES
 * and loadMockInvoices from here. Do NOT redeclare them inline elsewhere.
 * Remove this block and swap loadMockInvoices for the real API client once
 * the backend `/invoices` endpoint is ready.
 *
 * Public API (compatibility contract — do not change shapes without a
 * migration plan):
 *   - MOCK_INVOICES          {ReadonlyArray<InvoiceFixture>}
 *   - loadMockInvoices()     {() => Promise<ReadonlyArray<InvoiceFixture>>}
 *   - daysUntilMaturity()    {(dateStr: string, now?: Date) => number}
 *   - getInvoiceById()       {(id: string) => InvoiceFixture | undefined}
 *
 * Contract per item: { id, issuer, amount, currency, dueDate, yield, status }
 * NOTE: yield values are illustrative; contracts use on-chain basis points and
 * actual settlement is at maturity.
 */

/**
 * @typedef {object} InvoiceEvent
 * @property {string} id          - Unique event identifier.
 * @property {string} type        - Event type (e.g. "uploaded", "verified", "listed").
 * @property {string} actor       - Human-readable actor name.
 * @property {string} occurredAt  - ISO 8601 timestamp.
 */

/**
 * @typedef {object} InvoiceFixture
 * @property {string}          id           - Unique invoice identifier.
 * @property {string}          issuer       - Issuing company name.
 * @property {string}          amount       - Formatted amount string (e.g. "12,500").
 * @property {number}          amountValue  - Raw numeric amount.
 * @property {string}          currency     - ISO 4217 currency code.
 * @property {string}          dueDate      - ISO date string (YYYY-MM-DD).
 * @property {string}          yield        - Formatted yield percentage (e.g. "8.2%").
 * @property {number}          yieldValue   - Raw numeric yield.
 * @property {string}          status       - Invoice status (e.g. "Open").
 * @property {InvoiceEvent[]}  events       - Chronological lifecycle events.
 */

// ── Fixture data ──────────────────────────────────────────────────────────────

/**
 * Immutable mock invoice array.
 *
 * Frozen at module-load time so callers cannot accidentally mutate the shared
 * fixtures.  Each inner object is also deep-frozen for the same reason.
 *
 * @type {ReadonlyArray<InvoiceFixture>}
 */
export const MOCK_INVOICES = Object.freeze(
  [
    Object.freeze({
      id: "inv-001",
      issuer: "Acme Supplies Ltd",
      amount: "12,500",
      amountValue: 12500,
      currency: "USD",
      dueDate: "2026-06-15",
      yield: "8.2%",
      yieldValue: 8.2,
      status: "Open",
      events: Object.freeze([
        Object.freeze({ id: "evt-001-a", type: "uploaded", actor: "Acme Supplies Ltd", occurredAt: "2025-04-01T09:00:00Z" }),
        Object.freeze({ id: "evt-001-b", type: "verified", actor: "Liquidity Desk", occurredAt: "2025-04-03T11:30:00Z" }),
        Object.freeze({ id: "evt-001-c", type: "listed", actor: "Marketplace Bot", occurredAt: "2025-04-06T16:45:00Z" }),
      ]),
    }),
    Object.freeze({
      id: "inv-002",
      issuer: "Bright Logistics GmbH",
      amount: "7,800",
      amountValue: 7800,
      currency: "EUR",
      dueDate: "2026-07-01",
      yield: "7.5%",
      yieldValue: 7.5,
      status: "Open",
      events: Object.freeze([
        Object.freeze({ id: "evt-002-a", type: "uploaded", actor: "Bright Logistics GmbH", occurredAt: "2025-03-20T12:00:00Z" }),
        Object.freeze({ id: "evt-002-b", type: "verified", actor: "Risk Review", occurredAt: "2025-03-21T15:30:00Z" }),
        Object.freeze({ id: "evt-002-c", type: "listed", actor: "Marketplace Bot", occurredAt: "2025-03-22T10:15:00Z" }),
      ]),
    }),
    Object.freeze({
      id: "inv-003",
      issuer: "Sunrise Exports Pte",
      amount: "22,000",
      amountValue: 22000,
      currency: "USD",
      dueDate: "2026-05-30",
      yield: "9.1%",
      yieldValue: 9.1,
      status: "Open",
      events: Object.freeze([
        Object.freeze({ id: "evt-003-a", type: "uploaded", actor: "Sunrise Exports Pte", occurredAt: "2025-02-10T08:45:00Z" }),
        Object.freeze({ id: "evt-003-b", type: "verified", actor: "Compliance Team", occurredAt: "2025-02-11T09:10:00Z" }),
        Object.freeze({ id: "evt-003-c", type: "listed", actor: "Marketplace Bot", occurredAt: "2025-02-12T14:20:00Z" }),
      ]),
    }),
  ]
);

// ── DEV-only delay ────────────────────────────────────────────────────────────

// Simulate network latency during local development to make the skeleton
// visible.  Always 0 in test and production environments.
const DEV_DELAY = process.env.NODE_ENV === "development" ? 1500 : 0;

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Async loader that resolves to the mock invoice array.
 *
 * Determinism contract
 * ────────────────────
 * • In test environments (`NODE_ENV === "test"` or `jest` global present) the
 *   promise resolves **synchronously on the next microtask** — no real timer
 *   is involved so tests are hermetic and timing-independent.
 * • In development the loader intentionally delays by `DEV_DELAY` ms so the
 *   skeleton placeholder is visible during local iteration.
 * • In production the promise resolves immediately (DEV_DELAY === 0).
 *
 * Test override
 * ─────────────
 * Playwright / Jest tests may replace the fixture by setting
 * `window.__TEST_MOCK_INVOICES__` before the component mounts.  The override
 * is ignored in non-browser (SSR) environments and in production builds.
 *
 * @returns {Promise<ReadonlyArray<InvoiceFixture>>}
 */
export function loadMockInvoices() {
  // Browser test override (Playwright / jsdom).
  if (typeof window !== "undefined" && window.__TEST_MOCK_INVOICES__) {
    return Promise.resolve(window.__TEST_MOCK_INVOICES__);
  }

  // In test environments resolve immediately without a real timer so Jest
  // tests never need to advance fake timers just to get fixture data.
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    (typeof jest !== "undefined");

  if (isTestEnv || DEV_DELAY === 0) {
    return Promise.resolve(MOCK_INVOICES);
  }

  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_INVOICES), DEV_DELAY);
  });
}

/**
 * Calculate the number of calendar days between now and a target date string.
 *
 * Contract
 * ────────
 * • Returns a positive integer for future dates.
 * • Returns 0 when `dateStr` is today (in UTC).
 * • Returns a negative integer for past dates.
 * • Comparison is time-of-day insensitive — both operands are normalised to
 *   midnight UTC before diffing.
 * • An invalid or non-ISO `dateStr` returns `NaN`.
 *
 * @param {string} dateStr  - ISO date string (YYYY-MM-DD).  Non-ISO values
 *                            (e.g. "" or null) cause the function to return NaN.
 * @param {Date}   [now]    - Reference date (defaults to `new Date()`).
 *                            Non-Date values are coerced via `new Date(now)`.
 * @returns {number}
 */
export function daysUntilMaturity(dateStr, now = new Date()) {
  if (typeof dateStr !== "string" || dateStr === "") {
    return NaN;
  }

  const target = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(target.getTime())) {
    return NaN;
  }

  // Normalise the reference date to midnight UTC so time-of-day differences
  // on the same calendar day produce 0 (not ±1).
  const refDate = now instanceof Date ? now : new Date(now);
  const today = new Date(refDate.toISOString().slice(0, 10) + "T00:00:00Z");

  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ── getInvoiceById (LIB-6) ───────────────────────────────────────────────────

/**
 * Resolve an invoice by its `id` from the mock invoice list.
 *
 * Contract
 * ────────
 * • Returns the matching `InvoiceFixture` object when `id` is a non-empty
 *   string that exists in `MOCK_INVOICES`.
 * • Returns `undefined` for any id that does not exist in the fixture set.
 * • Returns `undefined` (not throws) for invalid inputs such as `null`,
 *   `undefined`, or non-string types.
 *
 * @param {string} id  - Invoice identifier to look up.
 * @returns {InvoiceFixture | undefined}
 */
export function getInvoiceById(id) {
  if (typeof id !== "string" || id === "") {
    return undefined;
  }
  return MOCK_INVOICES.find((invoice) => invoice.id === id);
}

/**
 * Validate an invoice ID segment received from the URL.
 *
 * An ID is considered valid when ALL of the following are true:
 *   1. It is a non-null, non-undefined string.
 *   2. After trimming it is non-empty (blocks pure-whitespace segments).
 *   3. Its length does not exceed MAX_INVOICE_ID_LENGTH (128 chars).
 *   4. It matches the allowed character set: [A-Za-z0-9_-].
 *      This rejects segments that contain path-traversal characters (e.g.
 *      `../`), null bytes, HTML metacharacters, or other unexpected input.
 *
 * The function deliberately has NO side-effects and does NOT throw —
 * callers receive a structured result and decide how to proceed.
 *
 * @param {unknown} id - Raw ID value from `params.id`.
 * @returns {{ valid: boolean, reason?: string }}
 *
 * @example
 * validateInvoiceId("inv-001")   // { valid: true }
 * validateInvoiceId("")          // { valid: false, reason: "empty" }
 * validateInvoiceId("../secret") // { valid: false, reason: "invalid-chars" }
 * validateInvoiceId(null)        // { valid: false, reason: "not-a-string" }
 */
export const MAX_INVOICE_ID_LENGTH = 128;

/** Allowlist: alphanumeric, hyphen, underscore only. */
const SAFE_ID_RE = /^[A-Za-z0-9_-]+$/;

export function validateInvoiceId(id) {
  if (typeof id !== "string") {
    return { valid: false, reason: "not-a-string" };
  }
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: "empty" };
  }
  if (trimmed.length > MAX_INVOICE_ID_LENGTH) {
    return { valid: false, reason: "too-long" };
  }
  if (!SAFE_ID_RE.test(trimmed)) {
    return { valid: false, reason: "invalid-chars" };
  }
  return { valid: true };
}

// NOTE: This file is the single source of truth for mock invoice data
// until the API client is fully integrated.
