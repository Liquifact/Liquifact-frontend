/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/page-data.test.js
 *
 * Tests for the hardened data fetching layer with concurrency protections.
 *
 * Test coverage:
 *   - Input validation for invoice IDs
 *   - Request deduplication (concurrent requests share the same Promise)
 *   - AbortController cancellation
 *   - Immutable snapshots (external mutations don't affect cached data)
 *   - Deterministic error handling (classified error types)
 *   - Cache clearing behavior
 *   - Prefetch functionality
 */

import {
  fetchInvoiceById,
  validateInvoiceId,
  clearRequestCache,
  prefetchInvoice,
  InvalidInvoiceIdError,
  InvoiceNotFoundError,
  InvoiceRequestAbortedError,
  InvoiceDetailError,
} from "./page-data";
import { getInvoiceById } from "../lib";

// Mock the data source
jest.mock("../lib", () => ({
  getInvoiceById: jest.fn(),
}));

describe("page-data - input validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it("accepts valid invoice IDs", () => {
    expect(validateInvoiceId("inv-001")).toBe("inv-001");
    expect(validateInvoiceId("INV_123")).toBe("INV_123");
    expect(validateInvoiceId("abc")).toBe("abc");
  });

  it("rejects empty strings", () => {
    expect(() => validateInvoiceId("")).toThrow(InvalidInvoiceIdError);
    expect(() => validateInvoiceId("")).toThrow("Invoice ID must be a non-empty string");
  });

  it("rejects non-string values", () => {
    expect(() => validateInvoiceId(null)).toThrow(InvalidInvoiceIdError);
    expect(() => validateInvoiceId(undefined)).toThrow(InvalidInvoiceIdError);
    expect(() => validateInvoiceId(123)).toThrow(InvalidInvoiceIdError);
    expect(() => validateInvoiceId({})).toThrow(InvalidInvoiceIdError);
  });

  it("rejects IDs that are too short", () => {
    expect(() => validateInvoiceId("ab")).toThrow(InvalidInvoiceIdError);
    expect(() => validateInvoiceId("a")).toThrow(InvalidInvoiceIdError);
  });

  it("rejects IDs that are too long", () => {
    const longId = "a".repeat(101);
    expect(() => validateInvoiceId(longId)).toThrow(InvalidInvoiceIdError);
  });

  it("rejects IDs with invalid characters", () => {
    expect(() => validateInvoiceId("inv 001")).toThrow(InvalidInvoiceIdError);
    expect(() => validateInvoiceId("inv@001")).toThrow(InvalidInvoiceIdError);
    expect(() => validateInvoiceId("inv#001")).toThrow(InvalidInvoiceIdError);
    expect(() => validateInvoiceId("inv/001")).toThrow(InvalidInvoiceIdError);
    expect(() => validateInvoiceId("inv.001")).toThrow(InvalidInvoiceIdError);
  });

  it("accepts alphanumeric, hyphens, and underscores", () => {
    expect(validateInvoiceId("INV-001_ABC")).toBe("INV-001_ABC");
    expect(validateInvoiceId("inv_123-456")).toBe("inv_123-456");
  });
});

describe("page-data - successful fetch", () => {
  const mockInvoice = {
    id: "inv-001",
    issuer: "Test Issuer",
    amount: "10,000",
    currency: "USD",
    status: "Open",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
    getInvoiceById.mockReturnValue(mockInvoice);
  });

  it("fetches and returns the invoice", async () => {
    const result = await fetchInvoiceById("inv-001");
    expect(result).toEqual(mockInvoice);
    expect(getInvoiceById).toHaveBeenCalledWith("inv-001");
  });

  it("returns an immutable snapshot (deep copy)", async () => {
    const result = await fetchInvoiceById("inv-001");

    // Modify the returned object
    result.amount = "20,000";
    result.newField = "test";

    // Fetch again should return the original data
    const result2 = await fetchInvoiceById("inv-001");
    expect(result2.amount).toBe("10,000");
    expect(result2.newField).toBeUndefined();
  });

  it("validates the invoice ID before fetching", async () => {
    await expect(fetchInvoiceById("")).rejects.toThrow(InvalidInvoiceIdError);
    expect(getInvoiceById).not.toHaveBeenCalled();
  });
});

