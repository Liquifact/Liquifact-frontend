/* eslint-disable no-console */
/**
 * @file lib/api/fundInvoice.js
 *
 * Server-action abstraction for the "fund invoice" flow.
 *
 * Why a dedicated module?
 * ───────────────────────
 * - Decouples the network/contract call from React component code so it can be
 *   unit-tested in isolation without rendering a component tree.
 * - Acts as the single seam where the mock implementation will be swapped for a
 *   real Stellar/Soroban contract call once the backend is ready.
 * - Exposes a predictable async interface that the `useOptimisticFund` hook
 *   can call optimistically and roll back on failure.
 *
 * API contract
 * ────────────
 * `fundInvoice({ id, amount, currency, signal, idempotencyKey? })` resolves to:
 *   { success: true, txHash: string, amount: number, currency: string }
 * and rejects with a `FundInvoiceError` (subclass of Error) on failure.
 *
 * Concurrency guard
 * ─────────────────
 * The caller coordinates concurrent calls; the optional idempotency key is
 * forwarded to the server so retries can be deduplicated there.
 */

/**
 * State invariants owned by this module
 * ─────────────────────────────────────
 * INV-1 (Idempotency / duplicate suppression): concurrent or repeated calls
 *   for the same invoice id while one is in-flight must not both hit the
 *   network. The second caller receives the same settled result as the first
 *   (success or rejection) instead of issuing a duplicate request.
 * INV-2 (Deterministic validation): invalid params (missing id, non-positive
 *   or non-finite amount, missing currency) reject synchronously with
 *   `FUND_INVALID_PARAMS` before any network side effect occurs.
 * INV-3 (Cancellation propagation): an aborted caller signal rejects with the
 *   caller's abort reason; a timeout rejects with `FundInvoiceTimeoutError`.
 *   These are mutually exclusive and never silently swallowed.
 * INV-4 (Error normalization): every rejection is a `FundInvoiceError`
 *   subclass, so callers can rely on `instanceof` checks.
 * INV-5 (No leaked timers/listeners): the timeout timer and the caller-signal
 *   abort listener are always cleaned up in `finally`, even on rejection.
 * INV-6 (Response integrity): a successful response must carry a non-empty
 *   `txHash`; otherwise the call rejects with `FUND_PARSE_ERROR` rather than
 *   returning a fabricated hash that could mask a partial failure.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

// ── Error types ───────────────────────────────────────────────────────────────

/**
 * Base error class for all fundInvoice failures.
 * Carries an optional machine-readable `code` for programmatic error handling.
 */
export class FundInvoiceError extends Error {
  /** @param {string} message @param {{ code?: string }} [options] */
  constructor(message, { code = "FUND_ERROR" } = {}) {
    super(message);
    this.name = "FundInvoiceError";
    this.code = code;
  }
}

export class FundInvoiceTimeoutError extends FundInvoiceError {
  constructor(ms) {
    super(`Funding request timed out after ${ms}ms`, { code: "FUND_TIMEOUT" });
    this.name = "FundInvoiceTimeoutError";
  }
}

export class FundInvoiceNetworkError extends FundInvoiceError {
  constructor(message) {
    super(message, { code: "FUND_NETWORK_ERROR" });
    this.name = "FundInvoiceNetworkError";
  }
}

export class FundInvoiceServerError extends FundInvoiceError {
  /** @param {number} status @param {string} [statusText] */
  constructor(status, statusText = "") {
    super(`Funding server returned ${status}${statusText ? ` ${statusText}` : ""}`, {
      code: "FUND_SERVER_ERROR",
    });
    this.name = "FundInvoiceServerError";
    this.status = status;
  }
}

