/**
 * @jest-environment jsdom
 *
 * @file lib/hooks/useFundingSubmit.test.js
 *
 * Unit tests for `useFundingSubmit` covering all 5 required edge cases:
 *   1. Double click (rapid re-submission while in-flight)
 *   2. Wallet rejects (performFund throws a wallet-reject error)
 *   3. Network timeout (performFund throws FundInvoiceTimeoutError)
 *   4. Same invoice in two tabs (BroadcastChannel cross-tab lock)
 *   5. Retry after a server conflict (409 — key is preserved for retry)
 *
 * Also covers: idle→pending→success state transitions, reset after failure,
 * idempotency key generation and persistence, and AbortController cleanup.
 */

import { renderHook, act } from "@testing-library/react";
import { useFundingSubmit, FUNDING_SUBMIT_STATES } from "./useFundingSubmit";

// ── Helpers ───────────────────────────────────────────────────────────────────

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Flush all pending promises + microtasks */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  });
}

function clearSessionIdem() {
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith("liquifact-idem-")) localStorage.removeItem(k);
  });
  Object.keys(sessionStorage).forEach((k) => {
    if (k.startsWith("liquifact-idem-")) sessionStorage.removeItem(k);
  });
}

// ── BroadcastChannel mock ─────────────────────────────────────────────────────

/**
 * Lightweight BroadcastChannel mock that keeps a registry of open channels
 * so we can simulate inter-tab messaging in the same JS process.
 */
class MockBroadcastChannel {
  static _registry = new Map();

  constructor(name) {
    this.name = name;
    this.onmessage = null;
    MockBroadcastChannel._registry.set(this, name);
  }

  postMessage(data) {
    for (const [ch, chName] of MockBroadcastChannel._registry) {
      if (chName === this.name && ch !== this && typeof ch.onmessage === "function") {
        ch.onmessage({ data });
      }
    }
  }

  close() {
    MockBroadcastChannel._registry.delete(this);
    this.onmessage = null;
  }
}

beforeEach(() => {
  MockBroadcastChannel._registry.clear();
  global.BroadcastChannel = MockBroadcastChannel;
  clearSessionIdem();
});

afterEach(() => {
  MockBroadcastChannel._registry.clear();
  delete global.BroadcastChannel;
  delete navigator.locks;
  clearSessionIdem();
});

// ── Default hook options ──────────────────────────────────────────────────────

const BASE_OPTS = {
  invoiceId: "inv-001",
  walletAddress: "GABC...XYZ",
};

// ── 1. State machine: idle → pending → success ────────────────────────────────

