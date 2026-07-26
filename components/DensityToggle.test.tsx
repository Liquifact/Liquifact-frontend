/**
 * @jest-environment jsdom
 *
 * @file components/DensityToggle.test.tsx
 *
 * Comprehensive tests for `components/DensityToggle.jsx`.
 *
 * Coverage targets
 * ─────────────────
 * 1. Renders with default density (comfortable) on first paint
 * 2. Compact button has aria-pressed=false when comfortable is active
 * 3. Comfortable button has aria-pressed=true when comfortable is active
 * 4. Clicking Compact sets density to compact
 * 5. Clicking Comfortable sets density to comfortable
 * 6. Active button has highlighted class
 * 7. Copy string keys are used (not inline strings)
 * 8. Accessibility: role=group, aria-label on group, aria-label on buttons
 * 9. Persistence: after clicking Compact, localStorage contains "compact"
 * 10. Persistence: after clicking Comfortable, localStorage contains "comfortable"
 * 11. Restores compact on remount when localStorage contains "compact"
 * 12. Custom className is forwarded to the root element
 * 13. No axe violations
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import DensityToggle from "./DensityToggle";
import { DENSITY_STORAGE_KEY } from "@/lib/hooks/useDensity";
import { copy } from "@/app/copy/en";

expect.extend(toHaveNoViolations);

const detail = copy.invest.detail;

function clearStorage() {
  window.localStorage.clear();
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(clearStorage);

// ── 1-3. Initial render ────────────────────────────────────────────────────

describe("DensityToggle — initial render", () => {
  it("renders the toggle group with the correct group label", () => {
    render(<DensityToggle />);
    expect(
      screen.getByRole("group", { name: detail.densityToggleLabel })
    ).toBeInTheDocument();
  });

  it("renders Compact and Comfortable buttons", () => {
    render(<DensityToggle />);
    expect(screen.getByRole("button", { name: detail.densityCompactAriaLabel })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: detail.densityComfortableAriaLabel })).toBeInTheDocument();
  });

  it("Comfortable button is aria-pressed=true by default", () => {
    render(<DensityToggle />);
    const btn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("Compact button is aria-pressed=false by default", () => {
    render(<DensityToggle />);
    const btn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the correct visible label text", () => {
    render(<DensityToggle />);
    expect(screen.getByText(`${detail.densityToggleLabel}:`)).toBeInTheDocument();
  });

  it("shows the correct button text", () => {
    render(<DensityToggle />);
    expect(screen.getByText(detail.densityCompact)).toBeInTheDocument();
    expect(screen.getByText(detail.densityComfortable)).toBeInTheDocument();
  });
});

// ── 4-5. Interaction ───────────────────────────────────────────────────────

describe("DensityToggle — interaction", () => {
  it("clicking Compact sets aria-pressed=true on Compact and false on Comfortable", () => {
    render(<DensityToggle />);
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    const comfortableBtn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });

    fireEvent.click(compactBtn);

    expect(compactBtn).toHaveAttribute("aria-pressed", "true");
    expect(comfortableBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking Comfortable after Compact restores aria-pressed", () => {
    render(<DensityToggle />);
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    const comfortableBtn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });

    fireEvent.click(compactBtn);
    expect(compactBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(comfortableBtn);
    expect(comfortableBtn).toHaveAttribute("aria-pressed", "true");
    expect(compactBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking the already-active button is a no-op (still pressed)", () => {
    render(<DensityToggle />);
    const comfortableBtn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });

    fireEvent.click(comfortableBtn); // already comfortable
    expect(comfortableBtn).toHaveAttribute("aria-pressed", "true");
  });
});

// ── 6. Active button styling ────────────────────────────────────────────────

describe("DensityToggle — active button styling", () => {
  it("Comfortable button has highlighted class when active", () => {
    render(<DensityToggle />);
    const comfortableBtn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });
    expect(comfortableBtn.className).toContain("text-cyan-400");
  });

  it("Compact button does not have highlighted class when comfortable is active", () => {
    render(<DensityToggle />);
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    expect(compactBtn.className).not.toContain("text-cyan-400");
  });

  it("Compact button has highlighted class after clicking it", () => {
    render(<DensityToggle />);
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    fireEvent.click(compactBtn);
    expect(compactBtn.className).toContain("text-cyan-400");
  });
});

// ── 9-11. localStorage persistence ─────────────────────────────────────────

describe("DensityToggle — localStorage persistence", () => {
  it("persists 'compact' to localStorage when Compact is clicked", () => {
    render(<DensityToggle />);
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    fireEvent.click(compactBtn);
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("compact");
  });

  it("persists 'comfortable' to localStorage when Comfortable is clicked", () => {
    render(<DensityToggle />);
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    fireEvent.click(compactBtn); // switch to compact
    const comfortableBtn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });
    fireEvent.click(comfortableBtn);
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("comfortable");
  });

  it("restores 'compact' on remount when localStorage contains 'compact'", async () => {
    // Pre-seed storage
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "compact");

    const { unmount } = render(<DensityToggle />);

    // After rehydration effect, compact should be active
    await waitFor(() => {
      const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
      expect(compactBtn).toHaveAttribute("aria-pressed", "true");
    });

    unmount();
  });

  it("falls back to comfortable when localStorage contains an invalid value", async () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "invalid-value");
    render(<DensityToggle />);

    await waitFor(() => {
      const comfortableBtn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });
      expect(comfortableBtn).toHaveAttribute("aria-pressed", "true");
    });
  });
});

// ── 12. Custom className ────────────────────────────────────────────────────

describe("DensityToggle — custom className", () => {
  it("forwards custom className to the root element", () => {
    const { container } = render(<DensityToggle className="my-custom-class" />);
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  it("renders without crashing when no className is provided", () => {
    expect(() => render(<DensityToggle />)).not.toThrow();
  });
});

// ── data-density attributes ─────────────────────────────────────────────────

describe("DensityToggle — data attributes", () => {
  it("Compact button has data-density='compact'", () => {
    render(<DensityToggle />);
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    expect(compactBtn).toHaveAttribute("data-density", "compact");
  });

  it("Comfortable button has data-density='comfortable'", () => {
    render(<DensityToggle />);
    const comfortableBtn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });
    expect(comfortableBtn).toHaveAttribute("data-density", "comfortable");
  });
});

// ── 13. Accessibility ───────────────────────────────────────────────────────

describe("DensityToggle — accessibility", () => {
  it("has no axe violations in default state", async () => {
    const { container } = render(<DensityToggle />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations after switching to compact", async () => {
    const { container } = render(<DensityToggle />);
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    fireEvent.click(compactBtn);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("both buttons have type='button' to prevent form submission", () => {
    render(<DensityToggle />);
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    const comfortableBtn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });
    expect(compactBtn).toHaveAttribute("type", "button");
    expect(comfortableBtn).toHaveAttribute("type", "button");
  });
});