describe("page-data - request deduplication", () => {
  const mockInvoice = {
    id: "inv-001",
    issuer: "Test Issuer",
    amount: "10,000",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
    getInvoiceById.mockReturnValue(mockInvoice);
  });

  it("deduplicates concurrent requests for the same invoice", async () => {
    // Make three concurrent requests
    const request1 = fetchInvoiceById("inv-001");
    const request2 = fetchInvoiceById("inv-001");
    const request3 = fetchInvoiceById("inv-001");

    // All should resolve to the same data
    const [result1, result2, result3] = await Promise.all([request1, request2, request3]);

    expect(result1).toEqual(mockInvoice);
    expect(result2).toEqual(mockInvoice);
    expect(result3).toEqual(mockInvoice);

    // getInvoiceById should only be called once
    expect(getInvoiceById).toHaveBeenCalledTimes(1);
  });

  it("allows new requests after the previous one completes", async () => {
    await fetchInvoiceById("inv-001");
    await fetchInvoiceById("inv-001");

    expect(getInvoiceById).toHaveBeenCalledTimes(2);
  });

  it("handles different invoice IDs independently", async () => {
    const mockInvoice2 = { id: "inv-002", issuer: "Other Issuer" };
    getInvoiceById.mockImplementation((id) => {
      if (id === "inv-001") return mockInvoice;
      if (id === "inv-002") return mockInvoice2;
      return null;
    });

    const [result1, result2] = await Promise.all([
      fetchInvoiceById("inv-001"),
      fetchInvoiceById("inv-002"),
    ]);

    expect(result1.id).toBe("inv-001");
    expect(result2.id).toBe("inv-002");
    expect(getInvoiceById).toHaveBeenCalledTimes(2);
  });

  it("clears cache after failed request and allows retry", async () => {
    getInvoiceById.mockReturnValueOnce(null);

    await expect(fetchInvoiceById("inv-001")).rejects.toThrow(InvoiceNotFoundError);

    // Should call getInvoiceById again on retry
    getInvoiceById.mockReturnValueOnce(mockInvoice);
    const result = await fetchInvoiceById("inv-001");
    expect(result).toEqual(mockInvoice);
    expect(getInvoiceById).toHaveBeenCalledTimes(2);
  });
});

describe("page-data - abort controller", () => {
  const mockInvoice = {
    id: "inv-001",
    issuer: "Test Issuer",
    amount: "10,000",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
    getInvoiceById.mockReturnValue(mockInvoice);
  });

  it("aborts the request when signal is aborted before fetch", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(fetchInvoiceById("inv-001", controller.signal)).rejects.toThrow(
      InvoiceRequestAbortedError
    );
    expect(getInvoiceById).not.toHaveBeenCalled();
  });

  it("throws InvoiceRequestAbortedError on abort", async () => {
    const controller = new AbortController();
    controller.abort();

    try {
      await fetchInvoiceById("inv-001", controller.signal);
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceRequestAbortedError);
      expect(error.code).toBe("REQUEST_ABORTED");
    }
  });
});

describe("page-data - error handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it("throws InvoiceNotFoundError when invoice is not found", async () => {
    getInvoiceById.mockReturnValue(null);

    await expect(fetchInvoiceById("inv-001")).rejects.toThrow(InvoiceNotFoundError);
    await expect(fetchInvoiceById("inv-001")).rejects.toThrow("Invoice not found: inv-001");
  });

  it("InvoiceNotFoundError includes the invoice ID", async () => {
    getInvoiceById.mockReturnValue(null);

    try {
      await fetchInvoiceById("inv-999");
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceNotFoundError);
      expect(error.invoiceId).toBe("inv-999");
      expect(error.code).toBe("INVOICE_NOT_FOUND");
    }
  });

  it("InvalidInvoiceIdError is thrown for invalid IDs", async () => {
    await expect(fetchInvoiceById("")).rejects.toThrow(InvalidInvoiceIdError);
    await expect(fetchInvoiceById("inv@001")).rejects.toThrow(InvalidInvoiceIdError);
  });

  it("all errors inherit from InvoiceDetailError", async () => {
    getInvoiceById.mockReturnValue(null);

    try {
      await fetchInvoiceById("inv-001");
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceDetailError);
    }

    try {
      await fetchInvoiceById("");
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceDetailError);
    }
  });
});

