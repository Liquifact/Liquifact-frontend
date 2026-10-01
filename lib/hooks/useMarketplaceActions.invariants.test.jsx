/**
 * @jest-environment jsdom
 *
 * @file lib/hooks/useMarketplaceActions.invariants.test.jsx
 *
 * Focused tests for the state-invariant protections introduced in
 * lib/hooks/useMarketplaceActions.js (issue #1171).
 *
 * Test strategy:
 *   - Success:    valid fund calls complete, pendingIds update correctly,
 *                 onSettled is called, and true is returned.
 *   - Rejection:  invalid invoiceId (empty string, non-string, null) and
 *                 invalid performAction (non-function) are rejected with false
 *                 and no side effects; duplicate in-flight calls return false.
 *   - Boundary:   onSettled is always called (success + failure); rollback is
 *                 only called when snapshot is non-null; pendingIds is always
 *                 cleaned up even when performAction throws.
 *   - Regression: existing callers remain compatible — concurrent independent
 *                 actions work; errors are re-thrown.
 */

import { act, renderHook } from "@testing-library/react";
import { useMarketplaceActions } from "@/lib/hooks/useMarketplaceActions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function suppressConsoleError() {
  return jest.spyOn(console, "error").mockImplementation(() => {});
}

// ─── Success scenarios ────────────────────────────────────────────────────────

describe("useMarketplaceActions — success", () => {
  it("returns true when the action resolves", async () => {
    const { result } = renderHook(() => useMarketplaceActions());
    let returned;
    await act(async () => {
      returned = await result.current.fund(
        "inv-001",
        500,
        jest.fn().mockResolvedValue(undefined),
      );
    });
    expect(returned).toBe(true);
  });

  it("adds invoiceId to pendingIds while in-flight", async () => {
    const d = deferred();
    const { result } = renderHook(() => useMarketplaceActions());

    act(() => {
      result.current.fund("inv-001", 500, () => d.promise);
    });

    expect(result.current.pendingIds.has("inv-001")).toBe(true);

    await act(async () => {
      d.resolve();
      await d.promise;
    });

    expect(result.current.pendingIds.has("inv-001")).toBe(false);
  });

  it("calls optimisticUpdate with invoiceId and amount before the action", async () => {
    const { result } = renderHook(() => useMarketplaceActions());
    const optimisticUpdate = jest.fn().mockReturnValue({ snapshot: true });

    await act(async () => {
      await result.current.fund("inv-001", 500, jest.fn().mockResolvedValue(), {
        optimisticUpdate,
      });
    });

    expect(optimisticUpdate).toHaveBeenCalledWith("inv-001", 500);
  });

  it("calls onSettled with { ok: true } after success", async () => {
    const onSettled = jest.fn();
    const { result } = renderHook(() => useMarketplaceActions({ onSettled }));

    await act(async () => {
      await result.current.fund("inv-001", 500, jest.fn().mockResolvedValue());
    });

    expect(onSettled).toHaveBeenCalledWith("inv-001", { ok: true });
  });

  it("calls onSettled with { ok: false } after failure", async () => {
    const onSettled = jest.fn();
    const { result } = renderHook(() => useMarketplaceActions({ onSettled }));

    await act(async () => {
      await result.current
        .fund("inv-001", 500, jest.fn().mockRejectedValue(new Error("fail")))
        .catch(() => {});
    });

    expect(onSettled).toHaveBeenCalledWith("inv-001", { ok: false });
  });

  it("passes invoiceId and amount to performAction", async () => {
    const { result } = renderHook(() => useMarketplaceActions());
    const action = jest.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.fund("inv-002", 1200, action);
    });

    expect(action).toHaveBeenCalledWith("inv-002", 1200);
  });
});

// ─── Rejection scenarios ──────────────────────────────────────────────────────

