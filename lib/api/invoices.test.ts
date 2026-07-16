// lib/api/invoices.test.ts
/**
 * Tests for fetchInvestableInvoices API client.
 */

import { fetchInvestableInvoices, InvoiceTimeoutError } from "./invoices";

describe("fetchInvestableInvoices", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("fetches invoices and returns normalized data", async () => {
    const mockData = [
      {
        id: "1",
        issuer: "Test Corp",
        amount: "1000",
        currency: "USD",
        dueDate: "2026-12-31",
        yield: "5%",
        status: "Open",
      },
    ];
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    (global as any).fetch = fetchMock;

    const result = await fetchInvestableInvoices();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/invoices",
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual(mockData);
  });

  it("uses NEXT_PUBLIC_API_URL when set", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.example.com";
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    (global as any).fetch = fetchMock;

    await fetchInvestableInvoices();
    expect(fetchMock).toHaveBeenCalledWith("http://api.example.com/invoices", expect.any(Object));
  });

  it("throws on non-200 response", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500, statusText: "Server Error" });
    (global as any).fetch = fetchMock;

    await expect(fetchInvestableInvoices()).rejects.toThrow(
      "Failed to fetch invoices: 500 Server Error"
    );
  });

  it("throws on invalid JSON", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("invalid json");
      },
    });
    (global as any).fetch = fetchMock;

    await expect(fetchInvestableInvoices()).rejects.toThrow("Response is not valid JSON");
  });

  it("throws when payload is not an array", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ foo: "bar" }) });
    (global as any).fetch = fetchMock;

    await expect(fetchInvestableInvoices()).rejects.toThrow("Invoice payload is not an array");
  });

  it("passes an AbortSignal to fetch", async () => {
    const controller = new AbortController();
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    (global as any).fetch = fetchMock;

    await fetchInvestableInvoices({ signal: controller.signal });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("throws InvoiceTimeoutError when the timeout fires", async () => {
    jest.useFakeTimers();

    const fetchMock = jest.fn().mockImplementation((_url, { signal }: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          const err = new DOMException("Aborted", "AbortError");
          reject(err);
        });
      });
    });
    (global as any).fetch = fetchMock;

    const promise = fetchInvestableInvoices({ timeoutMs: 5000 });

    jest.advanceTimersByTime(5000);

    await expect(promise).rejects.toBeInstanceOf(InvoiceTimeoutError);
    await expect(promise).rejects.toThrow("Request timed out after 5000ms");

    jest.useRealTimers();
  });

  it("throws the caller AbortError (not InvoiceTimeoutError) when caller signal fires", async () => {
    const controller = new AbortController();
    const fetchMock = jest.fn().mockImplementation((_url, { signal }: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    (global as any).fetch = fetchMock;

    const promise = fetchInvestableInvoices({ signal: controller.signal, timeoutMs: 30_000 });
    controller.abort();

    const err = await promise.catch((e: Error) => e);
    expect(err.name).toBe("AbortError");
    expect(err).not.toBeInstanceOf(InvoiceTimeoutError);
  });

  it("rejects immediately when a pre-aborted caller signal is supplied", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;

    await expect(fetchInvestableInvoices({ signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes invoices with missing fields to null", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{}],
    });
    (global as any).fetch = fetchMock;

    const result = await fetchInvestableInvoices();
    expect(result).toEqual([
      {
        id: null,
        issuer: null,
        amount: null,
        currency: null,
        dueDate: null,
        yield: null,
        status: null,
      },
    ]);
  });

  it("passes the composed AbortSignal (not the original caller signal) to fetch", async () => {
    const controller = new AbortController();
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    (global as any).fetch = fetchMock;

    await fetchInvestableInvoices({ signal: controller.signal });

    const usedSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    // The function wraps the caller signal in its own controller, so the signal
    // passed to fetch is a different AbortSignal instance.
    expect(usedSignal).toBeInstanceOf(AbortSignal);
    expect(usedSignal).not.toBe(controller.signal);
  });

  it("clears the timeout after a successful response", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    (global as any).fetch = fetchMock;

    await fetchInvestableInvoices({ timeoutMs: 10_000 });

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("clears the timeout even when fetch rejects", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const fetchMock = jest.fn().mockRejectedValue(new Error("Network failure"));
    (global as any).fetch = fetchMock;

    await expect(fetchInvestableInvoices()).rejects.toThrow("Network failure");
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
