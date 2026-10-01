/**
 * @jest-environment jsdom
 *
 * @file app/invest/layout.invariants.test.jsx
 *
 * Focused tests for the state-invariant protections introduced in
 * app/invest/layout.js (issue #1171).
 *
 * Test strategy:
 *   - Success:    valid renderable children (element, null, string, array) are
 *                 passed straight through to MarketplaceShell.
 *   - Rejection:  non-renderable children (plain object, function, class
 *                 instance) are replaced with null and a console.error is fired.
 *   - Boundary:   undefined children (omitted prop) are treated as renderable
 *                 (React's normal empty-children contract).
 *   - Regression: MarketplaceShell is ALWAYS rendered regardless of children
 *                 type — the layout never strips the context boundary.
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// ── Inline mock for MarketplaceShell ─────────────────────────────────────────
// We mock the shell to keep the test focused on layout.js invariants only.
// The shell mock renders its children inside a sentinel div so we can assert
// that (a) the shell was rendered and (b) what was ultimately passed to it.
jest.mock("./MarketplaceShell", () => {
  return function MockMarketplaceShell({ children }) {
    return (
      <div data-testid="marketplace-shell">
        {children}
      </div>
    );
  };
});

// Import layout AFTER mock is registered.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: InvestLayout } = require("./layout.js");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Suppress expected console.error calls so test output stays clean. */
function suppressConsoleError() {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  return spy;
}

// ─── Success scenarios ────────────────────────────────────────────────────────

describe("InvestLayout — success (valid children)", () => {
  it("renders a valid React element child inside MarketplaceShell", () => {
    render(
      <InvestLayout>
        <p data-testid="child">Hello</p>
      </InvestLayout>,
    );

    expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders a string child", () => {
    render(<InvestLayout>plain text</InvestLayout>);
    expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
    expect(screen.getByText("plain text")).toBeInTheDocument();
  });

  it("renders a numeric child", () => {
    render(<InvestLayout>{42}</InvestLayout>);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders an array of valid React elements", () => {
    render(
      <InvestLayout>
        {[
          <span key="a" data-testid="child-a">A</span>,
          <span key="b" data-testid="child-b">B</span>,
        ]}
      </InvestLayout>,
    );
    expect(screen.getByTestId("child-a")).toBeInTheDocument();
    expect(screen.getByTestId("child-b")).toBeInTheDocument();
  });

  it("renders null children (empty layout)", () => {
    const { container } = render(<InvestLayout>{null}</InvestLayout>);
    // Shell should still mount.
    expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
    // Nothing inside the shell.
    expect(screen.getByTestId("marketplace-shell").textContent).toBe("");
  });

  it("renders boolean false children (React no-op)", () => {
    render(<InvestLayout>{false}</InvestLayout>);
    expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
  });
});

// ─── Rejection scenarios ──────────────────────────────────────────────────────

describe("InvestLayout — rejection (non-renderable children)", () => {
  it("replaces a plain object child with null and logs a console.error", () => {
    const spy = suppressConsoleError();

    render(<InvestLayout>{({ key: "not-a-node" })}</InvestLayout>);

    expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-shell").textContent).toBe("");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("non-renderable"),
      expect.any(String),
    );

    spy.mockRestore();
  });

  it("replaces a function child with null and logs a console.error", () => {
    const spy = suppressConsoleError();

    render(<InvestLayout>{() => "not-a-node"}</InvestLayout>);

    expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
    expect(screen.getByTestId("marketplace-shell").textContent).toBe("");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("non-renderable"),
      expect.any(String),
    );

    spy.mockRestore();
  });

  it("does NOT log console.error for a valid React element", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <InvestLayout>
        <div>ok</div>
      </InvestLayout>,
    );

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ─── Boundary scenarios ───────────────────────────────────────────────────────

describe("InvestLayout — boundary cases", () => {
  it("renders without crashing when children prop is omitted entirely", () => {
    render(<InvestLayout />);
    expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
  });

  it("renders undefined children as empty (React-standard behaviour)", () => {
    render(<InvestLayout>{undefined}</InvestLayout>);
    expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
  });
});

// ─── Regression: shell is always present ─────────────────────────────────────

describe("InvestLayout — regression (context boundary preserved)", () => {
  it("always wraps output in MarketplaceShell regardless of children type", () => {
    const spy = suppressConsoleError();

    // Even with an invalid child, the shell must be in the tree.
    render(<InvestLayout>{({ bad: true })}</InvestLayout>);
    expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("renders MarketplaceShell with valid children correctly — no shell bypass", () => {
    render(
      <InvestLayout>
        <section data-testid="page-content">Page</section>
      </InvestLayout>,
    );

    const shell = screen.getByTestId("marketplace-shell");
    const content = screen.getByTestId("page-content");

    // Content must be inside the shell, not a sibling.
    expect(shell).toContainElement(content);
  });
});
