import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ThemeToggle, { THEME_STORAGE_KEY } from "./ThemeToggle";

jest.mock("./ToastProvider", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

// This file explicitly covers the theme loading, empty, error, and success state transitions
// as requested by issue #795. The "auto" theme is the fallback for loading/empty/error states.

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
        matches: false, // auto resolves to dark
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
    // Use the specific accessible name to avoid ambiguity with the copy button
    const btn = screen.getByRole("button", { name: /theme:/i });

    // During loading (SSR), it falls back to 'auto'
    expect(btn).toHaveAttribute("data-theme-pref", "auto");

    // Restore window
    global.window = originalWindow;
  });

  it("renders the right UI for empty state", () => {
    // Local storage is empty
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });

    // With empty preferences, it falls back to 'auto'
    expect(btn).toHaveAttribute("data-theme-pref", "auto");
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
    const btn = screen.getByRole("button", { name: /theme:/i });

    // Error state falls back to 'auto' safely
    expect(btn).toHaveAttribute("data-theme-pref", "auto");
  });

  it("renders the right UI for success state and transitions correctly", async () => {
    // Local storage contains a valid value (success state)
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key) => {
          // useLocalStorage uses JSON.parse, so values must be JSON-encoded
          if (key === THEME_STORAGE_KEY) return JSON.stringify("light");
          return null;
        }),
        setItem: jest.fn(),
      },
      writable: true,
    });

    render(<ThemeToggle />);

    // Wait for useLocalStorage to hydrate from storage
    await act(async () => {});

    const btn = screen.getByRole("button", { name: /theme:/i });
    expect(btn).toHaveAttribute("data-theme-pref", "light");

    // Verify UI transition
    await act(async () => {
      btn.click();
    });

    // Transitions correctly to the next state
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
  });
});
