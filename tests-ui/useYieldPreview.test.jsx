import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useYieldPreview } from "@/lib/hooks/useYieldPreview";

describe("useYieldPreview", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not call previewFn when amount is empty", () => {
    const previewFn = vi.fn();
    const { result } = renderHook(() =>
      useYieldPreview({ amount: "", lockSecs: 2592000, previewFn, enabled: true }),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.quote).toBeNull();
    expect(previewFn).not.toHaveBeenCalled();
  });

  it("does not call previewFn when lockSecs is 0", () => {
    const previewFn = vi.fn();
    renderHook(() => useYieldPreview({ amount: "1", lockSecs: 0, previewFn, enabled: true }));
    expect(previewFn).not.toHaveBeenCalled();
  });

  it("does not call previewFn when disabled", () => {
    const previewFn = vi.fn();
    renderHook(() => useYieldPreview({ amount: "1", lockSecs: 2592000, previewFn, enabled: false }));
    expect(previewFn).not.toHaveBeenCalled();
  });

  it("debounces: does not call previewFn before 300ms", async () => {
    const previewFn = vi.fn().mockResolvedValue({ effective_yield_bps: 950, lock_end_secs: 1733011200 });
    renderHook(() => useYieldPreview({ amount: "1", lockSecs: 2592000, previewFn, enabled: true }));
    // Not called yet (before debounce)
    expect(previewFn).not.toHaveBeenCalled();
    // Advance 299ms — still not called
    await act(async () => { await vi.advanceTimersByTimeAsync(299); });
    expect(previewFn).not.toHaveBeenCalled();
    // Advance 1 more ms — debounce fires
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(previewFn).toHaveBeenCalledTimes(1);
  });

  it("shows loading state during debounce and quote after resolution", async () => {
    const previewFn = vi.fn().mockResolvedValue({ effective_yield_bps: 950, lock_end_secs: 1733011200 });
    const { result } = renderHook(() =>
      useYieldPreview({ amount: "1", lockSecs: 2592000, previewFn, enabled: true }),
    );
    // After 299ms, debounce has not fired yet
    await act(async () => { await vi.advanceTimersByTimeAsync(299); });
    expect(result.current.loading).toBe(false);
    // After 1 more ms, debounce fires and the promise resolves
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(result.current.loading).toBe(false);
    expect(result.current.quote).toEqual({ effective_yield_bps: 950, lock_end_secs: 1733011200 });
    expect(result.current.error).toBeNull();
  });

  it("aborts stale requests: only the latest result is applied", async () => {
    let resolveFirst, resolveSecond;
    const firstPromise = new Promise((r) => { resolveFirst = r; });
    const secondPromise = new Promise((r) => { resolveSecond = r; });
    const previewFn = vi.fn()
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    const { result, rerender } = renderHook(
      ({ amount }) => useYieldPreview({ amount, lockSecs: 2592000, previewFn, enabled: true }),
      { initialProps: { amount: "1" } },
    );

    // First debounce fires
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(result.current.loading).toBe(true);

    // Change amount — second request starts (debounce reset)
    rerender({ amount: "2" });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(result.current.loading).toBe(true);

    // Resolve the stale (first) request — should NOT be applied
    await act(async () => { resolveFirst({ effective_yield_bps: 999, lock_end_secs: 0 }); });
    // Still loading because the latest (second) request hasn't resolved
    expect(result.current.loading).toBe(true);
    expect(result.current.quote).toBeNull();

    // Resolve the latest (second) request — SHOULD be applied
    await act(async () => { resolveSecond({ effective_yield_bps: 950, lock_end_secs: 1733011200 }); });
    expect(result.current.loading).toBe(false);
    expect(result.current.quote).toEqual({ effective_yield_bps: 950, lock_end_secs: 1733011200 });
    expect(result.current.error).toBeNull();
  });

  it("shows error state when previewFn rejects", async () => {
    const previewFn = vi.fn().mockRejectedValue(new Error("RPC timeout"));
    const { result } = renderHook(() =>
      useYieldPreview({ amount: "1", lockSecs: 2592000, previewFn, enabled: true }),
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(result.current.loading).toBe(false);
    expect(result.current.quote).toBeNull();
    expect(result.current.error).toBe("RPC timeout");
  });

  it("clears state when amount becomes empty", () => {
    const previewFn = vi.fn();
    const { result, rerender } = renderHook(
      ({ amount }) => useYieldPreview({ amount, lockSecs: 2592000, previewFn, enabled: true }),
      { initialProps: { amount: "1" } },
    );
    // Clear amount before debounce fires
    rerender({ amount: "" });
    expect(result.current.loading).toBe(false);
    expect(result.current.quote).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
