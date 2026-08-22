/**
 * ToastProvider.keyboard.test.tsx
 *
 * Comprehensive keyboard-accessibility tests for ToastProvider.
 *
 * Scenarios covered:
 *  1. Toast card is reachable via Tab (tabIndex=0).
 *  2. Focusing a toast card pauses its auto-dismiss timer.
 *  3. Blurring a toast card resumes its auto-dismiss timer.
 *  4. Focus moving between card and its Close button does NOT restart the timer.
 *  5. Pressing Escape on a focused card dismisses it.
 *  6. Pressing Escape on the Close button dismisses the toast.
 *  7. After Escape-dismiss, focus returns to the element that was active before
 *     the user tabbed into the toast (no focus loss to <body>).
 *  8. After clicking Close, focus returns to the pre-toast element.
 *  9. No jest-axe violations with keyboard-focused toast.
 * 10. Multiple toasts: Escape only dismisses the focused toast, not all.
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastProvider, useToast } from "./ToastProvider";

const AUTO_DISMISS_MS = 5000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ToastConsumer() {
  const toast = useToast();
  return (
    <div>
      <button
        type="button"
        id="trigger-info"
        onClick={() => toast.info("Info message", "Info Toast")}
      >
        Show Info
      </button>
      <button
        type="button"
        id="trigger-success"
        onClick={() => toast.success("Done!", "Success Toast")}
      >
        Show Success
      </button>
      <button type="button" id="trigger-error" onClick={() => toast.error("Oops", "Error Toast")}>
        Show Error
      </button>
      <button
        type="button"
        id="trigger-second"
        onClick={() => toast.info("Second message", "Second Toast")}
      >
        Show Second
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

/** Returns the first toast card element for the given title text. */
function toastCardForTitle(title: string) {
  return screen
    .getByText(new RegExp(`^${title}$`))
    .closest("div.pointer-events-auto") as HTMLElement;
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ToastProvider — keyboard accessibility", () => {
  // 1. Tab reachability -------------------------------------------------------
  it("toast card has tabIndex=0 and is focusable via Tab", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    expect(card).toHaveAttribute("tabIndex", "0");
  });

  // 2. Focus pauses auto-dismiss ---------------------------------------------
  it("focusing the toast card pauses auto-dismiss timer", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");

    // Focus the card — timer should pause
    act(() => {
      fireEvent.focus(card, { relatedTarget: screen.getByRole("button", { name: "Show Info" }) });
    });

    // Advance past the normal dismiss time
    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS + 1000);
    });

    // Toast should still be visible because the timer was paused
    expect(screen.getByText("Info Toast")).toBeInTheDocument();
  });

  // 3. Blur resumes auto-dismiss ---------------------------------------------
  it("blurring the toast card outside the container resumes auto-dismiss", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    const triggerButton = screen.getByRole("button", { name: "Show Info" });

    // Focus in, then blur out to an element outside the toast container
    act(() => {
      fireEvent.focus(card, { relatedTarget: triggerButton });
    });

    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS + 500);
    });

    // Still visible — paused
    expect(screen.getByText("Info Toast")).toBeInTheDocument();

    act(() => {
      // Blur back to the trigger button (outside toast region)
      fireEvent.blur(card, { relatedTarget: triggerButton });
    });

    // Resume: advance past the dismiss timer
    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS);
    });

    expect(screen.queryByText("Info Toast")).not.toBeInTheDocument();
  });

  // 4. Focus movement within toast does NOT restart timer --------------------
  it("moving focus between card and Close button does not resume the timer", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    const closeButton = within(card).getByRole("button", { name: "Dismiss notification" });

    // Focus the card
    act(() => {
      fireEvent.focus(card, { relatedTarget: screen.getByRole("button", { name: "Show Info" }) });
    });

    // Move focus from card to close button (relatedTarget is inside the container)
    act(() => {
      fireEvent.blur(card, { relatedTarget: closeButton });
    });
    act(() => {
      fireEvent.focus(closeButton, { relatedTarget: card });
    });

    // Advance past auto-dismiss time
    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS + 1000);
    });

    // Toast should still be visible — timer never resumed between card and button
    expect(screen.getByText("Info Toast")).toBeInTheDocument();
  });

  // 5. Escape on card dismisses the toast ------------------------------------
  it("pressing Escape on the focused toast card dismisses it", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    act(() => {
      fireEvent.focus(card);
    });

    act(() => {
      fireEvent.keyDown(card, { key: "Escape" });
    });

    expect(screen.queryByText("Info Toast")).not.toBeInTheDocument();
  });

  // 6. Escape on Close button dismisses the toast ----------------------------
  it("pressing Escape on the Close button dismisses the toast", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    const closeButton = within(card).getByRole("button", { name: "Dismiss notification" });

    act(() => {
      fireEvent.focus(closeButton);
    });
    act(() => {
      fireEvent.keyDown(card, { key: "Escape" });
    });

    expect(screen.queryByText("Info Toast")).not.toBeInTheDocument();
  });

  // 7. Focus return after Escape-dismiss -------------------------------------
  it("returns focus to the pre-toast element after Escape dismissal", async () => {
    renderWithProvider();

    const triggerButton = screen.getByRole("button", { name: "Show Info" });
    triggerButton.focus();
    fireEvent.click(triggerButton);

    const card = toastCardForTitle("Info Toast");

    // Simulate tabbing into the toast: focus the card with relatedTarget = trigger
    act(() => {
      fireEvent.focus(card, { relatedTarget: triggerButton });
    });

    act(() => {
      fireEvent.keyDown(card, { key: "Escape" });
    });

    // Wait for setTimeout(0) inside dismissAndReturnFocus to fire
    await act(async () => {
      jest.runAllTimers();
    });

    expect(document.activeElement).toBe(triggerButton);
  });

  // 8. Focus return after Close button click ---------------------------------
  it("returns focus to the pre-toast element after clicking Close", async () => {
    renderWithProvider();

    const triggerButton = screen.getByRole("button", { name: "Show Info" });
    triggerButton.focus();
    fireEvent.click(triggerButton);

    const card = toastCardForTitle("Info Toast");
    const closeButton = within(card).getByRole("button", { name: "Dismiss notification" });

    // Tab into the toast region
    act(() => {
      fireEvent.focus(card, { relatedTarget: triggerButton });
    });

    act(() => {
      fireEvent.click(closeButton);
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(document.activeElement).toBe(triggerButton);
  });

  // 9. No jest-axe violations with keyboard-focused toast --------------------
  it("has no accessibility violations when a toast card is focused", async () => {
    const { container } = renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    act(() => {
      fireEvent.focus(card);
    });

    // Run axe in real-timer mode to avoid conflicts with jest-axe internals
    jest.useRealTimers();
    const results = await axe(container);
    jest.useFakeTimers();

    expect(results).toHaveNoViolations();
  });

  // 10. Escape only dismisses the focused toast, not all --------------------
  it("Escape only dismisses the focused toast, leaving other toasts intact", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Second" }));

    expect(screen.getByText("Info Toast")).toBeInTheDocument();
    expect(screen.getByText("Second Toast")).toBeInTheDocument();

    // Focus the first (Info) toast and press Escape
    const infoCard = toastCardForTitle("Info Toast");
    act(() => {
      fireEvent.focus(infoCard);
    });
    act(() => {
      fireEvent.keyDown(infoCard, { key: "Escape" });
    });

    expect(screen.queryByText("Info Toast")).not.toBeInTheDocument();
    // Second toast should still be visible
    expect(screen.getByText("Second Toast")).toBeInTheDocument();
  });

  // 11. Non-Escape keys do not dismiss ---------------------------------------
  it("pressing keys other than Escape does not dismiss the toast", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    act(() => {
      fireEvent.focus(card);
      fireEvent.keyDown(card, { key: "Enter" });
      fireEvent.keyDown(card, { key: " " });
      fireEvent.keyDown(card, { key: "Tab" });
    });

    expect(screen.getByText("Info Toast")).toBeInTheDocument();
  });

  // 12. Timer paused while focused, dismissed with Escape, no stale timer ---
  it("cancels the auto-dismiss timer when toast is dismissed via Escape", () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    act(() => {
      fireEvent.focus(card);
    });

    act(() => {
      fireEvent.keyDown(card, { key: "Escape" });
    });

    expect(screen.queryByText("Info Toast")).not.toBeInTheDocument();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  // 13. Hover pause still works alongside focus pause ------------------------
  it("mouseenter and focus both pause the timer independently", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    const triggerBtn = screen.getByRole("button", { name: "Show Info" });

    // Step 1: hover pauses the timer
    act(() => {
      fireEvent.mouseEnter(card);
    });
    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS + 500);
    });
    // Still visible — hover pause is active
    expect(screen.getByText("Info Toast")).toBeInTheDocument();

    // Step 2: mouse leaves — this will call resumeToast which reschedules the timer
    act(() => {
      fireEvent.mouseLeave(card);
    });

    // Step 3: focus arrives immediately — should pause again before the rescheduled
    // timer has a chance to fire
    act(() => {
      fireEvent.focus(card, { relatedTarget: triggerBtn });
    });

    // Step 4: advance well past dismiss time — focus pause must hold
    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS + 500);
    });
    // Still visible — focus pause is active
    expect(screen.getByText("Info Toast")).toBeInTheDocument();

    // Step 5: blur out to outside the container — timer should resume and dismiss
    act(() => {
      fireEvent.blur(card, { relatedTarget: triggerBtn });
    });
    act(() => {
      jest.advanceTimersByTime(AUTO_DISMISS_MS);
    });
    expect(screen.queryByText("Info Toast")).not.toBeInTheDocument();
  });

  // 14. userEvent Tab — card is reachable in tab order ----------------------
  it("toast card is reachable via userEvent Tab traversal", async () => {
    // userEvent with delay:null and advanceTimers integrates with Jest fake timers.
    const user = userEvent.setup({
      delay: null,
      advanceTimers: (ms) =>
        act(() => {
          jest.advanceTimersByTime(ms);
        }),
    });

    render(
      <ToastProvider>
        <ToastConsumer />
      </ToastProvider>
    );

    // Trigger a toast
    await user.click(screen.getByRole("button", { name: "Show Info" }));

    const card = toastCardForTitle("Info Toast");
    // Tab until the card (or something inside it) is focused
    let focused = false;
    for (let i = 0; i < 10; i++) {
      await user.tab();
      if (card.contains(document.activeElement)) {
        focused = true;
        break;
      }
    }
    expect(focused).toBe(true);
  });
});
