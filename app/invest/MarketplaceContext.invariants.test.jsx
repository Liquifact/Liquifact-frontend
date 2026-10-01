/**
 * @jest-environment jsdom
 *
 * @file app/invest/MarketplaceContext.invariants.test.jsx
 *
 * Focused tests for the state-invariant protections introduced in
 * app/invest/MarketplaceContext.jsx (issue #1171).
 *
 * Test strategy:
 *   - Success:    valid props produce a working context; fundInvoice optimistic
 *                 update and rollback work correctly.
 *   - Rejection:  invalid `invoices`/`setInvoices` props are coerced safely;
 *                 fundInvoice aborts when invoices are not an Array.
 *   - Boundary:   null invoices (loading state), concurrent fund actions,
 *                 rollback when invoice is not found.
 *   - Regression: existing callers remain compatible; useMarketplace throws
 *                 outside provider; public API shape is unchanged.
 */

import React, { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { MarketplaceProvider, useMarketplace } from "./MarketplaceContext";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const INVOICES = [
  { id: "inv-001", issuer: "Acme", status: "Open", amount: "12,500", currency: "USD" },
  { id: "inv-002", issuer: "Bright", status: "Open", amount: "7,800", currency: "EUR" },
  { id: "inv-003", issuer: "Sunrise", status: "Funded", amount: "22,000", currency: "USD" },
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Build a wrapper that owns the `invoices` state internally so that hooks
 * rendered with it observe state updates from the context.
 */
function wrapperFactory(initialInvoices = INVOICES, setInvoicesOverride) {
  function Wrapper({ children }) {
    const [inv, setInv] = useState(initialInvoices);
    const setInvoices = setInvoicesOverride ?? setInv;
    return (
      <MarketplaceProvider invoices={inv} setInvoices={setInvoices}>
        {children}
      </MarketplaceProvider>
    );
  }
  return Wrapper;
}

/**
 * Wrapper that passes a specific (possibly invalid) `invoices` prop directly.
 */
function staticWrapper(invoices, setInvoices = jest.fn()) {
  return function Wrapper({ children }) {
    return (
      <MarketplaceProvider invoices={invoices} setInvoices={setInvoices}>
        {children}
      </MarketplaceProvider>
    );
  };
}

function suppressConsoleError() {
  return jest.spyOn(console, "error").mockImplementation(() => {});
}

// ─── Success scenarios ────────────────────────────────────────────────────────

describe("MarketplaceContext — success", () => {
  it("exposes valid invoices prop to consumers", () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });
    expect(result.current.invoices).toEqual(INVOICES);
  });

  it("exposes setInvoices, fundInvoice, and pendingIds on the context", () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });
    expect(typeof result.current.setInvoices).toBe("function");
    expect(typeof result.current.fundInvoice).toBe("function");
    expect(result.current.pendingIds).toBeInstanceOf(Set);
  });

  it("optimistically flips invoice status to Funded", async () => {
    const d = deferred();
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });

    act(() => {
      result.current.fundInvoice("inv-001", 500, () => d.promise);
    });

    expect(result.current.invoices.find((i) => i.id === "inv-001").status).toBe("Funded");
    expect(result.current.pendingIds.has("inv-001")).toBe(true);

    await act(async () => {
      d.resolve();
      await d.promise;
    });

    expect(result.current.pendingIds.has("inv-001")).toBe(false);
    expect(result.current.invoices.find((i) => i.id === "inv-001").status).toBe("Funded");
  });

  it("returns true on a successful fund action", async () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });
    let returned;
    await act(async () => {
      returned = await result.current.fundInvoice("inv-001", 500, jest.fn().mockResolvedValue());
    });
    expect(returned).toBe(true);
  });

  it("rolls back the invoice status after an action rejects", async () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });

    await act(async () => {
      await result.current
        .fundInvoice("inv-001", 500, jest.fn().mockRejectedValue(new Error("fail")))
        .catch(() => {});
    });

    expect(result.current.invoices.find((i) => i.id === "inv-001").status).toBe("Open");
  });

  it("does not alter other invoices during rollback", async () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });

    await act(async () => {
      await result.current
        .fundInvoice("inv-001", 500, jest.fn().mockRejectedValue(new Error("fail")))
        .catch(() => {});
    });

    expect(result.current.invoices.find((i) => i.id === "inv-002").status).toBe("Open");
    expect(result.current.invoices.find((i) => i.id === "inv-003").status).toBe("Funded");
  });

  it("re-throws the error from a failed fund action", async () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });
    const boom = new Error("network");
    let caught;
    await act(async () => {
      try {
        await result.current.fundInvoice("inv-001", 500, jest.fn().mockRejectedValue(boom));
      } catch (e) {
        caught = e;
      }
    });
    expect(caught).toBe(boom);
  });
});

