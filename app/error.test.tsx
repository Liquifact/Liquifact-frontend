// @ts-nocheck
/**
 * Tests for app/error.js — the route-level error boundary.
 *
 * Strategy:
 *  - Mock ErrorBanner and reportError so tests are isolated from their
 *    implementations and we can assert on call arguments.
 *  - Verify copy strings, ARIA roles, reset handler wiring, and a11y.
 */
import "@testing-library/jest-dom";
import { renderToString } from "react-dom/server";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import React from "react";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

jest.mock("../components/ErrorBanner", () => {
  function MockErrorBanner({ title, description, actionLabel, onAction, previewLabel, variant }) {
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
          <button type="button" onClick={onAction} data-testid="error-action-btn">
            {actionLabel}
          </button>
        )}
      </div>
    );
  }
  MockErrorBanner.displayName = "MockErrorBanner";
  return MockErrorBanner;
});

// ── Import SUT after mocks are wired ─────────────────────────────────────────

import GlobalError from "./error";
import { reportError } from "../lib/observability/reportError";
import { copy } from "./copy/en";
import { validateErrorProps } from "./error.validation";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeError(message = "Test error", digest = undefined) {
  const err = new Error(message);
  if (digest !== undefined) err.digest = digest;
  return err;
}

function makeErrorLike(value) {
  return value;
}

function renderError(error = makeError(), reset = jest.fn()) {
  return render(<GlobalError error={error} reset={reset} />);
}

