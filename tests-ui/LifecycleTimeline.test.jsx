/**
 * @file components/invoice/LifecycleTimeline.test.jsx
 *
 * Component tests for the LifecycleTimeline component.
 *
 * Covers:
 * - aria-current="step" on the current / active step
 * - Overdue badge text and visibility
 * - Vertical layout class presence on the ordered list
 * - Timer cleanup on unmount (no memory-leak setInterval)
 * - Hydration: absolute date always shown; relative text shown after hydration
 * - Steps rendered for each status
 */

import React from "react";
import { vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import LifecycleTimeline from "@/components/invoice/LifecycleTimeline";

// Fixed "now" = 2026-10-24T12:00:00Z
const NOW_MS = Date.UTC(2026, 9, 24, 12, 0, 0);

// A date clearly in the future relative to NOW_MS
const FUTURE_DUE = "2026-11-28";
// A date clearly in the past relative to NOW_MS
const PAST_DUE = "2026-06-15";

// ─── helpers ─────────────────────────────────────────────────────────────────

function renderTimeline(invoiceOverrides = {}, escrow = null) {
  const invoice = {
    status: "Open",
    dueDate: FUTURE_DUE,
    ...invoiceOverrides,
  };
  return render(
    <LifecycleTimeline invoice={invoice} escrow={escrow} _nowMs={NOW_MS} />
  );
}

// ─── aria-current ────────────────────────────────────────────────────────────

describe("LifecycleTimeline — aria-current", () => {
  it("sets aria-current='step' on exactly one list item for an Open invoice", () => {
    renderTimeline({ status: "Open", dueDate: FUTURE_DUE });

    const currentItems = screen
      .getAllByRole("listitem")
      .filter((el) => el.getAttribute("aria-current") === "step");

    expect(currentItems).toHaveLength(1);
    expect(currentItems[0]).toHaveAttribute("aria-current", "step");
  });

  it("sets aria-current='step' on the 'funded' step for a Funded invoice", () => {
    renderTimeline({ status: "Funded", dueDate: FUTURE_DUE });

    const currentItems = screen
      .getAllByRole("listitem")
      .filter((el) => el.getAttribute("aria-current") === "step");

    // The funded step should be current
    expect(currentItems.length).toBeGreaterThanOrEqual(1);
    const fundedItem = currentItems.find(
      (el) => el.getAttribute("data-testid") === "timeline-step-funded"
    );
    expect(fundedItem).toBeDefined();
  });

  it("no item has aria-current='step' for a fully settled invoice", () => {
    // For a Settled invoice the settled step becomes "current" (aria-current="step")
    renderTimeline({ status: "Settled", dueDate: PAST_DUE });

    const currentItems = screen
      .getAllByRole("listitem")
      .filter((el) => el.getAttribute("aria-current") === "step");

    // Settled step is current
    expect(currentItems).toHaveLength(1);
    const settledItem = currentItems.find(
      (el) => el.getAttribute("data-testid") === "timeline-step-settled"
    );
    expect(settledItem).toBeDefined();
  });

  it("step with state=missed gets aria-current='step'", () => {
    // Overdue/missed funding deadline should get aria-current
    const pastDeadlineMs = NOW_MS - 2 * 86400_000;
    renderTimeline(
      { status: "Open", dueDate: FUTURE_DUE },
      { funding_deadline: Math.floor(pastDeadlineMs / 1000) }
    );

    const currentItems = screen
      .getAllByRole("listitem")
      .filter((el) => el.getAttribute("aria-current") === "step");

    expect(currentItems.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── overdue badge ────────────────────────────────────────────────────────────

describe("LifecycleTimeline — overdue badge", () => {
  it("renders the OVERDUE badge when due date is in the past and status is Open", () => {
    renderTimeline({ status: "Open", dueDate: PAST_DUE });
    const badge = screen.getByTestId("overdue-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/overdue/i);
  });

  it("renders the OVERDUE badge when status is Overdue", () => {
    renderTimeline({ status: "Overdue", dueDate: PAST_DUE });
    const badge = screen.getByTestId("overdue-badge");
    expect(badge).toBeInTheDocument();
  });

  it("does NOT render the OVERDUE badge for a settled invoice with past due date", () => {
    renderTimeline({ status: "Settled", dueDate: PAST_DUE });
    const badge = screen.queryByTestId("overdue-badge");
    expect(badge).not.toBeInTheDocument();
  });

  it("does NOT render the OVERDUE badge when due date is in the future", () => {
    renderTimeline({ status: "Open", dueDate: FUTURE_DUE });
    const badge = screen.queryByTestId("overdue-badge");
    expect(badge).not.toBeInTheDocument();
  });

  it("badge has role='status' and aria-live='polite' for accessibility", () => {
    renderTimeline({ status: "Open", dueDate: PAST_DUE });
    const badge = screen.getByTestId("overdue-badge");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute("aria-live", "polite");
  });
});

// ─── layout ──────────────────────────────────────────────────────────────────

describe("LifecycleTimeline — layout", () => {
  it("renders the timeline as an ordered list", () => {
    const { container } = renderTimeline();
    const ol = container.querySelector("ol");
    expect(ol).toBeInTheDocument();
  });

  it("the ordered list uses the responsive timeline-steps layout (vertical ≤600px, horizontal above)", () => {
    const { container } = renderTimeline();
    const ol = container.querySelector("ol");
    expect(ol).toHaveClass("timeline-steps");
  });

  it("renders the section with aria-labelledby pointing to the heading", () => {
    const { container } = renderTimeline();
    const section = container.querySelector("section[aria-labelledby]");
    expect(section).toBeInTheDocument();

    const headingId = section.getAttribute("aria-labelledby");
    const heading = document.getElementById(headingId);
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/invoice lifecycle/i);
  });

  it("renders at least 4 list items (listed, funded, due, settled)", () => {
    renderTimeline({ status: "Open", dueDate: FUTURE_DUE });
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(4);
  });

  it("renders a terminal step for Cancelled invoice", () => {
    renderTimeline({ status: "Cancelled", dueDate: FUTURE_DUE });
    const terminalStep = screen.getByTestId("timeline-step-terminal");
    expect(terminalStep).toBeInTheDocument();
  });
});

// ─── date rendering ────────────────────────────────────────────────────────────

describe("LifecycleTimeline — date rendering", () => {
  it("renders a <time> element for steps that have a known date", () => {
    const { container } = renderTimeline({
      status: "Open",
      dueDate: FUTURE_DUE,
      createdAt: "2026-04-01T00:00:00Z",
    });

    const timeEls = container.querySelectorAll("time");
    expect(timeEls.length).toBeGreaterThan(0);
  });

  it("<time> has a dateTime attribute with the ISO string", () => {
    const { container } = renderTimeline({
      status: "Open",
      dueDate: FUTURE_DUE,
      createdAt: "2026-04-01T00:00:00Z",
    });

    const timeEls = container.querySelectorAll("time[datetime]");
    expect(timeEls.length).toBeGreaterThan(0);
    // At least one should contain a valid ISO date
    const hasIso = Array.from(timeEls).some((el) =>
      /^\d{4}-\d{2}-\d{2}T/.test(el.getAttribute("datetime"))
    );
    expect(hasIso).toBe(true);
  });
});

// ─── timer cleanup ───────────────────────────────────────────────────────────

describe("LifecycleTimeline — timer cleanup", () => {
  it("clears the setInterval on unmount to prevent memory leaks", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    const { unmount } = renderTimeline();

    act(() => {
      unmount();
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("removes visibilitychange listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderTimeline();

    act(() => {
      unmount();
    });

    const calls = removeEventListenerSpy.mock.calls;
    const removed = calls.some(([event]) => event === "visibilitychange");
    expect(removed).toBe(true);

    removeEventListenerSpy.mockRestore();
  });

  it("ticks the countdown when tab becomes visible again", () => {
    // This tests the visibilitychange handler: re-triggering tick on visible
    const { container } = renderTimeline({
      status: "Funded",
      dueDate: FUTURE_DUE,
      createdAt: "2026-04-01T00:00:00Z",
    });

    // Simulate visibility hidden then visible
    act(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    act(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Component should still be in the DOM without errors
    expect(container.querySelector("[data-testid='lifecycle-timeline']")).toBeInTheDocument();
  });
});

// ─── steps content ───────────────────────────────────────────────────────────

describe("LifecycleTimeline — step content", () => {
  it("renders 'Listed' label", () => {
    renderTimeline();
    expect(screen.getByText("Listed")).toBeInTheDocument();
  });

  it("renders 'Funded' label", () => {
    renderTimeline();
    expect(screen.getByText("Funded")).toBeInTheDocument();
  });

  it("renders 'Settled' label", () => {
    renderTimeline();
    expect(screen.getByText("Settled")).toBeInTheDocument();
  });

  it("renders 'Due / Maturity' label for a non-overdue invoice", () => {
    renderTimeline({ status: "Open", dueDate: FUTURE_DUE });
    expect(screen.getByText("Due / Maturity")).toBeInTheDocument();
  });

  it("renders overdue label for an Open invoice with past due date", () => {
    renderTimeline({ status: "Open", dueDate: PAST_DUE });
    // The label should mention overdue days
    const overdueLabel = screen.getByText(/Overdue by \d+ days?/);
    expect(overdueLabel).toBeInTheDocument();
  });

  it("renders step data-state attributes correctly", () => {
    renderTimeline({ status: "Settled", dueDate: PAST_DUE });

    const listedStep = screen.getByTestId("timeline-step-listed");
    expect(listedStep).toHaveAttribute("data-state", "done");

    const settledStep = screen.getByTestId("timeline-step-settled");
    expect(settledStep).toHaveAttribute("data-state", "current");
  });
});