describe("useMarketplaceActions — rejection (invalid inputs)", () => {
  it("rejects an empty-string invoiceId and returns false", async () => {
    const spy = suppressConsoleError();
    const action = jest.fn();
    const { result } = renderHook(() => useMarketplaceActions());

    let returned;
    await act(async () => {
      returned = await result.current.fund("", 500, action);
    });

    expect(returned).toBe(false);
    expect(action).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects a whitespace-only invoiceId and returns false", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplaceActions());
    const action = jest.fn();

    let returned;
    await act(async () => {
      returned = await result.current.fund("   ", 500, action);
    });

    expect(returned).toBe(false);
    expect(action).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects a null invoiceId and returns false", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplaceActions());
    const action = jest.fn();

    let returned;
    await act(async () => {
      returned = await result.current.fund(null, 500, action);
    });

    expect(returned).toBe(false);
    expect(action).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects a numeric invoiceId and returns false", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplaceActions());
    const action = jest.fn();

    let returned;
    await act(async () => {
      returned = await result.current.fund(123, 500, action);
    });

    expect(returned).toBe(false);
    expect(action).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects undefined invoiceId and returns false", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplaceActions());

    let returned;
    await act(async () => {
      returned = await result.current.fund(undefined, 500, jest.fn());
    });

    expect(returned).toBe(false);
    spy.mockRestore();
  });

  it("rejects a non-function performAction and returns false", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplaceActions());

    let returned;
    await act(async () => {
      returned = await result.current.fund("inv-001", 500, "not-a-function");
    });

    expect(returned).toBe(false);
    spy.mockRestore();
  });

  it("rejects a null performAction and returns false", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplaceActions());

    let returned;
    await act(async () => {
      returned = await result.current.fund("inv-001", 500, null);
    });

    expect(returned).toBe(false);
    spy.mockRestore();
  });

  it("does not add to pendingIds when invoiceId is invalid", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplaceActions());

    await act(async () => {
      await result.current.fund("", 500, jest.fn());
    });

    expect(result.current.pendingIds.size).toBe(0);
    spy.mockRestore();
  });

  it("blocks a duplicate fund call on the same invoice (returns false)", async () => {
    const d = deferred();
    const action = jest.fn(() => d.promise);
    const { result } = renderHook(() => useMarketplaceActions());

    act(() => {
      result.current.fund("inv-001", 500, action);
    });

    let secondResult;
    await act(async () => {
      secondResult = await result.current.fund("inv-001", 300, action);
    });

    expect(secondResult).toBe(false);
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve();
      await d.promise;
    });
  });

  it("emits console.error when invoiceId is invalid", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplaceActions());

    await act(async () => {
      await result.current.fund("", 500, jest.fn());
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("invalid invoiceId"),
      expect.anything(),
    );
    spy.mockRestore();
  });

  it("emits console.error when performAction is not a function", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplaceActions());

    await act(async () => {
      await result.current.fund("inv-001", 500, undefined);
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("performAction"),
      expect.any(String),
    );
    spy.mockRestore();
  });
});

// ─── Boundary scenarios ───────────────────────────────────────────────────────

