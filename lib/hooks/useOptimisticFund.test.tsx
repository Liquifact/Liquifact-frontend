/**
 * @jest-environment jsdom
 *
 * @file lib/hooks/useOptimisticFund.test.tsx
 *
 * Comprehensive tests for the useOptimisticFund hook.
 *
 * Test surface
 * ────────────
 * 1. Initial state
 * 2. Optimistic update on submit (status flips to "Funded" immediately)
 * 3. Confirmed state on server success
 * 4. Rollback on server failure
 * 5. Concurrent submit guard (double-submit prevention)
 * 6. Abort on unmount (no setState after unmount)
 * 7. Upstream status sync (idle/rolled_back states follow prop changes)
 * 8. onSuccess / onError callbacks
 * 9. FUNDING_STATES constant export
 */

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useOptimisticFund, FUNDING_STATES } from "./useOptimisticFund";
import { FundInvoiceError, FundInvoiceNetworkError } from "@/lib/api/fundInvoice";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUCCESS_RESULT = {
  success: true,
  txHash: "mock-tx-inv-001-123",
  amount: 1000,
  currency: "USD",
};

/** Create a fundFn that resolves after `delay` ms. */
function makeFundFn(result: unknown = SUCCESS_RESULT, delay = 0): jest.Mock {
  return jest.fn(
    () =>
      new Promise((resolve, reject) =>
        setTimeout(() => {
          if (result instanceof Error) reject(result);
          else resolve(result);
        }, delay)
      )
  );
}

/** Create a fundFn that rejects after `delay` ms. */
function makeFailFn(error: Error = new FundInvoiceNetworkError("Network error"), delay = 0) {
  return makeFundFn(error, delay);
}

// Default options shared across tests
const DEFAULT_OPTS = {
  id: "inv-001",
  status: "Open",
  currency: "USD",
};

// ── 1. Initial state ──────────────────────────────────────────────────────────

describe("useOptimisticFund — initial state", () => {
  it("optimisticStatus equals the initial status prop", () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFundFn() })
    );
    expect(result.current.optimisticStatus).toBe("Open");
  });

  it("fundingState starts as idle", () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFundFn() })
    );
    expect(result.current.fundingState).toBe(FUNDING_STATES.IDLE);
  });

  it("isFunding starts as false", () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFundFn() })
    );
    expect(result.current.isFunding).toBe(false);
  });

  it("submitFund is a function", () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFundFn() })
    );
    expect(typeof result.current.submitFund).toBe("function");
  });
});

// ── 2. Optimistic update on submit ───────────────────────────────────────────

describe("useOptimisticFund — optimistic update", () => {
  it("flips optimisticStatus to 'Funded' immediately when submit is called", async () => {
    const fundFn = makeFundFn(SUCCESS_RESULT, 100); // slow so we can observe pending state
    const { result } = renderHook(() => useOptimisticFund({ ...DEFAULT_OPTS, fundFn }));

    act(() => {
      result.current.submitFund(1000);
    });

    // Before the promise resolves the status should already be optimistic.
    expect(result.current.optimisticStatus).toBe("Funded");
  });

  it("sets fundingState to pending immediately", async () => {
    const fundFn = makeFundFn(SUCCESS_RESULT, 100);
    const { result } = renderHook(() => useOptimisticFund({ ...DEFAULT_OPTS, fundFn }));

    act(() => {
      result.current.submitFund(1000);
    });

    expect(result.current.fundingState).toBe(FUNDING_STATES.PENDING);
    expect(result.current.isFunding).toBe(true);
  });

  it("passes correct params to fundFn", async () => {
    const fundFn = makeFundFn();
    const { result } = renderHook(() => useOptimisticFund({ ...DEFAULT_OPTS, fundFn }));

    await act(async () => {
      await result.current.submitFund(500);
    });

    expect(fundFn).toHaveBeenCalledWith(
      expect.objectContaining({ id: "inv-001", amount: 500, currency: "USD" })
    );
  });

  it("includes an AbortSignal in the fundFn call", async () => {
    const fundFn = makeFundFn();
    const { result } = renderHook(() => useOptimisticFund({ ...DEFAULT_OPTS, fundFn }));

    await act(async () => {
      await result.current.submitFund(200);
    });

    const callArg = fundFn.mock.calls[0][0];
    expect(callArg.signal).toBeInstanceOf(AbortSignal);
  });
});

// ── 3. Confirmed state on success ────────────────────────────────────────────

