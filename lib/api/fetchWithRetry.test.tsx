// lib/api/fetchWithRetry.test.tsx
/**
 * Tests for the fetchWithRetry utility.
 *
 * Key scenarios covered:
 * - Successful fetch on first attempt
 * - Retry on 5xx, succeeds on retry
 * - Retry on network error, succeeds on retry
 * - Does not retry on 4xx client errors
 * - Exhausts retries on persistent 5xx
 * - Exhausts retries on persistent network errors
 * - Respects abort signal mid-retry
 * - Custom delay function injection
 * - Custom shouldRetry predicate
 * - Non-idempotent method passthrough
 * - retryNonIdempotent configuration
 * - Edge cases: maxAttempts=1, baseDelayMs=0
 */

import {
  fetchWithRetry,
  sleep,
  defaultDelay,
  defaultShouldRetry,
  isIdempotentMethod,
} from "./fetchWithRetry";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a mock Response object with the given status and optional body.
 */
function mockResponse(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone: function () {
      return mockResponse(status, body);
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("fetchWithRetry", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  describe("basic success path", () => {
    it("returns the response on a successful first attempt", async () => {
      mockFetch.mockResolvedValue(mockResponse(200, { status: "ok" }));

      const result = await fetchWithRetry("/health");

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("passes through options to fetch", async () => {
      const controller = new AbortController();
      mockFetch.mockResolvedValue(mockResponse(200));

      await fetchWithRetry("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "value" }),
        signal: controller.signal,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/test",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "value" }),
          signal: controller.signal,
        })
      );
    });
  });

  describe("retry on 5xx", () => {
    it("retries on 500 and succeeds on second attempt", async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(500))
        .mockResolvedValueOnce(mockResponse(200, { status: "ok" }));

      jest.spyOn(global.Math, "random").mockReturnValue(0.1);

      const result = await fetchWithRetry("/health", {}, { maxAttempts: 2, baseDelayMs: 100 });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      global.Math.random.mockRestore();
    });

    it("exhausts retries and returns the last 5xx response", async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(500))
        .mockResolvedValueOnce(mockResponse(502))
        .mockResolvedValueOnce(mockResponse(503));

      jest.spyOn(global.Math, "random").mockReturnValue(0.1);

      const result = await fetchWithRetry("/health", {}, { maxAttempts: 3, baseDelayMs: 50 });

      expect(result.status).toBe(503);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      global.Math.random.mockRestore();
    });
  });

  describe("retry on network errors", () => {
    it("retries on network error and succeeds on second attempt", async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError("NetworkError"))
        .mockResolvedValueOnce(mockResponse(200));

      jest.spyOn(global.Math, "random").mockReturnValue(0.1);

      const result = await fetchWithRetry("/health", {}, { maxAttempts: 2, baseDelayMs: 100 });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      global.Math.random.mockRestore();
    });

    it("re-throws the last error after exhausting retries", async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError("NetworkError"))
        .mockRejectedValueOnce(new TypeError("NetworkError"));

      jest.spyOn(global.Math, "random").mockReturnValue(0.1);

      await expect(
        fetchWithRetry("/health", {}, { maxAttempts: 2, baseDelayMs: 50 })
      ).rejects.toThrow(TypeError);

      expect(mockFetch).toHaveBeenCalledTimes(2);

      global.Math.random.mockRestore();
    });
  });

  describe("no retry on 4xx", () => {
    it("returns 400 immediately without retry", async () => {
      mockFetch.mockResolvedValue(mockResponse(400));

      const result = await fetchWithRetry("/health", {}, { maxAttempts: 3 });

      expect(result.status).toBe(400);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("returns 404 immediately without retry", async () => {
      mockFetch.mockResolvedValue(mockResponse(404));

      const result = await fetchWithRetry("/health", {}, { maxAttempts: 3 });

      expect(result.status).toBe(404);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("returns 429 (rate limit) immediately without retry", async () => {
      mockFetch.mockResolvedValue(mockResponse(429));

      const result = await fetchWithRetry("/health", {}, { maxAttempts: 3 });

      expect(result.status).toBe(429);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("abort signal handling", () => {
    it("throws AbortError if the original signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(fetchWithRetry("/health", { signal: controller.signal })).rejects.toThrow(
        DOMException
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("stops retrying if the signal is aborted during retry delay", async () => {
      const controller = new AbortController();
      mockFetch.mockResolvedValueOnce(mockResponse(500)).mockResolvedValueOnce(mockResponse(200));

      jest.spyOn(global.Math, "random").mockReturnValue(0.5);

      // Start the retry, then abort before the delay completes
      const promise = fetchWithRetry(
        "/health",
        { signal: controller.signal },
        { maxAttempts: 3, baseDelayMs: 1000 }
      );

      // Abort before the sleep resolves
      setTimeout(() => controller.abort(), 50);

      await expect(promise).rejects.toThrow(DOMException);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      global.Math.random.mockRestore();
    });

    it("does not retry AbortError from in-flight fetch", async () => {
      mockFetch.mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));

      await expect(fetchWithRetry("/health", {}, { maxAttempts: 3 })).rejects.toThrow(DOMException);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("custom delay function", () => {
    it("uses the injected delay function instead of default", async () => {
      const customDelay = jest.fn().mockReturnValue(5);

      mockFetch.mockResolvedValueOnce(mockResponse(500)).mockResolvedValueOnce(mockResponse(200));

      const result = await fetchWithRetry(
        "/health",
        {},
        { maxAttempts: 2, baseDelayMs: 2000, delayFn: customDelay }
      );

      expect(result.ok).toBe(true);
      expect(customDelay).toHaveBeenCalledWith(0, 2000);
    });
  });

  describe("custom shouldRetry predicate", () => {
    it("uses custom shouldRetry to decide which errors to retry", async () => {
      const customShouldRetry = jest.fn().mockReturnValue(false);

      mockFetch.mockRejectedValueOnce(new TypeError("NetworkError"));

      // Custom predicate says don't retry → should throw immediately.
      await expect(
        fetchWithRetry("/health", {}, { shouldRetry: customShouldRetry, maxAttempts: 3 })
      ).rejects.toThrow(TypeError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(customShouldRetry).toHaveBeenCalledWith(expect.any(TypeError), null);
    });

    it("retries 4xx if custom shouldRetry returns true", async () => {
      const customShouldRetry = jest.fn().mockReturnValue(true);

      mockFetch.mockResolvedValueOnce(mockResponse(400)).mockResolvedValueOnce(mockResponse(200));

      const result = await fetchWithRetry(
        "/health",
        {},
        { maxAttempts: 2, shouldRetry: customShouldRetry }
      );

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("non-idempotent methods", () => {
    it("does NOT retry POST by default", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500)).mockResolvedValueOnce(mockResponse(200));

      const result = await fetchWithRetry("/data", { method: "POST" }, { maxAttempts: 3 });

      // No retry — returns the first 500
      expect(result.status).toBe(500);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("retries POST when retryNonIdempotent is true", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500)).mockResolvedValueOnce(mockResponse(200));

      jest.spyOn(global.Math, "random").mockReturnValue(0.1);

      const result = await fetchWithRetry(
        "/data",
        { method: "POST" },
        { maxAttempts: 2, baseDelayMs: 100, retryNonIdempotent: true }
      );

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      global.Math.random.mockRestore();
    });

    it("does NOT retry PATCH by default", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500));

      const result = await fetchWithRetry("/data", { method: "PATCH" }, { maxAttempts: 3 });

      expect(result.status).toBe(500);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("works with maxAttempts = 1 (no retry)", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500)).mockResolvedValueOnce(mockResponse(200));

      // maxAttempts=1 means NO retry even on 5xx
      const result = await fetchWithRetry("/health", {}, { maxAttempts: 1 });

      expect(result.status).toBe(500);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("works with baseDelayMs = 0", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500)).mockResolvedValueOnce(mockResponse(200));

      jest.spyOn(global.Math, "random").mockReturnValue(0.1);

      const result = await fetchWithRetry("/health", {}, { maxAttempts: 2, baseDelayMs: 0 });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      global.Math.random.mockRestore();
    });

    it("does not call shouldRetry for successful responses", async () => {
      const shouldRetrySpy = jest.fn();
      mockFetch.mockResolvedValue(mockResponse(200));

      await fetchWithRetry("/health", {}, { shouldRetry: shouldRetrySpy });

      expect(shouldRetrySpy).not.toHaveBeenCalled();
    });
  });
});

// ── Helper function tests ───────────────────────────────────────────────────

describe("defaultDelay", () => {
  it("returns a value between 0 and baseDelay * 2^attempt", () => {
    jest.spyOn(global.Math, "random").mockReturnValue(0.5);

    const result = defaultDelay(2, 1000);
    expect(result).toBe(2000); // 0.5 * (1000 * 2^2) = 0.5 * 4000 = 2000

    global.Math.random.mockRestore();
  });
});

describe("defaultShouldRetry", () => {
  it("returns true for network errors", () => {
    expect(defaultShouldRetry(new Error("NetworkError"), null)).toBe(true);
  });

  it("returns true for 5xx responses", () => {
    expect(defaultShouldRetry(null, { status: 500 })).toBe(true);
    expect(defaultShouldRetry(null, { status: 502 })).toBe(true);
    expect(defaultShouldRetry(null, { status: 503 })).toBe(true);
  });

  it("returns false for 4xx responses", () => {
    expect(defaultShouldRetry(null, { status: 400 })).toBe(false);
    expect(defaultShouldRetry(null, { status: 404 })).toBe(false);
    expect(defaultShouldRetry(null, { status: 429 })).toBe(false);
  });

  it("returns false for successful responses (should not be called but defensive)", () => {
    expect(defaultShouldRetry(null, { status: 200 })).toBe(false);
    expect(defaultShouldRetry(null, { status: 201 })).toBe(false);
  });
});

describe("isIdempotentMethod", () => {
  it("returns true for GET", () => {
    expect(isIdempotentMethod("GET")).toBe(true);
  });

  it("returns true for HEAD, PUT, DELETE, OPTIONS, TRACE", () => {
    expect(isIdempotentMethod("HEAD")).toBe(true);
    expect(isIdempotentMethod("PUT")).toBe(true);
    expect(isIdempotentMethod("DELETE")).toBe(true);
    expect(isIdempotentMethod("OPTIONS")).toBe(true);
    expect(isIdempotentMethod("TRACE")).toBe(true);
  });

  it("returns false for POST and PATCH", () => {
    expect(isIdempotentMethod("POST")).toBe(false);
    expect(isIdempotentMethod("PATCH")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isIdempotentMethod("get")).toBe(true);
    expect(isIdempotentMethod("post")).toBe(false);
  });
});

describe("sleep", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves after the specified duration", async () => {
    const promise = sleep(1000);

    jest.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects if the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(sleep(1000, controller.signal)).rejects.toThrow(DOMException);
  });

  it("rejects if aborted during sleep", async () => {
    const controller = new AbortController();
    const promise = sleep(5000, controller.signal);

    controller.abort();

    await expect(promise).rejects.toThrow(DOMException);
  });
});
