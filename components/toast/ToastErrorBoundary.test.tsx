import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe } from "jest-axe";
import ToastErrorBoundary from "./ToastErrorBoundary";
import { setReporter, resetReporter } from "../../lib/observability/reportError";

// A controllable child so tests can force a render throw without needing a
// real rendering bug, then clear the condition to exercise retry/recovery.
let mockShouldThrow = true;
function Bomb() {
  if (mockShouldThrow) {
    throw new Error("Simulated toast render failure");
  }
  return <div>Toast rendered fine</div>;
}

describe("ToastErrorBoundary", () => {
  beforeEach(() => {
    mockShouldThrow = true;
    jest.spyOn(console, "error").mockImplementation(() => {});
    resetReporter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetReporter();
  });

  it("renders children normally when nothing throws", () => {
    mockShouldThrow = false;
    render(
      <ToastErrorBoundary>
        <Bomb />
      </ToastErrorBoundary>
    );

    expect(screen.getByText("Toast rendered fine")).toBeInTheDocument();
    expect(screen.queryByTestId("toast-error-boundary")).not.toBeInTheDocument();
  });

  it("shows an accessible fallback with a retry control when the child throws", () => {
    render(
      <ToastErrorBoundary>
        <Bomb />
      </ToastErrorBoundary>
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Notifications failed to load");
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("logs the error via the shared reportError seam instead of swallowing it", () => {
    const reporter = jest.fn();
    setReporter(reporter);

    render(
      <ToastErrorBoundary>
        <Bomb />
      </ToastErrorBoundary>
    );

    expect(reporter).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ boundary: "ToastErrorBoundary" })
    );
  });

  it("recovers and renders children again after Retry once the underlying issue clears", () => {
    render(
      <ToastErrorBoundary>
        <Bomb />
      </ToastErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    mockShouldThrow = false;
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    });

    expect(screen.getByText("Toast rendered fine")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("has no axe violations in the fallback state", async () => {
    const { container } = render(
      <ToastErrorBoundary>
        <Bomb />
      </ToastErrorBoundary>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
