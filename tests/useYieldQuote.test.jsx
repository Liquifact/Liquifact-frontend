import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QUOTE_DEBOUNCE_MS, useYieldQuote } from "@/components/invest/useYieldQuote";

const QUOTE = { effectiveYieldBps: 950, matchedLockSecs: 2592000 };

// Advance fake timers inside act so hook state flushes deterministically.
async function advance(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useYieldQuote", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("debounces: bursts of input changes produce one call with the latest value", async () => {
    const fetchQuote = vi.fn(async () => QUOTE);
    const { rerender, result } = renderHook(
      ({ amountStroops }) => useYieldQuote({ enabled: true, amountStroops, lockSecs: 2592000, fetchQuote }),
      { initialProps: { amountStroops: "100000000" } }
    );

    rerender({ amountStroops: "200000000" });
    rerender({ amountStroops: "300000000" });
    expect(fetchQuote).not.toHaveBeenCalled();

    await advance(QUOTE_DEBOUNCE_MS - 1);
    expect(fetchQuote).not.toHaveBeenCalled();

    await advance(1);
    expect(fetchQuote).toHaveBeenCalledTimes(1);
    expect(fetchQuote).toHaveBeenCalledWith(expect.objectContaining({ amountStroops: "300000000", lockSecs: 2592000 }));
    expect(result.current.status).toBe("quote");
    expect(result.current.quote).toEqual(QUOTE);
  });

  test("aborts the stale request when inputs change mid-flight", async () => {
    let firstSignal;
    const fetchQuote = vi.fn(({ amountStroops, signal }) => {
      if (amountStroops === "100000000") {
        firstSignal = signal;
        return new Promise(() => {}); // hangs forever — must be aborted
      }
      return Promise.resolve(QUOTE);
    });
    const { rerender } = renderHook(
      ({ amountStroops }) => useYieldQuote({ enabled: true, amountStroops, lockSecs: 0, fetchQuote }),
      { initialProps: { amountStroops: "100000000" } }
    );

    await advance(QUOTE_DEBOUNCE_MS);
    expect(fetchQuote).toHaveBeenCalledTimes(1);
    expect(firstSignal.aborted).toBe(false);

    // amount changes → effect cleanup aborts the in-flight request
    rerender({ amountStroops: "50000000" });
    expect(firstSignal.aborted).toBe(true);

    await advance(QUOTE_DEBOUNCE_MS);
    expect(fetchQuote).toHaveBeenCalledTimes(2);
  });

  test("stale response after abort does not overwrite newer state", async () => {
    let resolveFirst;
    const fetchQuote = vi.fn(({ amountStroops }) => {
      if (amountStroops === "100000000") {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(QUOTE);
    });
    const { rerender, result } = renderHook(
      ({ amountStroops }) => useYieldQuote({ enabled: true, amountStroops, lockSecs: 0, fetchQuote }),
      { initialProps: { amountStroops: "100000000" } }
    );
    await advance(QUOTE_DEBOUNCE_MS);

    rerender({ amountStroops: "50000000" }); // aborts first request
    await advance(QUOTE_DEBOUNCE_MS);
    expect(result.current.status).toBe("quote");
    expect(result.current.quote).toEqual(QUOTE);

    // late resolution of the aborted first request must be dropped
    await act(async () => {
      resolveFirst({ effectiveYieldBps: 1, matchedLockSecs: 1 });
      await Promise.resolve();
    });
    expect(result.current.quote.effectiveYieldBps).toBe(950);
  });

  test("error state captures the failure message", async () => {
    const fetchQuote = vi.fn(async () => {
      throw new Error("simulation failed");
    });
    const { result } = renderHook(() =>
      useYieldQuote({ enabled: true, amountStroops: "100000000", lockSecs: 0, fetchQuote })
    );
    expect(result.current.status).toBe("loading");

    await advance(QUOTE_DEBOUNCE_MS);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("simulation failed");
    expect(result.current.quote).toBeNull();
  });

  test("idle until enabled with a positive amount", async () => {
    const fetchQuote = vi.fn(async () => QUOTE);
    const { result, rerender } = renderHook(
      ({ enabled, amountStroops }) => useYieldQuote({ enabled, amountStroops, lockSecs: 0, fetchQuote }),
      { initialProps: { enabled: false, amountStroops: "100000000" } }
    );
    await advance(QUOTE_DEBOUNCE_MS * 2);
    expect(result.current.status).toBe("idle");
    expect(fetchQuote).not.toHaveBeenCalled();

    rerender({ enabled: true, amountStroops: "0" });
    await advance(QUOTE_DEBOUNCE_MS * 2);
    expect(result.current.status).toBe("idle");
    expect(fetchQuote).not.toHaveBeenCalled();
  });
});