describe("useOptimisticFund — success path", () => {
  it("transitions to confirmed state after server resolves", async () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFundFn() })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(result.current.fundingState).toBe(FUNDING_STATES.CONFIRMED);
    expect(result.current.isFunding).toBe(false);
  });

  it("keeps optimisticStatus as 'Funded' after confirmation", async () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFundFn() })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(result.current.optimisticStatus).toBe("Funded");
  });

  it("calls onSuccess with the server result", async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFundFn(), onSuccess })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(SUCCESS_RESULT);
  });

  it("does not call onError on success", async () => {
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFundFn(), onError })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(onError).not.toHaveBeenCalled();
  });
});

// ── 4. Rollback on failure ───────────────────────────────────────────────────

describe("useOptimisticFund — rollback on failure", () => {
  it("rolls back optimisticStatus to the original status on failure", async () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFailFn() })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(result.current.optimisticStatus).toBe("Open"); // rolled back
  });

  it("transitions to rolled_back state on failure", async () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFailFn() })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(result.current.fundingState).toBe(FUNDING_STATES.ROLLED_BACK);
    expect(result.current.isFunding).toBe(false);
  });

  it("calls onError with a FundInvoiceError on failure", async () => {
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFailFn(), onError })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(onError).toHaveBeenCalledTimes(1);
    const arg = onError.mock.calls[0][0];
    expect(arg).toBeInstanceOf(FundInvoiceError);
  });

  it("does not call onSuccess on failure", async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFailFn(), onSuccess })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("wraps plain Error objects in FundInvoiceError for onError", async () => {
    const plainError = new Error("Plain network error");
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFailFn(plainError), onError })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    const arg = onError.mock.calls[0][0];
    expect(arg).toBeInstanceOf(FundInvoiceError);
  });

  it("rolls back a non-Open status correctly (Funded → Closed rollback edge case)", async () => {
    // Start with status "Closed" — submit should still roll back correctly
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, status: "Closed", fundFn: makeFailFn() })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(result.current.optimisticStatus).toBe("Closed");
  });
});

// ── 5. Concurrent submit guard ───────────────────────────────────────────────

describe("useOptimisticFund — concurrent submit guard", () => {
  it("prevents a second call while the first is still pending", async () => {
    const fundFn = makeFundFn(SUCCESS_RESULT, 100);
    const { result } = renderHook(() => useOptimisticFund({ ...DEFAULT_OPTS, fundFn }));

    // Start first call but don't await it
    act(() => {
      result.current.submitFund(1000);
    });

    // Try a second call while the first is in-flight
    await act(async () => {
      await result.current.submitFund(500);
    });

    // fundFn should only have been called once
    expect(fundFn).toHaveBeenCalledTimes(1);
  });

  it("allows a new call after the previous one completes", async () => {
    const fundFn = makeFundFn();
    const { result } = renderHook(() => useOptimisticFund({ ...DEFAULT_OPTS, fundFn }));

    // First call
    await act(async () => {
      await result.current.submitFund(1000);
    });

    // Re-render with status "Open" so the hook resets to idle for the next test
    // In real usage the parent would pass the new server-confirmed status.
    // For testing we just verify fundFn was called, then submit again.

    // Second call after completion
    await act(async () => {
      await result.current.submitFund(500);
    });

    // fundFn was called for both submits
    expect(fundFn).toHaveBeenCalledTimes(2);
  });
});

// ── 6. Abort on unmount ──────────────────────────────────────────────────────

