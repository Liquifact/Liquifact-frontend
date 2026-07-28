/**
 * @jest-environment jsdom
 *
 * @file lib/api/fundInvoice.test.ts
 *
 * Comprehensive tests for the fundInvoice API abstraction.
 *
 * Test surface
 * ────────────
 * 1. Input validation (id, amount, currency)
 * 2. Successful response path
 * 3. HTTP error responses (4xx, 5xx)
 * 4. Network / fetch failure
 * 5. JSON parse failure
 * 6. Timeout → FundInvoiceTimeoutError
 * 7. AbortSignal cancellation (caller-initiated)
 * 8. Error class hierarchy and codes
 */

import {
  fundInvoice,
  FundInvoiceError,
  FundInvoiceTimeoutError,
  FundInvoiceNetworkError,
  FundInvoiceServerError,
} from "./fundInvoice";

// ── Mock global.fetch ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

function mockFetch(
  status: number,
  body: unknown,
  ok = status >= 200 && status < 300,
  statusText = "OK"
) {
  const jsonBody = typeof body === "string" ? body : JSON.stringify(body);
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(jsonBody),
  });
}

function mockFetchNetworkError(message = "Failed to fetch") {
  (global as unknown as { fetch: jest.Mock }).fetch = jest
    .fn()
    .mockRejectedValue(new TypeError(message));
}

function mockFetchAbort() {
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockRejectedValue(
    Object.assign(new DOMException("The operation was aborted.", "AbortError"), {
      name: "AbortError",
    })
  );
}

function mockFetchBadJson() {
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
  });
}

const VALID_PARAMS = { id: "inv-001", amount: 1000, currency: "USD" };

// ── 1. Input validation ───────────────────────────────────────────────────────

describe("fundInvoice — input validation", () => {
  it("throws FundInvoiceError with FUND_INVALID_PARAMS when id is missing", async () => {
    await expect(fundInvoice({ id: "", amount: 100, currency: "USD" })).rejects.toMatchObject({
      name: "FundInvoiceError",
      code: "FUND_INVALID_PARAMS",
    });
  });

  it("throws when id is not a string", async () => {
    await expect(
      fundInvoice({ id: null as unknown as string, amount: 100, currency: "USD" })
    ).rejects.toMatchObject({ code: "FUND_INVALID_PARAMS" });
  });

  it("throws FundInvoiceError when amount is zero", async () => {
    await expect(fundInvoice({ id: "inv-001", amount: 0, currency: "USD" })).rejects.toMatchObject({
      code: "FUND_INVALID_PARAMS",
    });
  });

  it("throws FundInvoiceError when amount is negative", async () => {
    await expect(fundInvoice({ id: "inv-001", amount: -5, currency: "USD" })).rejects.toMatchObject(
      { code: "FUND_INVALID_PARAMS" }
    );
  });

  it("throws FundInvoiceError when amount is NaN", async () => {
    await expect(
      fundInvoice({ id: "inv-001", amount: NaN, currency: "USD" })
    ).rejects.toMatchObject({ code: "FUND_INVALID_PARAMS" });
  });

  it("throws FundInvoiceError when amount is Infinity", async () => {
    await expect(
      fundInvoice({ id: "inv-001", amount: Infinity, currency: "USD" })
    ).rejects.toMatchObject({ code: "FUND_INVALID_PARAMS" });
  });

  it("throws when currency is missing", async () => {
    await expect(fundInvoice({ id: "inv-001", amount: 100, currency: "" })).rejects.toMatchObject({
      code: "FUND_INVALID_PARAMS",
    });
  });

  it("throws when currency is not a string", async () => {
    await expect(
      fundInvoice({ id: "inv-001", amount: 100, currency: null as unknown as string })
    ).rejects.toMatchObject({ code: "FUND_INVALID_PARAMS" });
  });
});

// ── 2. Successful response ────────────────────────────────────────────────────

