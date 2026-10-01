import { getHealth } from "./health";

describe("getHealth", () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns connected when response is ok", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
      }),
    } as Response);

    const result = await getHealth("http://localhost");

    expect(result).toEqual({
      status: "connected",
      message: "Backend is healthy",
      details: {
        status: "ok",
      },
    });
  });

  it("returns degraded when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: "Internal Server Error",
      }),
    } as Response);

    const result = await getHealth("http://localhost");

    expect(result.status).toBe("degraded");
  });

  it("handles malformed json safely", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      text: jest.fn().mockResolvedValue("<html>Error</html>"),
    } as unknown as Response);

    const result = await getHealth("http://localhost");

    expect(result.status).toBe("degraded");
    expect(result.details).toBe("<html>Error</html>");
  });

  it("returns unreachable when offline", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"));

    const result = await getHealth("http://localhost");

    expect(result.status).toBe("unreachable");
  });

  it("returns unreachable when request is aborted", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";

    mockFetch.mockRejectedValue(abortError);

    const result = await getHealth("http://localhost");

    expect(result.status).toBe("unreachable");
  });

  it("propagates an external abort signal to fetch", async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as Response);

    await getHealth("http://localhost", { signal: controller.signal });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit | undefined)?.signal).toBe(controller.signal);
  });

  it("returns unreachable when the caller already aborted the signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await getHealth("http://localhost", {
      signal: controller.signal,
    });

    expect(result.status).toBe("unreachable");
  });

  it("returns unreachable when the caller aborts during the request", async () => {
    const controller = new AbortController();
    mockFetch.mockImplementation((_input, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as RequestInit | undefined)?.signal;
        signal?.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const pending = getHealth("http://localhost", {
      signal: controller.signal,
    });
    controller.abort();

    const result = await pending;

    expect(result.status).toBe("unreachable");
  });

  it("returns unreachable when the timeout fires and clears the timer", async () => {
    jest.useFakeTimers();
    try {
      mockFetch.mockImplementation((_input, init) => {
        return new Promise((_resolve, reject) => {
          const signal = (init as RequestInit | undefined)?.signal;
          signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });

      const pending = getHealth("http://localhost");
      jest.advanceTimersByTime(30_000);

      const result = await pending;
      expect(result.status).toBe("unreachable");
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it("is idempotent across repeated and concurrent calls", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as Response);

    const [repeated, concurrent] = await Promise.all([
      getHealth("http://localhost"),
      getHealth("http://localhost"),
      getHealth("http://localhost"),
    ]);

    expect(repeated).toEqual(concurrent);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("does not leak internal error details on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED at 10.0.0.1:5432"));

    const result = await getHealth("http://localhost");

    expect(result.status).toBe("unreachable");
    expect(JSON.stringify(result)).not.toContain("10.0.0.1");
  });
});
