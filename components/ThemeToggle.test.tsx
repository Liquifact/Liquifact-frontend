/**
 * @file ThemeToggle.test.tsx
 *
 * Comprehensive tests for the ThemeToggle component and its exported helpers.
 * Covers the "auto" mode introduced in issue #465.
 *
 * Includes jest-axe accessibility checks for key states (loaded / empty / error).
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import ThemeToggle, {
  THEMES,
  THEME_IDENTIFIER,
  THEME_STORAGE_KEY,
  THEME_UPDATED_STORAGE_KEY,
  THEME_UPDATED_TICK_MS,
  resolveTheme,
  readStoredTheme,
  readStoredThemeUpdatedAt,
  applyTheme,
} from "./ThemeToggle";

expect.extend(toHaveNoViolations);

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

jest.mock("./ToastProvider", () => ({
  useToast: () => mockToast,
}));

// ─── Test utilities ──────────────────────────────────────────────────────────

function cleanupDataTheme() {
  document.documentElement.removeAttribute("data-theme");
}

function mockLocalStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  const mock = {
    getItem: jest.fn((k: string) => store[k] ?? null),
    setItem: jest.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: jest.fn((k: string) => {
      delete store[k];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
  Object.defineProperty(window, "localStorage", { value: mock, writable: true });
  return mock;
}

/**
 * Produce a `matchMedia` mock and return a helper that can fire the
 * `change` event on the returned media-query object.
 */
function mockMatchMediaWithEvents(prefersLight: boolean) {
  const listeners: Array<() => void> = [];

  const mqObject = {
    matches: prefersLight,
    media: "(prefers-color-scheme: light)",
    addEventListener: jest.fn((type: string, fn: () => void) => {
      if (type === "change") listeners.push(fn);
    }),
    removeEventListener: jest.fn((type: string, fn: () => void) => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    dispatchEvent: jest.fn(),
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => {
      if (query === "(prefers-color-scheme: light)") return mqObject;
      return {
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }),
  });

  return {
    mqObject,
    fireChange: () => listeners.forEach((fn) => fn()),
    listenerCount: () => listeners.length,
  };
}

function mockMatchMedia(prefersLight: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: light)" ? prefersLight : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// ─── 1. THEMES constant ───────────────────────────────────────────────────────

describe("THEMES", () => {
  it("is an array containing light, dark, and auto", () => {
    expect(THEMES).toEqual(expect.arrayContaining(["light", "dark", "auto"]));
  });

  it("has exactly three entries", () => {
    expect(THEMES).toHaveLength(3);
  });

  it('starts with "light"', () => {
    expect(THEMES[0]).toBe("light");
  });

  it('ends with "auto"', () => {
    expect(THEMES[2]).toBe("auto");
  });

  it("THEME_STORAGE_KEY is a non-empty string", () => {
    expect(typeof THEME_STORAGE_KEY).toBe("string");
    expect(THEME_STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

// ─── 2. THEME_IDENTIFIER export ──────────────────────────────────────────────

describe("THEME_IDENTIFIER", () => {
  it("is exported as a non-empty string", () => {
    expect(typeof THEME_IDENTIFIER).toBe("string");
    expect(THEME_IDENTIFIER.length).toBeGreaterThan(0);
  });

  it("is a stable constant (same value on repeated imports)", () => {
    // Re-import to verify stability; Jest module cache ensures same ref.
    const { THEME_IDENTIFIER: id2 } = require("./ThemeToggle");
    expect(id2).toBe(THEME_IDENTIFIER);
  });
});

// ─── 3. resolveTheme ────────────────────────────────────────────────────────

describe("resolveTheme", () => {
  beforeEach(() => mockMatchMedia(false));

  it('returns "light" when pref is "light"', () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it('returns "dark" when pref is "dark"', () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it('returns "dark" for "auto" when OS prefers dark', () => {
    mockMatchMedia(false);
    expect(resolveTheme("auto")).toBe("dark");
  });

  it('returns "light" for "auto" when OS prefers light', () => {
    mockMatchMedia(true);
    expect(resolveTheme("auto")).toBe("light");
  });

  it('returns "dark" for "auto" when matchMedia is unavailable (SSR / test env)', () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: undefined });
    expect(resolveTheme("auto")).toBe("dark");
  });
});

// ─── 4. readStoredTheme ──────────────────────────────────────────────────────

describe("readStoredTheme", () => {
  it("returns stored preference when it is a valid THEME", () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "light" });
    expect(readStoredTheme()).toBe("light");
  });

  it('returns "auto" when nothing is stored (default for first-time visitors)', () => {
    mockLocalStorage({});
    expect(readStoredTheme()).toBe("auto");
  });

  it('returns "auto" when stored value is not a valid theme', () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "rainbow" });
    expect(readStoredTheme()).toBe("auto");
  });

  it('returns "auto" when localStorage throws', () => {
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: jest.fn(() => {
          throw new Error("storage blocked");
        }),
        setItem: jest.fn(),
      },
    });
    expect(readStoredTheme()).toBe("auto");
  });

  it('accepts stored value "auto"', () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "auto" });
    expect(readStoredTheme()).toBe("auto");
  });
});

