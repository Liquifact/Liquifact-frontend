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
 * `fundInvoice({ id, amount, currency, signal })` resolves to:
 *   { success: true, txHash: string, amount: number, currency: string }
 * and rejects with a `FundInvoiceError` (subclass of Error) on failure.
 *
 * Concurrency guard
 * ─────────────────
 * The caller is responsible for queueing/preventing concurrent calls for the
 * same invoice (see `useOptimisticFund`). This module does not keep global state.
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
 * @param {AbortSignal} [params.signal]     - Optional AbortSignal to cancel the call
 * @param {number}      [params.timeoutMs]  - Ms before automatically aborting (default 15 000)
 * @returns {Promise<{ success: true, txHash: string, amount: number, currency: string }>}
 * @throws {FundInvoiceError} on any failure
 */
export async function fundInvoice({
  id,
  amount,
  currency,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
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

  // Bail out immediately when the caller has already signalled cancellation.
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }

  const controller = new AbortController();

  // Chain the caller's signal into our internal controller.
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await _executeFundRequest({ id, amount, currency, signal: controller.signal });
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
    clearTimeout(timeoutId);
  }
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
 * @param {AbortSignal} params.signal
 * @returns {Promise<{ success: true, txHash: string, amount: number, currency: string }>}
 */
async function _executeFundRequest({ id, amount, currency, signal }) {
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

  return {
    success: true,
    txHash: payload?.txHash ?? `mock-tx-${id}-${Date.now()}`,
    amount,
    currency,
  };
}
