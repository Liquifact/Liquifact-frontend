/**
 * Regression tests for app/invest/[id]/error.js
 *
 * Covers the concurrent-execution invariants documented in the component:
 *   1. Double-reporting race (StrictMode / fast remount) → idempotent by error identity
 *   2. Stale async sink after error-prop change → active flag prevents stale write
 *   3. Side-effects after unmount → isMountedRef prevents post-unmount setState
 *   4. Rapid reset-button clicks → isResetting guard prevents multi-fire
 *   5. Null / undefined error → no crash, no reportError call
 *   6. Correct copy, ARIA, and accessibility (axe)
 *   7. Back-to-marketplace link always present
 */

import "@testing-library/jest-dom";
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("@/lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

jest.mock("@/components/ErrorBanner", () => {
  function MockErrorBanner({
    title,
    description,
    actionLabel,
    onAction,
    previewLabel,
    variant,
  }) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="error-banner"
        data-variant={variant}
        data-preview={previewLabel}
      >
        <h2>{title}</h2>
        <p>{description}</p>
        {actionLabel && (
          <button type="button" onClick={onAction} data-testid="banner-action-btn">
            {actionLabel}
          </button>
        )}
      </div>
    );
  }
  MockErrorBanner.displayName = "MockErrorBanner";
  return MockErrorBanner;
});

// Mock next/link as a plain anchor so tests don't need the full Next.js router.
jest.mock("next/link", () => {
  function MockLink({ href, children, ...rest }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  MockLink.displayName = "MockLink";
  return { __esModule: true, default: MockLink };
});

// ── Import SUT after mocks are wired ─────────────────────────────────────────

import InvoiceDetailError from "./error";
import { reportError } from "@/lib/observability/reportError";
import { copy } from "@/app/copy/en";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeError(message = "Invoice load failed", digest = undefined) {
  const err = new Error(message);
  if (digest !== undefined) err.digest = digest;
  return err;
}

/**
 * Renders the error boundary with sensible defaults.
 * Returns the render result plus a reset spy.
 */
function renderError(error = makeError(), reset = jest.fn()) {
  const result = render(<InvoiceDetailError error={error} reset={reset} />);
  return { ...result, reset };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Rendering ─────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders the branded error boundary container", () => {
    renderError();
    expect(screen.getByTestId("invest-id-error-boundary")).toBeInTheDocument();
  });

  it("renders an ErrorBanner with the correct copy strings", () => {
    renderError();
    expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    expect(screen.getAllByText(copy.error.title).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(copy.error.description)).toBeInTheDocument();
  });

  it("passes the server variant to ErrorBanner", () => {
    renderError();
    expect(screen.getByTestId("error-banner")).toHaveAttribute("data-variant", "server");
  });

  it("passes previewLabel copy to ErrorBanner", () => {
    renderError();
    expect(screen.getByTestId("error-banner")).toHaveAttribute(
      "data-preview",
      copy.error.previewLabel
    );
  });

  it("renders the visually-hidden h1 heading", () => {
    renderError();
    const h1 = document.querySelector("h1.sr-only");
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent(copy.error.title);
  });

  it("renders a main landmark with aria-labelledby pointing to the heading id", () => {
    renderError();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("aria-labelledby", "invest-error-heading");
  });

  it("always renders the back-to-marketplace link", () => {
    renderError();
    const link = screen.getByRole("link", { name: /back to marketplace/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/invest");
  });

  it("applies the dark slate-950 background class", () => {
    renderError();
    const container = screen.getByTestId("invest-id-error-boundary");
    expect(container.className).toContain("bg-slate-950");
  });
});

// ── 2. Error reporting — basic ────────────────────────────────────────────────

describe("error reporting — basic", () => {
  it("calls reportError once on mount with the error", async () => {
    const error = makeError("boom");
    renderError(error);
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));
    expect(reportError).toHaveBeenCalledWith(error, { digest: undefined });
  });

  it("forwards error.digest to reportError when present", async () => {
    const error = makeError("server error", "srv-digest-abc");
    renderError(error);
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));
    expect(reportError).toHaveBeenCalledWith(error, { digest: "srv-digest-abc" });
  });

  it("does not crash when error has no digest property", async () => {
    const error = makeError("no digest");
    delete error.digest;
    expect(() => renderError(error)).not.toThrow();
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));
    expect(reportError).toHaveBeenCalledWith(error, { digest: undefined });
  });

  it("does not call reportError when error is null", () => {
    expect(() =>
      render(<InvoiceDetailError error={null} reset={jest.fn()} />)
    ).not.toThrow();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("does not call reportError when error is undefined", () => {
    expect(() =>
      render(<InvoiceDetailError error={undefined} reset={jest.fn()} />)
    ).not.toThrow();
    expect(reportError).not.toHaveBeenCalled();
  });
});