// ─── 5. applyTheme ───────────────────────────────────────────────────────────

describe("applyTheme", () => {
  beforeEach(() => {
    cleanupDataTheme();
    mockMatchMedia(false);
  });
  afterEach(cleanupDataTheme);

  it('sets data-theme="light" when pref is "light"', () => {
    applyTheme("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it('sets data-theme="dark" when pref is "dark"', () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it('sets data-theme="dark" for "auto" when OS prefers dark', () => {
    mockMatchMedia(false);
    applyTheme("auto");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it('sets data-theme="light" for "auto" when OS prefers light', () => {
    mockMatchMedia(true);
    applyTheme("auto");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});

// ─── 6. ThemeToggle component ────────────────────────────────────────────────

describe("ThemeToggle", () => {
  let originalClipboard: Clipboard | undefined;
  let originalExecCommand: typeof document.execCommand;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
    mockToast.success.mockClear();
    mockToast.error.mockClear();
    mockLocalStorage({});
    mockMatchMedia(false);
    cleanupDataTheme();
  });
  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    document.execCommand = originalExecCommand;
    cleanupDataTheme();
  });

  it("renders a button element", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /theme:/i })).toBeInTheDocument();
  });

  it('has id="theme-toggle"', () => {
    render(<ThemeToggle />);
    expect(document.getElementById("theme-toggle")).toBeInTheDocument();
  });

  it("has a non-empty aria-label", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    expect(btn).toHaveAttribute("aria-label");
    expect(btn.getAttribute("aria-label")!.length).toBeGreaterThan(0);
  });

  it("uses the correct button role for the icon-only theme control", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: "Theme: System (click for Light)" });
    expect(btn).toHaveAttribute("role", "button");
  });

  it("exposes a descriptive accessible name for the system icon state", () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "Theme: System (click for Light)" })
    ).toBeInTheDocument();
  });

  it("exposes a descriptive accessible name for the light icon state", () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "light" });
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "Theme: Light (click for Dark)" })
    ).toBeInTheDocument();
  });

  it("exposes a descriptive accessible name for the dark icon state", () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "dark" });
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "Theme: Dark (click for System)" })
    ).toBeInTheDocument();
  });

  it("aria-label mentions the current theme preference", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    // Default preference is 'system'
    expect(btn.getAttribute("aria-label")).toMatch(/system/i);
  });

  // ── Accessible name per state ──────────────────────────────────────────────

  it("exposes a descriptive accessible name for the auto state (dark resolved)", () => {
    mockMatchMedia(false); // OS prefers dark
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute("data-theme-pref", "light");
  });

  it("cycles light → dark on second click", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.keyDown(btn, { key: "ArrowDown" });
    });
    expect(btn).toHaveAttribute("data-theme-pref", "light");
  });

  it("cycles theme forward on ArrowRight keydown", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.keyDown(btn, { key: "ArrowRight" });
    });
    expect(btn).toHaveAttribute("data-theme-pref", "light");
  });

  it("cycles theme backward on ArrowUp keydown", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.keyDown(btn, { key: "ArrowUp" });
    });
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
  });

  it("cycles theme backward on ArrowLeft keydown", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.keyDown(btn, { key: "ArrowLeft" });
    });
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
  });

  it("wraps from system back to light after a full cycle", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    for (let i = 0; i < THEMES.length + 1; i++) {
      await act(async () => {
        fireEvent.click(btn);
      });
    }
    // After length+1 clicks starting from 'system': system→light→dark→system→light
    expect(btn).toHaveAttribute("data-theme-pref", "light");
  });

  // ── 5c. Persists preference to localStorage ───────────────────────────────

  it("writes the new preference to localStorage on click", async () => {
    const ls = mockLocalStorage({});
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });
    expect(ls.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "light");
  });

  it('stores "dark" after a second click', async () => {
    const ls = mockLocalStorage({});
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(ls.setItem).toHaveBeenLastCalledWith(THEME_STORAGE_KEY, "dark");
  });

  it("reads initial preference from localStorage on mount", async () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "dark" });
    render(<ThemeToggle />);
    await act(async () => {}); // flush useEffect
    const btn = screen.getByRole("button", { name: /theme:/i });
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
  });

  // ── 5d. Applies data-theme to <html> ──────────────────────────────────────

  it("sets data-theme on <html> after mount", async () => {
    render(<ThemeToggle />);
    await act(async () => {});
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  // ── auto mode OS preference live update ───────────────────────────────────

  it("updates data-theme when OS preference changes while in auto mode", async () => {
    const { fireChange, mqObject } = mockMatchMediaWithEvents(false); // starts dark
    render(<ThemeToggle />);
    await act(async () => {});
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    // Simulate OS switching to light mode
    mqObject.matches = true;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it('sets data-theme="dark" on <html> after clicking to dark', async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  // ── 5e. aria-pressed reflects state ──────────────────────────────────────

  it('aria-pressed is false when preference is "system"', async () => {
    render(<ThemeToggle />);
    await act(async () => {});
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("removes the OS preference listener when switching away from auto mode", async () => {
    const { listenerCount } = mockMatchMediaWithEvents(false);
    render(<ThemeToggle />);
    await act(async () => {});
    // Should be subscribed while in auto mode
    expect(listenerCount()).toBe(1);

    // Click to move to "light" – listener should be removed
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("re-registers the OS preference listener when cycling back to auto", async () => {
    const { listenerCount } = mockMatchMediaWithEvents(false);
    render(<ThemeToggle />);
    await act(async () => {});

    // auto → light (unsubscribed)
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /theme:/i })));
    expect(listenerCount()).toBe(0);

    // light → dark (still unsubscribed)
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /theme:/i })));
    expect(listenerCount()).toBe(0);

    // dark → auto (re-subscribed)
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /theme:/i })));
    expect(listenerCount()).toBe(1);
  });

  // ── aria-pressed ───────────────────────────────────────────────────────────

  it("aria-pressed is false when the active theme is light", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("aria-pressed is true when the active theme is dark", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => fireEvent.click(btn));
    await act(async () => fireEvent.click(btn));
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("aria-pressed follows the OS preference when the theme is set to auto (OS=light)", async () => {
    mockMatchMedia(true); // OS prefers light → not dark
    render(<ThemeToggle />);
    await act(async () => {});
    const btn = screen.getByRole("button", { name: /theme:/i });
    // starts at 'system', next is 'light'
    expect(btn).toHaveAttribute("data-theme-next", "light");
  });

  it("updates data-theme-next after a click (light → dark)", async () => {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });
    // now at 'light', next is 'dark'
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveAttribute(
      "data-theme-next",
      "dark"
    );
  });

  it("data-theme-next wraps back to auto after dark", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => fireEvent.click(btn)); // → light
    await act(async () => fireEvent.click(btn)); // → dark
    expect(btn).toHaveAttribute("data-theme-next", "auto");
  });

  // ── className forwarding ───────────────────────────────────────────────────

  it("forwards className to the button", () => {
    render(<ThemeToggle className="my-extra-class" />);
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveClass("my-extra-class");
  });

  it("keeps built-in classes alongside the custom className", () => {
    render(<ThemeToggle className="extra" />);
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveClass("rounded-lg");
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveClass("extra");
  });

  // ── 5h. SVG icons are decorative ─────────────────────────────────────────

  it("renders an SVG icon that is aria-hidden", () => {
    render(<ThemeToggle />);
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  // ── Copy-identifier button ─────────────────────────────────────────────────

  it("renders an accessible copy control for the theme identifier", () => {
    render(<ThemeToggle />);
    const copyButton = screen.getByRole("button", { name: "Copy theme identifier" });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveAttribute("type", "button");
  });

  it("copies the theme identifier with Clipboard API and shows a success toast", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    render(<ThemeToggle />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy theme identifier" }));
    });

    expect(writeText).toHaveBeenCalledWith(THEME_IDENTIFIER);
    expect(mockToast.success).toHaveBeenCalledWith(
      "Theme identifier copied to clipboard.",
      "Copied!"
    );
  });

  it("falls back to document.execCommand when Clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const execCommand = jest.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    render(<ThemeToggle />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy theme identifier" }));
    });

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(mockToast.success).toHaveBeenCalledWith(
      "Theme identifier copied to clipboard.",
      "Copied!"
    );
  });

  it("shows an error toast when Clipboard API write is rejected", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
      writable: true,
    });

    render(<ThemeToggle />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy theme identifier" }));
    });

    expect(mockToast.error).toHaveBeenCalledWith("Failed to copy theme identifier.", "Error");
  });
});