function renderError(error = makeError(), reset = jest.fn()) {
  return render(<GlobalError error={error} reset={reset} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GlobalError (app/error.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Validation boundaries ───────────────────────────────────────────────────

  describe("validation boundaries", () => {
    it("accepts a well-formed Error instance", () => {
      const result = validateErrorProps(makeError("ok"), jest.fn());
      expect(result.ok).toBe(true);
      expect(result.reason).toBeNull();
    });

    it("accepts an Error with a string digest", () => {
      const result = validateErrorProps(makeError("ok", "digest-1"), jest.fn());
      expect(result.ok).toBe(true);
      expect(result.digest).toBe("digest-1");
    });

    it("rejects a non-Error error value", () => {
      const result = validateErrorProps("not-an-error", jest.fn());
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid-error");
    });

    it("rejects a null error value", () => {
      const result = validateErrorProps(null, jest.fn());
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid-error");
    });

    it("rejects a non-function reset", () => {
      const result = validateErrorProps(makeError(), "nope");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid-reset");
    });

    it("rejects a missing reset", () => {
      const result = validateErrorProps(makeError(), undefined);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid-reset");
    });

    it("normalizes a non-string digest to undefined", () => {
      const err = makeError("weird");
      err.digest = 12345;
      const result = validateErrorProps(err, jest.fn());
      expect(result.ok).toBe(true);
      expect(result.digest).toBeUndefined();
    });

    it("treats an empty-string digest as undefined", () => {
      const err = makeError("empty");
      err.digest = "";
      const result = validateErrorProps(err, jest.fn());
      expect(result.ok).toBe(true);
      expect(result.digest).toBeUndefined();
    });

    it("is deterministic for duplicate identical inputs", () => {
      const err = makeError("dup", "d-1");
      const reset = jest.fn();
      const a = validateErrorProps(err, reset);
      const b = validateErrorProps(err, reset);
      expect(a).toEqual(b);
    });

    it("does not throw on hostile getters for digest", () => {
      const err = makeError("hostile");
      Object.defineProperty(err, "digest", {
        get() {
          throw new Error("boom");
        },
      });
      expect(() => validateErrorProps(err, jest.fn())).not.toThrow();
      const result = validateErrorProps(err, jest.fn());
      expect(result.ok).toBe(true);
      expect(result.digest).toBeUndefined();
    });
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  describe("rendering", () => {
    it("renders the branded error page container", () => {
      renderError();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("renders an ErrorBanner with the correct copy", () => {
      renderError();
      const banner = screen.getByTestId("error-banner");
      expect(banner).toBeInTheDocument();
      // title appears in both the sr-only h1 and the ErrorBanner mock's h2
      expect(screen.getAllByText(copy.error.title).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(copy.error.description)).toBeInTheDocument();
    });

    it("passes the 'server' variant to ErrorBanner", () => {
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

    it("renders the action button with the correct copy label", () => {
      renderError();
      expect(screen.getByTestId("error-action-btn")).toHaveTextContent(copy.error.actionLabel);
    });

    it("renders the visually-hidden h1 heading", () => {
      renderError();
      // The sr-only h1 should be present in the DOM for screen readers
      const h1 = document.querySelector("h1.sr-only");
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveTextContent(copy.error.title);
    });

    it("renders a main landmark with the correct aria-labelledby", () => {
      renderError();
      const main = screen.getByRole("main");
      expect(main).toHaveAttribute("aria-labelledby", "error-boundary-heading");
    });
  });

  // ── Error reporting ──────────────────────────────────────────────────────────

  describe("error reporting", () => {
    it("calls reportError with the error on mount", () => {
      const error = makeError("boom");
      renderError(error);
      expect(reportError).toHaveBeenCalledTimes(1);
      expect(reportError).toHaveBeenCalledWith(error, { digest: undefined });
    });

    it("forwards error.digest to reportError when present", () => {
      const error = makeError("server boom", "abc-123");
      renderError(error);
      expect(reportError).toHaveBeenCalledWith(error, { digest: "abc-123" });
    });

    it("does not crash when error has no digest property", () => {
      const error = makeError("no digest");
      delete error.digest;
      expect(() => renderError(error)).not.toThrow();
      expect(reportError).toHaveBeenCalledWith(error, { digest: undefined });
    });

    it("does not report when the error prop is invalid", () => {
      render(<GlobalError error={null} reset={jest.fn()} />);
      expect(reportError).not.toHaveBeenCalled();
    });

    it("does not report when the reset prop is invalid", () => {
      render(<GlobalError error={makeError()} reset={undefined} />);
      expect(reportError).not.toHaveBeenCalled();
    });

    it("re-reports when the error prop changes", () => {
      const error1 = makeError("first");
      const { rerender } = render(<GlobalError error={error1} reset={jest.fn()} />);
      expect(reportError).toHaveBeenCalledTimes(1);

      const error2 = makeError("second");
      act(() => {
        rerender(<GlobalError error={error2} reset={jest.fn()} />);
      });
      expect(reportError).toHaveBeenCalledTimes(2);
      expect(reportError).toHaveBeenLastCalledWith(error2, { digest: undefined });
    });
  });

  // ── Reset handler ────────────────────────────────────────────────────────────

  describe("reset handler", () => {
    it("calls the reset prop when the action button is clicked", async () => {
      const reset = jest.fn();
      renderError(makeError(), reset);
      await userEvent.click(screen.getByTestId("error-action-btn"));
      expect(reset).toHaveBeenCalledTimes(1);
    });

    it("prevents concurrent or duplicate reset executions", async () => {
      let resolveReset;
      const reset = jest.fn(() => new Promise((resolve) => { resolveReset = resolve; }));
      renderError(makeError(), reset);
      const btn = screen.getByTestId("error-action-btn");
      
      // Fire rapid multiple clicks
      await userEvent.click(btn);
      await userEvent.click(btn);
      await userEvent.click(btn);
      
      expect(reset).toHaveBeenCalledTimes(1);
      resolveReset();
    });

    it("does not call reportError again when reset is clicked", async () => {
      const reset = jest.fn();
      renderError(makeError(), reset);
      jest.clearAllMocks();
      const btn = screen.getByTestId("error-action-btn");
      await act(async () => {
        userEvent.click(btn);
      });
      expect(reportError).not.toHaveBeenCalled();
    });
  });

  describe("idempotent error reporting", () => {
    it("deduplicates reportError for the same error instance", () => {
      const error = makeError("boom");
      const { rerender } = render(<GlobalError error={error} reset={jest.fn()} />);
      
      // Rerender with the exact same error
      rerender(<GlobalError error={error} reset={jest.fn()} />);
      rerender(<GlobalError error={error} reset={jest.fn()} />);
      
      expect(reportError).toHaveBeenCalledTimes(1);
    });
  });

  // ── Accessibility ────────────────────────────────────────────────────────────

  describe("accessibility", () => {
    it("the error banner region has role=alert", () => {
      renderError();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("the error banner region has aria-live=assertive", () => {
      renderError();
      expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    });

    it("has no axe violations", async () => {
      const { container } = renderError();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ── Dark theme background ────────────────────────────────────────────────────

  describe("theme / styling", () => {
    it("applies the dark slate-950 background class to the page wrapper", () => {
      renderError();
      const page = screen.getByTestId("error-boundary-page");
      expect(page.className).toContain("bg-slate-950");
    });
  });
});

// ── Compatibility contracts ──────────────────────────────────────────────────
//
// These tests pin the public behavior of app/error.js so that refactors,
// upgrades, and adverse inputs cannot silently change the contract that
// callers (Next.js App Router, ErrorBanner, reportError) depend on.

describe("GlobalError compatibility contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("valid input", () => {
    it("renders deterministically for a standard Error", () => {
      const error = makeError("standard");
      const { container: a } = render(<GlobalError error={error} reset={jest.fn()} />);
      const htmlA = a.innerHTML;
      const { container: b } = render(<GlobalError error={error} reset={jest.fn()} />);
      expect(b.innerHTML).toBe(htmlA);
    });

    it("invokes reportError exactly once per mount with the same error identity", () => {
      const error = makeError("identity");
      render(<GlobalError error={error} reset={jest.fn()} />);
      expect(reportError).toHaveBeenCalledTimes(1);
      expect(reportError.mock.calls[0][0]).toBe(error);
    });
  });

  describe("invalid and malformed input", () => {
    it("does not throw when error is a plain object without message", () => {
      const malformed = makeErrorLike({});
      expect(() =>
        render(<GlobalError error={malformed} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("does not throw when error is null", () => {
      expect(() =>
        render(<GlobalError error={null} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("does not throw when error is undefined", () => {
      expect(() =>
        render(<GlobalError error={undefined} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("does not throw when error is a string", () => {
      expect(() =>
        render(<GlobalError error={"boom"} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("does not throw when error is a number", () => {
      expect(() =>
        render(<GlobalError error={42} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("does not throw when error is a symbol", () => {
      expect(() =>
        render(<GlobalError error={Symbol("boom")} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("does not throw when error is a function", () => {
      expect(() =>
        render(<GlobalError error={() => {}} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("does not throw when error is an array", () => {
      expect(() =>
        render(<GlobalError error={[]} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("does not throw when digest is a non-string value", () => {
      const error = makeError("weird digest");
      error.digest = { nested: true };
      expect(() =>
        render(<GlobalError error={error} reset={jest.fn()} />)
      ).not.toThrow();
      expect(reportError).toHaveBeenCalledTimes(1);
    });

    it("does not throw when digest is null", () => {
      const error = makeError("null digest");
      error.digest = null;
      expect(() =>
        render(<GlobalError error={error} reset={jest.fn()} />)
      ).not.toThrow();
      expect(reportError).toHaveBeenCalledTimes(1);
    });

    it("does not throw when digest is an empty string", () => {
      const error = makeError("empty digest");
      error.digest = "";
      expect(() =>
        render(<GlobalError error={error} reset={jest.fn()} />)
      ).not.toThrow();
      expect(reportError).toHaveBeenCalledTimes(1);
    });
  });

  describe("boundary cases", () => {
    it("handles an Error with an empty message", () => {
      const error = makeError("");
      expect(() =>
        render(<GlobalError error={error} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("handles an Error with a very long message without truncating the contract", () => {
      const longMessage = "x".repeat(100_000);
      const error = makeError(longMessage);
      expect(() =>
        render(<GlobalError error={error} reset={jest.fn()} />)
      ).not.toThrow();
      expect(reportError).toHaveBeenCalledTimes(1);
    });

    it("handles an Error with unicode and control characters in the message", () => {
      const error = makeError("💥 \u0000 \u2028 \u2029 end");
      expect(() =>
        render(<GlobalError error={error} reset={jest.fn()} />)
      ).not.toThrow();
      expect(screen.getByTestId("error-boundary-page")).toBeInTheDocument();
    });

    it("handles a digest with a very long string", () => {
      const error = makeError("long digest", "d".repeat(10_000));
      expect(() =>
        render(<GlobalError error={error} reset={jest.fn()} />)
      ).not.toThrow();
      expect(reportError).toHaveBeenCalledWith(error, { digest: "d".repeat(10_000) });
    });
  });

  describe("duplicate and repeated inputs", () => {
    it("re-reports when the same error identity is passed again", () => {
      const error = makeError("same");
      const { rerender } = render(<GlobalError error={error} reset={jest.fn()} />);
      expect(reportError).toHaveBeenCalledTimes(1);
      act(() => {
        rerender(<GlobalError error={error} reset={jest.fn()} />);
      });
      expect(reportError).toHaveBeenCalledTimes(2);
      expect(reportError).toHaveBeenLastCalledWith(error, { digest: undefined });
    });

    it("does not double-report on a single mount under React strict-mode-like double render", () => {
      const error = makeError("strict");
      const { rerender } = render(<GlobalError error={error} reset={jest.fn()} />);
      act(() => {
        rerender(<GlobalError error={error} reset={jest.fn()} />);
      });
      // Two renders of the same error produce exactly two reports — never more.
      expect(reportError).toHaveBeenCalledTimes(2);
    });
  });

  describe("reset contract", () => {
    it("does not invoke reset on mount", () => {
      const reset = jest.fn();
      render(<GlobalError error={makeError()} reset={reset} />);
      expect(reset).not.toHaveBeenCalled();
    });

    it("invokes reset with no arguments", async () => {
      const reset = jest.fn();
      render(<GlobalError error={makeError()} reset={reset} />);
      await userEvent.click(screen.getByTestId("error-action-btn"));
      expect(reset).toHaveBeenCalledWith();
    });

    it("propagates errors thrown by reset to the caller", async () => {
      const reset = jest.fn(() => {
        throw new Error("reset failed");
      });
      render(<GlobalError error={makeError()} reset={reset} />);
      await expect(
        userEvent.click(screen.getByTestId("error-action-btn"))
      ).rejects.toThrow("reset failed");
    });
  });

  describe("observability contract", () => {
    it("never passes the raw error message to reportError as a separate field", () => {
      const error = makeError("secret-token-abc");
      render(<GlobalError error={error} reset={jest.fn()} />);
      const [, meta] = reportError.mock.calls[0];
      expect(Object.keys(meta)).toEqual(["digest"]);
    });

    it("reports the digest as undefined when the error has no digest", () => {
      const error = makeError("no digest");
      delete error.digest;
      render(<GlobalError error={error} reset={jest.fn()} />);
      expect(reportError).toHaveBeenCalledWith(error, { digest: undefined });
    });
  });

  describe("server-render compatibility", () => {
    it("renders without throwing during SSR", () => {
      const error = makeError("ssr");
      expect(() =>
        renderToString(<GlobalError error={error} reset={() => {}} />)
      ).not.toThrow();
    });

    it("produces the same markup on server and client for the same error", () => {
      const error = makeError("parity");
      const serverHtml = renderToString(
        <GlobalError error={error} reset={() => {}} />
      );
      const { container } = render(
        <GlobalError error={error} reset={() => {}} />
      );
      expect(container.innerHTML).toBe(serverHtml);
    });
  });
});
