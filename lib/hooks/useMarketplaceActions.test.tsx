/**
 * @jest-environment jsdom
 *
 * @file lib/hooks/useMarketplaceActions.test.tsx
 *
 * Tests for the useMarketplaceActions hook covering:
 *   - Optimistic pending state applied before action resolves
 *   - Success: pending cleared, returns true
 *   - Failure rollback: pending cleared, error re-thrown
 *   - Concurrent guard: second call on same id while in-flight returns false
 *   - Independent concurrent actions on different ids
 *   - Optimistic update callback invoked before action, snapshot returned
 *   - Rollback callback invoked on failure with correct snapshot
 *   - onSettled callback invoked after success and failure
 */

import React from "react";
import { act, renderHook } from "@testing-library/react";
import { useMarketplaceActions } from "./useMarketplaceActions";

// ── helpers ───────────────────────────────────────────────────────────────────

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("useMarketplaceActions", () => {
  it("starts with an empty pending set", () => {
    const { result } = renderHook(() => useMarketplaceActions());
    expect(result.current.pendingIds.size).toBe(0);
  });

  describe("success path", () => {
    it("adds the invoice id to pendingIds while the action is in-flight", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const { promise, resolve } = deferred();

      let fundPromise: Promise<boolean>;
      act(() => {
        fundPromise = result.current.fund("inv-001", 500, () => promise);
      });

      expect(result.current.pendingIds.has("inv-001")).toBe(true);

      await act(async () => {
        resolve();
        await fundPromise!;
      });
    });

    it("removes the invoice id from pendingIds after the action resolves", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const action = jest.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.fund("inv-001", 500, action);
      });

      expect(result.current.pendingIds.has("inv-001")).toBe(false);
    });

    it("returns true on success", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const action = jest.fn().mockResolvedValue(undefined);

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.fund("inv-001", 500, action);
      });

      expect(returned).toBe(true);
    });

    it("calls performAction with invoiceId and amount", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const action = jest.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.fund("inv-002", 1200, action);
      });

      expect(action).toHaveBeenCalledWith("inv-002", 1200);
    });
  });

  describe("failure / rollback path", () => {
    it("removes the invoice id from pendingIds after the action rejects (rollback)", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const action = jest.fn().mockRejectedValue(new Error("server error"));

      await act(async () => {
        await result.current.fund("inv-001", 500, action).catch(() => {});
      });

      expect(result.current.pendingIds.has("inv-001")).toBe(false);
    });

    it("re-throws the error so the caller can show an error toast", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const boom = new Error("network failure");
      const action = jest.fn().mockRejectedValue(boom);

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.fund("inv-001", 500, action);
        } catch (e) {
          caught = e;
        }
      });

      expect(caught).toBe(boom);
    });

    it("pendingIds is empty after rollback (no leftover state)", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const action = jest.fn().mockRejectedValue(new Error("fail"));

      await act(async () => {
        await result.current.fund("inv-001", 500, action).catch(() => {});
      });

      expect(result.current.pendingIds.size).toBe(0);
    });
  });

  describe("concurrent guard — same invoice id", () => {
    it("returns false immediately when a second fund call arrives while the first is in-flight", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const { promise, resolve } = deferred();
      const action = jest.fn(() => promise);

      let firstPromise: Promise<boolean>;
      let secondResult: boolean | undefined;

      act(() => {
        firstPromise = result.current.fund("inv-001", 500, action);
      });

      await act(async () => {
        secondResult = await result.current.fund("inv-001", 300, action);
      });

      expect(secondResult).toBe(false);
      // first action still runs to completion
      await act(async () => {
        resolve();
        await firstPromise!;
      });
    });

    it("does not call performAction a second time when the guard fires", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const { promise, resolve } = deferred();
      const action = jest.fn(() => promise);

      let firstPromise: Promise<boolean>;
      act(() => {
        firstPromise = result.current.fund("inv-001", 500, action);
      });

      await act(async () => {
        await result.current.fund("inv-001", 300, action);
      });

      expect(action).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolve();
        await firstPromise!;
      });
    });

    it("allows a new fund call after the previous one completes", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const action = jest.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.fund("inv-001", 500, action);
      });

      let secondResult: boolean | undefined;
      await act(async () => {
        secondResult = await result.current.fund("inv-001", 200, action);
      });

      expect(secondResult).toBe(true);
      expect(action).toHaveBeenCalledTimes(2);
    });

    it("allows a new fund call after a rollback", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const failing = jest.fn().mockRejectedValue(new Error("fail"));
      const succeeding = jest.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.fund("inv-001", 500, failing).catch(() => {});
      });

      let secondResult: boolean | undefined;
      await act(async () => {
        secondResult = await result.current.fund("inv-001", 200, succeeding);
      });

      expect(secondResult).toBe(true);
    });
  });

  describe("concurrent actions on different invoice ids", () => {
    it("tracks two independent in-flight actions simultaneously", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const { promise: p1, resolve: r1 } = deferred();
      const { promise: p2, resolve: r2 } = deferred();

      let fp1: Promise<boolean>;
      let fp2: Promise<boolean>;

      act(() => {
        fp1 = result.current.fund("inv-001", 500, () => p1);
        fp2 = result.current.fund("inv-002", 300, () => p2);
      });

      expect(result.current.pendingIds.has("inv-001")).toBe(true);
      expect(result.current.pendingIds.has("inv-002")).toBe(true);

      // Settle first action
      await act(async () => {
        r1();
        await fp1!;
      });

      expect(result.current.pendingIds.has("inv-001")).toBe(false);
      expect(result.current.pendingIds.has("inv-002")).toBe(true);

      // Settle second action
      await act(async () => {
        r2();
        await fp2!;
      });

      expect(result.current.pendingIds.size).toBe(0);
    });

    it("rolling back one invoice does not affect the other", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const { promise: p1, reject: rej1 } = deferred();
      const { promise: p2, resolve: r2 } = deferred();

      let fp1: Promise<boolean>;
      let fp2: Promise<boolean>;

      act(() => {
        fp1 = result.current.fund("inv-001", 500, () => p1);
        fp2 = result.current.fund("inv-002", 300, () => p2);
      });

      // Fail first, succeed second
      await act(async () => {
        rej1(new Error("fail"));
        await fp1!.catch(() => {});
      });

      expect(result.current.pendingIds.has("inv-001")).toBe(false);
      expect(result.current.pendingIds.has("inv-002")).toBe(true);

      await act(async () => {
        r2();
        await fp2!;
      });

      expect(result.current.pendingIds.size).toBe(0);
    });
  });

  describe("optimistic update callbacks", () => {
    it("calls optimisticUpdate before the action runs", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const { promise, resolve } = deferred();
      const action = jest.fn(() => promise);
      const optimisticUpdate = jest.fn().mockReturnValue({ status: "Open" });

      act(() => {
        result.current.fund("inv-001", 500, action, { optimisticUpdate });
      });

      expect(optimisticUpdate).toHaveBeenCalledWith("inv-001", 500);
      expect(optimisticUpdate).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolve();
        await promise;
      });
    });

    it("does not call rollback on success", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const action = jest.fn().mockResolvedValue(undefined);
      const optimisticUpdate = jest.fn().mockReturnValue({ status: "Open" });
      const rollback = jest.fn();

      await act(async () => {
        await result.current.fund("inv-001", 500, action, {
          optimisticUpdate,
          rollback,
        });
      });

      expect(rollback).not.toHaveBeenCalled();
    });

    it("calls rollback with invoiceId and snapshot on failure", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const boom = new Error("network error");
      const action = jest.fn().mockRejectedValue(boom);
      const snapshot = { id: "inv-001", status: "Open" };
      const optimisticUpdate = jest.fn().mockReturnValue(snapshot);
      const rollback = jest.fn();

      await act(async () => {
        try {
          await result.current.fund("inv-001", 500, action, {
            optimisticUpdate,
            rollback,
          });
        } catch {}
      });

      expect(rollback).toHaveBeenCalledWith("inv-001", snapshot);
    });

    it("rollback is not called when no optimisticUpdate is provided", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const action = jest.fn().mockRejectedValue(new Error("fail"));
      const rollback = jest.fn();

      await act(async () => {
        try {
          await result.current.fund("inv-001", 500, action, { rollback });
        } catch {}
      });

      expect(rollback).toHaveBeenCalledWith("inv-001", undefined);
    });

    it("works without any options (backward compatible)", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const action = jest.fn().mockResolvedValue(undefined);

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.fund("inv-001", 500, action);
      });

      expect(returned).toBe(true);
    });

    it("optimisticUpdate and rollback work across concurrent independent invoices", async () => {
      const { result } = renderHook(() => useMarketplaceActions());
      const { promise: p1, reject: rej1 } = deferred();
      const { promise: p2, resolve: r2 } = deferred();

      const rollback1 = jest.fn();
      const rollback2 = jest.fn();
      const update1 = jest.fn().mockReturnValue({ status: "Open", id: "inv-001" });
      const update2 = jest.fn().mockReturnValue({ status: "Open", id: "inv-002" });

      let fp1: Promise<boolean>;
      let fp2: Promise<boolean>;

      act(() => {
        fp1 = result.current.fund("inv-001", 500, () => p1, {
          optimisticUpdate: update1,
          rollback: rollback1,
        });
        fp2 = result.current.fund("inv-002", 300, () => p2, {
          optimisticUpdate: update2,
          rollback: rollback2,
        });
      });

      // Fail first, succeed second
      await act(async () => {
        rej1(new Error("fail"));
        await fp1!.catch(() => {});
      });

      expect(rollback1).toHaveBeenCalledWith("inv-001", {
        status: "Open",
        id: "inv-001",
      });
      expect(rollback2).not.toHaveBeenCalled();

      await act(async () => {
        r2();
        await fp2!;
      });

      expect(rollback2).not.toHaveBeenCalled();
    });
  });

  describe("onSettled callback", () => {
    it("calls onSettled with ok:true on success", async () => {
      const onSettled = jest.fn();
      const { result } = renderHook(() => useMarketplaceActions({ onSettled }));
      const action = jest.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.fund("inv-001", 500, action);
      });

      expect(onSettled).toHaveBeenCalledWith("inv-001", { ok: true });
    });

    it("calls onSettled with ok:false on failure", async () => {
      const onSettled = jest.fn();
      const { result } = renderHook(() => useMarketplaceActions({ onSettled }));
      const action = jest.fn().mockRejectedValue(new Error("fail"));

      await act(async () => {
        await result.current.fund("inv-001", 500, action).catch(() => {});
      });

      expect(onSettled).toHaveBeenCalledWith("inv-001", { ok: false });
    });

    it("does not call onSettled when guard blocks a duplicate", async () => {
      const onSettled = jest.fn();
      const { result } = renderHook(() => useMarketplaceActions({ onSettled }));
      const { promise, resolve } = deferred();
      const action = jest.fn(() => promise);

      act(() => {
        result.current.fund("inv-001", 500, action);
      });

      await act(async () => {
        await result.current.fund("inv-001", 300, action);
      });

      expect(onSettled).not.toHaveBeenCalled();

      await act(async () => {
        resolve();
        await promise;
      });

      expect(onSettled).toHaveBeenCalledTimes(1);
    });
  });
});
