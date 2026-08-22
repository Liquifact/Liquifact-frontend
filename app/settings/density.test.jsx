/**
 * @file app/settings/density.test.jsx
 *
 * Tests for the density toggle integration in the settings page (issue #744).
 *
 * Coverage:
 * 1. DensityToggle renders in the settings page
 * 2. Density section has correct copy text
 * 3. data-density attribute is applied to the page root
 * 4. Density CSS variables affect settings spacing
 * 5. Persisted density is restored on mount
 * 6. Invalid stored density falls back to comfortable
 * 7. Density toggle changes persist to localStorage
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import SettingsRoute, { SettingsPage } from "./page";
import { DENSITY_STORAGE_KEY } from "@/lib/hooks/useDensity";
import { copy } from "../copy/en";

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return <nav aria-label="site navigation" />;
  }
  return { __esModule: true, default: MockNavMenu };
});

function createDeferredLoader(rows, delayMs = 0) {
  return jest.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(rows), delayMs);
      })
  );
}

function makeRows(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${String(i + 1).padStart(3, "0")}`,
    category: "display",
    label: `Row ${i + 1}`,
    type: "toggle",
    value: "enabled",
    description: `Description ${i + 1}`,
  }));
}

function clearDensity() {
  window.localStorage.removeItem(DENSITY_STORAGE_KEY);
  document.documentElement.removeAttribute("data-density");
}

beforeEach(clearDensity);
afterEach(clearDensity);

// ── 1. DensityToggle renders in the settings page ─────────────────────────

describe("Settings page — density toggle", () => {
  it("renders the density section with a group label", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(screen.getByTestId("settings-density-section")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /density/i })).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("displays the density label text from copy", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(screen.getByText(copy.settings.densityLabel)).toBeInTheDocument();
    expect(screen.getByText(copy.settings.densityDescription)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("renders both Compact and Comfortable buttons", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const detail = copy.invest.detail;
    expect(
      screen.getByRole("button", { name: detail.densityCompactAriaLabel })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: detail.densityComfortableAriaLabel })
    ).toBeInTheDocument();
    jest.useRealTimers();
  });
});

// ── 3. data-density attribute ─────────────────────────────────────────────

describe("Settings page — data-density attribute", () => {
  it("applies data-density to the page root on mount", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const root = document.querySelector("div[data-density]");
    expect(root).toHaveAttribute("data-density", "comfortable");
    jest.useRealTimers();
  });

  it("updates data-density when the toggle is clicked", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const detail = copy.invest.detail;
    fireEvent.click(screen.getByRole("button", { name: detail.densityCompactAriaLabel }));

    const root = document.querySelector("div[data-density]");
    expect(root).toHaveAttribute("data-density", "compact");
    jest.useRealTimers();
  });
});

// ── 4. Density CSS variables ──────────────────────────────────────────────

describe("Settings page — density CSS variables", () => {
  it("the density section uses CSS variable padding", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const section = screen.getByTestId("settings-density-section");
    expect(section.style.padding).toBe("var(--settings-section-padding)");
    jest.useRealTimers();
  });

  it("the settings list uses CSS variable gap", async () => {
    jest.useFakeTimers();
    const rows = makeRows(3);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const list = screen.getByRole("list", { name: /settings list/i });
    expect(list.style.gap).toBe("var(--settings-list-gap)");
    jest.useRealTimers();
  });
});

// ── 5. Persisted density is restored ──────────────────────────────────────

describe("Settings page — density persistence", () => {
  it("restores compact density from localStorage on mount", async () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "compact");
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const root = document.querySelector("div[data-density]");
    expect(root).toHaveAttribute("data-density", "compact");
    jest.useRealTimers();
  });

  it("clicking compact persists to localStorage", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const detail = copy.invest.detail;
    fireEvent.click(screen.getByRole("button", { name: detail.densityCompactAriaLabel }));

    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("compact");
    jest.useRealTimers();
  });

  it("clicking comfortable persists to localStorage", async () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "compact");
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const detail = copy.invest.detail;
    fireEvent.click(screen.getByRole("button", { name: detail.densityComfortableAriaLabel }));

    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("comfortable");
    jest.useRealTimers();
  });
});

// ── 6. Invalid stored density falls back ──────────────────────────────────

describe("Settings page — invalid density fallback", () => {
  it("falls back to comfortable when localStorage has an invalid value", async () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "invalid-density");
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const root = document.querySelector("div[data-density]");
    expect(root).toHaveAttribute("data-density", "comfortable");
    jest.useRealTimers();
  });

  it("falls back to comfortable when localStorage is empty", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const root = document.querySelector("div[data-density]");
    expect(root).toHaveAttribute("data-density", "comfortable");
    jest.useRealTimers();
  });
});

// ── 7. Accessibility ──────────────────────────────────────────────────────

describe("Settings page — density accessibility", () => {
  it("density section has a group role with accessible label", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const groups = screen.getAllByRole("group");
    const group = groups.find((g) =>
      g.getAttribute("aria-label")?.toLowerCase().includes("density")
    );
    expect(group).toBeDefined();
    expect(group).toHaveAttribute("aria-label");
    jest.useRealTimers();
  });

  it("density buttons have aria-pressed attributes", async () => {
    jest.useFakeTimers();
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(1), 0)} />);
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const detail = copy.invest.detail;
    const compactBtn = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    const comfortableBtn = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });

    expect(compactBtn).toHaveAttribute("aria-pressed");
    expect(comfortableBtn).toHaveAttribute("aria-pressed");
    jest.useRealTimers();
  });
});
