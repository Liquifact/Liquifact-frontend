/**
 * ToastProvider.announce.test.tsx
 *
 * Hardens the accessible-announcement behaviour of ToastProvider:
 *  - Errors get their own decoupled aria-live="assertive" announcement,
 *    independent of the polite live region that wraps the visible stack.
 *  - Success/info toasts never populate the assertive announcer.
 *  - The assertive announcer never claims role="status" or role="alert",
 *    so it can't collide with existing queries for those roles.
 *  - The announcer updates when a *different* error is the newest error
 *    in the stack, and clears once no error remains.
 */
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastProvider";

function ToastConsumer() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.info("All good", "Info")}>
        Show Info
      </button>
      <button type="button" onClick={() => toast.success("Saved", "Success")}>
        Show Success
      </button>
      <button type="button" onClick={() => toast.error("Upload failed", "Error One")}>
        Show Error One
      </button>
      <button type="button" onClick={() => toast.error("Network timeout", "Error Two")}>
        Show Error Two
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <ToastConsumer />
    </ToastProvider>
  );
}

function getAnnouncer() {
  return screen.getByTestId("toast-assertive-announcer");
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe("ToastProvider — assertive error announcements", () => {
  it("renders an empty assertive announcer before any toast is shown", () => {
    renderWithProvider();

    const announcer = getAnnouncer();
    expect(announcer).toHaveAttribute("aria-live", "assertive");
    expect(announcer).toHaveTextContent("");
  });

  it("populates the assertive announcer with the error's title and message", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show Error One" }));

    expect(getAnnouncer()).toHaveTextContent("Error One: Upload failed");
  });

  it("does not populate the assertive announcer for success or info toasts", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show Success" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    expect(getAnnouncer()).toHaveTextContent("");
  });

  it("updates the assertive announcer when a second, different error becomes newest", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show Error One" }));
    expect(getAnnouncer()).toHaveTextContent("Error One: Upload failed");

    fireEvent.click(screen.getByRole("button", { name: "Show Error Two" }));
    expect(getAnnouncer()).toHaveTextContent("Error Two: Network timeout");
  });

  it("keeps announcing the still-visible error even after an unrelated success toast arrives", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show Error One" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Success" }));

    expect(getAnnouncer()).toHaveTextContent("Error One: Upload failed");
  });

  it("clears the assertive announcer once the error toast is dismissed and none remain", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show Error One" }));
    expect(getAnnouncer()).toHaveTextContent("Error One: Upload failed");

    const dismissButton = screen.getByRole("button", { name: "Dismiss notification" });
    fireEvent.click(dismissButton);

    expect(getAnnouncer()).toHaveTextContent("");
  });

  it("has no explicit role, so it never collides with role=status or role=alert queries", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show Error One" }));

    // The visible stack still exposes exactly one role="status" region.
    expect(screen.getAllByRole("status")).toHaveLength(1);
    // No role="alert" exists in the happy path (only the error boundary
    // fallback uses that role, and it hasn't been triggered here).
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // The announcer itself is reachable only by its test id / aria-live,
    // confirming it carries no ARIA role of its own.
    expect(getAnnouncer()).not.toHaveAttribute("role");
  });
});