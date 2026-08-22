/**
 * @file Comprehensive tests for the ApiError class.
 *
 * Covers:
 * - Constructor: required and optional fields, defaults
 * - instanceof checks (including prototype chain correctness after transpilation)
 * - ApiError.fromResponse factory: default message, custom message, code, requestId
 * - Edge cases: status 0, empty strings, missing headers
 * - Backwards-compatibility: .message still readable by code expecting a plain Error
 */

import { ApiError } from "./ApiError";

// ── Constructor ─────────────────────────────────────────────────────────────

describe("ApiError constructor", () => {
  it("sets message, status, code, and requestId from arguments", () => {
    const err = new ApiError("Something went wrong", 500, "INTERNAL_SERVER_ERROR", "req-001");

    expect(err.message).toBe("Something went wrong");
    expect(err.status).toBe(500);
    expect(err.code).toBe("INTERNAL_SERVER_ERROR");
    expect(err.requestId).toBe("req-001");
  });

  it("defaults code to the stringified status when code is omitted", () => {
    const err = new ApiError("Not found", 404);

    expect(err.code).toBe("404");
  });

  it("defaults requestId to undefined when omitted", () => {
    const err = new ApiError("Unauthorized", 401);

    expect(err.requestId).toBeUndefined();
  });

  it("sets the name property to 'ApiError'", () => {
    const err = new ApiError("Bad gateway", 502);

    expect(err.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    const err = new ApiError("Server error", 500);

    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of ApiError", () => {
    const err = new ApiError("Forbidden", 403);

    expect(err).toBeInstanceOf(ApiError);
  });

  it("instanceof check works when caught as unknown Error", () => {
    let caught: unknown;
    try {
      throw new ApiError("Service unavailable", 503);
    } catch (e) {
      caught = e;
    }

    expect(caught instanceof ApiError).toBe(true);
    if (caught instanceof ApiError) {
      expect(caught.status).toBe(503);
    }
  });

  it("instanceof returns false for a plain Error", () => {
    const plain = new Error("plain error");

    expect(plain instanceof ApiError).toBe(false);
  });

  it("instanceof returns false for null", () => {
    // Defensive guard — just ensure no crash.
    expect(null instanceof ApiError).toBe(false);
  });

  it("has a stack trace", () => {
    const err = new ApiError("error with stack", 500);

    expect(typeof err.stack).toBe("string");
    expect(err.stack).toContain("ApiError");
  });

  it("accepts status 0 for network-level failures with no HTTP response", () => {
    const err = new ApiError("Network failure", 0);

    expect(err.status).toBe(0);
    expect(err.code).toBe("0");
  });

  it("preserves an explicit code even when it matches the stringified status", () => {
    const err = new ApiError("Bad request", 400, "400");

    expect(err.code).toBe("400");
  });

  it("accepts an empty string as a valid requestId", () => {
    // Odd but shouldn't crash — treat as caller's choice.
    const err = new ApiError("error", 500, "500", "");

    expect(err.requestId).toBe("");
  });
});

// ── fromResponse factory ────────────────────────────────────────────────────

describe("ApiError.fromResponse", () => {
  it("creates an ApiError with status from the response", () => {
    const response = { status: 500, statusText: "Internal Server Error" };
    const err = ApiError.fromResponse(response);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
  });

  it("builds the default message from status and statusText", () => {
    const response = { status: 404, statusText: "Not Found" };
    const err = ApiError.fromResponse(response);

    expect(err.message).toBe("HTTP 404 Not Found");
  });

  it("uses the custom message when provided", () => {
    const response = { status: 503, statusText: "Service Unavailable" };
    const err = ApiError.fromResponse(response, "Backend is temporarily unavailable");

    expect(err.message).toBe("Backend is temporarily unavailable");
  });

  it("defaults code to the stringified status", () => {
    const response = { status: 422, statusText: "Unprocessable Entity" };
    const err = ApiError.fromResponse(response);

    expect(err.code).toBe("422");
  });

  it("uses the custom code when provided", () => {
    const response = { status: 400, statusText: "Bad Request" };
    const err = ApiError.fromResponse(response, undefined, "VALIDATION_ERROR");

    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("sets requestId when provided", () => {
    const response = { status: 500, statusText: "Internal Server Error" };
    const err = ApiError.fromResponse(response, undefined, undefined, "trace-xyz-789");

    expect(err.requestId).toBe("trace-xyz-789");
  });

  it("leaves requestId undefined when not provided", () => {
    const response = { status: 401, statusText: "Unauthorized" };
    const err = ApiError.fromResponse(response);

    expect(err.requestId).toBeUndefined();
  });

  it("handles an empty statusText gracefully (no trailing space in message)", () => {
    const response = { status: 500, statusText: "" };
    const err = ApiError.fromResponse(response);

    // Should not produce "HTTP 500 " with a trailing space.
    expect(err.message).toBe("HTTP 500");
  });

  it("is an instance of both ApiError and Error", () => {
    const err = ApiError.fromResponse({ status: 502, statusText: "Bad Gateway" });

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
  });
});

// ── Backwards-compatibility ─────────────────────────────────────────────────

describe("ApiError backwards-compatibility", () => {
  it("callers that only read .message continue to work", () => {
    const err = new ApiError("Failed to fetch invoices: 500 Server Error", 500);

    // Simulate legacy catch block: `if (err.message.includes("500")) ...`
    expect(err.message).toContain("500");
  });

  it("can be caught with a plain Error type guard", () => {
    let caughtMessage = "";
    try {
      throw new ApiError("old-style catch", 500);
    } catch (e) {
      if (e instanceof Error) {
        caughtMessage = e.message;
      }
    }

    expect(caughtMessage).toBe("old-style catch");
  });

  it("toString() produces a sensible representation", () => {
    const err = new ApiError("Forbidden", 403);

    // Error.prototype.toString() uses name + message.
    expect(err.toString()).toBe("ApiError: Forbidden");
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────────

describe("ApiError edge cases", () => {
  it("handles a timeout scenario (status 0 with no HTTP response)", () => {
    const err = new ApiError("Request timed out", 0, "TIMEOUT");

    expect(err.status).toBe(0);
    expect(err.code).toBe("TIMEOUT");
    expect(err instanceof ApiError).toBe(true);
  });

  it("handles non-JSON body scenario (status still available)", () => {
    // When the server returns HTML instead of JSON we still get the status.
    const response = { status: 503, statusText: "Service Unavailable" };
    const err = ApiError.fromResponse(response, "Response is not valid JSON");

    expect(err.status).toBe(503);
    expect(err.message).toBe("Response is not valid JSON");
    expect(err instanceof ApiError).toBe(true);
  });

  it("handles missing requestId (undefined) gracefully in callers", () => {
    const err = new ApiError("Not Found", 404);

    // Caller should be able to use optional-chaining safely.
    const logLine = `status=${err.status} req=${err.requestId ?? "n/a"}`;
    expect(logLine).toBe("status=404 req=n/a");
  });

  it("two different ApiError instances are independent", () => {
    const e1 = new ApiError("First", 400, "ERR_A", "rid-1");
    const e2 = new ApiError("Second", 500, "ERR_B", "rid-2");

    expect(e1.status).not.toBe(e2.status);
    expect(e1.code).not.toBe(e2.code);
    expect(e1.requestId).not.toBe(e2.requestId);
  });

  it("works with all standard 4xx and 5xx status codes", () => {
    const statuses = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];

    for (const status of statuses) {
      const err = new ApiError(`HTTP error ${status}`, status);
      expect(err.status).toBe(status);
      expect(err.code).toBe(String(status));
      expect(err instanceof ApiError).toBe(true);
    }
  });
});
