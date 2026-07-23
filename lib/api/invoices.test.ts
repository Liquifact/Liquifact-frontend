// lib/api/invoices.test.ts
/**
 * Tests for fetchInvestableInvoices API client and text clamping/sanitization.
 */

import { fetchInvestableInvoices, clampAndSanitizeText, InvoiceTimeoutError } from "./invoices";

describe("clampAndSanitizeText", () => {
  it("returns non-string values as-is or null", () => {
    expect(clampAndSanitizeText(null)).toBeNull();
    expect(clampAndSanitizeText(undefined)).toBeNull();
    expect(clampAndSanitizeText(123 as any)).toBe(123);
  });

  it("clamps oversized strings to specified maxLength", () => {
    const multiMegabyteString = "A".repeat(2 * 1024 * 1024);
    const result = clampAndSanitizeText(multiMegabyteString, 256);
    expect(result?.length).toBe(256);
    expect(result).toBe("A".repeat(256));
  });

  it("strips ASCII control characters and C1 controls", () => {
    const inputWithControls = "Hello\x00\x07World\x1F\x7F!";
    expect(clampAndSanitizeText(inputWithControls)).toBe("HelloWorld!");
  });

  it("strips bidi overrides and direction control codepoints", () => {
    // \u202E is RIGHT-TO-LEFT OVERRIDE, \u202D is LEFT-TO-RIGHT OVERRIDE, \u200E is LRM
    const bidiSpoof = "Issuer\u202E\u202D\u200E Corp";
    expect(clampAndSanitizeText(bidiSpoof)).toBe("Issuer Corp");
  });
});

describe("fetchInvestableInvoices", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("fetches invoices and returns normalized, sanitized data", async () => {
    const mockData = [
      {
        id: "1",
        issuer: "Test Corp",
        description: "Valid invoice description",
        reference: "REF-101",
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

  it("clamps and sanitizes oversized, control-char, and RTL-override invoice fields", async () => {
    const oversizedIssuer = "B".repeat(500);
    const bidiSpoofedDescription = "Desc\u202E\u2066\u202Aription";
    const controlCharReference = "REF\x00\x1F123";

    const hostilePayload = [
      {
        id: "inv-hostile",
        issuer: oversizedIssuer,
        description: bidiSpoofedDescription,
        reference: controlCharReference,
        amount: "5000",
      },
    ];

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => hostilePayload,
    });
    (global as any).fetch = fetchMock;

    const [sanitized] = await fetchInvestableInvoices();

    expect(sanitized.issuer).toBe("B".repeat(256));
    expect(sanitized.issuer.length).toBe(256);
    expect(sanitized.description).toBe("Description");
    expect(sanitized.reference).toBe("REF123");
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
        description: null,
        reference: null,
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
