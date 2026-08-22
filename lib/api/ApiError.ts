/**
 * @file ApiError — typed error class for HTTP API failures in the fetch layer.
 *
 * Replaces bare `new Error(...)` throws so callers can:
 *  - distinguish API failures from coding bugs or network timeouts via `instanceof ApiError`
 *  - branch on the HTTP status code (e.g. show a 401 login prompt vs. a 503 retry banner)
 *  - log the backend `requestId` to correlate browser errors with server traces
 *  - surface a machine-readable `code` string for i18n / analytics
 *
 * Behaviour is intentionally backwards-compatible: callers that only read
 * `.message` continue to work without any changes.
 */

/**
 * Typed error thrown by the fetch layer whenever an HTTP response indicates
 * failure (non-2xx status) or when a response body cannot be decoded.
 *
 * @example
 * ```ts
 * try {
 *   const invoices = await fetchInvestableInvoices();
 * } catch (err) {
 *   if (err instanceof ApiError) {
 *     console.error(`API error ${err.status} [${err.code}] — requestId: ${err.requestId}`);
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /**
   * HTTP status code of the failed response (e.g. 404, 500).
   * `0` when no HTTP response was received (network-level failure).
   */
  readonly status: number;

  /**
   * Machine-readable error code string for programmatic handling and i18n.
   * Sourced from the response body when available; falls back to a
   * stringified status code (e.g. `"500"`).
   */
  readonly code: string;

  /**
   * Opaque request identifier returned by the backend (e.g. in an
   * `X-Request-Id` header or response body field).  `undefined` when the
   * backend did not supply one.
   */
  readonly requestId: string | undefined;

  /**
   * @param message   - Human-readable description of the error.
   * @param status    - HTTP status code (use `0` for pre-response failures).
   * @param code      - Machine-readable error code; defaults to the stringified status.
   * @param requestId - Backend-supplied request identifier for log correlation.
   */
  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);

    // Restore the prototype chain broken by extending built-in classes in ES5
    // transpilation targets (TypeScript / Babel with older targets).
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = "ApiError";
    this.status = status;
    this.code = code ?? String(status);
    this.requestId = requestId;
  }

  /**
   * Convenience factory that constructs an `ApiError` from a `Response`
   * object plus an optional message override.
   *
   * @param response  - The failed `Response` (status must be non-2xx).
   * @param message   - Human-readable description. Defaults to
   *                    `"HTTP {status} {statusText}"`.
   * @param code      - Optional machine-readable code. Defaults to the
   *                    stringified status.
   * @param requestId - Optional request-ID string for log correlation.
   */
  static fromResponse(
    response: Pick<Response, "status" | "statusText">,
    message?: string,
    code?: string,
    requestId?: string
  ): ApiError {
    const msg =
      message ?? `HTTP ${response.status}${response.statusText ? " " + response.statusText : ""}`;
    return new ApiError(msg, response.status, code ?? String(response.status), requestId);
  }
}