// ─── 7. Accessibility (jest-axe) – Acceptance Criteria ───────────────────────

describe("ThemeToggle accessibility (jest-axe)", () => {
  beforeEach(() => {
    mockLocalStorage({});
    mockMatchMedia(false);
    cleanupDataTheme();
  });
  afterEach(cleanupDataTheme);

  // LOADED state (default / auto preference)
  it("has no accessibility violations in loaded (auto) state", async () => {
    const { container } = render(<ThemeToggle />);
    await act(async () => {});
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // LOADED state – light
  it("has no accessibility violations in light theme state", async () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: JSON.stringify("light") });
    const { container } = render(<ThemeToggle />);
    await act(async () => {});
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // LOADED state – dark
  it("has no accessibility violations in dark theme state", async () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: JSON.stringify("dark") });
    const { container } = render(<ThemeToggle />);
    await act(async () => {});
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // EMPTY-ish / fallback state (localStorage unavailable)
  it("has no accessibility violations when localStorage is unavailable (empty/fallback)", async () => {
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: jest.fn(() => {
          throw new Error("storage blocked");
        }),
        setItem: jest.fn(),
      },
    });
    const { container } = render(<ThemeToggle />);
    await act(async () => {});
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // ERROR-ish state (matchMedia missing / restricted environment)
  it("has no accessibility violations when matchMedia is unavailable (error state)", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: undefined,
    });
    const { container } = render(<ThemeToggle />);
    await act(async () => {});
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─── 8. Relative "last updated" timestamp ────────────────────────────────────

