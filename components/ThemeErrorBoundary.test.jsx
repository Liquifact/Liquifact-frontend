import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeErrorBoundary from "./ThemeErrorBoundary";
import * as observability from "../lib/observability/reportError";

// Mock reportError
jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

describe("ThemeErrorBoundary", () => {
  const Bomb = ({ shouldThrow }) => {
    if (shouldThrow) {
      throw new Error("Kaboom!");
    }
    return <div>Safe Content</div>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error in tests to avoid noisy output when errors are thrown intentionally
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders normal children when no error occurs", () => {
    render(
      <ThemeErrorBoundary>
        <Bomb shouldThrow={false} />
      </ThemeErrorBoundary>
    );

    expect(screen.getByText("Safe Content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(observability.reportError).not.toHaveBeenCalled();
  });

  it("renders the fallback UI when a child throws, and calls reportError", () => {
    render(
      <ThemeErrorBoundary>
        <Bomb shouldThrow={true} />
      </ThemeErrorBoundary>
    );

    expect(screen.queryByText("Safe Content")).not.toBeInTheDocument();
    
    // Check fallback UI
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Theme component failed to load")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry loading theme" })).toBeInTheDocument();

    // Ensure error was reported via the existing seam
    expect(observability.reportError).toHaveBeenCalledTimes(1);
    expect(observability.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it("clears the error state and re-renders children when the retry button is clicked", () => {
    const { rerender } = render(
      <ThemeErrorBoundary>
        <Bomb shouldThrow={true} />
      </ThemeErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Rerender with the Bomb no longer throwing
    rerender(
      <ThemeErrorBoundary>
        <Bomb shouldThrow={false} />
      </ThemeErrorBoundary>
    );

    // Click retry
    const retryButton = screen.getByRole("button", { name: "Retry loading theme" });
    fireEvent.click(retryButton);

    // Fallback UI should be gone, normal content back
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Safe Content")).toBeInTheDocument();
  });
});
