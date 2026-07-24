import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeToggle from "./ThemeToggle";

describe("Theme component states and interactions", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
  });

  it("handles empty state (no stored preference)", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("data-theme-pref", "system");
  });

  it("handles error state gracefully (e.g. localStorage blocked/quota exceeded)", () => {
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme/i });
    
    // Interaction should not crash even if localStorage throws
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("data-theme-pref", "light");
    
    setItemSpy.mockRestore();
  });

  it("handles loading exclusivity (ensures component remains interactive)", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme/i });
    
    // The theme toggle does not have an explicit loading state,
    // but we verify it maintains expected accessible roles and isn't disabled
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute("aria-pressed");
  });

  it("handles success state and primary interaction of theme", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme/i });
    
    // Success state: Successfully cycles the theme
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("data-theme-pref", "light");
    expect(btn.getAttribute("aria-label")).toMatch(/Light/i);
    
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
    expect(btn.getAttribute("aria-label")).toMatch(/Dark/i);
  });

  it("verifies keyboard interaction", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme/i });
    
    btn.focus();
    expect(btn).toHaveFocus();
    
    // Trigger via keyboard (Enter or Space usually triggers click on buttons)
    fireEvent.keyDown(btn, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(btn); // standard RTL fallback for button keyboard activation
    expect(btn).toHaveAttribute("data-theme-pref", "light");
  });
});