describe("state machine: idle → pending → success", () => {
  it("starts in idle state", () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.IDLE);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isBlocked).toBe(false);
  });

  it("transitions to pending while performFund is in-flight", async () => {
    const { promise, resolve } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    act(() => {
      result.current.submit(500);
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.PENDING);
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolve({ ok: true });
      await promise;
    });
  });

  it("transitions to success after performFund resolves", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund, onSuccess }));

    await act(async () => {
      await result.current.submit(500);
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.SUCCESS);
    expect(onSuccess).toHaveBeenCalledWith({ ok: true });
  });

  it("calls performFund with (invoiceId, amount, idempotencyKey)", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(250);
    });

    expect(performFund).toHaveBeenCalledTimes(1);
    const [invoiceId, amount, idem] = performFund.mock.calls[0];
    expect(invoiceId).toBe("inv-001");
    expect(amount).toBe(250);
    expect(idem).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("rejects non-finite and non-positive amounts before calling performFund", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, performFund })
    );

    for (const amount of [0, -1, NaN, Infinity]) {
      await act(async () => {
        await expect(result.current.submit(amount)).rejects.toMatchObject({
          code: "FUND_INVALID_AMOUNT",
        });
      });
    }
    expect(performFund).not.toHaveBeenCalled();
  });

  it("accepts the exact maximum and rejects amounts above it", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, maxAmount: 500, performFund })
    );

    await act(async () => {
      await result.current.submit(500);
    });
    await act(async () => {
      await expect(result.current.submit(500.01)).rejects.toMatchObject({
        code: "FUND_INVALID_AMOUNT",
      });
    });
    expect(performFund).toHaveBeenCalledTimes(1);
  });

  it("aborts and ignores a pending result when the invoice changes", async () => {
    const { promise, resolve } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);
    const { result, rerender } = renderHook(
      ({ invoiceId }) => useFundingSubmit({ ...BASE_OPTS, invoiceId, performFund }),
      { initialProps: { invoiceId: "inv-old" } }
    );

    let submit;
    act(() => {
      submit = result.current.submit(500);
    });
    const requestSignal = performFund.mock.calls[0][3];

    rerender({ invoiceId: "inv-new" });
    expect(requestSignal.aborted).toBe(true);
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.IDLE);

    await act(async () => {
      resolve({ ok: true });
      await submit;
    });
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.IDLE);
  });

  it("serializes racing hook instances with the Web Locks API", async () => {
    let held = false;
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: jest.fn(async (_name, _options, callback) => {
          if (held) return callback(null);
          held = true;
          try {
            return await callback({ name: "fund-lock" });
          } finally {
            held = false;
          }
        }),
      },
    });

    const { promise, resolve } = deferred();
    const performFundOne = jest.fn().mockReturnValue(promise);
    const performFundTwo = jest.fn().mockResolvedValue({ ok: true });
    const first = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, performFund: performFundOne })
    );
    const second = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, performFund: performFundTwo })
    );

    let firstSubmit;
    let secondSubmit;
    act(() => {
      firstSubmit = first.result.current.submit(500);
      secondSubmit = second.result.current.submit(500);
    });

    await act(async () => {
      await expect(secondSubmit).rejects.toMatchObject({ code: "FUND_CONFLICT" });
    });
    expect(performFundOne).toHaveBeenCalledTimes(1);
    expect(performFundTwo).not.toHaveBeenCalled();

    await act(async () => {
      resolve({ ok: true });
      await firstSubmit;
    });
  });
});

// ── 2. State machine: idle → pending → failure ────────────────────────────────

describe("state machine: idle → pending → failure", () => {
  it("treats a lower-level duplicate sentinel as a conflict and preserves its key", async () => {
    const performFund = jest.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, performFund })
    );

    await act(async () => {
      await expect(result.current.submit(500)).rejects.toMatchObject({
        code: "FUND_CONFLICT",
        status: 409,
      });
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.FAILURE);
    expect(localStorage.getItem("liquifact-idem-GABC...XYZ-inv-001-500")).toBeTruthy();
  });

  it("transitions to failure when performFund rejects", async () => {
    const err = new Error("network error");
    const performFund = jest.fn().mockRejectedValue(err);
    const onError = jest.fn();

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund, onError }));

    await act(async () => {
      await result.current.submit(100).catch(() => {});
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.FAILURE);
    expect(onError).toHaveBeenCalledWith(err);
  });

  it("reset() returns from failure to idle", async () => {
    const performFund = jest.fn().mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(100).catch(() => {});
    });
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.FAILURE);

    act(() => {
      result.current.reset();
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.IDLE);
  });

  it("reset() is a no-op when not in failure state", () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    act(() => {
      result.current.reset();
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.IDLE);
  });
});

// ── Edge case 1: Double click ─────────────────────────────────────────────────

describe("edge case 1: double click (in-memory double-submit guard)", () => {
  it("ignores a second submit call while the first is still in-flight", async () => {
    const { promise, resolve } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    // First click
    act(() => {
      result.current.submit(500);
    });

    expect(result.current.isPending).toBe(true);

    // Second click (double-click) — ignored without reporting success.
    let duplicateSubmit;
    act(() => {
      duplicateSubmit = result.current.submit(500);
    });
    await expect(duplicateSubmit).resolves.toBe(false);

    await act(async () => {
      resolve({ ok: true });
      await promise;
    });

    // performFund was only called once despite two submit calls
    expect(performFund).toHaveBeenCalledTimes(1);
  });

  it("allows a new submit after the first completes", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500);
    });

    // After success the guard resets — a new submit should go through
    // (though normally the UI disables the button after success)
    await act(async () => {
      await result.current.submit(500);
    });

    expect(performFund).toHaveBeenCalledTimes(2);
  });
});

