/**
 * End-to-end coverage for issue #265 — Theme toggle persistence across reloads.
 *
 * Complements the unit tests in `components/ThemeToggle.test.tsx` by exercising
 * the full browser-level integration with `localStorage`, the pre-paint inline
 * hydration script in `app/layout.js`, and the React mount cycle.
 *
 * Scenarios covered
 * ─────────────────
 * 1. Toggling to a non-default theme sets `data-theme` and persists across a
 *    full page reload, with no console errors during the flow.
 * 2. Cycling through to `dark` likewise persists across reload.
 * 3. A pre-set `localStorage` preference is applied on first paint — no flash
 *    of incorrect theme (FOIT).
 * 4. The toggle button remains keyboard-accessible after a reload (focus
 *    management / a11y).
 * 5. Cycling through all three themes persists the final preference.
 *
 * Each test runs against an isolated browser context (Playwright default), so
 * `localStorage` from a previous test does not bleed in.
 */
import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

/** localStorage key used by `ThemeToggle`.  Keep in sync with `THEME_STORAGE_KEY`. */
const THEME_STORAGE_KEY = "liquifact-theme";

/** Selector for the toggle button rendered by the `<ThemeToggle />` component. */
const TOGGLE_SELECTOR = "#theme-toggle";

/**
 * Window augmentation used by the "no flash" test to record the timeline
 * of `data-theme` values seen on `<html>`.  Hoisted so each call site
 * doesn't re-cast through `window as …`.
 */
type ThemeTimelineWindow = Window & { __themeTimeline__?: Array<string> };

/**
 * Capture console errors and uncaught page errors for a page.
 *
 * The assertions at the end of each test fail if anything written to
 * `console.error` or raised via `pageerror` was observed during the test.
 * This guards against regressions where the toggle flow might emit noise
 * during hydration, persistence, or reload.
 */
function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err: Error) => errors.push(err.message));
  return errors;
}

