/**
 * @file ThemeToggle.test.tsx
 *
 * Comprehensive tests for the ThemeToggle component and its exported helpers.
 *
 * Areas covered
 * ─────────────
 * 1. THEMES constant — shape and order
 * 2. resolveTheme   — maps pref to effective visual theme
 * 3. readStoredTheme — reads from localStorage, falls back to 'system'
 * 4. applyTheme     — writes data-theme to document.documentElement
 * 5. ThemeToggle component
 *    a. Renders a button with an accessible aria-label
 *    b. Cycles light → dark → system on successive clicks
 *    c. Persists the new preference to localStorage on click
 *    d. Applies data-theme to <html> on mount and on click
 *    e. aria-pressed reflects non-system preferences
 *    f. data-theme-pref and data-theme-next attributes stay in sync
 *    g. Custom className is forwarded to the root button
 *    h. Button has an id of "theme-toggle"
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ThemeToggle, {
  THEMES,
  THEME_STORAGE_KEY,
  THEME_UPDATED_STORAGE_KEY,
  THEME_UPDATED_TICK_MS,
  resolveTheme,
  readStoredTheme,
  readStoredThemeUpdatedAt,
  applyTheme,
} from "./ThemeToggle";

// ─── Test utilities ──────────────────────────────────────────────────────────

/** Reset HTML data-theme before/after each test. */
function cleanupDataTheme() {
  document.documentElement.removeAttribute("data-theme");
}

/** Mock localStorage */
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

/** Mock matchMedia to simulate OS preference. */
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

  it('starts with "light" (the toggle start state)', () => {
    expect(THEMES[0]).toBe("light");
  });

  it("THEME_STORAGE_KEY is a non-empty string", () => {
    expect(typeof THEME_STORAGE_KEY).toBe("string");
    expect(THEME_STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

// ─── 2. resolveTheme ────────────────────────────────────────────────────────

describe("resolveTheme", () => {
  beforeEach(() => mockMatchMedia(false)); // default: OS prefers dark

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
  beforeEach(() => {
    mockLocalStorage({});
    mockMatchMedia(false);
    cleanupDataTheme();
  });
  afterEach(cleanupDataTheme);

  // ── 5a. Renders a button ──────────────────────────────────────────────────

  it("renders a button element", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it('has id="theme-toggle"', () => {
    render(<ThemeToggle />);
    expect(document.getElementById("theme-toggle")).toBeInTheDocument();
  });

  it("has a non-empty aria-label", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label");
    expect(btn.getAttribute("aria-label")!.length).toBeGreaterThan(0);
  });

  it("aria-label mentions the current theme preference", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    // Default preference is 'system'
    expect(btn.getAttribute("aria-label")).toMatch(/system/i);
  });

  // ── 5b. Cycles through themes on click ────────────────────────────────────

  it("cycles system → light on first click", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute("data-theme-pref", "light");
  });

  it("cycles light → dark on second click", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
  });

  it("cycles dark → system on third click", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute("data-theme-pref", "system");
  });

  it("wraps from system back to light after a full cycle", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
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
      fireEvent.click(screen.getByRole("button"));
    });
    expect(ls.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "light");
  });

  it('stores "dark" after a second click', async () => {
    const ls = mockLocalStorage({});
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
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
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
  });

  // ── 5d. Applies data-theme to <html> ──────────────────────────────────────

  it("sets data-theme on <html> after mount", async () => {
    render(<ThemeToggle />);
    await act(async () => {});
    expect(document.documentElement).toHaveAttribute("data-theme");
  });

  it('sets data-theme="light" on <html> after clicking to light', async () => {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it('sets data-theme="dark" on <html> after clicking to dark', async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
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
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it('aria-pressed is true when preference is "light"', async () => {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it('aria-pressed is true when preference is "dark"', async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  // ── 5f. data attributes stay in sync ─────────────────────────────────────

  it("data-theme-next shows the next theme in the cycle", async () => {
    render(<ThemeToggle />);
    await act(async () => {});
    const btn = screen.getByRole("button");
    // starts at 'system', next is 'light'
    expect(btn).toHaveAttribute("data-theme-next", "light");
  });

  it("updates data-theme-next after a click", async () => {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    // now at 'light', next is 'dark'
    expect(screen.getByRole("button")).toHaveAttribute("data-theme-next", "dark");
  });

  // ── 5g. className forwarding ──────────────────────────────────────────────

  it("forwards className to the button", () => {
    render(<ThemeToggle className="my-extra-class" />);
    expect(screen.getByRole("button")).toHaveClass("my-extra-class");
  });

  it("keeps built-in classes alongside the custom className", () => {
    render(<ThemeToggle className="extra" />);
    expect(screen.getByRole("button")).toHaveClass("rounded-lg");
    expect(screen.getByRole("button")).toHaveClass("extra");
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

  it("does not expose SVG as a focusable element", () => {
    render(<ThemeToggle />);
    const svgs = document.querySelectorAll("svg");
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("focusable", "false");
    });
  });
});

// ─── 6. Relative "last updated" timestamp ────────────────────────────────────

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
      fireEvent.click(screen.getByRole("button"));
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