// ── Edge case 2: Wallet rejects ───────────────────────────────────────────────

describe("edge case 2: wallet rejects", () => {
  it("enters failure state when the wallet declines signing", async () => {
    class WalletRejectedError extends Error {
      constructor() {
        super("User rejected signing");
        this.name = "WalletRejectedError";
        this.code = "WALLET_REJECT";
      }
    }

    const performFund = jest.fn().mockRejectedValue(new WalletRejectedError());
    const onError = jest.fn();

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund, onError }));

    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.FAILURE);
    const calledErr = onError.mock.calls[0][0];
    expect(calledErr.code).toBe("WALLET_REJECT");
  });

  it("preserves the idempotency key on wallet rejection (for retry)", async () => {
    const walletErr = Object.assign(new Error("rejected"), { code: "WALLET_REJECT" });
    const performFund = jest.fn().mockRejectedValue(walletErr);

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });

    // Key should still exist in sessionStorage (cleared only on success)
    const stored = localStorage.getItem("liquifact-idem-GABC...XYZ-inv-001-500");
    expect(stored).toBeTruthy();
  });

  it("the guard is released after wallet rejection, enabling retry", async () => {
    const walletErr = Object.assign(new Error("rejected"), { code: "WALLET_REJECT" });
    const performFund = jest
      .fn()
      .mockRejectedValueOnce(walletErr)
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.FAILURE);

    act(() => result.current.reset());

    await act(async () => {
      await result.current.submit(500);
    });

    expect(performFund).toHaveBeenCalledTimes(2);
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.SUCCESS);
  });
});

// ── Edge case 3: Network timeout ──────────────────────────────────────────────

describe("edge case 3: network timeout", () => {
  it("enters failure state on timeout error", async () => {
    class FundInvoiceTimeoutError extends Error {
      constructor() {
        super("timed out");
        this.name = "FundInvoiceTimeoutError";
        this.code = "FUND_TIMEOUT";
      }
    }

    const performFund = jest.fn().mockRejectedValue(new FundInvoiceTimeoutError());
    const onError = jest.fn();

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund, onError }));

    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.FAILURE);
    const err = onError.mock.calls[0][0];
    expect(err.code).toBe("FUND_TIMEOUT");
  });

  it("preserves idempotency key on timeout (same key on retry)", async () => {
    const timeoutErr = Object.assign(new Error("timed out"), {
      name: "FundInvoiceTimeoutError",
      code: "FUND_TIMEOUT",
    });
    const performFund = jest.fn().mockRejectedValue(timeoutErr);

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });

    const stored = localStorage.getItem("liquifact-idem-GABC...XYZ-inv-001-500");
    expect(stored).toBeTruthy();
  });

  it("retry after timeout uses the SAME idempotency key", async () => {
    const timeoutErr = Object.assign(new Error("timed out"), {
      name: "FundInvoiceTimeoutError",
      code: "FUND_TIMEOUT",
    });
    const performFund = jest
      .fn()
      .mockRejectedValueOnce(timeoutErr)
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    // First attempt (fails)
    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });

    const firstKey = performFund.mock.calls[0][2]; // 3rd arg = idempotencyKey

    // Reset and retry
    act(() => result.current.reset());

    await act(async () => {
      await result.current.submit(500);
    });

    const retryKey = performFund.mock.calls[1][2];
    expect(retryKey).toBe(firstKey); // same idempotency key re-used
  });
});

// ── Edge case 4: Same invoice in two tabs ─────────────────────────────────────

