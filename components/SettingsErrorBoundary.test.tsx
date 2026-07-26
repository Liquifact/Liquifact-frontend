import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import SettingsErrorBoundary from "./SettingsErrorBoundary";
import * as observability from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

// Spy on reportError
jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

// Component that throws on demand
function ProblematicChild({
  shouldThrow = false,
  message = "Settings render failed",
}: {
  shouldThrow?: boolean;
  message?: string;
}) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="settings-child">Settings content loaded successfully</div>;
}

// Wrapper component to simulate stateful retry recovery
function StatefulTestContainer({ initialShouldThrow = true }: { initialShouldThrow?: boolean }) {
  const [shouldThrow, setShouldThrow] = useState(initialShouldThrow);

  return (
    <SettingsErrorBoundary onRetry={() => setShouldThrow(false)}>
      <ProblematicChild shouldThrow={shouldThrow} />
    </SettingsErrorBoundary>
  );
}

describe("SettingsErrorBoundary", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // React logs errors caught by error boundaries to console.error, suppress for clean test output
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children normally when no error occurs", () => {
    render(
      <SettingsErrorBoundary>
        <ProblematicChild shouldThrow={false} />
      </SettingsErrorBoundary>
    );

    expect(screen.getByTestId("settings-child")).toBeInTheDocument();
    expect(screen.queryByTestId("settings-error-boundary")).not.toBeInTheDocument();
    expect(observability.reportError).not.toHaveBeenCalled();
  });

  it("catches child render error and displays accessible fallback UI", () => {
    render(
      <SettingsErrorBoundary>
        <ProblematicChild shouldThrow={true} message="Settings explosion" />
      </SettingsErrorBoundary>
    );

    expect(screen.queryByTestId("settings-child")).not.toBeInTheDocument();
    expect(screen.getByTestId("settings-error-boundary")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Unable to load settings");
    expect(
      screen.getByText("An unexpected error occurred in the settings section. Please try again.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("logs caught error to reportError seam with boundary context", () => {
    render(
      <SettingsErrorBoundary>
        <ProblematicChild shouldThrow={true} message="Settings explosion" />
      </SettingsErrorBoundary>
    );

    expect(observability.reportError).toHaveBeenCalledTimes(1);
    expect(observability.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Settings explosion" }),
      expect.objectContaining({
        boundary: "SettingsErrorBoundary",
        componentStack: expect.any(String),
      })
    );
  });

  it("resets error state on retry click and re-renders children", () => {
    render(<StatefulTestContainer initialShouldThrow={true} />);

    // Initially in error state
    expect(screen.getByTestId("settings-error-boundary")).toBeInTheDocument();
    expect(screen.queryByTestId("settings-child")).not.toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(retryButton);

    // After retry, child recovers
    expect(screen.queryByTestId("settings-error-boundary")).not.toBeInTheDocument();
    expect(screen.getByTestId("settings-child")).toBeInTheDocument();
  });

  it("re-catches and renders fallback if child throws again on retry", () => {
    render(
      <SettingsErrorBoundary>
        <ProblematicChild shouldThrow={true} message="Persistent error" />
      </SettingsErrorBoundary>
    );

    expect(screen.getByTestId("settings-error-boundary")).toBeInTheDocument();

    // Click retry
    const retryButton = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(retryButton);

    // Still throws
    expect(screen.getByTestId("settings-error-boundary")).toBeInTheDocument();
    expect(observability.reportError).toHaveBeenCalledTimes(2);
  });

  it("supports custom fallback props and onError/onRetry callbacks", () => {
    const onErrorMock = jest.fn();
    const onRetryMock = jest.fn();

    render(
      <SettingsErrorBoundary
        fallbackTitle="Custom Error Title"
        fallbackDescription="Custom error details."
        fallbackActionLabel="Reload Settings"
        onError={onErrorMock}
        onRetry={onRetryMock}
      >
        <ProblematicChild shouldThrow={true} />
      </SettingsErrorBoundary>
    );

    expect(screen.getByText("Custom Error Title")).toBeInTheDocument();
    expect(screen.getByText("Custom error details.")).toBeInTheDocument();
    const customButton = screen.getByRole("button", { name: "Reload Settings" });
    expect(customButton).toBeInTheDocument();

    expect(onErrorMock).toHaveBeenCalledTimes(1);

    fireEvent.click(customButton);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it("uses default fallback strings if copy dictionary values are absent", () => {
    // Save original copy.settings
    const originalSettings = (copy as any).settings;
    (copy as any).settings = undefined;

    render(
      <SettingsErrorBoundary>
        <ProblematicChild shouldThrow={true} />
      </SettingsErrorBoundary>
    );

    expect(screen.getByText("Unable to load settings")).toBeInTheDocument();
    expect(
      screen.getByText("An unexpected error occurred in the settings section. Please try again.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

    // Restore
    (copy as any).settings = originalSettings;
  });

  it("has no accessibility violations in normal state", async () => {
    const { container } = render(
      <SettingsErrorBoundary>
        <ProblematicChild shouldThrow={false} />
      </SettingsErrorBoundary>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations in fallback error state", async () => {
    const { container } = render(
      <SettingsErrorBoundary>
        <ProblematicChild shouldThrow={true} />
      </SettingsErrorBoundary>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
