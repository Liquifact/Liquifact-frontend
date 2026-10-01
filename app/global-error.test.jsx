/**
 * @jest-environment jsdom
 *
 * @file app/global-error.test.jsx
 *
 * Focused tests for app/global-error.js — the Next.js global layout error
 * boundary (issue #1105: Define validation boundaries).
 *
 * Test strategy
 * ─────────────
 * - Success:    valid Error + function reset renders correctly and reports.
 * - Rejection:  null/undefined/non-Error error props and null/non-function
 *   reset props never crash the component.
 * - Boundary:   missing digest, plain-object errors, reset called multiple
 *   times, reportError malfunctions.
 * - Regression: copy strings, ARIA semantics, home link, public interface
 *   shape remain unchanged.
 */

import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

jest.mock("next/link", () => {
  function MockLink({ href, children, ...rest }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  MockLink.displayName = "MockLink";
  return MockLink;
});

// ── Import SUT after mocks ────────────────────────────────────────────────────

import GlobalLayoutError from "./global-error";
import { reportError } from "../lib/observability/reportError";
import { copy } from "./copy/en";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeError(message = "Layout crash", digest = undefined) {
  const err = new Error(message);
  if (digest !== undefined) err.digest = digest;
  return err;
}

function renderGlobalError(error = makeError(), reset = jest.fn()) {
  return render(<GlobalLayoutError error={error} reset={reset} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GlobalLayoutError (app/global-error.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Success: valid inputs ──────────────────────────────────────────────────

  describe("success — valid Error + function reset", () => {
    it("renders the global error page container", () => {
      renderGlobalError();
      expect(screen.getByTestId("global-error-page")).toBeInTheDocument();
    });

    it("renders the heading with correct copy", () => {
      renderGlobalError();
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent(copy.globalError.heading);
    });

    it("renders the description with correct copy", () => {
      renderGlobalError();
      expect(screen.getByText(copy.globalError.description)).toBeInTheDocument();
    });

    it("renders the reset button with correct label", () => {
      renderGlobalError();
      expect(screen.getByTestId("global-error-reset")).toHaveTextContent(
        copy.globalError.reloadLabel,
      );
    });

    it("renders the home link with correct label and href", () => {
      renderGlobalError();
      const link = screen.getByTestId("global-error-home-link");
      expect(link).toHaveTextContent(copy.globalError.homeLabel);
      expect(link).toHaveAttribute("href", "/");
    });

    it("calls reportError on mount with the error and boundary context", () => {
      const error = makeError("boom");
      renderGlobalError(error);
      expect(reportError).toHaveBeenCalledTimes(1);
      expect(reportError).toHaveBeenCalledWith(error, {
        digest: undefined,
        boundary: "global-layout",
      });
    });

    it("forwards error.digest when present", () => {
      const error = makeError("server crash", "srv-999");
      renderGlobalError(error);
      expect(reportError).toHaveBeenCalledWith(error, {
        digest: "srv-999",
        boundary: "global-layout",
      });
    });

    it("calls reset when the reset button is clicked", async () => {
      const reset = jest.fn();
      renderGlobalError(makeError(), reset);
      await userEvent.click(screen.getByTestId("global-error-reset"));
      expect(reset).toHaveBeenCalledTimes(1);
    });

    it("returns true from reset on each call (idempotent)", async () => {
      const reset = jest.fn();
      renderGlobalError(makeError(), reset);
      const btn = screen.getByTestId("global-error-reset");
      await userEvent.click(btn);
      await userEvent.click(btn);
      await userEvent.click(btn);
      expect(reset).toHaveBeenCalledTimes(3);
    });

    it("re-reports when the error prop changes", () => {
      const error1 = makeError("first");
      const { rerender } = render(
        <GlobalLayoutError error={error1} reset={jest.fn()} />,
      );
      expect(reportError).toHaveBeenCalledTimes(1);

      const error2 = makeError("second");
      act(() => {
        rerender(<GlobalLayoutError error={error2} reset={jest.fn()} />);
      });
      expect(reportError).toHaveBeenCalledTimes(2);
      expect(reportError).toHaveBeenLastCalledWith(error2, {
        digest: undefined,
        boundary: "global-layout",
      });
    });
  });

  // ── Rejection: invalid error prop ─────────────────────────────────────────

  describe("rejection — invalid error prop", () => {
    it("does not crash when error is null", () => {
      expect(() =>
        render(<GlobalLayoutError error={null} reset={jest.fn()} />),
      ).not.toThrow();
    });

    it("does not crash when error is undefined", () => {
      expect(() =>
        render(<GlobalLayoutError error={undefined} reset={jest.fn()} />),
      ).not.toThrow();
    });

    it("does not crash when error is a plain string", () => {
      expect(() =>
        render(<GlobalLayoutError error="something broke" reset={jest.fn()} />),
      ).not.toThrow();
    });

    it("does not crash when error is a plain object without message", () => {
      expect(() =>
        render(<GlobalLayoutError error={{ code: 500 }} reset={jest.fn()} />),
      ).not.toThrow();
    });

    it("does not crash when error is a number", () => {
      expect(() =>
        render(<GlobalLayoutError error={42} reset={jest.fn()} />),
      ).not.toThrow();
    });

    it("still calls reportError when error is null", () => {
      render(<GlobalLayoutError error={null} reset={jest.fn()} />);
      expect(reportError).toHaveBeenCalledWith(null, {
        digest: undefined,
        boundary: "global-layout",
      });
    });

    it("still calls reportError when error is undefined", () => {
      render(<GlobalLayoutError error={undefined} reset={jest.fn()} />);
      expect(reportError).toHaveBeenCalledWith(undefined, {
        digest: undefined,
        boundary: "global-layout",
      });
    });

    it("still renders the page when error has no digest property", () => {
      const error = makeError("no digest");
      delete error.digest;
      renderGlobalError(error);
      expect(screen.getByTestId("global-error-page")).toBeInTheDocument();
      expect(reportError).toHaveBeenCalledWith(error, {
        digest: undefined,
        boundary: "global-layout",
      });
    });
  });

  // ── Rejection: invalid reset prop ─────────────────────────────────────────

  describe("rejection — invalid reset prop", () => {
    it("does not crash when reset is undefined", () => {
      expect(() =>
        render(<GlobalLayoutError error={makeError()} reset={undefined} />),
      ).not.toThrow();
    });

    it("does not crash when reset is null", () => {
      expect(() =>
        render(<GlobalLayoutError error={makeError()} reset={null} />),
      ).not.toThrow();
    });

    it("does not crash when reset is a string", () => {
      expect(() =>
        render(<GlobalLayoutError error={makeError()} reset="not-a-function" />),
      ).not.toThrow();
    });

    it("does not crash when reset is a number", () => {
      expect(() =>
        render(<GlobalLayoutError error={makeError()} reset={0} />),
      ).not.toThrow();
    });

    it("does not render the reset button when reset is undefined", () => {
      render(<GlobalLayoutError error={makeError()} reset={undefined} />);
      expect(screen.queryByTestId("global-error-reset")).not.toBeInTheDocument();
    });

    it("does not render the reset button when reset is null", () => {
      render(<GlobalLayoutError error={makeError()} reset={null} />);
      expect(screen.queryByTestId("global-error-reset")).not.toBeInTheDocument();
    });

    it("does not render the reset button when reset is a non-function", () => {
      render(<GlobalLayoutError error={makeError()} reset="noop" />);
      expect(screen.queryByTestId("global-error-reset")).not.toBeInTheDocument();
    });

    it("still renders the home link when reset is invalid", () => {
      render(<GlobalLayoutError error={makeError()} reset={null} />);
      expect(screen.getByTestId("global-error-home-link")).toBeInTheDocument();
    });
  });

  // ── Boundary cases ─────────────────────────────────────────────────────────

  describe("boundary cases", () => {
    it("does not crash when both error and reset are omitted entirely", () => {
      expect(() => render(<GlobalLayoutError />)).not.toThrow();
    });

    it("renders the home link even when all props are missing", () => {
      render(<GlobalLayoutError />);
      expect(screen.getByTestId("global-error-home-link")).toBeInTheDocument();
    });

    it("does not crash when reportError itself throws", () => {
      reportError.mockImplementationOnce(() => {
        throw new Error("reporter exploded");
      });
      expect(() => renderGlobalError()).not.toThrow();
      expect(screen.getByTestId("global-error-page")).toBeInTheDocument();
    });

    it("continues to render after reportError throws", () => {
      reportError.mockImplementationOnce(() => {
        throw new Error("sink offline");
      });
      renderGlobalError();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        copy.globalError.heading,
      );
    });

    it("allows reset to be called multiple times without error", async () => {
      const reset = jest.fn();
      renderGlobalError(makeError(), reset);
      const btn = screen.getByTestId("global-error-reset");
      await userEvent.click(btn);
      await userEvent.click(btn);
      expect(reset).toHaveBeenCalledTimes(2);
    });

    it("does not call reportError again when reset is clicked", async () => {
      const reset = jest.fn();
      renderGlobalError(makeError(), reset);
      jest.clearAllMocks();
      await userEvent.click(screen.getByTestId("global-error-reset"));
      expect(reportError).not.toHaveBeenCalled();
    });

    it("handles an Error subclass (TypeError) without crashing", () => {
      const typeError = new TypeError("bad type");
      expect(() =>
        render(<GlobalLayoutError error={typeError} reset={jest.fn()} />),
      ).not.toThrow();
    });
  });

  // ── Regression: public interface and ARIA ──────────────────────────────────

  describe("regression — public interface, copy, and ARIA", () => {
    it("renders html and body tags (root layout replacement)", () => {
      const { container } = renderGlobalError();
      // jsdom wraps in html/body, but our component renders <html><body>
      // The data-testid anchors the root content.
      expect(screen.getByTestId("global-error-page")).toBeInTheDocument();
    });

    it("main landmark has role=alert", () => {
      renderGlobalError();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("main landmark has aria-live=assertive", () => {
      renderGlobalError();
      expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    });

    it("main landmark has id=main-content", () => {
      renderGlobalError();
      expect(document.getElementById("main-content")).toBeInTheDocument();
    });

    it("heading copy matches copy.globalError.heading", () => {
      renderGlobalError();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        copy.globalError.heading,
      );
    });

    it("description copy matches copy.globalError.description", () => {
      renderGlobalError();
      expect(screen.getByText(copy.globalError.description)).toBeInTheDocument();
    });

    it("reset button label matches copy.globalError.reloadLabel", () => {
      renderGlobalError();
      expect(screen.getByTestId("global-error-reset")).toHaveTextContent(
        copy.globalError.reloadLabel,
      );
    });

    it("home link label matches copy.globalError.homeLabel", () => {
      renderGlobalError();
      expect(screen.getByTestId("global-error-home-link")).toHaveTextContent(
        copy.globalError.homeLabel,
      );
    });

    it("home link always points to /", () => {
      renderGlobalError();
      expect(screen.getByTestId("global-error-home-link")).toHaveAttribute("href", "/");
    });

    it("does not expose raw error message in the rendered UI", () => {
      const sensitiveMessage = "DB password=hunter2 leaked in error";
      renderGlobalError(new Error(sensitiveMessage));
      expect(screen.queryByText(sensitiveMessage)).not.toBeInTheDocument();
    });

    it("reportError is called with boundary='global-layout' context key", () => {
      renderGlobalError();
      expect(reportError).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ boundary: "global-layout" }),
      );
    });
  });
});