describe("edge case 4: same invoice in two tabs (BroadcastChannel lock)", () => {
  it("blocks the second hook instance when the first broadcasts FUND_LOCK", async () => {
    const { promise: p1, resolve: r1 } = deferred();
    const performFundTab1 = jest.fn().mockReturnValue(p1);
    const performFundTab2 = jest.fn().mockResolvedValue({ ok: true });

    // Tab 1 hook — starts a submission
    const { result: tab1Result } = renderHook(() =>
      useFundingSubmit({
        invoiceId: "inv-tab-test",
        walletAddress: "wallet",
        performFund: performFundTab1,
      })
    );

    // Tab 2 hook — same invoice, should be blocked by the broadcast
    const { result: tab2Result } = renderHook(() =>
      useFundingSubmit({
        invoiceId: "inv-tab-test",
        walletAddress: "wallet",
        performFund: performFundTab2,
      })
    );

    // Tab 1 starts submission — this broadcasts FUND_LOCK
    act(() => {
      tab1Result.current.submit(500);
    });

    // Tab 2 should now be blocked
    expect(tab2Result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.BLOCKED_BY_TAB);
    expect(tab2Result.current.isBlocked).toBe(true);

    // Tab 2 submit should be a no-op while blocked
    await act(async () => {
      await tab2Result.current.submit(500);
    });
    expect(performFundTab2).not.toHaveBeenCalled();

    // Resolve tab 1 — broadcasts FUND_UNLOCK
    await act(async () => {
      r1({ ok: true });
      await p1;
    });

    // Tab 2 should unblock
    expect(tab2Result.current.fundingState).not.toBe(FUNDING_SUBMIT_STATES.BLOCKED_BY_TAB);
  });

  it("does NOT block hooks for different invoice IDs", async () => {
    const { promise, resolve } = deferred();
    const performFundA = jest.fn().mockReturnValue(promise);
    const performFundB = jest.fn().mockResolvedValue({ ok: true });

    const { result: hookAResult } = renderHook(() =>
      useFundingSubmit({
        invoiceId: "inv-A",
        walletAddress: "wallet",
        performFund: performFundA,
      })
    );

    const { result: hookBResult } = renderHook(() =>
      useFundingSubmit({
        invoiceId: "inv-B", // different invoice
        walletAddress: "wallet",
        performFund: performFundB,
      })
    );

    act(() => {
      hookAResult.current.submit(500);
    });

    // hookB is for a different invoice — must NOT be blocked
    expect(hookBResult.current.isBlocked).toBe(false);

    await act(async () => {
      resolve({ ok: true });
      await promise;
    });
  });

  it("broadcasts FUND_UNLOCK on unmount so other tabs are not left blocked", async () => {
    const { promise } = deferred();
    const performFundTab1 = jest.fn().mockReturnValue(promise);
    const performFundTab2 = jest.fn().mockResolvedValue({ ok: true });

    const { result: tab1Result, unmount: unmountTab1 } = renderHook(() =>
      useFundingSubmit({
        invoiceId: "inv-unmount-test",
        walletAddress: "wallet",
        performFund: performFundTab1,
      })
    );

    const { result: tab2Result } = renderHook(() =>
      useFundingSubmit({
        invoiceId: "inv-unmount-test",
        walletAddress: "wallet",
        performFund: performFundTab2,
      })
    );

    act(() => {
      tab1Result.current.submit(500);
    });

    expect(tab2Result.current.isBlocked).toBe(true);

    // Unmounting tab1 should broadcast FUND_UNLOCK
    act(() => {
      unmountTab1();
    });

    expect(tab2Result.current.fundingState).not.toBe(FUNDING_SUBMIT_STATES.BLOCKED_BY_TAB);
  });
});

// ── Edge case 5: Retry after server conflict (409) ────────────────────────────