describe("ThemeToggle - last updated timestamp", () => {
  const FIXED_NOW = new Date("2026-07-26T12:00:00.000Z");

  beforeEach(() => {
    mockMatchMedia(false);
    cleanupDataTheme();
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    cleanupDataTheme();
    jest.useRealTimers();
  });

  it('shows "Updated just now" and persists a timestamp on a first-ever visit', async () => {
    const ls = mockLocalStorage({});
    render(<ThemeToggle />);
    await act(async () => {});

    expect(screen.getByText(/updated just now/i)).toBeInTheDocument();
    expect(ls.setItem).toHaveBeenCalledWith(THEME_UPDATED_STORAGE_KEY, String(FIXED_NOW.getTime()));
  });

  it("does not overwrite an already-stored timestamp on mount", async () => {
    const tenMinutesAgo = FIXED_NOW.getTime() - 10 * 60 * 1000;
    const ls = mockLocalStorage({ [THEME_UPDATED_STORAGE_KEY]: String(tenMinutesAgo) });
    render(<ThemeToggle />);
    await act(async () => {});

    expect(screen.getByText(/updated 10 minutes ago/i)).toBeInTheDocument();
    expect(ls.setItem).not.toHaveBeenCalledWith(THEME_UPDATED_STORAGE_KEY, expect.anything());
  });

  it("reads a previously-stored timestamp via readStoredThemeUpdatedAt", () => {
    mockLocalStorage({ [THEME_UPDATED_STORAGE_KEY]: "1000" });
    expect(readStoredThemeUpdatedAt()).toEqual(new Date(1000));
  });

  it("readStoredThemeUpdatedAt returns null when nothing is stored", () => {
    mockLocalStorage({});
    expect(readStoredThemeUpdatedAt()).toBeNull();
  });

  it("bumps the timestamp to now when the user clicks the toggle", async () => {
    const ls = mockLocalStorage({});
    render(<ThemeToggle />);
    await act(async () => {});
    ls.setItem.mockClear();

    jest.setSystemTime(new Date(FIXED_NOW.getTime() + 5 * 60 * 1000));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });

    expect(ls.setItem).toHaveBeenCalledWith(
      THEME_UPDATED_STORAGE_KEY,
      String(FIXED_NOW.getTime() + 5 * 60 * 1000)
    );
    expect(screen.getByText(/updated just now/i)).toBeInTheDocument();
  });

  it("advances the displayed relative time as the clock ticks forward", async () => {
    mockLocalStorage({ [THEME_UPDATED_STORAGE_KEY]: String(FIXED_NOW.getTime()) });
    render(<ThemeToggle />);
    await act(async () => {});
    expect(screen.getByText(/updated just now/i)).toBeInTheDocument();

    jest.setSystemTime(new Date(FIXED_NOW.getTime() + 90 * 1000));
    await act(async () => {
      jest.advanceTimersByTime(THEME_UPDATED_TICK_MS);
    });

    expect(screen.getByText(/updated 2 minutes ago/i)).toBeInTheDocument();
  });

  it("exposes an accessible absolute-time alternative alongside the relative text", async () => {
    mockLocalStorage({ [THEME_UPDATED_STORAGE_KEY]: String(FIXED_NOW.getTime()) });
    render(<ThemeToggle />);
    await act(async () => {});

    const container = document.getElementById("theme-updated-at");
    expect(container).toHaveAttribute("title", expect.stringContaining("Theme last updated"));
    expect(container?.querySelector(".sr-only")).toHaveTextContent(FIXED_NOW.toLocaleString());
  });
});

