import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeToggle from "@/components/ThemeToggle";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { THEME_KEY } from "@/lib/theme";

function mockMatchMedia(initialMatches = false) {
  let matches = initialMatches;
  const listeners = new Set();

  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener(type, fn) {
      if (type === "change") listeners.add(fn);
    },
    removeEventListener(type, fn) {
      if (type === "change") listeners.delete(fn);
    },
    trigger(nextMatches) {
      matches = nextMatches;
      for (const fn of listeners) fn({ matches: nextMatches, media: mql.media });
    },
    listenerCount() {
      return listeners.size;
    },
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn(() => mql),
  });

  return mql;
}

function renderToggle(locale = "en") {
  return render(
    <I18nProvider locale={locale} dict={getDictionary(locale)}>
      <ThemeToggle />
    </I18nProvider>
  );
}

describe("ThemeToggle component", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders localized labels and reflects stored preference", () => {
    mockMatchMedia(false);
    window.localStorage.setItem(THEME_KEY, "dark");

    renderToggle("en");

    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "false");
  });

  it("renders Spanish translations when locale is es", () => {
    mockMatchMedia(false);

    renderToggle("es");

    expect(screen.getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Claro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Oscuro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Sistema" })).toBeInTheDocument();
  });

  it("persists selection to localStorage and sets data-theme", () => {
    mockMatchMedia(false);

    renderToggle("en");

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("radio", { name: "Light" }));

    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  });

  it("reacts to matchMedia change events when preference is system", () => {
    const mql = mockMatchMedia(false);

    const { unmount } = renderToggle("en");

    expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
    expect(mql.listenerCount()).toBe(1);

    act(() => {
      mql.trigger(true);
    });
    expect(document.documentElement.dataset.theme).toBe("dark");

    act(() => {
      mql.trigger(false);
    });
    expect(document.documentElement.dataset.theme).toBe("light");

    unmount();
    expect(mql.listenerCount()).toBe(0);
  });
});