describe("edge case 5: retry after server conflict (409)", () => {
  it("enters failure state on a 409 conflict error", async () => {
    const conflictErr = Object.assign(new Error("Conflict"), {
      status: 409,
      code: "FUND_CONFLICT",
    });
    const performFund = jest.fn().mockRejectedValue(conflictErr);
    const onError = jest.fn();

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund, onError }));

    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.FAILURE);
    expect(onError).toHaveBeenCalledWith(conflictErr);
  });

  it("preserves the idempotency key after a 409 (for retry)", async () => {
    const conflictErr = Object.assign(new Error("Conflict"), { status: 409 });
    const performFund = jest.fn().mockRejectedValue(conflictErr);

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });

    const stored = localStorage.getItem("liquifact-idem-GABC...XYZ-inv-001-500");
    expect(stored).toBeTruthy();
  });

  it("re-uses the SAME key when retrying after a conflict", async () => {
    const conflictErr = Object.assign(new Error("Conflict"), { status: 409 });
    const performFund = jest
      .fn()
      .mockRejectedValueOnce(conflictErr)
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });

    const firstKey = performFund.mock.calls[0][2];

    act(() => result.current.reset());

    await act(async () => {
      await result.current.submit(500);
    });

    expect(performFund).toHaveBeenCalledTimes(2);
    expect(performFund.mock.calls[1][2]).toBe(firstKey); // same idempotency key
  });
});

// ── Idempotency key lifecycle ─────────────────────────────────────────────────

describe("idempotency key lifecycle", () => {
  it("clears the key from sessionStorage after success", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500);
    });

    const stored = localStorage.getItem("liquifact-idem-GABC...XYZ-inv-001-500");
    expect(stored).toBeNull(); // cleared on success
  });

  it("keeps the key in sessionStorage after failure", async () => {
    const performFund = jest.fn().mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500).catch(() => {});
    });

    const stored = localStorage.getItem("liquifact-idem-GABC...XYZ-inv-001-500");
    expect(stored).toBeTruthy(); // preserved for retry
  });
});

// ── AbortController cleanup ───────────────────────────────────────────────────

describe("AbortController / unmount cleanup", () => {
  it("does not call onSuccess or onError after unmount", async () => {
    const { promise } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);
    const onSuccess = jest.fn();
    const onError = jest.fn();

    const { result, unmount } = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, performFund, onSuccess, onError })
    );

    act(() => {
      result.current.submit(500);
    });

    // Unmount before the promise resolves
    act(() => {
      unmount();
    });

    // Now resolve — callbacks must not be invoked
    await flush();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

// ── Graceful degradation: no BroadcastChannel ─────────────────────────────────

describe("graceful degradation when BroadcastChannel is unavailable", () => {
  it("still completes a submission successfully without BroadcastChannel", async () => {
    delete global.BroadcastChannel;

    const performFund = jest.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500);
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.SUCCESS);
    expect(performFund).toHaveBeenCalledTimes(1);
  });
});

// ── Cross-tab lock ownership (advisory BroadcastChannel protocol) ─────────────

/** Deliver a raw channel message to every open channel for `invoiceId`. */
function dispatchToHook(invoiceId, data) {
  for (const [ch, name] of MockBroadcastChannel._registry) {
    if (name === `liquifact-fund-${invoiceId}` && typeof ch.onmessage === "function") {
      ch.onmessage({ data });
    }
  }
}