describe("fundInvoice — success path", () => {
  it("resolves with success:true and txHash from server", async () => {
    mockFetch(200, { txHash: "abc123" });

    const result = await fundInvoice(VALID_PARAMS);

    expect(result.success).toBe(true);
    expect(result.txHash).toBe("abc123");
    expect(result.amount).toBe(1000);
    expect(result.currency).toBe("USD");
  });

  it("uses a generated txHash when server does not provide one", async () => {
    mockFetch(200, {});

    const result = await fundInvoice(VALID_PARAMS);

    expect(typeof result.txHash).toBe("string");
    expect(result.txHash.length).toBeGreaterThan(0);
  });

  it("POSTs to the correct URL with the right body", async () => {
    mockFetch(200, { txHash: "tx1" });

    await fundInvoice(VALID_PARAMS);

    const fetchCall = (global as unknown as { fetch: jest.Mock }).fetch.mock.calls[0];
    expect(fetchCall[0]).toContain("/invoices/inv-001/fund");
    expect(fetchCall[1].method).toBe("POST");

    const body = JSON.parse(fetchCall[1].body);
    expect(body).toEqual({ amount: 1000, currency: "USD" });
  });

  it("sets Content-Type and Accept headers", async () => {
    mockFetch(200, { txHash: "tx2" });

    await fundInvoice(VALID_PARAMS);

    const fetchCall = (global as unknown as { fetch: jest.Mock }).fetch.mock.calls[0];
    expect(fetchCall[1].headers["Content-Type"]).toBe("application/json");
    expect(fetchCall[1].headers["Accept"]).toBe("application/json");
  });

  it("passes an AbortSignal to fetch", async () => {
    mockFetch(200, { txHash: "tx3" });

    await fundInvoice(VALID_PARAMS);

    const fetchCall = (global as unknown as { fetch: jest.Mock }).fetch.mock.calls[0];
    expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("URL-encodes the invoice id in the path", async () => {
    mockFetch(200, { txHash: "tx4" });

    await fundInvoice({ id: "inv/special&id", amount: 100, currency: "USD" });

    const fetchCall = (global as unknown as { fetch: jest.Mock }).fetch.mock.calls[0];
    expect(fetchCall[0]).toContain("inv%2Fspecial%26id");
  });
});

// ── 3. HTTP error responses ───────────────────────────────────────────────────

describe("fundInvoice — HTTP errors", () => {
  it("throws FundInvoiceServerError on 400", async () => {
    mockFetch(400, { error: "bad request" }, false, "Bad Request");

    await expect(fundInvoice(VALID_PARAMS)).rejects.toBeInstanceOf(FundInvoiceServerError);
  });

  it("throws FundInvoiceServerError on 401", async () => {
    mockFetch(401, {}, false, "Unauthorized");

    const err = await fundInvoice(VALID_PARAMS).catch((e) => e);
    expect(err).toBeInstanceOf(FundInvoiceServerError);
    expect((err as FundInvoiceServerError).status).toBe(401);
  });

  it("throws FundInvoiceServerError on 500", async () => {
    mockFetch(500, {}, false, "Internal Server Error");

    const err = await fundInvoice(VALID_PARAMS).catch((e) => e);
    expect(err).toBeInstanceOf(FundInvoiceServerError);
    expect((err as FundInvoiceServerError).status).toBe(500);
    expect(err.code).toBe("FUND_SERVER_ERROR");
  });

  it("throws FundInvoiceServerError on 503", async () => {
    mockFetch(503, {}, false, "Service Unavailable");

    await expect(fundInvoice(VALID_PARAMS)).rejects.toBeInstanceOf(FundInvoiceServerError);
  });
});

// ── 4. Network failure ────────────────────────────────────────────────────────

describe("fundInvoice — network errors", () => {
  it("throws FundInvoiceNetworkError when fetch rejects with a TypeError", async () => {
    mockFetchNetworkError("net::ERR_CONNECTION_REFUSED");

    const err = await fundInvoice(VALID_PARAMS).catch((e) => e);
    expect(err).toBeInstanceOf(FundInvoiceNetworkError);
    expect(err.code).toBe("FUND_NETWORK_ERROR");
  });

  it("preserves the original error message in the FundInvoiceNetworkError", async () => {
    mockFetchNetworkError("Custom network error");

    const err = await fundInvoice(VALID_PARAMS).catch((e) => e);
    expect(err.message).toBe("Custom network error");
  });
});

// ── 5. JSON parse failure ─────────────────────────────────────────────────────

describe("fundInvoice — JSON parse error", () => {
  it("throws FundInvoiceError with FUND_PARSE_ERROR code when response JSON is invalid", async () => {
    mockFetchBadJson();

    const err = await fundInvoice(VALID_PARAMS).catch((e) => e);
    expect(err).toBeInstanceOf(FundInvoiceError);
    expect(err.code).toBe("FUND_PARSE_ERROR");
  });
});

// ── 6. Timeout ───────────────────────────────────────────────────────────────

describe("fundInvoice — timeout", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("throws FundInvoiceTimeoutError when the request exceeds timeoutMs", async () => {
    // fetch never resolves
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn(() => new Promise(() => {}));

    const fundPromise = fundInvoice({ ...VALID_PARAMS, timeoutMs: 100 });

    // Advance time past the timeout
    jest.advanceTimersByTime(200);

    const err = await fundPromise.catch((e) => e);
    expect(err).toBeInstanceOf(FundInvoiceTimeoutError);
    expect(err.code).toBe("FUND_TIMEOUT");
    expect(err.message).toContain("100ms");
  });
});

// ── 7. AbortSignal cancellation ───────────────────────────────────────────────

describe("fundInvoice — AbortSignal cancellation", () => {
  it("throws AbortError immediately when the provided signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(fundInvoice({ ...VALID_PARAMS, signal: controller.signal })).rejects.toMatchObject(
      { name: "AbortError" }
    );
  });

  it("propagates AbortError when caller aborts during in-flight request", async () => {
    const controller = new AbortController();
    mockFetchAbort();

    const promise = fundInvoice({ ...VALID_PARAMS, signal: controller.signal });
    controller.abort();

    const err = await promise.catch((e) => e);
    expect(err.name).toBe("AbortError");
  });
});