describe("page-data - cache management", () => {
  const mockInvoice = {
    id: "inv-001",
    issuer: "Test Issuer",
    amount: "10,000",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
    getInvoiceById.mockReturnValue(mockInvoice);
  });

  it("clearRequestCache clears the in-flight request cache", async () => {
    // Start a request (cache it)
    const request1 = fetchInvoiceById("inv-001");
    await request1;

    // Clear cache
    clearRequestCache();

    // New request should call getInvoiceById again
    await fetchInvoiceById("inv-001");
    expect(getInvoiceById).toHaveBeenCalledTimes(2);
  });

  it("cache is automatically cleared after request completes", async () => {
    await fetchInvoiceById("inv-001");
    await fetchInvoiceById("inv-001");

    // Should call getInvoiceById twice (not deduplicated)
    expect(getInvoiceById).toHaveBeenCalledTimes(2);
  });
});

describe("page-data - prefetch", () => {
  const mockInvoice = {
    id: "inv-001",
    issuer: "Test Issuer",
    amount: "10,000",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
    getInvoiceById.mockReturnValue(mockInvoice);
  });

  it("prefetches an invoice without throwing on error", async () => {
    getInvoiceById.mockReturnValue(null);

    // Should not throw
    await expect(prefetchInvoice("inv-001")).resolves.toBeUndefined();
  });

  it("prefetches successfully for valid invoice", async () => {
    await prefetchInvoice("inv-001");
    expect(getInvoiceById).toHaveBeenCalledWith("inv-001");
  });

  it("prefetch completes successfully and can be followed by a fetch", async () => {
    await prefetchInvoice("inv-001");

    // Clear the mock to track new calls
    getInvoiceById.mockClear();

    // Subsequent fetch will call getInvoiceById again (cache cleared after prefetch completes)
    await fetchInvoiceById("inv-001");
    expect(getInvoiceById).toHaveBeenCalledTimes(1);
  });
});

describe("page-data - concurrent execution scenarios", () => {
  const mockInvoice = {
    id: "inv-001",
    issuer: "Test Issuer",
    amount: "10,000",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
    getInvoiceById.mockReturnValue(mockInvoice);
  });

  it("handles rapid successive requests without race conditions", async () => {
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(fetchInvoiceById("inv-001"));
    }

    const results = await Promise.all(requests);
    results.forEach((result) => {
      expect(result).toEqual(mockInvoice);
    });

    // Should only call getInvoiceById once due to deduplication
    expect(getInvoiceById).toHaveBeenCalledTimes(1);
  });

  it("handles interleaved requests for different invoices", async () => {
    const mockInvoice2 = { id: "inv-002", issuer: "Other Issuer" };
    getInvoiceById.mockImplementation((id) => {
      if (id === "inv-001") return mockInvoice;
      if (id === "inv-002") return mockInvoice2;
      return null;
    });

    const results = await Promise.all([
      fetchInvoiceById("inv-001"),
      fetchInvoiceById("inv-002"),
      fetchInvoiceById("inv-001"),
      fetchInvoiceById("inv-002"),
    ]);

    expect(results[0].id).toBe("inv-001");
    expect(results[1].id).toBe("inv-002");
    expect(results[2].id).toBe("inv-001");
    expect(results[3].id).toBe("inv-002");

    // Each unique ID should be fetched once
    expect(getInvoiceById).toHaveBeenCalledTimes(2);
  });

  it("returns independent copies for concurrent requests", async () => {
    const [result1, result2] = await Promise.all([
      fetchInvoiceById("inv-001"),
      fetchInvoiceById("inv-001"),
    ]);

    // Modify one result
    result1.amount = "20,000";

    // The other should be unaffected
    expect(result2.amount).toBe("10,000");
  });
});