describe("cross-tab lock ownership", () => {
  it("does not downgrade a tab that is itself mid-submission", async () => {
    const { promise, resolve } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);

    const { result } = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, invoiceId: "inv-race", performFund })
    );

    act(() => {
      result.current.submit(500);
    });
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.PENDING);

    // A peer that raced us broadcasts its own FUND_LOCK. We already hold a
    // local submission — the message must not block or downgrade us.
    act(() => {
      dispatchToHook("inv-race", {
        type: "FUND_LOCK",
        invoiceId: "inv-race",
        owner: "peer-1",
      });
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.PENDING);
    expect(result.current.isBlocked).toBe(false);

    await act(async () => {
      resolve({ ok: true });
      await promise;
    });

    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.SUCCESS);
  });

  it("ignores a stale FUND_UNLOCK from a different owner", () => {
    const { result } = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, invoiceId: "inv-stale", performFund: jest.fn() })
    );

    // Blocked on peer-A's lock.
    act(() => {
      dispatchToHook("inv-stale", {
        type: "FUND_LOCK",
        invoiceId: "inv-stale",
        owner: "peer-A",
      });
    });
    expect(result.current.isBlocked).toBe(true);

    // A stale unlock from a previous submission must not release the lock.
    act(() => {
      dispatchToHook("inv-stale", {
        type: "FUND_UNLOCK",
        invoiceId: "inv-stale",
        owner: "peer-B",
      });
    });
    expect(result.current.isBlocked).toBe(true);

    // The matching owner finally releases it.
    act(() => {
      dispatchToHook("inv-stale", {
        type: "FUND_UNLOCK",
        invoiceId: "inv-stale",
        owner: "peer-A",
      });
    });
    expect(result.current.isBlocked).toBe(false);
  });

  it("an idle tab unmounting does not release a peer's lock", async () => {
    const { promise, resolve } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);

    const holder = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, invoiceId: "inv-idle", performFund })
    );
    const idle = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, invoiceId: "inv-idle", performFund: jest.fn() })
    );
    const observer = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, invoiceId: "inv-idle", performFund: jest.fn() })
    );

    act(() => {
      holder.result.current.submit(500);
    });

    expect(idle.result.current.isBlocked).toBe(true);
    expect(observer.result.current.isBlocked).toBe(true);

    // The idle tab never took the lock, so its unmount must not broadcast
    // FUND_UNLOCK. If it did, the observer would wrongly become unblocked
    // while the holder is still in flight.
    act(() => {
      idle.unmount();
    });

    expect(observer.result.current.isBlocked).toBe(true);

    await act(async () => {
      resolve({ ok: true });
      await promise;
    });
  });
});

// ── Web Locks cross-tab exclusion ─────────────────────────────────────────────

describe("Web Locks cross-tab exclusion", () => {
  function installWebLocks(impl) {
    const locks = { request: jest.fn(impl) };
    Object.defineProperty(globalThis.navigator, "locks", {
      value: locks,
      configurable: true,
    });
    return locks;
  }

  afterEach(() => {
    delete globalThis.navigator.locks;
  });

  it("runs the submission while holding the exclusive lock", async () => {
    const locks = installWebLocks((name, _opts, cb) => Promise.resolve(cb({ name })));
    const performFund = jest.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useFundingSubmit({ ...BASE_OPTS, performFund }));

    await act(async () => {
      await result.current.submit(500);
    });

    expect(performFund).toHaveBeenCalledTimes(1);
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.SUCCESS);
    expect(locks.request).toHaveBeenCalledWith(
      "liquifact-fund-lock-inv-001",
      expect.objectContaining({ mode: "exclusive", ifAvailable: true }),
      expect.any(Function)
    );
  });

  it("reports blocked_by_tab without issuing a request when another tab holds the lock", async () => {
    installWebLocks((_name, _opts, cb) => Promise.resolve(cb(null)));

    const performFund = jest.fn();

    const { result } = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, invoiceId: "inv-wl", performFund })
    );

    await act(async () => {
      await result.current.submit(500);
    });

    expect(performFund).not.toHaveBeenCalled();
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.BLOCKED_BY_TAB);
  });

  it("releases the guard after a losing race so the tab can retry later", async () => {
    let available = false;
    installWebLocks((name, _opts, cb) => Promise.resolve(cb(available ? { name } : null)));
    const performFund = jest.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(() =>
      useFundingSubmit({ ...BASE_OPTS, invoiceId: "inv-wl-retry", performFund })
    );

    await act(async () => {
      await result.current.submit(500);
    });
    expect(performFund).not.toHaveBeenCalled();

    available = true;
    await act(async () => {
      await result.current.submit(500);
    });

    expect(performFund).toHaveBeenCalledTimes(1);
    expect(result.current.fundingState).toBe(FUNDING_SUBMIT_STATES.SUCCESS);
  });
});
