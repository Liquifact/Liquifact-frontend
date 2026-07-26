import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastProvider";
import { setReporter, resetReporter } from "../lib/observability/reportError";

// The real ToastStack is replaced with a controllable stand-in so these tests
// can force it to throw during render without needing a real rendering bug.
// This proves the boundary is scoped to the toast section only: the rest of
// the app tree (children) must keep rendering even while the toast stack has
// failed.
let mockShouldThrow = true;
jest.mock("./toast/ToastStack", () => ({
  ToastStack: () => {
    if (mockShouldThrow) {
      throw new Error("Simulated toast stack render failure");
    }
    return <div>Toast stack rendered fine</div>;
  },
}));

function AppContent() {
  const toast = useToast();
  return (
    <main>
      <h1>App content</h1>
      <button type="button" onClick={() => toast.success("Hi")}>
        Trigger toast
      </button>
    </main>
  );
}

function renderApp() {
  return render(
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

describe("ToastProvider — toast section error boundary", () => {
  beforeEach(() => {
    mockShouldThrow = true;
    jest.spyOn(console, "error").mockImplementation(() => {});
    resetReporter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetReporter();
  });

  it("does not blank the whole app when the toast section throws", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "App content" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trigger toast" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Notifications failed to load");
  });

  it("shows an accessible failure with a retry control", () => {
    renderApp();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Notifications failed to load");
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("logs the error via the shared reportError seam instead of swallowing it", () => {
    const reporter = jest.fn();
    setReporter(reporter);

    renderApp();

    expect(reporter).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ boundary: "ToastErrorBoundary" })
    );
  });

  it("recovers and renders the toast stack normally after Retry once the underlying issue clears", () => {
    renderApp();

    expect(screen.getByRole("alert")).toBeInTheDocument();

    mockShouldThrow = false;
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    });

    expect(screen.getByText("Toast stack rendered fine")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "App content" })).toBeInTheDocument();
  });

  it("renders the toast stack and app content normally when nothing throws", () => {
    mockShouldThrow = false;
    renderApp();

    expect(screen.getByText("Toast stack rendered fine")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "App content" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
