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
});
