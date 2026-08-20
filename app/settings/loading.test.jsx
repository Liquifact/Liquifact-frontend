/**
 * @file app/settings/loading.test.jsx
 * Tests for the Next.js route-level loading UI at /settings.
 *
 * Verifies that SettingsLoading:
 *  - renders without errors
 *  - delegates to ThemeSkeleton
 *  - exposes the correct ARIA attributes on the page shell
 *  - has no accessibility violations
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import SettingsLoading from "./loading";

expect.extend(toHaveNoViolations);

describe("SettingsLoading", () => {
  it("renders without crashing", () => {
    expect(() => render(<SettingsLoading />)).not.toThrow();
  });

  it("renders the page root with data-testid='settings-loading'", () => {
    render(<SettingsLoading />);
    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();
  });

  it("renders the page root with aria-busy='true'", () => {
    render(<SettingsLoading />);
    expect(screen.getByTestId("settings-loading")).toHaveAttribute("aria-busy", "true");
  });

  it("renders the NavMenuSkeleton header", () => {
    const { container } = render(<SettingsLoading />);
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
  });

  it("renders the ThemeSkeleton component (data-testid='theme-skeleton')", () => {
    render(<SettingsLoading />);
    expect(screen.getByTestId("theme-skeleton")).toBeInTheDocument();
  });

  it("ThemeSkeleton inside SettingsLoading has aria-busy='true'", () => {
    render(<SettingsLoading />);
    expect(screen.getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("contains the sr-only loading announcement from ThemeSkeleton", () => {
    render(<SettingsLoading />);
    expect(screen.getByText(/theme settings loading, please wait/i)).toBeInTheDocument();
  });

  it("has multiple animate-pulse elements", () => {
    const { container } = render(<SettingsLoading />);
    const pulsed = container.querySelectorAll(".animate-pulse");
    expect(pulsed.length).toBeGreaterThanOrEqual(5);
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<SettingsLoading />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