export class FundInvoiceConflictError extends FundInvoiceError {
  /** @param {string} message */
  constructor(message) {
    super(message, { code: "FUND_CONFLICT" });
    this.name = "FundInvoiceConflictError";
  }
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Submit a funding request for an invoice.
 *
 * In the current mock phase this simulates a real network round-trip (short
 * delay + configurable result) so the optimistic UI machinery can be developed
 * and tested end-to-end before Stellar integration lands.
 *
 * Replace `_executeFundRequest` below with a real fetch/Soroban invocation once
 * the backend `/invoices/:id/fund` endpoint or contract is available.
 *
 * @param {object}      params
 * @param {string}      params.id           - Invoice ID to fund
 * @param {number}      params.amount       - Amount to fund (validated positive number)
 * @param {string}      params.currency     - ISO currency code (e.g. "USD")
 * @param {string}      [params.idempotencyKey] - Stable key for safe retries
 * @param {AbortSignal} [params.signal]     - Optional AbortSignal to cancel the call
 * @param {number}      [params.timeoutMs]  - Ms before automatically aborting (default 15 000)
 * @returns {Promise<{ success: true, txHash: string, amount: number, currency: string }>}
 * @throws {FundInvoiceError} on any failure
 */

// Module-level in-flight registry keyed by invoice id. This enforces INV-1
// (duplicate suppression) without leaking state across invoices. Entries are
// removed in `finally` so a settled call never blocks a future retry.
const inFlightByInvoiceId = new Map();

export async function fundInvoice({
  id,
  amount,
  currency,
  idempotencyKey,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  // INV-2: validate before touching any shared state or the network.
  if (!id || typeof id !== "string") {
    throw new FundInvoiceError("Invoice id is required", { code: "FUND_INVALID_PARAMS" });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new FundInvoiceError("Amount must be a positive finite number", {
      code: "FUND_INVALID_PARAMS",
    });
  }
  if (!currency || typeof currency !== "string") {
    throw new FundInvoiceError("Currency is required", { code: "FUND_INVALID_PARAMS" });
  }

  // INV-1: if a call for this invoice is already in-flight, join it instead of
  // issuing a duplicate request. We deliberately do NOT forward the new
  // caller's signal to the shared promise: cancelling one caller must not
  // cancel the shared operation observed by others. Instead we race the shared
  // promise against the new caller's abort so only this caller rejects.
  const existing = inFlightByInvoiceId.get(id);
  if (existing) {
    return _raceWithCallerAbort(existing.promise, signal);
  }

  const run = _runFundInvoice({ id, amount, currency, signal, timeoutMs });
  inFlightByInvoiceId.set(id, { promise: run });
  try {
    return await run;
  } finally {
    // Only clear if we still own the slot (defensive against future changes).
    if (inFlightByInvoiceId.get(id)?.promise === run) {
      inFlightByInvoiceId.delete(id);
    }
  }
}

/**
 * Internal implementation of a single funding attempt. Extracted so the
 * public `fundInvoice` can wrap it with the in-flight registry (INV-1).
 *
 * @param {object}      params
 * @param {string}      params.id
 * @param {number}      params.amount
 * @param {string}      params.currency
 * @param {AbortSignal} [params.signal]
 * @param {number}      params.timeoutMs
 * @returns {Promise<{ success: true, txHash: string, amount: number, currency: string }>}
 */
async function _runFundInvoice({ id, amount, currency, signal, timeoutMs }) {
  // Bail out immediately when the caller has already signalled cancellation.
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }

  const controller = new AbortController();

  // INV-3 / INV-5: chain the caller's signal into our internal controller and
  // remember the listener so it can be removed in `finally`.
  let onCallerAbort;
  if (signal) {
    onCallerAbort = () => controller.abort(signal.reason);
    signal.addEventListener("abort", onCallerAbort, { once: true });
  }

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await _executeFundRequest({
      id,
      amount,
      currency,
      idempotencyKey,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      if (timedOut) throw new FundInvoiceTimeoutError(timeoutMs);
      // Propagate caller-initiated cancellation as-is.
      throw err;
    }
    if (err instanceof FundInvoiceError) throw err;
    // Wrap unknown errors so callers only need to handle FundInvoiceError.
    throw new FundInvoiceNetworkError(err?.message ?? "Unknown error");
  } finally {
    // INV-5: always release the timer and the caller-signal listener.
    clearTimeout(timeoutId);
    if (signal && onCallerAbort) {
      signal.removeEventListener("abort", onCallerAbort);
    }
  }
}

/**
 * Race a shared in-flight promise against a joining caller's abort signal.
 * Only the joining caller rejects on abort; the shared operation continues
 * for the original caller. Enforces INV-1 without violating INV-3.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {AbortSignal} [signal]
 * @returns {Promise<T>}
 */
function _raceWithCallerAbort(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

// ── Internal network/contract call ───────────────────────────────────────────

/**
 * Execute the actual funding network call.
 *
 * MOCK PHASE: Simulates a round-trip with configurable behaviour.
 * PRODUCTION: Replace with `fetch(...)` POST to `/invoices/:id/fund` or a
 * Stellar/Soroban contract invocation.
 *
 * @param {object}      params
 * @param {string}      params.id
 * @param {number}      params.amount
 * @param {string}      params.currency
 * @param {string}      [params.idempotencyKey]
 * @param {AbortSignal} params.signal
 * @returns {Promise<{ success: true, txHash: string, amount: number, currency: string }>}
 */
async function _executeFundRequest({ id, amount, currency, idempotencyKey, signal }) {
  const baseUrl =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || "http://localhost:3001";
  const url = `${baseUrl.replace(/\/+$/, "")}/invoices/${encodeURIComponent(id)}/fund`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({ amount, currency }),
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new FundInvoiceNetworkError(err?.message ?? "Network request failed");
  }

  if (!response.ok) {
    throw new FundInvoiceServerError(response.status, response.statusText);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new FundInvoiceError("Response is not valid JSON", { code: "FUND_PARSE_ERROR" });
  }

  // INV-6: never fabricate a txHash. A missing/empty hash indicates a partial
  // or malformed server response and must surface as a diagnosable failure
  // rather than a silent success that could mask data loss.
  const txHash = payload?.txHash;
  if (typeof txHash !== "string" || txHash.length === 0) {
    throw new FundInvoiceError("Response missing txHash", { code: "FUND_PARSE_ERROR" });
  }

  return {
    success: true,
    txHash,
    amount,
    currency,
  };
}