// ── 3. Double-reporting race (StrictMode / fast remount) ─────────────────────

describe("concurrent safety — double-reporting race", () => {
  /**
   * Simulates the StrictMode double-effect pattern: same component instance,
   * effect fires, is cleaned up, then fires again immediately for THE SAME
   * error object (because React 18 Strict Mode runs effects twice on every
   * mount in development to surface unsafe patterns).
   *
   * The component uses a module-level WeakSet so the same Error instance is
   * never forwarded to the sink more than once, even across component remounts
   * within the same page lifecycle.
   */
  it("does not double-report when effect fires twice for the same error object", async () => {
    const error = makeError("strictmode-race");

    // First mount: error is reported, WeakSet is stamped.
    const { unmount } = render(<InvoiceDetailError error={error} reset={jest.fn()} />);
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));

    // Unmount (simulates StrictMode teardown phase).
    act(() => unmount());

    // Re-render with the SAME error instance in a NEW component instance.
    // The module-level WeakSet already contains this error → should NOT report.
    render(<InvoiceDetailError error={error} reset={jest.fn()} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Still only 1 total call; the remount on the same error object is a no-op.
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("re-reports when the error prop changes to a different error object", async () => {
    const error1 = makeError("first");
    const reset = jest.fn();
    const { rerender } = render(<InvoiceDetailError error={error1} reset={reset} />);
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));

    const error2 = makeError("second");
    act(() => {
      rerender(<InvoiceDetailError error={error2} reset={reset} />);
    });

    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(2));
    expect(reportError).toHaveBeenLastCalledWith(error2, { digest: undefined });
  });
});

// ── 4. Stale async sink after error-prop change ───────────────────────────────

describe("concurrent safety — stale async sink", () => {
  it("does not stamp the new error as reported when cleanup fires before sink resolves", async () => {
    // Arrange: the sink is slow and never resolves during this test.
    let resolveSink;
    const slowReportError = jest.fn(
      () =>
        new Promise((r) => {
          resolveSink = r;
        })
    );

    const { reportError: mockReport } = jest.requireMock(
      "@/lib/observability/reportError"
    );
    mockReport.mockImplementationOnce(slowReportError);

    const error1 = makeError("slow-error");
    const error2 = makeError("fast-follow-up");
    const reset = jest.fn();

    const { rerender } = render(<InvoiceDetailError error={error1} reset={reset} />);
    // The slow sink has been called but not resolved.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(mockReport).toHaveBeenCalledTimes(1);

    // Swap the error prop — this triggers effect cleanup (active = false) then
    // a new effect run.
    act(() => {
      rerender(<InvoiceDetailError error={error2} reset={reset} />);
    });

    // Now resolve the stale sink — it must NOT mark error2 as reported because
    // active was false when the first call finally resolved.
    act(() => {
      resolveSink?.();
    });

    // The second error should also have been reported.
    await waitFor(() => expect(mockReport).toHaveBeenCalledTimes(2));
    expect(mockReport).toHaveBeenLastCalledWith(error2, { digest: undefined });
  });
});

// ── 5. Side-effects after unmount ─────────────────────────────────────────────

describe("concurrent safety — side-effects after unmount", () => {
  it("does not call setState after the component unmounts", async () => {
    // Install a slow async sink.
    let resolveSink;
    const { reportError: mockReport } = jest.requireMock(
      "@/lib/observability/reportError"
    );
    mockReport.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveSink = r;
        })
    );

    const error = makeError("unmount-race");
    const { unmount } = render(<InvoiceDetailError error={error} reset={jest.fn()} />);

    // Allow effect to fire.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Unmount while sink is still in flight.
    act(() => {
      unmount();
    });

    // Resolve the sink AFTER unmount — should not throw or warn.
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    act(() => {
      resolveSink?.();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // React 18 warns about setState on unmounted components.
    const reactWarnings = consoleSpy.mock.calls.filter(
      ([msg]) =>
        typeof msg === "string" &&
        msg.includes("unmounted component")
    );
    expect(reactWarnings).toHaveLength(0);
    consoleSpy.mockRestore();
  });
});

// ── 6. Rapid reset-button clicks ──────────────────────────────────────────────