test.describe("Theme toggle persistence (#265)", () => {
  test("toggling to light applies data-theme and persists across reload with no console errors", async ({
    page,
  }) => {
    // Pin the OS preference to `dark` so 'system' resolves to 'dark' and the
    // first toggle click (system → light) is unambiguously a non-default theme.
    await page.emulateMedia({ colorScheme: "dark" });

    const errors = captureConsoleErrors(page);

    await page.goto("/");
    const toggle = page.locator(TOGGLE_SELECTOR);
    await expect(toggle).toBeVisible();

    // Initial state: preference 'system', which resolves to 'dark'.
    await expect(toggle).toHaveAttribute("data-theme-pref", "system");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Click once: system → light (non-default). `data-theme` must follow.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme-pref", "light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Preference is persisted to localStorage on click.
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      THEME_STORAGE_KEY
    );
    expect(stored).toBe("light");

    // Full page reload — the pre-paint inline script re-applies the preference
    // before React hydrates, eliminating the flash of incorrect theme.
    await page.reload();

    // Theme is restored from localStorage.
    await expect(toggle).toHaveAttribute("data-theme-pref", "light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    const storedAfter = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      THEME_STORAGE_KEY
    );
    expect(storedAfter).toBe("light");

    expect(errors).toEqual([]);
  });

  test("toggling through to dark persists across reload", async ({ page }) => {
    // Pin the OS preference to `light` so 'system' resolves to 'light' and
    // 'dark' is unambiguously the non-default selection.
    await page.emulateMedia({ colorScheme: "light" });

    const errors = captureConsoleErrors(page);

    await page.goto("/");
    const toggle = page.locator(TOGGLE_SELECTOR);
    await expect(toggle).toBeVisible();

    await expect(toggle).toHaveAttribute("data-theme-pref", "system");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Click twice: system → light → dark.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme-pref", "light");
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme-pref", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      THEME_STORAGE_KEY
    );
    expect(stored).toBe("dark");

    await page.reload();

    await expect(toggle).toHaveAttribute("data-theme-pref", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const storedAfter = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      THEME_STORAGE_KEY
    );
    expect(storedAfter).toBe("dark");

    expect(errors).toEqual([]);
  });

  test("pre-set localStorage preference is applied on first paint (no flash)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });

    // Seed localStorage BEFORE the page loads, so the pre-paint inline script
    // in `app/layout.js` reads it before React mounts.
    await page.addInitScript(
      ([key, value]: [string, string]) => {
        window.localStorage.setItem(key, value);
      },
      [THEME_STORAGE_KEY, "light"] as [string, string]
    );

    // Record every value the `data-theme` attribute ever takes on <html>.
    // A flash of incorrect theme would manifest as any record besides "light".
    //
    // `document.documentElement` is not guaranteed to be available when
    // `addInitScript` first executes, so we defer setup to DOMContentLoaded
    // if it isn't ready yet.  The pre-paint inline script in `app/layout.js`
    // still runs before DOMContentLoaded — by the time we attach the observer
    // and capture the initial value, the inline script has already set
    // `data-theme="light"`, so the first `push()` records that value (and
    // any subsequent mutation would fire the observer).
    await page.addInitScript(() => {
      const setupObserver = () => {
        const w = window as ThemeTimelineWindow;
        w.__themeTimeline__ = [];
        const push = () => {
          const v = document.documentElement.getAttribute("data-theme");
          if (v !== null) w.__themeTimeline__?.push(v);
        };
        push();
        const observer = new MutationObserver(push);
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });
      };
      if (document.documentElement) {
        setupObserver();
      } else {
        document.addEventListener("DOMContentLoaded", setupObserver);
      }
    });

    const errors = captureConsoleErrors(page);

    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(TOGGLE_SELECTOR)).toHaveAttribute("data-theme-pref", "light");

    // No flash of incorrect theme: every observed value is "light".  The
    // pre-paint inline script sets this on <html> before any React rendering
    // occurs, so the user never sees the wrong theme.
    const timeline = await page.evaluate(
      () => (window as ThemeTimelineWindow).__themeTimeline__ ?? []
    );
    expect(timeline.length).toBeGreaterThan(0);
    expect(Array.from(new Set(timeline))).toEqual(["light"]);

    expect(errors).toEqual([]);
  });

  test("toggle remains keyboard-accessible after reload (focus preserved)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/");
    const toggle = page.locator(TOGGLE_SELECTOR);
    await expect(toggle).toBeVisible();

    // Focus the toggle and activate it via keyboard — focus stays on the
    // button after click, so keyboard users retain their interaction context.
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("data-theme-pref", "light");

    // Reload — Chromium doesn't deterministically focus <body> after a
    // reload, so we explicitly blur whatever was focused.  The first Tab
    // press below then enters the document tab order from its head, no
    // matter which element (if any) Chromium left focused.
    await page.reload();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("data-theme-pref", "light");

    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });

    // Bound the loop by the actual number of focusable elements so the test
    // doesn't rely on a fixed magic number; a small slack handles the case
    // where focus wraps around to the start of the document.
    const focusableCount = await page.evaluate(
      () =>
        document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ).length
    );

    let reached = false;
    for (let i = 0; i < focusableCount + 4 && !reached; i++) {
      await page.keyboard.press("Tab");
      const focusedId = await page.evaluate(() => document.activeElement?.id ?? "");
      if (focusedId === "theme-toggle") {
        reached = true;
      }
    }
    expect(reached).toBe(true);

    // The toggle can also receive programmatic focus — guards against an
    // accidental `tabindex="-1"` regression after reload.
    await toggle.focus();
    await expect(toggle).toBeFocused();
  });

  test("cycling through all three themes persists the final preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/");
    const toggle = page.locator(TOGGLE_SELECTOR);
    await expect(toggle).toBeVisible();

    // Cycle from 'system' through 'light' and 'dark' and back to 'system'.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme-pref", "light");
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme-pref", "dark");
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme-pref", "system");

    // `system` resolves to `dark` because we emulated dark colour scheme.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      THEME_STORAGE_KEY
    );
    expect(stored).toBe("system");

    await page.reload();

    await expect(toggle).toHaveAttribute("data-theme-pref", "system");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const storedAfter = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      THEME_STORAGE_KEY
    );
    expect(storedAfter).toBe("system");
  });
});
