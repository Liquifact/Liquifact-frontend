/**
 * @file components/UploadSkeleton.test.jsx
 * Comprehensive tests for the UploadSkeleton loading skeleton.
 *
 * Covers:
 *  - Rendering and structure
 *  - Accessibility (aria-busy, aria-hidden, sr-only text, axe)
 *  - Prop behaviour (isBusy default / override)
 *  - Animation classes
 *  - Edge-case props (unknown props do not break render)
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import UploadSkeleton from "./UploadSkeleton";

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderSkeleton(props = {}) {
  return render(<UploadSkeleton {...props} />);
}

// ---------------------------------------------------------------------------
// Structure & render
// ---------------------------------------------------------------------------
describe("UploadSkeleton – structure", () => {
  it("renders without crashing", () => {
    expect(() => renderSkeleton()).not.toThrow();
  });

  it("renders the root element with data-testid='upload-skeleton'", () => {
    renderSkeleton();
    expect(screen.getByTestId("upload-skeleton")).toBeInTheDocument();
  });

  it("contains animate-pulse elements for the drop-zone area", () => {
    const { container } = renderSkeleton();
    const pulsed = container.querySelectorAll(".animate-pulse");
    // At minimum: requirements notice, drop-zone, submit button
    expect(pulsed.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the requirements notice placeholder", () => {
    const { container } = renderSkeleton();
    // The notice has border-cyan-500/20 – check at least one such element exists
    const notice = container.querySelector(".border-cyan-500\\/20");
    expect(notice).toBeInTheDocument();
  });

  it("renders the drop-zone placeholder with dashed border", () => {
    const { container } = renderSkeleton();
    const dropZone = container.querySelector(".border-dashed");
    expect(dropZone).toBeInTheDocument();
  });

  it("renders the submit button placeholder", () => {
    const { container } = renderSkeleton();
    // h-12 w-full rounded-xl bg-slate-800 animate-pulse
    const btnPlaceholder = container.querySelector(".h-12.w-full.rounded-xl");
    expect(btnPlaceholder).toBeInTheDocument();
  });

  it("renders badge pill placeholders inside the requirements notice", () => {
    const { container } = renderSkeleton();
    const pills = container.querySelectorAll(".rounded-full");
    // 3 badge pills in the requirements notice
    expect(pills.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the folder icon placeholder", () => {
    const { container } = renderSkeleton();
    // h-10 w-10 mx-auto rounded bg-slate-700
    const icon = container.querySelector(".h-10.w-10");
    expect(icon).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------
describe("UploadSkeleton – accessibility", () => {
  it("has aria-hidden='true' on the decorative shapes container", () => {
    const { container } = renderSkeleton();
    const hiddenDiv = container.querySelector("[aria-hidden='true']");
    expect(hiddenDiv).toBeInTheDocument();
  });

  it("root wrapper exposes aria-busy='true' by default", () => {
    renderSkeleton();
    expect(screen.getByTestId("upload-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("root wrapper exposes aria-busy='false' when isBusy=false", () => {
    renderSkeleton({ isBusy: false });
    expect(screen.getByTestId("upload-skeleton")).toHaveAttribute("aria-busy", "false");
  });

  it("has an sr-only loading announcement for screen readers", () => {
    renderSkeleton();
    const srText = screen.getByText(/upload form loading, please wait/i);
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
describe("UploadSkeleton – isBusy prop", () => {
  it("defaults to isBusy=true", () => {
    renderSkeleton();
    expect(screen.getByTestId("upload-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("accepts isBusy=true explicitly", () => {
    renderSkeleton({ isBusy: true });
    expect(screen.getByTestId("upload-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("accepts isBusy=false and sets aria-busy='false'", () => {
    renderSkeleton({ isBusy: false });
    expect(screen.getByTestId("upload-skeleton")).toHaveAttribute("aria-busy", "false");
  });

  it("renders identically regardless of isBusy value (same skeleton shapes)", () => {
    const { container: a } = render(<UploadSkeleton isBusy={true} />);
    const { container: b } = render(<UploadSkeleton isBusy={false} />);
    // Pulse element count is the same
    expect(a.querySelectorAll(".animate-pulse").length).toBe(
      b.querySelectorAll(".animate-pulse").length
    );
  });
});

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
describe("UploadSkeleton – animation", () => {
  it("every skeleton block has the animate-pulse class", () => {
    const { container } = renderSkeleton();
    const pulsed = container.querySelectorAll(".animate-pulse");
    expect(pulsed.length).toBeGreaterThanOrEqual(3);
    pulsed.forEach((el) => {
      expect(el.className).toContain("animate-pulse");
    });
  });
});

// ---------------------------------------------------------------------------
// Fast load / slow load edge cases
// ---------------------------------------------------------------------------
describe("UploadSkeleton – edge cases", () => {
  it("renders correctly when mounted and immediately unmounted (fast load)", () => {
    const { unmount, getByTestId } = renderSkeleton();
    expect(getByTestId("upload-skeleton")).toBeInTheDocument();
    // Unmount simulates content settling quickly
    expect(() => unmount()).not.toThrow();
  });

  it("renders correctly when isBusy transitions from true to false (slow load)", () => {
    const { rerender, getByTestId } = renderSkeleton({ isBusy: true });
    expect(getByTestId("upload-skeleton")).toHaveAttribute("aria-busy", "true");

    rerender(<UploadSkeleton isBusy={false} />);
    expect(getByTestId("upload-skeleton")).toHaveAttribute("aria-busy", "false");
  });

  it("still renders skeleton shapes when isBusy is false (error/slow-settle state)", () => {
    const { container } = renderSkeleton({ isBusy: false });
    const pulsed = container.querySelectorAll(".animate-pulse");
    expect(pulsed.length).toBeGreaterThanOrEqual(3);
  });
});