// ─── Rejection scenarios ──────────────────────────────────────────────────────

describe("MarketplaceContext — rejection (invalid props)", () => {
  it("treats a non-Array invoices prop as null and logs an error", () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: staticWrapper("not-an-array"),
    });
    expect(result.current.invoices).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid `invoices` prop"),
      expect.any(String),
    );
    spy.mockRestore();
  });

  it("treats a number invoices prop as null", () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: staticWrapper(42),
    });
    expect(result.current.invoices).toBeNull();
    spy.mockRestore();
  });

  it("treats a plain-object invoices prop as null", () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: staticWrapper({ id: "inv-001" }),
    });
    expect(result.current.invoices).toBeNull();
    spy.mockRestore();
  });

  it("replaces a non-function setInvoices prop with a no-op and logs an error", () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: staticWrapper(INVOICES, "not-a-function"),
    });
    expect(typeof result.current.setInvoices).toBe("function");
    expect(() => result.current.setInvoices([])).not.toThrow();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid `setInvoices` prop"),
      expect.any(String),
    );
    spy.mockRestore();
  });

  it("aborts fundInvoice when invoices is null (not yet loaded)", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: staticWrapper(null),
    });

    let returned;
    await act(async () => {
      returned = await result.current.fundInvoice("inv-001", 500, jest.fn());
    });

    expect(returned).toBe(false);
    spy.mockRestore();
  });

  it("aborts fundInvoice when invoices is an invalid type", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: staticWrapper("invalid"),
    });

    let returned;
    await act(async () => {
      returned = await result.current.fundInvoice("inv-001", 500, jest.fn());
    });

    expect(returned).toBe(false);
    spy.mockRestore();
  });

  it("logs a console.error when fundInvoice is called on null invoices", async () => {
    const spy = suppressConsoleError();
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: staticWrapper(null),
    });

    await act(async () => {
      await result.current.fundInvoice("inv-001", 500, jest.fn());
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("fundInvoice called while invoices is"),
      expect.any(String),
    );
    spy.mockRestore();
  });
});

// ─── Boundary scenarios ───────────────────────────────────────────────────────

describe("MarketplaceContext — boundary cases", () => {
  it("accepts null as a valid invoices prop (loading sentinel)", () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: staticWrapper(null, jest.fn()),
    });
    expect(result.current.invoices).toBeNull();
  });

  it("handles funding an invoice that does not exist in the list (no-op rollback)", async () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });

    // "inv-999" does not exist — snapshot will be null, rollback should be safe.
    await act(async () => {
      await result.current
        .fundInvoice("inv-999", 500, jest.fn().mockRejectedValue(new Error("fail")))
        .catch(() => {});
    });

    // Original invoices should be untouched.
    expect(result.current.invoices).toEqual(INVOICES);
  });

  it("tracks two concurrent in-flight actions independently", async () => {
    const d1 = deferred();
    const d2 = deferred();
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });

    let p1, p2;
    act(() => {
      p1 = result.current.fundInvoice("inv-001", 500, () => d1.promise);
      p2 = result.current.fundInvoice("inv-002", 300, () => d2.promise);
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

  it("blocks a duplicate fund call on the same invoice", async () => {
    const d = deferred();
    const action = jest.fn(() => d.promise);
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });

    act(() => {
      result.current.fundInvoice("inv-001", 500, action);
    });

    let secondResult;
    await act(async () => {
      secondResult = await result.current.fundInvoice("inv-001", 300, action);
    });

    expect(secondResult).toBe(false);
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve();
      await d.promise;
    });
  });
});

// ─── Regression: public API compatibility ────────────────────────────────────

describe("MarketplaceContext — regression (public API unchanged)", () => {
  it("useMarketplace throws with the original error message outside a provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useMarketplace())).toThrow(
      "useMarketplace must be used within a MarketplaceProvider",
    );
    spy.mockRestore();
  });

  it("context value shape matches the documented API", () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: wrapperFactory(),
    });
    const ctx = result.current;
    expect(ctx).toHaveProperty("invoices");
    expect(ctx).toHaveProperty("setInvoices");
    expect(ctx).toHaveProperty("pendingIds");
    expect(ctx).toHaveProperty("fundInvoice");
    expect(typeof ctx.setInvoices).toBe("function");
    expect(typeof ctx.fundInvoice).toBe("function");
    expect(ctx.pendingIds).toBeInstanceOf(Set);
  });
});