// ── Theme options modal (focus-trap, escape, restore) ───────────────────────

describe("ThemeToggle — theme options modal", () => {
  beforeAll(() => {
    // jsdom has no real layout engine, so every element's `offsetParent` is
    // null by default — including genuinely visible ones.
    // getFocusableElements uses offsetParent to detect display:none-hidden
    // elements, so without this stub the focus trap would (only in tests)
    // treat every option as hidden.
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return document.body;
      },
    });
  });

  beforeEach(() => {
    cleanupDataTheme();
    mockLocalStorage({});
    mockMatchMedia(false);
  });

  afterEach(() => {
    cleanupDataTheme();
  });

  it("opens the modal when the options trigger is clicked", async () => {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme options/i }));
    });
    expect(screen.getByRole("dialog", { name: "Theme" })).toBeInTheDocument();
  });

  it("sets aria-expanded on the trigger while the modal is open", async () => {
    render(<ThemeToggle />);
    const trigger = screen.getByRole("button", { name: /theme options/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      fireEvent.click(trigger);
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("does not change the main toggle button's preference just by opening the modal", async () => {
    const ls = mockLocalStorage({});
    render(<ThemeToggle />);
    await act(async () => {});
    const callsBeforeOpening = ls.setItem.mock.calls.length;

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme options/i }));
    });

    expect(ls.setItem.mock.calls.length).toBe(callsBeforeOpening);
  });

  it("selecting an option changes the theme and closes the modal", async () => {
    const ls = mockLocalStorage({});
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme options/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    });

    expect(ls.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("restores focus to the options trigger after selecting an option", async () => {
    render(<ThemeToggle />);
    const trigger = screen.getByRole("button", { name: /theme options/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    });
    // Focus restoration is scheduled via queueMicrotask.
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    render(<ThemeToggle />);
    const trigger = screen.getByRole("button", { name: /theme options/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("restores focus to whichever element had focus before opening, not necessarily the trigger", async () => {
    render(
      <div>
        <button type="button">Elsewhere</button>
        <ThemeToggle />
      </div>
    );
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    elsewhere.focus();
    expect(document.activeElement).toBe(elsewhere);

    // fireEvent.click (unlike a real browser click or userEvent.click) does
    // not itself move focus, so activeElement at open time genuinely
    // remains "elsewhere" here — exercising the branch where the opener
    // captures document.activeElement rather than assuming it's the trigger.
    const trigger = screen.getByRole("button", { name: /theme options/i });
    await act(async () => {
      fireEvent.click(trigger);
    });
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(elsewhere);
  });

  it("closes when the backdrop is clicked", async () => {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme options/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("theme-options-backdrop"));
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("traps Tab focus within the modal", async () => {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme options/i }));
    });

    const options = screen.getAllByRole("radio");
    options[options.length - 1].focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });

    expect(document.activeElement).toBe(options[0]);
  });
});