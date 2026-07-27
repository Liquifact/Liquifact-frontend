import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { ToastProvider, useToast } from "./ToastProvider";

const AUTO_DISMISS_MS = 5000;

function ToastConsumer() {
  const toast = useToast();

  return (
    <div>
      <button type="button" onClick={() => toast.success("Action complete")}>
        Trigger success
      </button>
      <button type="button" onClick={() => toast.error("Something went wrong")}>
        Trigger error
      </button>
      <button type="button" onClick={() => toast.info("FYI message")}>
        Trigger info
      </button>
      <button type="button" onClick={() => toast.success("First message", "First")}>
        Trigger first toast
      </button>
      <button type="button" onClick={() => toast.success("Second message", "Second")}>
        Trigger second toast
      </button>
      <button type="button" onClick={() => toast.success("Third message", "Third")}>
        Trigger third toast
      </button>
      <button type="button" onClick={() => toast.success("Fourth message", "Fourth")}>
        Trigger fourth toast
      </button>
      <button type="button" onClick={() => toast.info("Paused message", "Paused")}>
        Trigger paused toast
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

function toastCardForTitle(title: string) {
  return screen.getByText(new RegExp(`^${title}$`)).closest("div.pointer-events-auto");
}

describe("ToastProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders an accessible live region and applies default variant titles and styling", async () => {
    const { container } = renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Trigger success" }));
    fireEvent.click(screen.getByRole("button", { name: "Trigger error" }));
    fireEvent.click(screen.getByRole("button", { name: "Trigger info" }));

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");

    expect(within(liveRegion).getByText(/^Success$/)).toBeInTheDocument();
    expect(within(liveRegion).getByText(/^Error$/)).toBeInTheDocument();
    expect(within(liveRegion).getByText(/^Info$/)).toBeInTheDocument();

    expect(toastCardForTitle("Success")).toHaveClass("border-emerald-500/30");
    expect(toastCardForTitle("Error")).toHaveClass("border-red-500/30");
    expect(toastCardForTitle("Info")).toHaveClass("border-cyan-500/20");

    jest.useRealTimers();
    const results = await axe(container);
    jest.useFakeTimers();

    expect(results).toHaveNoViolations();
  });

  it("supports manual dismissal of a toast", () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Trigger success" }));
    });

    const toastTitle = screen.getByText(/^Success$/);
    const card = toastTitle.closest("div.pointer-events-auto");
    expect(card).toBeInTheDocument();

    const closeButton = within(card as Element).getByRole("button", {
      name: "Dismiss notification",
    });
    act(() => {
      fireEvent.click(closeButton);
    });

    expect(screen.queryByText(/^Success$/)).not.toBeInTheDocument();
  });

  it("auto-dismisses a toast after the configured timeout", async () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Trigger success" }));
    });

    expect(screen.getByText(/^Success$/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS);
    });

    await waitFor(() => {
      expect(screen.queryByText(/^Success$/)).not.toBeInTheDocument();
    });
  });

  it("pauses dismissal on hover and resumes on mouse leave", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Trigger paused toast" }));
    const toastTitle = screen.getByText("Paused");
    const card = toastTitle.closest("div.pointer-events-auto");
    expect(card).toBeInTheDocument();

    if (card) {
      fireEvent.mouseEnter(card);
    }

    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS + 1000);
    });

    expect(screen.getByText("Paused")).toBeInTheDocument();

    if (card) {
      fireEvent.mouseLeave(card);
    }

    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS);
    });

    expect(screen.queryByText("Paused")).not.toBeInTheDocument();
  });

  it("keeps only the newest toasts visible when enqueued rapidly", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Trigger first toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Trigger second toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Trigger third toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Trigger fourth toast" }));

    expect(screen.queryByText("First")).not.toBeInTheDocument();
    expect(screen.getByText("Fourth")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("clears timers on unmount before auto-dismiss occurs", () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const { unmount } = renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Trigger info" }));
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    act(() => {
      unmount();
    });

    expect(jest.getTimerCount()).toBe(0);
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("throws when useToast is called outside ToastProvider", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    function BadConsumer() {
      useToast();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow("useToast must be used within a ToastProvider");
    consoleErrorSpy.mockRestore();
  });
});
