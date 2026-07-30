/**
 * @file components/ThemeSkeleton.test.jsx
 * Comprehensive tests for the ThemeSkeleton loading skeleton.
 *
 * Covers:
 *  - Rendering and structure
 *  - Accessibility (aria-busy, aria-hidden, sr-only text, axe)
 *  - isBusy prop behaviour (default / true / false / transition)
 *  - Animation classes
 *  - Edge cases: fast load, slow load, error state
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import ThemeSkeleton from "./ThemeSkeleton";

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function renderSkeleton(props = {}) {
  return render(<ThemeSkeleton {...props} />);
}

// ---------------------------------------------------------------------------
// Structure & render
// ---------------------------------------------------------------------------
describe("ThemeSkeleton – structure", () => {
  it("renders without crashing", () => {
    expect(() => renderSkeleton()).not.toThrow();
  });

  it("renders root element with data-testid='theme-skeleton'", () => {
    renderSkeleton();
    expect(screen.getByTestId("theme-skeleton")).toBeInTheDocument();
  });

  it("contains animate-pulse elements", () => {
    const { container } = renderSkeleton();
    const pulsed = container.querySelectorAll(".animate-pulse");
    expect(pulsed.length).toBeGreaterThanOrEqual(5);
  });

  it("renders the page title placeholder (h-8 w-48)", () => {
    const { container } = renderSkeleton();
    const title = container.querySelector(".h-8.w-48");
    expect(title).toBeInTheDocument();
  });

  it("renders the page subtitle placeholder (h-4 w-72)", () => {
    const { container } = renderSkeleton();
    const subtitle = container.querySelector(".h-4.w-72");
    expect(subtitle).toBeInTheDocument();
  });

  it("renders the settings card with rounded-2xl border", () => {
    const { container } = renderSkeleton();
    const card = container.querySelector(".rounded-2xl.border");
    expect(card).toBeInTheDocument();
  });

  it("renders the theme preferences card (rounded-xl border)", () => {
    const { container } = renderSkeleton();
    const cards = container.querySelectorAll(".rounded-xl.border");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the save button placeholder (h-10 w-36)", () => {
    const { container } = renderSkeleton();
    const btn = container.querySelector(".h-10.w-36");
    expect(btn).toBeInTheDocument();
  });

  it("renders the theme toggle button placeholder (h-9 w-9 rounded-lg)", () => {
    const { container } = renderSkeleton();
    const toggle = container.querySelector(".h-9.w-9.rounded-lg");
    expect(toggle).toBeInTheDocument();
  });

  it("renders two select field placeholders (h-9 w-full rounded-lg)", () => {
    const { container } = renderSkeleton();
    const selects = container.querySelectorAll(".h-9.w-full.rounded-lg");
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it("renders field label placeholders", () => {
    const { container } = renderSkeleton();
    const labels = container.querySelectorAll(".h-3\\.5");
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------
describe("ThemeSkeleton – accessibility", () => {
  it("has aria-hidden='true' on the decorative shapes container", () => {
    const { container } = renderSkeleton();
    const hiddenDiv = container.querySelector("[aria-hidden='true']");
    expect(hiddenDiv).toBeInTheDocument();
  });

  it("root wrapper has aria-busy='true' by default", () => {
    renderSkeleton();
    expect(screen.getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("root wrapper has aria-busy='false' when isBusy=false", () => {
    renderSkeleton({ isBusy: false });
    expect(screen.getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "false");
  });

  it("has an sr-only loading announcement for screen readers", () => {
    renderSkeleton();
    const srText = screen.getByText(/theme settings loading, please wait/i);
    expect(srText).toBeInTheDocument();
    expect(srText.className).toContain("sr-only");
  });

  it("has no axe accessibility violations (default props)", async () => {
    const { container } = renderSkeleton();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe accessibility violations (isBusy=false)", async () => {
    const { container } = renderSkeleton({ isBusy: false });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// isBusy prop
// ---------------------------------------------------------------------------
describe("ThemeSkeleton – isBusy prop", () => {
  it("defaults to isBusy=true", () => {
    renderSkeleton();
    expect(screen.getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("accepts isBusy=true explicitly", () => {
    renderSkeleton({ isBusy: true });
    expect(screen.getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("accepts isBusy=false and sets aria-busy='false'", () => {
    renderSkeleton({ isBusy: false });
    expect(screen.getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "false");
  });

  it("renders the same number of pulse elements regardless of isBusy", () => {
    const { container: a } = render(<ThemeSkeleton isBusy={true} />);
    const { container: b } = render(<ThemeSkeleton isBusy={false} />);
    expect(a.querySelectorAll(".animate-pulse").length).toBe(
      b.querySelectorAll(".animate-pulse").length
    );
  });
});

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
describe("ThemeSkeleton – animation", () => {
  it("every skeleton shape has the animate-pulse class", () => {
    const { container } = renderSkeleton();
    const pulsed = container.querySelectorAll(".animate-pulse");
    expect(pulsed.length).toBeGreaterThanOrEqual(5);
    pulsed.forEach((el) => {
      expect(el.className).toContain("animate-pulse");
    });
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("ThemeSkeleton – edge cases", () => {
  it("renders correctly when mounted and immediately unmounted (fast load)", () => {
    const { unmount, getByTestId } = renderSkeleton();
    expect(getByTestId("theme-skeleton")).toBeInTheDocument();
    expect(() => unmount()).not.toThrow();
  });

  it("transitions aria-busy from true to false on re-render (slow load)", () => {
    const { rerender, getByTestId } = renderSkeleton({ isBusy: true });
    expect(getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "true");

    rerender(<ThemeSkeleton isBusy={false} />);
    expect(getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "false");
  });

  it("still renders skeleton shapes when isBusy=false (error/slow-settle state)", () => {
    const { container } = renderSkeleton({ isBusy: false });
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(5);
  });

  it("renders correctly when re-rendered multiple times", () => {
    const { rerender, getByTestId } = renderSkeleton({ isBusy: true });
    rerender(<ThemeSkeleton isBusy={false} />);
    rerender(<ThemeSkeleton isBusy={true} />);
    expect(getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "true");
  });
});
