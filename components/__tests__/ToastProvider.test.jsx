import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider, useToast } from "../ToastProvider";

jest.setTimeout(20000);

function TestHarness() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.info("First info toast")}>
        trigger-one
      </button>
      <button type="button" onClick={() => toast.success("Second success toast")}>
        trigger-two
      </button>
      <button type="button" onClick={() => toast.error("Third error toast")}>
        trigger-three
      </button>
      <p>Body text</p>
    </div>
  );
}

function MixedHarness() {
  // Combines an unrelated focusable input (NOT a toast trigger) with the
  // standard three-trigger harness in the same tree so we can move focus
  // away from any trigger without unmounting it.
  const toast = useToast();
  return (
    <div>
      <input type="text" data-testid="inert-input" aria-label="inert input" />
      <button type="button" onClick={() => toast.info("First info toast")}>
        trigger-one
      </button>
      <button type="button" onClick={() => toast.success("Second success toast")}>
        trigger-two
      </button>
      <button type="button" onClick={() => toast.error("Third error toast")}>
        trigger-three
      </button>
      <p>Body text</p>
    </div>
  );
}

function EphemeralHarness() {
  const toast = useToast();
  return (
    <button
      type="button"
      data-ephemeral
      onClick={() => {
        toast.info("ephemeral toast");
      }}
    >
      ephemeral
    </button>
  );
}

function renderWithToastProvider(ui = <TestHarness />) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

