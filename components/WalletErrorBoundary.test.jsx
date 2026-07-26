/**
 * Tests for components/WalletErrorBoundary.jsx — the error boundary guarding
 * the wallet section of the header.
 *
 * Strategy:
 *  - Mock the reportError observability seam so we can assert the error is
 *    logged (and never silently swallowed) without touching the console sink.
 *  - Render the real ErrorBanner so the fallback's accessibility semantics
 *    (role="alert", aria-live="assertive", axe) are genuinely exercised.
 *  - React logs caught render errors to console.error; that noise is silenced
 *    per-test so a failing assertion is still readable.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import React from "react";

jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

import WalletErrorBoundary from "./WalletErrorBoundary";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

expect.extend(toHaveNoViolations);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Child that throws on render while `shouldThrow` is true. Module-level state
 * lets a test flip the behaviour before clicking Retry, so the remounted
 * subtree can succeed.
 */
function Boom({ shouldThrow, message = "wallet exploded" }) {
  if (shouldThrow) throw new Error(message);
  return <div data-testid="wallet-ok">wallet ok</div>;
}

/** Mounts/unmounts counter used to prove Retry really re-mounts the subtree. */
let mountCount = 0;
function CountingChild() {
  React.useEffect(() => {
    mountCount += 1;
  }, []);
  return <div data-testid="wallet-ok">wallet ok</div>;
}

let consoleErrorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  mountCount = 0;
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ── Normal render ─────────────────────────────────────────────────────────────

describe("WalletErrorBoundary — normal render", () => {
  it("renders children untouched when nothing throws", () => {
    render(
      <WalletErrorBoundary>
        <Boom shouldThrow={false} />
      </WalletErrorBoundary>
    );

    expect(screen.getByTestId("wallet-ok")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-error-fallback")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not report anything when nothing throws", () => {
    render(
      <WalletErrorBoundary>
        <Boom shouldThrow={false} />
      </WalletErrorBoundary>
    );

    expect(reportError).not.toHaveBeenCalled();
  });

  it("adds no wrapper element around children (header layout unaffected)", () => {
    const { container } = render(
      <WalletErrorBoundary>
        <span data-testid="only-child">x</span>
      </WalletErrorBoundary>
    );

    expect(container.firstChild).toBe(screen.getByTestId("only-child"));
  });
});

// ── Child throws ──────────────────────────────────────────────────────────────

describe("WalletErrorBoundary — child throws", () => {
  it("renders the fallback instead of blanking the section", () => {
    render(
      <WalletErrorBoundary>
        <Boom shouldThrow />
      </WalletErrorBoundary>
    );

    expect(screen.getByTestId("wallet-error-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-ok")).not.toBeInTheDocument();
  });

  it("shows the wallet error copy and retry action", () => {
    render(
      <WalletErrorBoundary>
        <Boom shouldThrow />
      </WalletErrorBoundary>
    );

    expect(screen.getByText(copy.wallet.errorTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.wallet.errorDescription)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.wallet.errorActionLabel })).toBeInTheDocument();
  });

  it("announces the fallback assertively to assistive tech", () => {
    render(
      <WalletErrorBoundary>
        <Boom shouldThrow />
      </WalletErrorBoundary>
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("has no accessibility violations in the fallback state", async () => {
    const { container } = render(
      <WalletErrorBoundary>
        <Boom shouldThrow />
      </WalletErrorBoundary>
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("logs the error through the reportError seam (not swallowed)", () => {
    render(
      <WalletErrorBoundary>
        <Boom shouldThrow message="boom-1" />
      </WalletErrorBoundary>
    );

    expect(reportError).toHaveBeenCalledTimes(1);
    const [error, context] = reportError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("boom-1");
    expect(context).toMatchObject({ boundary: "WalletErrorBoundary" });
    expect(typeof context.componentStack).toBe("string");
    expect(context.componentStack.length).toBeGreaterThan(0);
  });
});

// ── Retry ─────────────────────────────────────────────────────────────────────

describe("WalletErrorBoundary — retry", () => {
  it("re-renders the children when the failure has cleared", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [broken, setBroken] = React.useState(true);
      return (
        <WalletErrorBoundary onReset={() => setBroken(false)}>
          <Boom shouldThrow={broken} />
        </WalletErrorBoundary>
      );
    }

    render(<Harness />);
    expect(screen.getByTestId("wallet-error-fallback")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: copy.wallet.errorActionLabel }));

    expect(screen.getByTestId("wallet-ok")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-error-fallback")).not.toBeInTheDocument();
  });

  it("mounts a fresh child instance on retry (no stale state carried over)", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [broken, setBroken] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setBroken(true)}>
            break
          </button>
          <WalletErrorBoundary onReset={() => setBroken(false)}>
            {broken ? <Boom shouldThrow /> : <CountingChild />}
          </WalletErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    expect(mountCount).toBe(1);

    await user.click(screen.getByRole("button", { name: "break" }));
    expect(screen.getByTestId("wallet-error-fallback")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: copy.wallet.errorActionLabel }));
    expect(screen.getByTestId("wallet-ok")).toBeInTheDocument();
    expect(mountCount).toBe(2);
  });

  it("fires the optional onReset callback on retry", async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();

    render(
      <WalletErrorBoundary onReset={onReset}>
        <Boom shouldThrow />
      </WalletErrorBoundary>
    );

    await user.click(screen.getByRole("button", { name: copy.wallet.errorActionLabel }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("works without an onReset prop", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [broken, setBroken] = React.useState(true);
      return (
        <>
          <button type="button" onClick={() => setBroken(false)}>
            repair
          </button>
          <WalletErrorBoundary>
            <Boom shouldThrow={broken} />
          </WalletErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "repair" }));
    await user.click(screen.getByRole("button", { name: copy.wallet.errorActionLabel }));

    expect(screen.getByTestId("wallet-ok")).toBeInTheDocument();
  });

  it("catches and re-reports when the retried render throws again", async () => {
    const user = userEvent.setup();

    render(
      <WalletErrorBoundary>
        <Boom shouldThrow message="boom-again" />
      </WalletErrorBoundary>
    );

    expect(reportError).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: copy.wallet.errorActionLabel }));

    // Still broken → fallback stays up and the second failure is logged too.
    expect(screen.getByTestId("wallet-error-fallback")).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledTimes(2);
    expect(reportError.mock.calls[1][0].message).toBe("boom-again");
  });
});