// ── 8. Error class hierarchy and codes ───────────────────────────────────────

describe("FundInvoice error classes", () => {
  it("FundInvoiceError is an instance of Error", () => {
    const err = new FundInvoiceError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("FundInvoiceError");
    expect(err.code).toBe("FUND_ERROR");
  });

  it("FundInvoiceTimeoutError extends FundInvoiceError", () => {
    const err = new FundInvoiceTimeoutError(5000);
    expect(err).toBeInstanceOf(FundInvoiceError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("FundInvoiceTimeoutError");
    expect(err.code).toBe("FUND_TIMEOUT");
    expect(err.message).toBe("Funding request timed out after 5000ms");
  });

  it("FundInvoiceNetworkError extends FundInvoiceError", () => {
    const err = new FundInvoiceNetworkError("net down");
    expect(err).toBeInstanceOf(FundInvoiceError);
    expect(err.name).toBe("FundInvoiceNetworkError");
    expect(err.code).toBe("FUND_NETWORK_ERROR");
  });

  it("FundInvoiceServerError extends FundInvoiceError and carries status", () => {
    const err = new FundInvoiceServerError(502, "Bad Gateway");
    expect(err).toBeInstanceOf(FundInvoiceError);
    expect(err.name).toBe("FundInvoiceServerError");
    expect(err.code).toBe("FUND_SERVER_ERROR");
    expect((err as FundInvoiceServerError).status).toBe(502);
    expect(err.message).toContain("502");
    expect(err.message).toContain("Bad Gateway");
  });

  it("FundInvoiceError accepts a custom code", () => {
    const err = new FundInvoiceError("custom", { code: "MY_CODE" });
    expect(err.code).toBe("MY_CODE");
  });
});