function dispatchEscape() {
  return act(() => {
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
  });
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

describe("ToastProvider - escape and focus handling (#413)", () => {
  it("exposes a status region by default (existing a11y tree is preserved)", () => {
    const { container } = renderWithToastProvider();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it("a) Escape dismisses the most recent toast and leaves the older ones intact", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    const two = screen.getByText("trigger-two");

    one.focus();
    await user.click(one);
    await user.click(two);

    expect(screen.getByText("First info toast")).toBeInTheDocument();
    expect(screen.getByText("Second success toast")).toBeInTheDocument();

    await dispatchEscape();

    expect(screen.queryByText("Second success toast")).not.toBeInTheDocument();
    expect(screen.getByText("First info toast")).toBeInTheDocument();
  });

  it("a.2) Repeated Escape presses dismiss one toast at a time, newest first", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    const two = screen.getByText("trigger-two");
    const three = screen.getByText("trigger-three");

    await user.click(one);
    await user.click(two);
    await user.click(three);

    await dispatchEscape();
    expect(screen.queryByText("Third error toast")).not.toBeInTheDocument();

    await dispatchEscape();
    expect(screen.queryByText("Second success toast")).not.toBeInTheDocument();

    await dispatchEscape();
    expect(screen.queryByText("First info toast")).not.toBeInTheDocument();
  });

  it("a.3) Escape while there are no toasts is a no-op", () => {
    renderWithToastProvider();
    expect(() => {
      act(() => {
        fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
      });
    }).not.toThrow();
  });

  it("a.4) Escape in an input still dismisses the most recent toast", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    function InputHarness() {
      const toast = useToast();
      return (
        <div>
          <input type="text" data-testid="txt" />
          <button type="button" onClick={() => toast.info("escape me")}>
            trigger
          </button>
        </div>
      );
    }
    renderWithToastProvider(<InputHarness />);
    const input = screen.getByTestId("txt");
    const trigger = screen.getByText("trigger");
    input.focus();
    await user.click(trigger);

    expect(screen.getByText("escape me")).toBeInTheDocument();

    await dispatchEscape();

    expect(screen.queryByText("escape me")).not.toBeInTheDocument();
  });

  it("b) Click on the Close button dismisses the corresponding toast", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    await user.click(one);

    const closeButtons = screen.getAllByRole("button", { name: "Dismiss notification" });
    expect(closeButtons).toHaveLength(1);
    await user.click(closeButtons[0]);

    expect(screen.queryByText("First info toast")).not.toBeInTheDocument();
  });

  it("b.2) Multiple toasts each have their own Close button", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    const two = screen.getByText("trigger-two");
    await user.click(one);
    await user.click(two);

    const closeButtons = screen.getAllByRole("button", { name: "Dismiss notification" });
    expect(closeButtons).toHaveLength(2);
  });

  it("c) Focus is restored to the original trigger after the LAST toast is dismissed via Close", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    one.focus();
    await user.click(one);

    const closeButtons = screen.getAllByRole("button", { name: "Dismiss notification" });
    await user.click(closeButtons[0]);

    await act(async () => {
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(one);
  });

  it("c.2) Focus is restored to the original trigger after Escape dismisses the last toast", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    one.focus();
    await user.click(one);

    await dispatchEscape();

    await act(async () => {
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(one);
  });

  it("c.3) Focus restoration is deferred until the queue is empty (not after intermediate dismissals)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    const two = screen.getByText("trigger-two");
    two.focus();
    await user.click(one);
    await user.click(two);

    await dispatchEscape();
    await act(async () => {
      await Promise.resolve();
    });

    // One Escape press dismisses the newest toast (Second success toast at
    // index 0). The older First info toast is still present, so focus must
    // remain on the second trigger - the queue has not drained yet.
    expect(screen.queryByText("Second success toast")).not.toBeInTheDocument();
    expect(screen.getByText("First info toast")).toBeInTheDocument();
    expect(document.activeElement).toBe(two);

    await dispatchEscape();
    await act(async () => {
      await Promise.resolve();
    });

    // The queue is now empty; focus should be restored to the original
    // second trigger button.
    expect(screen.queryByText("First info toast")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(two);
  });

  it("d) Focus is NOT restored when no interactive element had focus at the moment the first toast appeared", async () => {
    // Use programmatic click to avoid the implicit focus shift that user.click
    // applies. body.focus() then click - addToast sees body as activeElement
    // and intentionally does not capture it.
    renderWithToastProvider();
    document.body.focus();

    const one = screen.getByText("trigger-one");
    fireEvent.click(one);

    await dispatchEscape();

    await act(async () => {
      await Promise.resolve();
    });

    expect(document.activeElement).not.toBe(one);
  });

  it("d.2) Focus is NOT restored when focus was on an unrelated element at addToast time", async () => {
    renderWithToastProvider(<MixedHarness />);
    const inert = screen.getByTestId("inert-input");
    inert.focus();
    expect(document.activeElement).toBe(inert);

    const one = screen.getByText("trigger-one");
    fireEvent.click(one);

    await dispatchEscape();

    await act(async () => {
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(inert);
    expect(document.activeElement).not.toBe(one);
  });

  it("e) does not throw when Escape dismisses a toast whose trigger is no longer connected", async () => {
    // Detached-trigger safety: the focus-restoration path must not throw if
    // the trigger element reports isConnected === false at dismiss time.
    // We override the isConnected getter on the captured button ref rather
    // than racing React reconciliation with btn.remove().
    renderWithToastProvider(<EphemeralHarness />);
    const btn = screen.getByText("ephemeral");
    btn.focus();

    act(() => {
      fireEvent.click(btn);
    });
    expect(screen.getByText("ephemeral toast")).toBeInTheDocument();

    // Force the saved trigger to look disconnected without DOM mutation.
    Object.defineProperty(btn, "isConnected", {
      configurable: true,
      get: () => false,
    });

    expect(() => dispatchEscape()).not.toThrow();
    expect(screen.queryByText("ephemeral toast")).not.toBeInTheDocument();
  });

  it("e.2) Auto-dismiss timer does NOT restore focus", async () => {
    renderWithToastProvider(<MixedHarness />);

    // Move focus AWAY from any trigger to a non-toast element first.
    const inert = screen.getByTestId("inert-input");
    inert.focus();
    expect(document.activeElement).toBe(inert);

    const one = screen.getByText("trigger-one");
    // Use fireEvent.click so activeElement stays on the inert input.
    fireEvent.click(one);
    expect(screen.getByText("First info toast")).toBeInTheDocument();
    expect(document.activeElement).toBe(inert);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("First info toast")).not.toBeInTheDocument();

    await act(async () => {
      await Promise.resolve();
    });

    // Timer-driven dismiss must not steal focus back.
    expect(document.activeElement).toBe(inert);
    expect(document.activeElement).not.toBe(one);
  });

  it("non-Escape keys do not dismiss toasts", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    await user.click(one);
    expect(screen.getByText("First info toast")).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: "Enter", code: "Enter" });
      fireEvent.keyDown(document, { key: "a", code: "KeyA" });
      fireEvent.keyDown(document, { key: " ", code: "Space" });
    });

    expect(screen.getByText("First info toast")).toBeInTheDocument();
  });

  it("triggers re-mount without leaking timer state", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { unmount } = renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    await user.click(one);

    // Confirm there is no leaked pending timer after unmount: fast-forwarding
    // beyond AUTO_DISMISS_MS should not throw.
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(10000);
      });
    }).not.toThrow();

    unmount();
  });
});
