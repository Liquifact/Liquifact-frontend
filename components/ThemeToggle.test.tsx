/**
 * @file ThemeToggle.test.tsx
 *
 * Comprehensive tests for the ThemeToggle component and its exported helpers.
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
  THEME_UPDATED_KEY,
  resolveTheme,
  readStoredTheme,
  readStoredUpdatedAt,
  formatRelativeTime,
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
  it("is an array containing light, dark, and system", () => {
    expect(THEMES).toEqual(expect.arrayContaining(["light", "dark", "system"]));
  });

  it("has exactly three entries", () => {
    expect(THEMES).toHaveLength(3);
  });

  it('starts with "light"', () => {
    expect(THEMES[0]).toBe("light");
  });

  it("THEME_STORAGE_KEY is a non-empty string", () => {
    expect(typeof THEME_STORAGE_KEY).toBe("string");
    expect(THEME_STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

// ─── 2. resolveTheme ────────────────────────────────────────────────────────

describe("resolveTheme", () => {
  beforeEach(() => mockMatchMedia(false));

  it('returns "light" when pref is "light"', () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it('returns "dark" when pref is "dark"', () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it('returns "dark" for "system" when OS prefers dark', () => {
    mockMatchMedia(false);
    expect(resolveTheme("system")).toBe("dark");
  });

  it('returns "light" for "system" when OS prefers light', () => {
    mockMatchMedia(true);
    expect(resolveTheme("system")).toBe("light");
  });
});

// ─── 3. readStoredTheme ──────────────────────────────────────────────────────

describe("readStoredTheme", () => {
  it("returns stored preference when it is a valid THEME", () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "light" });
    expect(readStoredTheme()).toBe("light");
  });

  it('returns "system" when nothing is stored', () => {
    mockLocalStorage({});
    expect(readStoredTheme()).toBe("system");
  });

  it('returns "system" when stored value is not a valid theme', () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "rainbow" });
    expect(readStoredTheme()).toBe("system");
  });

  it('returns "system" when localStorage throws', () => {
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: jest.fn(() => {
          throw new Error("storage blocked");
        }),
        setItem: jest.fn(),
      },
    });
    expect(readStoredTheme()).toBe("system");
  });
});

// ─── 4. applyTheme ───────────────────────────────────────────────────────────

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

  it('sets data-theme="dark" for "system" when OS prefers dark', () => {
    mockMatchMedia(false);
    applyTheme("system");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it('sets data-theme="light" for "system" when OS prefers light', () => {
    mockMatchMedia(true);
    applyTheme("system");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});

// ─── 5. ThemeToggle component ────────────────────────────────────────────────

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
    expect(screen.getByRole("button", { name: "Theme: System (click for Light)" })).toBeInTheDocument();
  });

  it("exposes a descriptive accessible name for the light icon state", () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "light" });
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Theme: Light (click for Dark)" })).toBeInTheDocument();
  });

  it("exposes a descriptive accessible name for the dark icon state", () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "dark" });
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Theme: Dark (click for System)" })).toBeInTheDocument();
  });

  it("aria-label mentions the current theme preference", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    expect(btn.getAttribute("aria-label")).toMatch(/system/i);
  });

  it("cycles system → light on first click", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute("data-theme-pref", "light");
  });

  // ── 5b-i. Keyboard activation ────────────────────────────────────────────

  it("is focusable and keyboard-accessible (button is natively operable)", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    btn.focus();
    expect(btn).toHaveFocus();
    expect(btn.tagName).toBe("BUTTON");
  });

  it("cycles theme via keyboard click (simulates Enter/Space activation)", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    btn.focus();
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute("data-theme-pref", "light");
  });

  it("cycles theme forward on ArrowDown keydown", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.keyDown(btn, { key: "ArrowDown" });
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

  it("cycles light → dark on second click", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => fireEvent.click(btn));
    await act(async () => fireEvent.click(btn));
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
  });

  it("cycles dark → system on third click", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => fireEvent.click(btn));
    await act(async () => fireEvent.click(btn));
    await act(async () => fireEvent.click(btn));
    expect(btn).toHaveAttribute("data-theme-pref", "system");
  });

  it("writes the new preference to localStorage on click", async () => {
    const ls = mockLocalStorage({});
    render(<ThemeToggle />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /theme:/i })));
    expect(ls.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "light");
  });

  it("sets data-theme on <html> after mount", async () => {
    render(<ThemeToggle />);
    await act(async () => {});
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  // ── 5e. aria-pressed reflects the active theme ────────────────────────

  it("aria-pressed is false when the active theme is light", async () => {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("aria-pressed is true when the active theme is dark", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /theme:/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("aria-pressed follows the system preference when the theme is set to system", async () => {
    mockMatchMedia(true);
    render(<ThemeToggle />);
    await act(async () => {});
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveAttribute("aria-pressed", "false");
  });

  // ── 5f. data attributes stay in sync ─────────────────────────────────────

  it("data-theme-next shows the next theme in the cycle", async () => {
    render(<ThemeToggle />);
    await act(async () => {});
    const btn = screen.getByRole("button", { name: /theme:/i });
    // starts at 'system', next is 'light'
    expect(btn).toHaveAttribute("data-theme-next", "light");
  });

  it("updates data-theme-next after a click", async () => {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });
    // now at 'light', next is 'dark'
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveAttribute("data-theme-next", "dark");
  });

  // ── 5g. className forwarding ──────────────────────────────────────────────

  it("forwards className to the button", () => {
    render(<ThemeToggle className="my-extra-class" />);
    expect(screen.getByRole("button", { name: /theme:/i })).toHaveClass("my-extra-class");
  });

  it("renders an SVG icon that is aria-hidden", () => {
    render(<ThemeToggle />);
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

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
});

// ─── 6. Accessibility (jest-axe) – Acceptance Criteria ───────────────────────

describe("ThemeToggle accessibility (jest-axe)", () => {
  beforeEach(() => {
    mockLocalStorage({});
    mockMatchMedia(false);
    cleanupDataTheme();
  });
  afterEach(cleanupDataTheme);

  // LOADED state (default / system preference)
  it("has no accessibility violations in loaded (system) state", async () => {
    const { container } = render(<ThemeToggle />);
    await act(async () => {});
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // LOADED state – light
  it("has no accessibility violations in light theme state", async () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "light" });
    const { container } = render(<ThemeToggle />);
    await act(async () => {});
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // LOADED state – dark
  it("has no accessibility violations in dark theme state", async () => {
    mockLocalStorage({ [THEME_STORAGE_KEY]: "dark" });
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

// ─── 6. formatRelativeTime — pure formatter, tested with a fixed clock ───────

describe("formatRelativeTime", () => {
  const FIXED_NOW = new Date("2026-07-26T12:00:00.000Z").getTime();

  it("returns null when there is no timestamp", () => {
    expect(formatRelativeTime(null, FIXED_NOW)).toBeNull();
  });

  it('returns "just now" for under a minute', () => {
    expect(formatRelativeTime(FIXED_NOW - 30 * 1000, FIXED_NOW)).toBe("just now");
    expect(formatRelativeTime(FIXED_NOW, FIXED_NOW)).toBe("just now");
  });

  it("formats singular and plural minutes", () => {
    expect(formatRelativeTime(FIXED_NOW - 60 * 1000, FIXED_NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(FIXED_NOW - 5 * 60 * 1000, FIXED_NOW)).toBe("5 minutes ago");
    expect(formatRelativeTime(FIXED_NOW - 59 * 60 * 1000, FIXED_NOW)).toBe("59 minutes ago");
  });

  it("formats singular and plural hours", () => {
    expect(formatRelativeTime(FIXED_NOW - 60 * 60 * 1000, FIXED_NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(FIXED_NOW - 3 * 60 * 60 * 1000, FIXED_NOW)).toBe("3 hours ago");
    expect(formatRelativeTime(FIXED_NOW - 23 * 60 * 60 * 1000, FIXED_NOW)).toBe("23 hours ago");
  });

  it("formats singular and plural days beyond 24 hours", () => {
    expect(formatRelativeTime(FIXED_NOW - 24 * 60 * 60 * 1000, FIXED_NOW)).toBe("1 day ago");
    expect(formatRelativeTime(FIXED_NOW - 50 * 60 * 60 * 1000, FIXED_NOW)).toBe("2 days ago");
  });

  it("defaults `now` to the current time when omitted", () => {
    const realNow = Date.now();
    expect(formatRelativeTime(realNow)).toBe("just now");
  });

  it("treats invalid input as null", () => {
    expect(formatRelativeTime(undefined, FIXED_NOW)).toBeNull();
    expect(formatRelativeTime(NaN, FIXED_NOW)).toBeNull();
  });
});

// ─── 7. readStoredUpdatedAt ───────────────────────────────────────────────────

describe("readStoredUpdatedAt", () => {
  it("returns the stored numeric timestamp", () => {
    mockLocalStorage({ [THEME_UPDATED_KEY]: "1700000000000" });
    expect(readStoredUpdatedAt()).toBe(1700000000000);
  });

  it("returns null when nothing is stored", () => {
    mockLocalStorage({});
    expect(readStoredUpdatedAt()).toBeNull();
  });

  it("returns null when the stored value is not numeric", () => {
    mockLocalStorage({ [THEME_UPDATED_KEY]: "not-a-number" });
    expect(readStoredUpdatedAt()).toBeNull();
  });

  it("returns null when localStorage throws", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
      writable: true,
    });
    expect(readStoredUpdatedAt()).toBeNull();
  });
});

// ─── 8. ThemeToggle — relative "last updated" label ──────────────────────────

describe("ThemeToggle last-updated label", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("renders no label when the theme has never been changed", () => {
    mockLocalStorage({});
    render(<ThemeToggle />);
    expect(screen.queryByTestId("theme-updated-at")).not.toBeInTheDocument();
  });

  it('shows "just now" immediately after a click, and persists the timestamp', async () => {
    const storage = mockLocalStorage({});
    const fixedNow = new Date("2026-07-26T12:00:00.000Z").getTime();
    jest.spyOn(Date, "now").mockReturnValue(fixedNow);

    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });

    expect(screen.getByTestId("theme-updated-at")).toHaveTextContent("just now");
    expect(storage.setItem).toHaveBeenCalledWith(THEME_UPDATED_KEY, String(fixedNow));

    (Date.now as jest.Mock).mockRestore();
  });

  it("shows an accessible absolute-time alternative alongside the relative label", async () => {
    mockLocalStorage({});
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /theme:/i }));
    });

    const label = screen.getByTestId("theme-updated-at");
    expect(label).toHaveAttribute("title", expect.stringContaining("Theme last changed:"));
    expect(label.querySelector(".sr-only")).toHaveTextContent(/Theme last changed/);
  });

  it("reads a previously stored timestamp on mount and renders it as relative time", () => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    mockLocalStorage({ [THEME_STORAGE_KEY]: "dark", [THEME_UPDATED_KEY]: String(oneHourAgo) });

    render(<ThemeToggle />);

    expect(screen.getByTestId("theme-updated-at")).toHaveTextContent("1 hour ago");
  });
});
