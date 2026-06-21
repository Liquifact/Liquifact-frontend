import { checkBackendHealth } from "./health";

describe("checkBackendHealth", () => {
  it("returns connected status with the backend payload", async () => {
    const payload = { status: "ok", message: "API ready" };
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    });

    await expect(
      checkBackendHealth("https://api.example.test", { fetcher }),
    ).resolves.toMatchObject({
      state: "connected",
      message: "API ready",
      details: payload,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/health",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns degraded status when the backend responds with an error", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockRejectedValue(new Error("not json")),
    });

    await expect(
      checkBackendHealth("https://api.example.test", { fetcher }),
    ).resolves.toMatchObject({
      state: "degraded",
      message: "Backend returned HTTP 503.",
      details: { status: 503 },
    });
  });

  it("returns unreachable status when the request times out", async () => {
    jest.useFakeTimers();

    const fetcher = jest.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    const result = checkBackendHealth("https://api.example.test", {
      fetcher,
      retries: 0,
      timeoutMs: 100,
    });

    jest.advanceTimersByTime(100);

    await expect(result).resolves.toMatchObject({
      state: "unreachable",
      message: "Backend health check timed out after 0.1s.",
    });

    jest.useRealTimers();
  });

  it("returns unreachable status for network errors", async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error("network down"));

    await expect(
      checkBackendHealth("https://api.example.test", { fetcher }),
    ).resolves.toMatchObject({
      state: "unreachable",
      message: "network down",
    });
  });

  it("retries transient failures before returning connected status", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: jest.fn().mockResolvedValue({ error: "warming up" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ message: "ready" }),
      });

    await expect(
      checkBackendHealth("https://api.example.test", { fetcher }),
    ).resolves.toMatchObject({
      state: "connected",
      message: "ready",
      attempts: 2,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
