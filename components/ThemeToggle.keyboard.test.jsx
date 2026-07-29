import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle, {
  THEMES,
  THEME_STORAGE_KEY,
  resolveTheme,
  readStoredTheme,
} from "./ThemeToggle";

jest.mock("./ToastProvider", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

beforeEach(() => {
  localStorage.clear();
});

describe("ThemeToggle keyboard operability", () => {
  it("is focusable via Tab", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.tab();
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveFocus();
  });

  it("cycles forward on Enter", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: /theme:/i });
    btn.focus();

    const initialLabel = btn.getAttribute("aria-label");
    await user.keyboard("{Enter}");

    expect(btn.getAttribute("aria-label")).not.toBe(initialLabel);
  });

  it("cycles forward on Space", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: /theme:/i });
    btn.focus();

    const initialLabel = btn.getAttribute("aria-label");
    await user.keyboard(" ");

    expect(btn.getAttribute("aria-label")).not.toBe(initialLabel);
  });

  it("cycles forward on ArrowRight", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: /theme:/i });
    btn.focus();

    const initialLabel = btn.getAttribute("aria-label");
    await user.keyboard("{ArrowRight}");

    expect(btn.getAttribute("aria-label")).not.toBe(initialLabel);
  });

  it("cycles backward on ArrowLeft", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: /theme:/i });
    btn.focus();

    const initialLabel = btn.getAttribute("aria-label");
    await user.keyboard("{ArrowLeft}");

    expect(btn.getAttribute("aria-label")).not.toBe(initialLabel);
  });

  it("cycles forward on ArrowDown", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: /theme:/i });
    btn.focus();

    const initialLabel = btn.getAttribute("aria-label");
    await user.keyboard("{ArrowDown}");

    expect(btn.getAttribute("aria-label")).not.toBe(initialLabel);
  });

  it("cycles backward on ArrowUp", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: /theme:/i });
    btn.focus();

    const initialLabel = btn.getAttribute("aria-label");
    await user.keyboard("{ArrowUp}");

    expect(btn.getAttribute("aria-label")).not.toBe(initialLabel);
  });

  it("persists selection to localStorage on keyboard activation", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: /theme:/i });
    btn.focus();
    await user.keyboard("{Enter}");

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeTruthy();
  });

  it("has visible focus indicator (focus-ring class)", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    expect(btn.className).toContain("focus-ring");
  });

  it("has accessible aria-label describing current state", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    expect(btn.getAttribute("aria-label")).toMatch(/Theme:/);
  });

  it("has aria-pressed attribute", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    expect(btn).toHaveAttribute("aria-pressed");
  });
});

describe("resolveTheme", () => {
  it("returns light for light preference", () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it("returns dark for dark preference", () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("returns dark in SSR environment for auto preference", () => {
    expect(resolveTheme("auto")).toBe("dark");
  });
});

describe("readStoredTheme", () => {
  it("returns auto when localStorage is empty (default for first-time visitors)", () => {
    expect(readStoredTheme()).toBe("auto");
  });

  it("returns stored theme when valid", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("returns auto for invalid stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "invalid");
    expect(readStoredTheme()).toBe("auto");
  });
});