describe("useMarketplaceActions — boundary cases", () => {
  it("always cleans up pendingIds after a failed action", async () => {
    const { result } = renderHook(() => useMarketplaceActions());

    await act(async () => {
      await result.current
        .fund("inv-001", 500, jest.fn().mockRejectedValue(new Error("err")))
        .catch(() => {});
    });

    expect(result.current.pendingIds.has("inv-001")).toBe(false);
    expect(result.current.pendingIds.size).toBe(0);
  });

  it("does not call rollback when the snapshot is null", async () => {
    const rollback = jest.fn();
    const optimisticUpdate = jest.fn().mockReturnValue(null); // null snapshot
    const { result } = renderHook(() => useMarketplaceActions());

    await act(async () => {
      await result.current
        .fund("inv-999", 500, jest.fn().mockRejectedValue(new Error("fail")), {
          optimisticUpdate,
          rollback,
        })
        .catch(() => {});
    });

    expect(rollback).not.toHaveBeenCalled();
  });

  it("does not call rollback when snapshot is undefined", async () => {
    const rollback = jest.fn();
    const optimisticUpdate = jest.fn().mockReturnValue(undefined);
    const { result } = renderHook(() => useMarketplaceActions());

    await act(async () => {
      await result.current
        .fund("inv-001", 500, jest.fn().mockRejectedValue(new Error("fail")), {
          optimisticUpdate,
          rollback,
        })
        .catch(() => {});
    });

    expect(rollback).not.toHaveBeenCalled();
  });

  it("calls rollback with invoiceId and snapshot when snapshot is non-null", async () => {
    const snap = { id: "inv-001", status: "Open" };
    const rollback = jest.fn();
    const optimisticUpdate = jest.fn().mockReturnValue(snap);
    const { result } = renderHook(() => useMarketplaceActions());

    await act(async () => {
      await result.current
        .fund("inv-001", 500, jest.fn().mockRejectedValue(new Error("fail")), {
          optimisticUpdate,
          rollback,
        })
        .catch(() => {});
    });

    expect(rollback).toHaveBeenCalledWith("inv-001", snap);
  });

  it("re-throws errors from performAction", async () => {
    const boom = new Error("server down");
    const { result } = renderHook(() => useMarketplaceActions());

    let caught;
    await act(async () => {
      try {
        await result.current.fund("inv-001", 500, jest.fn().mockRejectedValue(boom));
      } catch (e) {
        caught = e;
      }
    });

    expect(caught).toBe(boom);
  });

  it("processes concurrent actions on different invoices independently", async () => {
    const d1 = deferred();
    const d2 = deferred();
    const { result } = renderHook(() => useMarketplaceActions());

    let p1, p2;
    act(() => {
      p1 = result.current.fund("inv-001", 500, () => d1.promise);
      p2 = result.current.fund("inv-002", 300, () => d2.promise);
    });

    expect(result.current.pendingIds.has("inv-001")).toBe(true);
    expect(result.current.pendingIds.has("inv-002")).toBe(true);

    await act(async () => {
      d1.resolve();
      await p1;
    });
    expect(result.current.pendingIds.has("inv-001")).toBe(false);
    expect(result.current.pendingIds.has("inv-002")).toBe(true);

    await act(async () => {
      d2.resolve();
      await p2;
    });
    expect(result.current.pendingIds.size).toBe(0);
  });

  it("allows a second fund call on the same invoice after the first completes", async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useMarketplaceActions());

    await act(async () => {
      await result.current.fund("inv-001", 500, action);
    });

    let secondResult;
    await act(async () => {
      secondResult = await result.current.fund("inv-001", 500, action);
    });

    expect(secondResult).toBe(true);
    expect(action).toHaveBeenCalledTimes(2);
  });
});

// ─── Regression: existing callers remain compatible ───────────────────────────

describe("useMarketplaceActions — regression (public API unchanged)", () => {
  it("returns { pendingIds, fund } from the hook", () => {
    const { result } = renderHook(() => useMarketplaceActions());
    expect(result.current).toHaveProperty("pendingIds");
    expect(result.current).toHaveProperty("fund");
    expect(result.current.pendingIds).toBeInstanceOf(Set);
    expect(typeof result.current.fund).toBe("function");
  });

  it("works without options argument (options is optional)", async () => {
    const { result } = renderHook(() => useMarketplaceActions());
    let returned;
    await act(async () => {
      returned = await result.current.fund(
        "inv-001",
        500,
        jest.fn().mockResolvedValue(),
      );
    });
    expect(returned).toBe(true);
  });

  it("works without onSettled (onSettled is optional)", async () => {
    const { result } = renderHook(() => useMarketplaceActions());
    await expect(
      act(async () => {
        await result.current.fund("inv-001", 500, jest.fn().mockResolvedValue());
      }),
    ).resolves.not.toThrow();
  });
});