describe("useOptimisticFund — abort on unmount", () => {
  it("aborts the in-flight request when the component unmounts", async () => {
    let capturedSignal: AbortSignal | undefined;
    const fundFn = jest.fn(({ signal }: { signal: AbortSignal }) => {
      capturedSignal = signal;
      return new Promise(() => {}); // Never resolves
    });

    const { result, unmount } = renderHook(() => useOptimisticFund({ ...DEFAULT_OPTS, fundFn }));

    act(() => {
      result.current.submitFund(1000);
    });

    expect(capturedSignal?.aborted).toBe(false);

    // Unmount the hook — should abort the controller
    act(() => {
      unmount();
    });

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("does not setState after unmount (no React warning)", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // fundFn resolves after unmount
    let resolvePromise!: (v: unknown) => void;
    const fundFn = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    const { result, unmount } = renderHook(() => useOptimisticFund({ ...DEFAULT_OPTS, fundFn }));

    act(() => {
      result.current.submitFund(1000);
    });

    act(() => {
      unmount();
    });

    // Resolve after unmount — should not cause a React setState warning
    await act(async () => {
      resolvePromise(SUCCESS_RESULT);
      // Small delay to allow microtasks to flush
      await new Promise((r) => setTimeout(r, 10));
    });

    // No "Can't perform a React state update on an unmounted component" error
    const reactWarning = consoleSpy.mock.calls.some((args) =>
      String(args[0]).includes("unmounted")
    );
    expect(reactWarning).toBe(false);

    consoleSpy.mockRestore();
  });
});

// ── 7. Upstream status sync ──────────────────────────────────────────────────

describe("useOptimisticFund — upstream status sync", () => {
  it("updates optimisticStatus when the status prop changes while idle", () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: string }) =>
        useOptimisticFund({ ...DEFAULT_OPTS, status, fundFn: makeFundFn() }),
      { initialProps: { status: "Open" } }
    );

    expect(result.current.optimisticStatus).toBe("Open");

    rerender({ status: "Funded" });

    expect(result.current.optimisticStatus).toBe("Funded");
  });

  it("updates optimisticStatus when the status prop changes while rolled_back", async () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: string }) =>
        useOptimisticFund({ ...DEFAULT_OPTS, status, fundFn: makeFailFn() }),
      { initialProps: { status: "Open" } }
    );

    // Submit and fail → rolled_back
    await act(async () => {
      await result.current.submitFund(1000);
    });

    expect(result.current.fundingState).toBe(FUNDING_STATES.ROLLED_BACK);

    // Parent provides a new confirmed status
    rerender({ status: "Cancelled" });

    await waitFor(() => {
      expect(result.current.optimisticStatus).toBe("Cancelled");
    });
  });

  it("does NOT update optimisticStatus when status prop changes while pending", async () => {
    const fundFn = makeFundFn(SUCCESS_RESULT, 200); // slow
    const { result, rerender } = renderHook(
      ({ status }: { status: string }) => useOptimisticFund({ ...DEFAULT_OPTS, status, fundFn }),
      { initialProps: { status: "Open" } }
    );

    act(() => {
      result.current.submitFund(1000);
    });

    expect(result.current.fundingState).toBe(FUNDING_STATES.PENDING);
    expect(result.current.optimisticStatus).toBe("Funded");

    // Parent pushes a new status while request is in-flight
    rerender({ status: "Closed" });

    // Should still be the optimistic value during pending
    expect(result.current.optimisticStatus).toBe("Funded");

    // Clean up pending promise
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
  });
});

// ── 8. Callbacks ─────────────────────────────────────────────────────────────

describe("useOptimisticFund — callbacks", () => {
  it("onSuccess receives the full server result object", async () => {
    const onSuccess = jest.fn();
    const serverResult = {
      success: true,
      txHash: "abc123",
      amount: 750,
      currency: "EUR",
    };
    const { result } = renderHook(() =>
      useOptimisticFund({
        ...DEFAULT_OPTS,
        currency: "EUR",
        fundFn: makeFundFn(serverResult),
        onSuccess,
      })
    );

    await act(async () => {
      await result.current.submitFund(750);
    });

    expect(onSuccess).toHaveBeenCalledWith(serverResult);
  });

  it("onError receives a FundInvoiceError when fundFn throws a FundInvoiceError directly", async () => {
    const specificError = new FundInvoiceNetworkError("Connection refused");
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFailFn(specificError), onError })
    );

    await act(async () => {
      await result.current.submitFund(1000);
    });

    // Since it IS already a FundInvoiceError it should be passed through as-is
    expect(onError.mock.calls[0][0]).toBeInstanceOf(FundInvoiceError);
    expect(onError.mock.calls[0][0].message).toBe("Connection refused");
  });

  it("is fine when onSuccess is not provided (no crash)", async () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFundFn() })
    );

    await expect(
      act(async () => {
        await result.current.submitFund(1000);
      })
    ).resolves.toBeUndefined();
  });

  it("is fine when onError is not provided (no crash on failure)", async () => {
    const { result } = renderHook(() =>
      useOptimisticFund({ ...DEFAULT_OPTS, fundFn: makeFailFn() })
    );

    await expect(
      act(async () => {
        await result.current.submitFund(1000);
      })
    ).resolves.toBeUndefined();
  });
});

// ── 9. FUNDING_STATES export ─────────────────────────────────────────────────

describe("FUNDING_STATES constant", () => {
  it("exports all four state strings", () => {
    expect(FUNDING_STATES.IDLE).toBe("idle");
    expect(FUNDING_STATES.PENDING).toBe("pending");
    expect(FUNDING_STATES.CONFIRMED).toBe("confirmed");
    expect(FUNDING_STATES.ROLLED_BACK).toBe("rolled_back");
  });

  it("has exactly four keys", () => {
    expect(Object.keys(FUNDING_STATES)).toHaveLength(4);
  });
});
