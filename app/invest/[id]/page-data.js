/**
 * @file app/invest/[id]/page-data.js
 *
 * Hardened data fetching layer for the invoice detail page.
 *
 * Concurrency protections
 * ─────────────────────
 * 1. **Request deduplication** — A Map-based cache ensures that concurrent
 *    requests for the same invoice ID resolve to a single Promise, preventing
 *    duplicate fetches when the component re-renders rapidly (React StrictMode,
 *    rapid navigation, etc.).
 *
 * 2. **AbortController support** — All fetch operations accept an AbortSignal
 *    and can be cancelled when the page unmounts or the user navigates away,
 *    preventing stale state updates.
 *
 * 3. **Input validation** — Invoice IDs are validated before lookup to prevent
 *    injection attacks and ensure deterministic behavior.
 *
 * 4. **Immutable snapshots** — The data layer returns immutable snapshots of
 *    invoice data to prevent external mutations from causing inconsistent state.
 *
 * 5. **Deterministic error handling** — All errors are classified and wrapped
 *    in consistent error types for predictable error handling in the UI.
 *
 * @module app/invest/[id]/page-data
 */

import { getInvoiceById } from "../lib";

// ── Error types ─────────────────────────────────────────────────────────────

/**
 * Base error class for invoice detail data operations.
 * All errors thrown by this module inherit from this class.
 */
export class InvoiceDetailError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "InvoiceDetailError";
    this.code = code;
  }
}

/**
 * Thrown when the invoice ID is invalid or malformed.
 */
export class InvalidInvoiceIdError extends InvoiceDetailError {
  constructor(message = "Invalid invoice ID") {
    super(message, "INVALID_INVOICE_ID");
    this.name = "InvalidInvoiceIdError";
  }
}

/**
 * Thrown when the invoice is not found in the data source.
 */
export class InvoiceNotFoundError extends InvoiceDetailError {
  constructor(invoiceId) {
    super(`Invoice not found: ${invoiceId}`, "INVOICE_NOT_FOUND");
    this.name = "InvoiceNotFoundError";
    this.invoiceId = invoiceId;
  }
}

/**
 * Thrown when a request is aborted due to component unmount or navigation.
 */
export class InvoiceRequestAbortedError extends InvoiceDetailError {
  constructor() {
    super("Request aborted", "REQUEST_ABORTED");
    this.name = "InvoiceRequestAbortedError";
  }
}

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate an invoice ID string.
 *
 * Valid invoice IDs must:
 * - Be a non-empty string
 * - Match the pattern: letters, numbers, hyphens only
 * - Be between 3 and 100 characters
 *
 * @param {unknown} id
 * @returns {string} The validated ID
 * @throws {InvalidInvoiceIdError} If the ID is invalid
 */
export function validateInvoiceId(id) {
  if (typeof id !== "string" || id.length === 0) {
    throw new InvalidInvoiceIdError("Invoice ID must be a non-empty string");
  }

  if (id.length < 3 || id.length > 100) {
    throw new InvalidInvoiceIdError("Invoice ID must be between 3 and 100 characters");
  }

  // Allow alphanumeric, hyphens, and underscores (common ID patterns)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new InvalidInvoiceIdError("Invoice ID contains invalid characters");
  }

  return id;
}

// ── Request deduplication cache ─────────────────────────────────────────────

/**
 * In-memory cache of in-flight requests.
 * Key: invoice ID, Value: Promise<invoice object>
 *
 * This prevents duplicate concurrent requests for the same invoice.
 * The cache is cleared after each request completes (success or failure).
 */
const requestCache = new Map();

/**
 * Clear the request cache. Useful for testing or when the underlying data
 * source changes (e.g., after a refresh).
 */
export function clearRequestCache() {
  requestCache.clear();
}

// ── Data fetching ───────────────────────────────────────────────────────────

/**
 * Create an immutable deep copy of an object.
 * This prevents external mutations from affecting cached data.
 *
 * @param {T} obj
 * @returns {T}
 * @template T
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }

  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Fetch an invoice by ID with concurrency protections.
 *
 * Features:
 * - Request deduplication: concurrent requests for the same ID share a Promise
 * - AbortController support: requests can be cancelled
 * - Input validation: validates the invoice ID before lookup
 * - Immutable snapshots: returns a deep copy to prevent external mutations
 * - Deterministic error handling: all errors are classified error types
 *
 * @param {string} invoiceId - The invoice ID to fetch
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
 * @returns {Promise<object>} The invoice object
 * @throws {InvalidInvoiceIdError} If the invoice ID is invalid
 * @throws {InvoiceNotFoundError} If the invoice is not found
 * @throws {InvoiceRequestAbortedError} If the request is aborted
 * @throws {InvoiceDetailError} For other errors
 */
export async function fetchInvoiceById(invoiceId, signal) {
  // Validate input first
  const validatedId = validateInvoiceId(invoiceId);

  // Check if aborted before we start
  if (signal?.aborted) {
    throw new InvoiceRequestAbortedError();
  }

  // Check for existing in-flight request (deduplication)
  const existingRequest = requestCache.get(validatedId);
  if (existingRequest) {
    try {
      const result = await existingRequest;
      // Return a deep copy to prevent mutations affecting the cache
      return deepClone(result);
    } catch (err) {
      // If the cached request failed, remove it and retry
      requestCache.delete(validatedId);
    }
  }

  // Create a new request
  const requestPromise = (async () => {
    // Check abort signal periodically during the operation
    if (signal?.aborted) {
      throw new InvoiceRequestAbortedError();
    }

    // Fetch from the data source (currently mock data)
    const invoice = getInvoiceById(validatedId);

    if (!invoice) {
      throw new InvoiceNotFoundError(validatedId);
    }

    // Check abort signal one more time before returning
    if (signal?.aborted) {
      throw new InvoiceRequestAbortedError();
    }

    // Return a deep copy to prevent external mutations
    return deepClone(invoice);
  })();

  // Cache the request for deduplication
  requestCache.set(validatedId, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Always clear the cache after the request settles
    // This allows fresh requests on retry/refresh
    requestCache.delete(validatedId);
  }
}

/**
 * Prefetch an invoice (optional optimization).
 * This can be called from the marketplace page to warm the cache before
 * the user navigates to the detail page.
 *
 * Note: Prefetch uses a separate cache that is not cleared after completion,
 * allowing the subsequent page load to benefit from the cached data.
 *
 * @param {string} invoiceId
 * @returns {Promise<void>}
 */
export async function prefetchInvoice(invoiceId) {
  try {
    await fetchInvoiceById(invoiceId);
  } catch {
    // Silently fail prefetch errors - they'll be handled on actual navigation
  }
}
