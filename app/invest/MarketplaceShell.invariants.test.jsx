/**
 * @jest-environment jsdom
 *
 * @file app/invest/MarketplaceShell.invariants.test.jsx
 *
 * Focused tests for the guarded-setInvoices invariant introduced in
 * app/invest/MarketplaceShell.jsx (issue #1171).
 *
 * Test strategy:
 *   - Success:    null and Array values pass through the guard unchanged.
 *   - Rejection:  string / number / plain-object / function values are
 *                 rejected; state stays at its previous valid value.
 *   - Boundary:   functional-updater form works for both valid and invalid
 *                 return values.
 *   - Regression: children are always rendered inside MarketplaceProvider;
 *                 the guard never breaks the render tree.
 */

import React from "react";
import { act, render, screen, renderHook } from "@testing-library/react";
import MarketplaceShell from "./MarketplaceShell";
import { useMarketplace } from "./MarketplaceContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function suppressConsoleError() {
  return jest.spyOn(console, "error").mockImplementation(() => {});
}

/**
 * Render MarketplaceShell and expose the context value through a probe
 * component so we can assert on invoices and setInvoices.
 */
function renderShellWithProbe(children) {
  let capturedCtx = null;

  function Probe() {
    capturedCtx = useMarketplace();
    return null;
  }

  render(
    <MarketplaceShell>
      <Probe />
      {children}
    </MarketplaceShell>,
  );

  return {
    getCtx: () => capturedCtx,
  };
}

// ─── Success scenarios ────────────────────────────────────────────────────────

describe("MarketplaceShell — success (guarded setInvoices)", () => {
  it("initial invoices state is null (loading sentinel)", () => {
    const { getCtx } = renderShellWithProbe(null);
    expect(getCtx().invoices).toBeNull();
  });

  it("accepts null via the guarded setter", () => {
    const { getCtx } = renderShellWithProbe(null);
    act(() => {
      getCtx().setInvoices(null);
    });
    expect(getCtx().invoices).toBeNull();
  });

  it("accepts a valid Array via the guarded setter", () => {
    const { getCtx } = renderShellWithProbe(null);
    const invoices = [{ id: "inv-001", status: "Open" }];
    act(() => {
      getCtx().setInvoices(invoices);
    });
    expect(getCtx().invoices).toEqual(invoices);
  });

  it("accepts an empty Array", () => {
    const { getCtx } = renderShellWithProbe(null);
    act(() => {
      getCtx().setInvoices([]);
    });
    expect(getCtx().invoices).toEqual([]);
  });

  it("accepts a functional updater returning a valid Array", () => {
    const { getCtx } = renderShellWithProbe(null);
    const invoices = [{ id: "inv-001" }];
    act(() => {
      getCtx().setInvoices(() => invoices);
    });
    expect(getCtx().invoices).toEqual(invoices);
  });

  it("accepts a functional updater returning null", () => {
    const { getCtx } = renderShellWithProbe(null);
    // First set to a valid array.
    act(() => {
      getCtx().setInvoices([{ id: "inv-001" }]);
    });
    // Then reset to null via updater.
    act(() => {
      getCtx().setInvoices(() => null);
    });
    expect(getCtx().invoices).toBeNull();
  });
});

// ─── Rejection scenarios ──────────────────────────────────────────────────────

describe("MarketplaceShell — rejection (guarded setInvoices)", () => {
  it("rejects a string value and keeps the previous state", () => {
    const spy = suppressConsoleError();
    const { getCtx } = renderShellWithProbe(null);

    act(() => {
      getCtx().setInvoices("not-an-array");
    });

    expect(getCtx().invoices).toBeNull(); // State unchanged.
    spy.mockRestore();
  });

  it("rejects a number value and keeps the previous state", () => {
    const spy = suppressConsoleError();
    const { getCtx } = renderShellWithProbe(null);

    act(() => {
      getCtx().setInvoices(42);
    });

    expect(getCtx().invoices).toBeNull();
    spy.mockRestore();
  });

  it("rejects a plain-object value and keeps the previous state", () => {
    const spy = suppressConsoleError();
    const { getCtx } = renderShellWithProbe(null);

    act(() => {
      getCtx().setInvoices({ id: "inv-001" });
    });

    expect(getCtx().invoices).toBeNull();
    spy.mockRestore();
  });

  it("rejects undefined and keeps the previous state", () => {
    const spy = suppressConsoleError();
    const { getCtx } = renderShellWithProbe(null);
    // First set a valid array so we can confirm it is preserved.
    act(() => {
      getCtx().setInvoices([{ id: "inv-001" }]);
    });

    act(() => {
      getCtx().setInvoices(undefined);
    });

    expect(Array.isArray(getCtx().invoices)).toBe(true);
    spy.mockRestore();
  });

  it("emits a console.error on rejection", () => {
    const spy = suppressConsoleError();
    const { getCtx } = renderShellWithProbe(null);

    act(() => {
      getCtx().setInvoices("bad-value");
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("setInvoices"),
      expect.any(String),
    );
    spy.mockRestore();
  });

  it("rejects a functional updater that returns an invalid value", () => {
    const spy = suppressConsoleError();
    const { getCtx } = renderShellWithProbe(null);

    act(() => {
      getCtx().setInvoices(() => "invalid");
    });

    expect(getCtx().invoices).toBeNull();
    spy.mockRestore();
  });
});

// ─── Boundary scenarios ───────────────────────────────────────────────────────

describe("MarketplaceShell — boundary cases", () => {
  it("does not call console.error when setting a valid Array", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { getCtx } = renderShellWithProbe(null);

    act(() => {
      getCtx().setInvoices([{ id: "inv-001" }]);
    });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("allows multiple valid updates in sequence", () => {
    const { getCtx } = renderShellWithProbe(null);
    const first = [{ id: "a" }];
    const second = [{ id: "a" }, { id: "b" }];

    act(() => {
      getCtx().setInvoices(first);
    });
    expect(getCtx().invoices).toEqual(first);

    act(() => {
      getCtx().setInvoices(second);
    });
    expect(getCtx().invoices).toEqual(second);
  });

  it("preserves the last valid state across multiple invalid calls", () => {
    const spy = suppressConsoleError();
    const { getCtx } = renderShellWithProbe(null);
    const valid = [{ id: "inv-001" }];

    act(() => {
      getCtx().setInvoices(valid);
    });

    act(() => {
      getCtx().setInvoices("bad-1");
    });
    act(() => {
      getCtx().setInvoices(999);
    });

    expect(getCtx().invoices).toEqual(valid);
    spy.mockRestore();
  });
});

// ─── Regression: render tree is never broken ─────────────────────────────────

describe("MarketplaceShell — regression (render tree integrity)", () => {
  it("always renders children inside a MarketplaceProvider context", () => {
    render(
      <MarketplaceShell>
        <div data-testid="child-node">content</div>
      </MarketplaceShell>,
    );

    expect(screen.getByTestId("child-node")).toBeInTheDocument();
  });

  it("children can access useMarketplace without error", () => {
    expect(() => {
      renderShellWithProbe(<span>ok</span>);
    }).not.toThrow();
  });
});