describe("concurrent safety — rapid reset clicks", () => {
  it("calls reset() exactly once even when the button is clicked rapidly", async () => {
    const reset = jest.fn();
    const error = makeError("rapid-reset");

    render(<InvoiceDetailError error={error} reset={reset} />);
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));

    const btn = screen.getByTestId("invest-error-reset-btn");

    await act(async () => {
      await userEvent.click(btn);
    });
    // Button should be disabled after first click.
    expect(btn).toBeDisabled();

    // Additional clicks must be no-ops.
    await act(async () => {
      await userEvent.click(btn);
      await userEvent.click(btn);
    });

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("disables the reset button after the first click (isResetting)", async () => {
    const reset = jest.fn();
    renderError(makeError(), reset);
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));

    const btn = screen.getByTestId("invest-error-reset-btn");
    expect(btn).not.toBeDisabled();

    await act(async () => {
      await userEvent.click(btn);
    });

    expect(btn).toBeDisabled();
  });

  it("shows 'Retrying…' label while isResetting is true", async () => {
    const reset = jest.fn();
    renderError(makeError(), reset);
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));

    await act(async () => {
      await userEvent.click(screen.getByTestId("invest-error-reset-btn"));
    });

    expect(screen.getByTestId("invest-error-reset-btn")).toHaveTextContent(/retrying/i);
  });
});

// ── 7. Reset does not trigger extra reportError calls ────────────────────────

describe("reset handler — no side-effect leak", () => {
  it("does not call reportError again when reset is clicked", async () => {
    const reset = jest.fn();
    renderError(makeError(), reset);
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      await userEvent.click(screen.getByTestId("invest-error-reset-btn"));
    });

    expect(reportError).not.toHaveBeenCalled();
  });
});

// ── 8. Accessibility ──────────────────────────────────────────────────────────

describe("accessibility", () => {
  it("the error banner has role=alert", () => {
    renderError();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("the error banner has aria-live=assertive", () => {
    renderError();
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("the reset button has aria-disabled when disabled", async () => {
    const reset = jest.fn();
    renderError(makeError(), reset);
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));

    await act(async () => {
      await userEvent.click(screen.getByTestId("invest-error-reset-btn"));
    });

    const btn = screen.getByTestId("invest-error-reset-btn");
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });

  it("has no axe accessibility violations", async () => {
    const { container } = renderError();
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── 9. Idempotent retries on the same error ───────────────────────────────────

describe("idempotent retries", () => {
  it("only reports once per unique error object across multiple renders", async () => {
    const error = makeError("idempotent-test");
    const { rerender } = render(
      <InvoiceDetailError error={error} reset={jest.fn()} />
    );
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));

    // Re-render with the same error object several times.
    for (let i = 0; i < 5; i++) {
      act(() => {
        rerender(<InvoiceDetailError error={error} reset={jest.fn()} />);
      });
    }

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Despite multiple re-renders, reportError fires only once for that identity.
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("reports a new error even after the previous one was reported", async () => {
    const error1 = makeError("first-error");
    const error2 = makeError("second-error");
    const reset = jest.fn();

    const { rerender } = render(
      <InvoiceDetailError error={error1} reset={reset} />
    );
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(1));

    // Provide a fresh error (different reference).
    act(() => {
      rerender(<InvoiceDetailError error={error2} reset={reset} />);
    });

    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(2));
    expect(reportError).toHaveBeenNthCalledWith(1, error1, { digest: undefined });
    expect(reportError).toHaveBeenNthCalledWith(2, error2, { digest: undefined });
  });
});

// ── 10. Timing boundary — reporting in-flight disables reset ─────────────────

describe("timing boundary — in-flight reporting", () => {
  it("disables the reset button while reportError is in-flight", async () => {
    let resolveSink;
    const { reportError: mockReport } = jest.requireMock(
      "@/lib/observability/reportError"
    );
    mockReport.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveSink = r;
        })
    );

    const error = makeError("in-flight");
    render(<InvoiceDetailError error={error} reset={jest.fn()} />);

    // Immediately after mount the sink is pending → button should be disabled.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });

    expect(screen.getByTestId("invest-error-reset-btn")).toBeDisabled();

    // Resolve the sink — button should re-enable.
    act(() => {
      resolveSink?.();
    });

    await waitFor(() =>
      expect(screen.getByTestId("invest-error-reset-btn")).not.toBeDisabled()
    );
  });

  it("shows 'Reporting…' label while sink is in-flight", async () => {
    let resolveSink;
    const { reportError: mockReport } = jest.requireMock(
      "@/lib/observability/reportError"
    );
    mockReport.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveSink = r;
        })
    );

    const error = makeError("in-flight-label");
    render(<InvoiceDetailError error={error} reset={jest.fn()} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });

    expect(screen.getByTestId("invest-error-reset-btn")).toHaveTextContent(/reporting/i);

    act(() => {
      resolveSink?.();
    });
    await waitFor(() =>
      expect(screen.getByTestId("invest-error-reset-btn")).not.toHaveTextContent(/reporting/i)
    );
  });
});
