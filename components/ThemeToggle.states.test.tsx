import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ThemeToggle from "./ThemeToggle";
import { THEME_STORAGE_KEY } from "./ThemeToggle";

// This file explicitly covers the theme loading, empty, error, and success state transitions
// as requested by issue #795. The "system" theme is the fallback for loading/empty/error states.

describe("theme's state transitions (loading->success/empty/error)", () => {
  beforeEach(() => {
    // Reset localStorage and matchMedia
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
      },
      writable: true,
    });

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false, // system resolves to dark
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    document.documentElement.removeAttribute("data-theme");
  });

  it("renders the right UI for loading state", () => {
    // Simulate SSR (window undefined) which acts as loading state
    const originalWindow = global.window;
    delete global.window;

    render(<ThemeToggle />);
    const btn = screen.getByRole("button");

    // During loading (SSR), it falls back to 'system'
    expect(btn).toHaveAttribute("data-theme-pref", "system");

    // Restore window
    global.window = originalWindow;
  });

  it("renders the right UI for empty state", () => {
    // Local storage is empty
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");

    // With empty preferences, it falls back to 'system'
    expect(btn).toHaveAttribute("data-theme-pref", "system");
  });

  it("renders the right UI for error state", () => {
    // Local storage throws an error
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(() => {
          throw new Error("Storage blocked");
        }),
      },
      writable: true,
    });

    render(<ThemeToggle />);
    const btn = screen.getByRole("button");

    // Error state falls back to 'system' safely
    expect(btn).toHaveAttribute("data-theme-pref", "system");
  });

  it("renders the right UI for success state and transitions correctly", async () => {
    // Local storage contains a valid value (success state)
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key) => {
          if (key === THEME_STORAGE_KEY) return "light";
          return null;
        }),
        setItem: jest.fn(),
      },
      writable: true,
    });

    render(<ThemeToggle />);

    // Initial success state from localStorage
    let btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-theme-pref", "light");

    // Verify UI transition
    await act(async () => {
      btn.click();
    });

    // Transitions correctly to the next state
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
  });
});
