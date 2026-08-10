/**
 * @file components/SettingsSkeleton.test.jsx
 * Comprehensive tests for the SettingsSkeleton loading skeleton.
 *
 * Covers:
 *  - Rendering and structure
 *  - Accessibility (aria-busy, aria-hidden, sr-only text, axe)
 *  - Prop behaviour (isBusy default / override, rows prop)
 *  - Animation classes
 *  - Edge-case props (unknown props do not break render)
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import SettingsSkeleton from "./SettingsSkeleton";

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderSkeleton(props = {}) {
  return render(<SettingsSkeleton {...props} />);
}

// ---------------------------------------------------------------------------
// Structure & render
// ---------------------------------------------------------------------------
describe("SettingsSkeleton – structure", () => {
  it("renders without crashing", () => {
    expect(() => renderSkeleton()).not.toThrow();
  });

  it("renders the root element with data-testid='settings-skeleton'", () => {
    renderSkeleton();
    expect(screen.getByTestId("settings-skeleton")).toBeInTheDocument();
  });

  it("renders the default number of row placeholders (4)", () => {
    const { container } = renderSkeleton();
    const rows = container.querySelectorAll(
      ".flex.items-center.justify-between.gap-4"
    );
    expect(rows.length).toBe(4);
  });

  it("respects the rows prop", () => {
    const { container } = renderSkeleton({ rows: 2 });
    const rows = container.querySelectorAll(
      ".flex.items-center.justify-between.gap-4"
    );
    expect(rows.length).toBe(2);
  });

  it("clamps rows to a minimum of 1", () => {
    const { container } = renderSkeleton({ rows: 0 });
    const rows = container.querySelectorAll(
      ".flex.items-center.justify-between.gap-4"
    );
    expect(rows.length).toBe(1);
  });

  it("contains animate-pulse elements", () => {
    const { container } = renderSkeleton();
    const pulsed = container.querySelectorAll(".animate-pulse");
    expect(pulsed.length).toBeGreaterThanOrEqual(5);
  });

  it("renders the footer (load-more and count) placeholders", () => {
    const { container } = renderSkeleton();
    const footers = container.querySelectorAll(".justify-between.pt-2");
    expect(footers.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------
describe("SettingsSkeleton – accessibility", () => {
  it("has aria-busy='true' by default", () => {
    renderSkeleton();
    expect(screen.getByTestId("settings-skeleton")).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("sets aria-busy='false' when isBusy=false", () => {
    renderSkeleton({ isBusy: false });
    expect(screen.getByTestId("settings-skeleton")).toHaveAttribute(
      "aria-busy",
      "false"
    );
  });

  it("contains the sr-only loading announcement", () => {
    renderSkeleton();
    expect(
      screen.getByText(/Settings loading, please wait/i)
    ).toBeInTheDocument();
  });

  it("has no axe accessibility violations", async () => {
    const { container } = renderSkeleton();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Props edge cases
// ---------------------------------------------------------------------------
describe("SettingsSkeleton – props edge cases", () => {
  it("ignores unknown extra props gracefully", () => {
    const { container } = renderSkeleton({ unknownProp: true });
    expect(container.querySelector('[data-testid="settings-skeleton"]')).toBeInTheDocument();
  });
});