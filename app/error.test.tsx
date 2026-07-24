/**
 * Tests for app/error.js — the route-level error boundary.
 *
 * Strategy:
 *  - Mock ErrorBanner and reportError so tests are isolated from their
 *    implementations and we can assert on call arguments.
 *  - Verify copy strings, ARIA roles, reset handler wiring, and a11y.
 */
import "@testing-library/jest-dom";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeError(message = "Test error", digest = undefined) {
  const err = new Error(message);
  if (digest !== undefined) err.digest = digest;
  return err;
}

function renderError(error = makeError(), reset = jest.fn()) {
  return render(<GlobalError error={error} reset={reset} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GlobalError (app/error.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it("allows reset to be called multiple times (idempotent)", async () => {
      const reset = jest.fn();
      renderError(makeError(), reset);
      const btn = screen.getByTestId("error-action-btn");
      await userEvent.click(btn);
      await userEvent.click(btn);
      await userEvent.click(btn);
      expect(reset).toHaveBeenCalledTimes(3);
    });

    it("does not call reportError again when reset is clicked", async () => {
      const reset = jest.fn();
      renderError(makeError(), reset);
      jest.clearAllMocks();
      await userEvent.click(screen.getByTestId("error-action-btn"));
      expect(reportError).not.toHaveBeenCalled();
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
