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
  THEME_STORAGE_KEY,
  resolveTheme,
  readStoredTheme,
  applyTheme,
} from "./ThemeToggle";

expect.extend(toHaveNoViolations);

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
  beforeEach(() => {
    mockLocalStorage({});
    mockMatchMedia(false);
    cleanupDataTheme();
  });
  afterEach(cleanupDataTheme);

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
    expect(btn.getAttribute("aria-label")).toMatch(/system/i);
  });

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
    await act(async () => fireEvent.click(btn));
    await act(async () => fireEvent.click(btn));
    expect(btn).toHaveAttribute("data-theme-pref", "dark");
  });

  it("cycles dark → system on third click", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    await act(async () => fireEvent.click(btn));
    await act(async () => fireEvent.click(btn));
    await act(async () => fireEvent.click(btn));
    expect(btn).toHaveAttribute("data-theme-pref", "system");
  });

  it("writes the new preference to localStorage on click", async () => {
    const ls = mockLocalStorage({});
    render(<ThemeToggle />);
    await act(async () => fireEvent.click(screen.getByRole("button")));
    expect(ls.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "light");
  });

  it("sets data-theme on <html> after mount", async () => {
    render(<ThemeToggle />);
    await act(async () => {});
    expect(document.documentElement).toHaveAttribute("data-theme");
  });

  it('aria-pressed is false when preference is "system"', async () => {
    render(<ThemeToggle />);
    await act(async () => {});
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it('aria-pressed is true when preference is "light"', async () => {
    render(<ThemeToggle />);
    await act(async () => fireEvent.click(screen.getByRole("button")));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("forwards className to the button", () => {
    render(<ThemeToggle className="my-extra-class" />);
    expect(screen.getByRole("button")).toHaveClass("my-extra-class");
  });

  it("renders an SVG icon that is aria-hidden", () => {
    render(<ThemeToggle />);
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
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
