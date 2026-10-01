/**
 * @jest-environment jsdom
 *
 * @file lib/hooks/useOptimisticFund.test.js
 *
 * Regression tests for the optimistic funding hook's concurrency guard.
 *
 * The important case is the **same-tick double submit**: the in-flight flag
 * must be latched synchronously, not via a `useEffect` (which only runs after
 * the commit), otherwise two calls in one tick both observe `idle` and both
 * fire a request.
 */

import { renderHook, act } from "@testing-library/react";
import { useOptimisticFund, FUNDING_STATES } from "./useOptimisticFund";

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const BASE_OPTS = { id: "inv-001", status: "Open", currency: "USD" };

describe("useOptimisticFund concurrency guard", () => {
  it("ignores two submits dispatched in the same tick", async () => {
    const { promise, resolve } = deferred();
    const fundFn = jest.fn().mockReturnValue(promise);

    const { result } = renderHook(() => useOptimisticFund({ ...BASE_OPTS, fundFn }));

    act(() => {
      result.current.submitFund(100);
      result.current.submitFund(100);
    });

    expect(fundFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve({ success: true });
      await promise;
    });

    expect(result.current.fundingState).toBe(FUNDING_STATES.CONFIRMED);
  });

  it("allows a new submit once the first has settled", async () => {
    const fundFn = jest.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(() => useOptimisticFund({ ...BASE_OPTS, fundFn }));

    await act(async () => {
      await result.current.submitFund(100);
    });
    await act(async () => {
      await result.current.submitFund(200);
    });

    expect(fundFn).toHaveBeenCalledTimes(2);
  });
});

describe("useOptimisticFund optimistic status", () => {
  it("applies the optimistic status while pending and clears it on success", async () => {
    const { promise, resolve } = deferred();
    const fundFn = jest.fn().mockReturnValue(promise);

    const { result } = renderHook(() => useOptimisticFund({ ...BASE_OPTS, fundFn }));

    act(() => {
      result.current.submitFund(100);
    });
    expect(result.current.optimisticStatus).toBe("Funded");

    await act(async () => {
      resolve({ success: true });
      await promise;
    });

    expect(result.current.optimisticStatus).toBe("Open");
    expect(result.current.fundingState).toBe(FUNDING_STATES.CONFIRMED);
  });

  it("rolls back to the previous status when the request fails", async () => {
    const fundFn = jest.fn().mockRejectedValue(new Error("network"));
    const onError = jest.fn();

    const { result } = renderHook(() => useOptimisticFund({ ...BASE_OPTS, fundFn, onError }));

    await act(async () => {
      await result.current.submitFund(100);
    });

    expect(result.current.optimisticStatus).toBe("Open");
    expect(result.current.fundingState).toBe(FUNDING_STATES.ROLLED_BACK);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
