// lib/api/invoices.js

import { ApiError } from "./ApiError";

const DEFAULT_TIMEOUT_MS = 10_000;

export class InvoiceTimeoutError extends Error {
  constructor(ms) {
    super(`Request timed out after ${ms}ms`);
    this.name = "InvoiceTimeoutError";
  }
}

/**
 * Fetch investable invoices from the backend API.
 *
 * @param {Object} options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel the request.
 * @param {number} [options.timeoutMs=10000] - Milliseconds before the request is aborted.
 * @returns {Promise<Array<Object>>} Resolves to an array of normalized invoice objects.
 * @throws {InvoiceTimeoutError} Thrown when the request exceeds `timeoutMs`.
 * @throws {import("./ApiError").ApiError} Thrown when the response status is not OK,
 *   the response body is not valid JSON, or the payload is not an array.
 *   Carries `.status` (HTTP code), `.code` (stringified status), and optional
 *   `.requestId` from the `X-Request-Id` response header.
 */
export async function fetchInvestableInvoices({ signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${baseUrl.replace(/\/+$/, "")}/invoices`;

  const controller = new AbortController();

  if (signal) {
    if (signal.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      if (timedOut) throw new InvoiceTimeoutError(timeoutMs);
      // Caller-supplied signal fired — rethrow as-is so the caller can
      // distinguish an unmount-cancel from a timeout.
      throw err;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    // Extract optional X-Request-Id header for log correlation.
    const requestId = response.headers?.get("x-request-id") ?? undefined;
    throw ApiError.fromResponse(
      response,
      `Failed to fetch invoices: ${response.status} ${response.statusText}`,
      String(response.status),
      requestId
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (e) {
    // Response body was not valid JSON — throw a typed ApiError so callers
    // can inspect the status code even when the body is unparseable (e.g.
    // a gateway returning an HTML error page with a 200 status).
    throw new ApiError("Response is not valid JSON", response.status, String(response.status));
  }

  if (!Array.isArray(payload)) {
    throw new ApiError("Invoice payload is not an array", response.status, String(response.status));
  }

  // Normalize each invoice to the UI contract, guarding against missing fields.
  const normalized = payload.map((inv) => {
    const {
      id = null,
      issuer = null,
      amount = null,
      currency = null,
      dueDate = null,
      yield: invYield = null,
      status = null,
    } = inv || {};
    return { id, issuer, amount, currency, dueDate, yield: invYield, status };
  });

  return normalized;
}
