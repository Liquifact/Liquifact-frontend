import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MarketplaceErrorBoundary from "../MarketplaceErrorBoundary";
import { reportError } from "../../lib/observability/reportError";

jest.mock("../../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

jest.mock("../ErrorBanner", () => {
  function MockErrorBanner({ title, description, actionLabel, onAction }) {
    return (
      <div role="alert" aria-live="assertive" data-testid="error-banner">
        <h2>{title}</h2>
        <p>{description}</p>
        {actionLabel && (
          <button type="button" onClick={onAction} data-testid="retry-button">
            {actionLabel}
          </button>
        )}
      </div>
    );
  }
  MockErrorBanner.displayName = "MockErrorBanner";
  return MockErrorBanner;
});

function GoodChild() {
  return <div data-testid="good-child">All good</div>;
}

let throwError = true;

function BadChild() {
  if (throwError) {
    throw new Error("Intentional render error");
  }
  return <div data-testid="good-child">Fixed</div>;
}

beforeEach(() => {
  jest.clearAllMocks();
  throwError = true;
});

describe("MarketplaceErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <MarketplaceErrorBoundary>
        <GoodChild />
      </MarketplaceErrorBoundary>
    );

    expect(screen.getByTestId("good-child")).toBeInTheDocument();
    expect(screen.queryByTestId("error-banner")).not.toBeInTheDocument();
  });

  it("renders fallback UI when a child throws", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MarketplaceErrorBoundary>
        <BadChild />
      </MarketplaceErrorBoundary>
    );

    expect(screen.getByTestId("marketplace-error-boundary")).toBeInTheDocument();
    expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    expect(screen.getByTestId("retry-button")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("reports the error via reportError when a child throws", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MarketplaceErrorBoundary>
        <BadChild />
      </MarketplaceErrorBoundary>
    );

    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      componentStack: expect.any(String),
      boundary: "MarketplaceErrorBoundary",
    });

    consoleErrorSpy.mockRestore();
  });

  it("retry button re-renders children and clears error state", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <MarketplaceErrorBoundary>
        <BadChild />
      </MarketplaceErrorBoundary>
    );

    expect(screen.getByTestId("error-banner")).toBeInTheDocument();

    // Toggle the module-level flag so BadChild won't throw on re-render
    throwError = false;

    await userEvent.click(screen.getByTestId("retry-button"));

    // After retry, the boundary resets state and re-renders children.
    // Since the child no longer throws, the good content appears.
    rerender(
      <MarketplaceErrorBoundary>
        <BadChild />
      </MarketplaceErrorBoundary>
    );

    expect(screen.queryByTestId("error-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("good-child")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("does not call reportError when children render normally", () => {
    render(
      <MarketplaceErrorBoundary>
        <GoodChild />
      </MarketplaceErrorBoundary>
    );

    expect(reportError).not.toHaveBeenCalled();
  });

  it("shows the correct error copy in the fallback UI", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MarketplaceErrorBoundary>
        <BadChild />
      </MarketplaceErrorBoundary>
    );

    expect(screen.getByText("Unable to load investable invoices")).toBeInTheDocument();
    expect(
      screen.getByText("Unable to load investable invoices right now.")
    ).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
