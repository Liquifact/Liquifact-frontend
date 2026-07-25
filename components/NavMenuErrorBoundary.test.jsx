/**
 * Tests for components/NavMenuErrorBoundary.jsx
 *
 * Strategy mirrors app/error.test.tsx:
 *  - Mock ErrorBanner and reportError so tests are isolated from their
 *    implementations and we can assert on call arguments.
 *  - Cover: normal render passthrough, a child that throws, the accessible
 *    fallback, the retry action re-rendering children, and that the error
 *    is always logged (never swallowed silently).
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import React from "react";

// ── Module mocks ──────────────────────────────────────────────────────────

jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

jest.mock("./ErrorBanner", () => {
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

// ── Import SUT after mocks are wired ────────────────────────────────────────

import NavMenuErrorBoundary from "./NavMenuErrorBoundary";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

// ── Test fixtures ───────────────────────────────────────────────────────────

/** Renders its children normally, or throws once render-count reaches `throwOnRenderCount`. */
function Bomb({ shouldThrow, message = "nav boom" }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="nav-content">nav content</div>;
}

// A stateful wrapper so we can flip `shouldThrow` from true → false between
// the boundary's fallback and a successful retry, the way a real transient
// nav failure (e.g. a bad usePathname value mid-transition) would recover.
class ToggleableBomb extends React.Component {
  render() {
    return <Bomb shouldThrow={this.props.shouldThrow} message={this.props.message} />;
  }
}

function renderBoundary(children) {
  return render(<NavMenuErrorBoundary>{children}</NavMenuErrorBoundary>);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("NavMenuErrorBoundary", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // React logs caught errors to console.error even when a boundary catches
    // them; silence that expected noise so test output stays readable.
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("normal render", () => {
    it("renders children unaffected when nothing throws", () => {
      renderBoundary(<div data-testid="nav-content">nav content</div>);
      expect(screen.getByTestId("nav-content")).toBeInTheDocument();
      expect(screen.queryByTestId("nav-error-boundary")).not.toBeInTheDocument();
    });

    it("does not call reportError when nothing throws", () => {
      renderBoundary(<div data-testid="nav-content">nav content</div>);
      expect(reportError).not.toHaveBeenCalled();
    });
  });

  describe("child throws", () => {
    it("catches the error and renders the fallback instead of blanking the page", () => {
      renderBoundary(<Bomb shouldThrow />);
      expect(screen.getByTestId("nav-error-boundary")).toBeInTheDocument();
      expect(screen.queryByTestId("nav-content")).not.toBeInTheDocument();
    });

    it("renders an accessible alert with the nav-specific copy", () => {
      renderBoundary(<Bomb shouldThrow />);
      const banner = screen.getByTestId("error-banner");
      expect(banner).toBeInTheDocument();
      expect(screen.getByText(copy.nav.errorTitle)).toBeInTheDocument();
      expect(screen.getByText(copy.nav.errorDescription)).toBeInTheDocument();
      expect(banner).toHaveAttribute("data-variant", "error");
    });

    it("renders a Retry action button with the correct label", () => {
      renderBoundary(<Bomb shouldThrow />);
      expect(screen.getByTestId("error-action-btn")).toHaveTextContent(copy.nav.errorActionLabel);
    });

    it("logs the error via reportError instead of swallowing it", () => {
      renderBoundary(<Bomb shouldThrow message="nav render exploded" />);
      expect(reportError).toHaveBeenCalledTimes(1);
      const [loggedError, context] = reportError.mock.calls[0];
      expect(loggedError).toBeInstanceOf(Error);
      expect(loggedError.message).toBe("nav render exploded");
      expect(context).toMatchObject({ boundary: "NavMenuErrorBoundary" });
    });
  });

  describe("retry", () => {
    it("re-renders children when retry is clicked and the error no longer occurs", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <NavMenuErrorBoundary>
          <ToggleableBomb shouldThrow />
        </NavMenuErrorBoundary>
      );

      expect(screen.getByTestId("nav-error-boundary")).toBeInTheDocument();

      // Fix the underlying condition (e.g. transient state resolved) before
      // the user retries, mirroring how a real recoverable failure clears.
      rerender(
        <NavMenuErrorBoundary>
          <ToggleableBomb shouldThrow={false} />
        </NavMenuErrorBoundary>
      );

      await user.click(screen.getByTestId("error-action-btn"));

      expect(screen.getByTestId("nav-content")).toBeInTheDocument();
      expect(screen.queryByTestId("nav-error-boundary")).not.toBeInTheDocument();
    });

    it("shows the fallback again if the child throws again after retry", async () => {
      const user = userEvent.setup();
      renderBoundary(<Bomb shouldThrow />);

      expect(screen.getByTestId("nav-error-boundary")).toBeInTheDocument();
      await user.click(screen.getByTestId("error-action-btn"));

      // Child still throws — boundary should re-catch, not crash or blank.
      expect(screen.getByTestId("nav-error-boundary")).toBeInTheDocument();
      expect(reportError).toHaveBeenCalledTimes(2);
    });

    it("retry does not throw even when clicked multiple times", async () => {
      const user = userEvent.setup();
      renderBoundary(<Bomb shouldThrow />);
      const btn = screen.getByTestId("error-action-btn");

      await user.click(btn);
      await user.click(btn);
      await user.click(btn);
      expect(screen.getByTestId("nav-error-boundary")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("the fallback has no axe violations", async () => {
      const { container } = renderBoundary(<Bomb shouldThrow />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("the fallback is announced via role=alert / aria-live=assertive", () => {
      renderBoundary(<Bomb shouldThrow />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });
  });
});
