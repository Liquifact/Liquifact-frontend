/**
 * @file components/ThemeToggle.keyboard.test.jsx
 * Issue #950 — deterministic keyboard-navigation coverage for theme controls.
 *
 * Covers:
 * - Logical Tab order through the theme control group
 * - Enter and Space activation of the main toggle
 * - ArrowRight / ArrowDown forward navigation
 * - ArrowLeft / ArrowUp backward navigation
 * - Enter activation of the theme-options trigger and radio option
 * - Escape dismissal and focus restoration
 * - Tab / Shift+Tab focus wrapping inside the modal
 *
 * All tests use fake timers. No real timer or real animation-frame delay is
 * allowed to influence the results.
 */

import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import ThemeToggle, {
  THEME_STORAGE_KEY,
} from "./ThemeToggle";

jest.mock("./ToastProvider", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;

function mockMatchMedia(prefersLight = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches:
        query === "(prefers-color-scheme: light)"
          ? prefersLight
          : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

function setup(ui = <ThemeToggle />) {
  const user = userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  });

  return {
    user,
    ...render(ui),
  };
}

describe("ThemeToggle keyboard navigation", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return document.body;
      },
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    mockMatchMedia(false);

    window.requestAnimationFrame = jest.fn((callback) => {
      callback(0);
      return 1;
    });

    window.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.clear();
  });

  afterAll(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it("follows a logical Tab order through toggle, copy, and options controls", async () => {
    const { user } = setup(
      <div>
        <button type="button">Before theme controls</button>
        <ThemeToggle />
        <button type="button">After theme controls</button>
      </div>
    );

    const before = screen.getByRole("button", {
      name: "Before theme controls",
    });
    const toggle = screen.getByRole("button", {
      name: /theme:/i,
    });
    const copy = screen.getByRole("button", {
      name: /copy theme identifier/i,
    });
    const options = screen.getByRole("button", {
      name: /theme options/i,
    });
    const after = screen.getByRole("button", {
      name: "After theme controls",
    });

    await user.tab();
    expect(before).toHaveFocus();

    await user.tab();
    expect(toggle).toHaveFocus();

    await user.tab();
    expect(copy).toHaveFocus();

    await user.tab();
    expect(options).toHaveFocus();

    await user.tab();
    expect(after).toHaveFocus();
  });

  it("activates the main theme toggle with Enter", async () => {
    const { user } = setup();
    const toggle = screen.getByRole("button", {
      name: /theme:/i,
    });

    toggle.focus();
    expect(toggle).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(toggle).toHaveAttribute("data-theme-pref", "light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(
      JSON.stringify("light")
    );
  });

  it("activates the main theme toggle with Space", async () => {
    const { user } = setup();
    const toggle = screen.getByRole("button", {
      name: /theme:/i,
    });

    toggle.focus();
    await user.keyboard(" ");

    expect(toggle).toHaveAttribute("data-theme-pref", "light");
  });

  it.each([
    ["ArrowRight", "light"],
    ["ArrowDown", "light"],
    ["ArrowLeft", "dark"],
    ["ArrowUp", "dark"],
  ])(
    "handles %s with the expected theme direction",
    (key, expectedPreference) => {
      setup();
      const toggle = screen.getByRole("button", {
        name: /theme:/i,
      });

      toggle.focus();

      const eventWasNotCancelled = fireEvent.keyDown(toggle, {
        key,
        code: key,
      });

      expect(eventWasNotCancelled).toBe(false);
      expect(toggle).toHaveAttribute(
        "data-theme-pref",
        expectedPreference
      );
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(
        JSON.stringify(expectedPreference)
      );
    }
  );

  it("opens theme options with Enter and focuses the first option", async () => {
    const { user } = setup();
    const optionsTrigger = screen.getByRole("button", {
      name: /theme options/i,
    });

    optionsTrigger.focus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("dialog", { name: "Theme" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("radio", { name: "Light" })
    ).toHaveFocus();
  });

  it("selects the focused theme option with Enter and restores trigger focus", async () => {
    const { user } = setup();
    const optionsTrigger = screen.getByRole("button", {
      name: /theme options/i,
    });

    optionsTrigger.focus();
    await user.keyboard("{Enter}");

    const lightOption = screen.getByRole("radio", {
      name: "Light",
    });
    expect(lightOption).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(
      JSON.stringify("light")
    );

    await waitFor(() => {
      expect(optionsTrigger).toHaveFocus();
    });
  });

  it("closes theme options with Escape and restores trigger focus", async () => {
    const { user } = setup();
    const optionsTrigger = screen.getByRole("button", {
      name: /theme options/i,
    });

    optionsTrigger.focus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("dialog", { name: "Theme" })
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(optionsTrigger).toHaveFocus();
    });
  });

  it("wraps focus backward and forward within the theme options dialog", async () => {
    const { user } = setup();
    const optionsTrigger = screen.getByRole("button", {
      name: /theme options/i,
    });

    optionsTrigger.focus();
    await user.keyboard("{Enter}");

    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveFocus();

    await user.tab({ shift: true });
    expect(options[2]).toHaveFocus();

    await user.tab();
    expect(options[0]).toHaveFocus();
  });

  it("ignores unrelated keys on the main theme toggle", () => {
    setup();
    const toggle = screen.getByRole("button", {
      name: /theme:/i,
    });
    const initialPreference = toggle.getAttribute("data-theme-pref");

    toggle.focus();

    const eventWasNotCancelled = fireEvent.keyDown(toggle, {
      key: "Home",
      code: "Home",
    });

    expect(eventWasNotCancelled).toBe(true);
    expect(toggle).toHaveAttribute(
      "data-theme-pref",
      initialPreference
    );
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  // ── Global `t` shortcut (Issue #948) ──────────────────────────────────

  it("opens the theme options dialog when pressing t globally", async () => {
    setup();

    fireEvent.keyDown(document, {
      key: "t",
      code: "KeyT",
    });

    expect(
      screen.getByRole("dialog", { name: "Theme" })
    ).toBeInTheDocument();
  });

  it("does not open theme options when pressing t inside an editable element", () => {
    setup();

    // Create an input and focus it
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(document, {
      key: "t",
      code: "KeyT",
    });

    expect(
      screen.queryByRole("dialog", { name: "Theme" })
    ).not.toBeInTheDocument();

    document.body.removeChild(input);
  });

  it("does not open theme options when pressing t with a modifier key", () => {
    setup();

    fireEvent.keyDown(document, {
      key: "t",
      code: "KeyT",
      ctrlKey: true,
    });

    expect(
      screen.queryByRole("dialog", { name: "Theme" })
    ).not.toBeInTheDocument();
  });

  it("does not open theme options for other keys", () => {
    setup();

    fireEvent.keyDown(document, {
      key: "r",
      code: "KeyR",
    });

    expect(
      screen.queryByRole("dialog", { name: "Theme" })
    ).not.toBeInTheDocument();
  });
});
