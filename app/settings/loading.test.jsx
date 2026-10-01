/**
 * @file app/settings/loading.test.jsx
 * Tests for the Next.js route-level loading UI at /settings.
 *
 * Verifies that SettingsLoading:
 *  - renders without errors
 *  - delegates to ThemeSkeleton
 *  - exposes the correct ARIA attributes on the page shell
 *  - has no accessibility violations
 *
 * Additionally covers the validation boundaries defined in this module:
 *  - accepted input (numbers, literal reduced-motion values, custom labels)
 *  - rejected input (wrong types, negative/overflow delays, NaN, Infinity)
 *  - duplicate submissions (concurrent renders produce identical output)
 *  - boundary values (0, MAX_SKELETON_DELAY_MS)
 *
 * NOTE: This file is a Jest test module. It must be parsed by the
 * project's Jest/Babel transform pipeline (which understands JSX/TSX),
 * not by `Node.js --check`. Running `node --check` directly on a `.jsx`
 * file fails with ERR_UNKNOWN_FILE_EXTENSION because Node's built-in
 * syntax checker does not support the `.jsx` extension. Use
 * `npx jest app/settings/loading.test.jsx` (or the repository's configured
 * test script) to validate this file.
 */

/* eslint-env jest */

/**
 * @file app/settings/loading.test.jsx
 * Comprehensive unit, boundary, integration, and accessibility tests for SettingsLoading
 * with deterministic failure recovery.
 */

// @ts-nocheck

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import SettingsLoading, {
  MAX_SKELETON_DELAY_MS,
  DEFAULT_SKELETON_DELAY_MS,
  clampSkeletonDelay,
  normaliseReducedMotion,
  getSettingsLoadingState,
} from "./loading";

expect.extend(toHaveNoViolations);

/* global describe, it, expect, jest */

describe("SettingsLoading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    throwChildError = true;
  });

  it("renders the page root with data-testid='settings-loading'", () => {
    render(<SettingsLoading />);
    expect(screen.getByTestId("settings-loading")).toBeInDocument();
  });

  describe("Deterministic Timeout Failure Recovery", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("transitions deterministically to TIMED_OUT after DEFAULT_TIMEOUT_MS", () => {
      const onError = jest.fn();
      render(<SettingsLoading onError={onError} />);

      expect(screen.getByTestId("settings-loading")).toHaveAttribute("aria-busy", "true");
      expect(screen.queryByTestId("settings-loading-fallback")).not.toBeInTheDocument();

      // Advance by slightly less than the timeout
      act(() => {
        jest.advanceTimersByTime(DEFAULT_TIMEOUT_MS - 100);
      });
      expect(screen.queryByTestId("settings-loading-fallback")).not.toBeInTheDocument();

      // Trigger timeout transition
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("settings-loading")).toHaveAttribute("aria-busy", "false");
      expect(screen.getByTestId("settings-loading")).toHaveAttribute("data-status", "timed_out");
      expect(screen.getByTestId("settings-loading-fallback")).toBeInTheDocument();
      expect(screen.getByText("Loading timed out")).toBeInTheDocument();
      expect(
        screen.getByText(/settings are taking longer than expected to load/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

      // Observability checks
      expect(reportError).toHaveBeenCalledTimes(1);
      expect(reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "SettingsLoadingTimeoutError",
          code: "LOADING_TIMEOUT",
        }),
        expect.objectContaining({
          boundary: "SettingsLoading",
          phase: "timeout",
          retryCount: 0,
        })
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ phase: "timeout", retryCount: 0 })
      );
    });

    it("respects custom timeoutMs threshold", () => {
      render(<SettingsLoading timeoutMs={500} />);

      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(screen.queryByTestId("settings-loading-fallback")).not.toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByTestId("settings-loading-fallback")).toBeInTheDocument();
    });

    it("clears timeout timer cleanly on component unmount", () => {
      const onError = jest.fn();
      const { unmount } = render(<SettingsLoading timeoutMs={1000} onError={onError} />);

      unmount();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(reportError).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    describe("Boundary cases for timeoutMs", () => {
      it("disables timeout when timeoutMs is 0", () => {
        render(<SettingsLoading timeoutMs={0} />);
        act(() => {
          jest.advanceTimersByTime(30000);
        });
        expect(screen.queryByTestId("settings-loading-fallback")).not.toBeInTheDocument();
        expect(screen.getByTestId("settings-loading")).toHaveAttribute("aria-busy", "true");
      });

      it("disables timeout when timeoutMs is negative", () => {
        render(<SettingsLoading timeoutMs={-500} />);
        act(() => {
          jest.advanceTimersByTime(30000);
        });
        expect(screen.queryByTestId("settings-loading-fallback")).not.toBeInTheDocument();
      });

      it("disables timeout when timeoutMs is null", () => {
        render(<SettingsLoading timeoutMs={null} />);
        act(() => {
          jest.advanceTimersByTime(30000);
        });
        expect(screen.queryByTestId("settings-loading-fallback")).not.toBeInTheDocument();
      });

      it("disables timeout when timeoutMs is NaN", () => {
        render(<SettingsLoading timeoutMs={NaN} />);
        act(() => {
          jest.advanceTimersByTime(30000);
        });
        expect(screen.queryByTestId("settings-loading-fallback")).not.toBeInTheDocument();
      });
    });
  });

  it("renders the NavMenuSkeleton header", () => {
    const { container } = render(<SettingsLoading />);
    const header = container.querySelector("header");
    expect(header).toBeInDocument();
  });

  it("renders the ThemeSkeleton component (data-testid='theme-skeleton')", () => {
    render(<SettingsLoading />);
    expect(screen.getByTestId("theme-skeleton")).toBeInDocument();
  });

  it("ThemeSkleton inside SettingsLoading has aria-busy='true'", () => {
    render(<SettingsLoading />);
    expect(screen.getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("contains the sr-only loading announcement from ThemeSkeleton", () => {
    render(<SettingsLoading />);
    expect(screen.getByText(/theme settings loading, please wait/i)).toBeInDocument();
  });

  describe("Compatibility Contracts & Edge Cases", () => {
    it("safely handles nullish and primitive inputs to component function", () => {
      expect(() => render(SettingsLoading(null))).not.toThrow();
      expect(() => render(SettingsLoading(undefined))).not.toThrow();
      expect(() => render(SettingsLoading(42))).not.toThrow();
      expect(() => render(SettingsLoading("invalid-string"))).not.toThrow();
      expect(() => render(SettingsLoading([]))).not.toThrow();
    });

    it("merges custom className without displacing base layout classes", () => {
      render(<SettingsLoading className="custom-wrapper-class extra-padding" />);
      const root = screen.getByTestId("settings-loading");
      expect(root).toHaveClass(
        "min-h-screen",
        "bg-slate-950",
        "custom-wrapper-class",
        "extra-padding"
      );
    });

    it("allows overriding isBusy to false while preserving ARIA semantics", () => {
      render(<SettingsLoading isBusy={false} />);
      const root = screen.getByTestId("settings-loading");
      expect(root).toHaveAttribute("aria-busy", "false");
      expect(screen.getByTestId("theme-skeleton")).toHaveAttribute("aria-busy", "false");
    });

    it("allows custom data-testid while falling back to default", () => {
      render(<SettingsLoading data-testid="custom-settings-loader" />);
      expect(screen.getByTestId("custom-settings-loader")).toBeInTheDocument();
    });

    it("forwards arbitrary HTML and data attributes safely to root", () => {
      render(
        <SettingsLoading
          id="route-settings-loading"
          data-env="production"
          title="Loading settings"
        />
      );
      const root = screen.getByTestId("settings-loading");
      expect(root).toHaveAttribute("id", "route-settings-loading");
      expect(root).toHaveAttribute("data-env", "production");
      expect(root).toHaveAttribute("title", "Loading settings");
    });

    it("renders optional children slot without displacing default skeleton", () => {
      render(
        <SettingsLoading>
          <div data-testid="settings-custom-addon">Extra status info</div>
        </SettingsLoading>
      );
      expect(screen.getByTestId("settings-loading")).toBeInTheDocument();
      expect(screen.getByTestId("theme-skeleton")).toBeInTheDocument();
      expect(screen.getByTestId("settings-custom-addon")).toHaveTextContent("Extra status info");
    });

    it("preserves accessibility when rendered with custom props and children", async () => {
      const { container } = render(
        <SettingsLoading className="custom-test" isBusy={true}>
          <div className="text-slate-400 text-sm mt-4">Loading user profile preferences...</div>
        </SettingsLoading>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  /**
   * Concurrency / idempotency regression guards.
   *
   * The /settings loading UI is a pure, side-effect-free component so that concurrent or
   * repeated renders (e.g. React StrictMode double-invoke, Suspense retries, route
   * prefetch + navigation races) cannot produce stale or inconsistent output.
   */
  describe("concurrency and idempotency", () => {
    it("renders identical markup across repeated renders", () => {
      const first = render(<SettingsLoading />);
      const firstHtml = first.container.innerHTML;
      first.unmount();

      const second = render(<SettingsLoading />);
      const secondHtml = second.container.innerHTML;
      second.unmount();

      expect(secondHtml).toEqual(firstHtml);
    });

    it("supports concurrent instances without duplicate testid leaks", () => {
      const a = render(<SettingsLoading />);
      const b = render(<SettingsLoading />);

      // Each instance must own exactly one root and one ThemeSkeleton.
      expect(a.getByTestId("settings-loading")).toBeInDocument();
      expect(b.getByTestId("settings-loading")).toBeInDocument();
      expect(a.getByTestId("theme-skeleton")).toBeInDocument();
      expect(b.getByTestId("theme-skeleton")).toBeInDocument();

      a.unmount();
      b.unmount();
    });

    it("remains stable when unmounted and remounted rapidly", () => {
      const { unmount } = render(<SettingsLoading />);
      expect(() => unmount()).not.toThrow();

      const remounted = render(<SettingsLoading />);
      expect(remounted.getByTestId("settings-loading")).toHaveAttribute("aria-busy", "true");
      remounted.unmount();
    });

    it("produces no console errors or warnings during render", () => {
      const spyError = jest.spyOn(console, "error").mockImplementation(() => {});
      const spyWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

      const { unmount } = render(<SettingsLoading />);
      unmount();

      expect(spyError).not.toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();

      spyError.mockRestore();
      spyWarn.mockRestore();
    });
  });
});

describe("clampSkeletonDelay", () => {
  it("accepts a valid numeric delay", () => {
    expect(clampSkeletonDelay(250)).toBe(250);
  });

  it("accepts a numeric string delay", () => {
    expect(clampSkeletonDelay("125")).toBe(125);
  });

  it("floors fractional delays", () => {
    expect(clampSkeletonDelay(12.7)).toBe(12);
  });

  it("clamps negative delays to 0", () => {
    expect(clampSkeletonDelay(-1)).toBe(0);
  });

  it("clamps delays above the maximum", () => {
    expect(clampSkeletonDelay(MAX_SKELETON_DELAY_MS + 1)).toBe(
      MAX_SKELETON_DELAY_MS
    );
  });

  it("accepts the maximum boundary value", () => {
    expect(clampSkeletonDelay(MAX_SKELETON_DELAY_MS)).toBe(
      MAX_SKELETON_DELAY_MS
    );
  });

  it("accepts the zero boundary value", () => {
    expect(clampSkeletonDelay(0)).toBe(0);
  });

  it("rejects NaN and falls back to the default", () => {
    expect(clampSkeletonDelay(NaN)).toBe(
      DEFAULT_SKELETON_DELAY_MS
    );
  });

  it("rejects Infinity and falls back to the default", () => {
    expect(clampSkeletonDelay(Infinity)).toBe(
      DEFAULT_SKELETON_DELAY_MS
    );
  });

  it("rejects non-numeric strings and falls back to the default", () => {
    expect(clampSkeletonDelay("not-a-number")).toBe(
      DEFAULT_SKELETON_DELAY_MS
    );
  });

  it("rejects null, undefined, objects and booleans", () => {
    expect(clampSkeletonDelay(null)).toBe(
      DEFAULT_SKELETON_DELAY_MS
    );
    expect(clampSkeletonDelay(undefined)).toBe(
      DEFAULT_SKELETON_DELAY_MS
    );
    expect(clampSkeletonDelay({})).toBe(
      DEFAULT_SKELETON_DELAY_MS
    );
    expect(clampSkeletonDelay(true)).toBe(
      DEFAULT_SKELETON_DELAY_MS
    );
  });
});

describe("normaliseReducedMotion", () => {
  it("accepts the documented literals", () => {
    expect(normaliseReducedMotion("system")).toBe("system");
    expect(normaliseReducedMotion("reduce")).toBe("reduce");
    expect(normaliseReducedMotion("no-preference")).toBe(
      "no-preference"
    );
  });

  it("normalises case and whitespace", () => {
    expect(normaliseReducedMotion("  REduce  ")).toBe("reduce");
  });

  it("rejects unknown literals and non-strings", () => {
    expect(normaliseReducedMotion("fast")).toBe("system");
    expect(normaliseReducedMotion(null)).toBe("system");
    expect(normaliseReducedMotion(1)).toBe("system");
    expect(normaliseReducedMotion({})).toBe("system");
  });
});

describe("getSettingsLoadingState", () => {
  it("returns safe defaults for an empty object", () => {
    expect(getSettingsLoadingState({})).toEqual({
      delayMic: DEFAULT_SKELETON_DELAY_MS,
      reducedMotion: "system",
      label: "Theme settings loading, please wait",
    });
  });

  it("returns safe defaults for non-object input", () => {
    expect(getSettingsLoadingState(null).delayMic).toBe(
      DEFAULT_SKELETON_DELAY_MS
    );
    expect(getSettingsLoadingState("nope").reducedMotion).toBe("system");
    expect(getSettingsLoadingState(undefined).label).toMatch(/loading/i);
  });

  it("preserves valid input fields", () => {
    expect(
      getSettingsLoadingState({
        delayMic: 1000,
        reducedMotion: "reduce",
        label: "Waiting for settings",
      })
    ).toEqual({
      delayMic: 1000,
      reducedMotion: "reduce",
      label: "Waiting for settings",
    });
  });

  it("is deterministic for duplicate inputs", () => {
    const input = { delayMic: 500, reducedMotion: "reduce", label: "X" };
    expect(getSettingsLoadingState(input)).toEqual(
      getSettingsLoadingState(input)
    );
  });
});

describe("SettingsLoading validation boundaries", () => {
  it("exposes the clamped delay and reduced-motion on the root", () => {
    render(
      <SettingsLoading delayMic={Math.pow(10, 9)} reducedMotion="REDUCE" />
    );
    const root = screen.getByTestId("settings-loading");
    expect(root).toHaveAttribute(
      "data-delay-ms",
      String(MAX_SKELETON_DELAY_MS)
    );
    expect(root).toHaveAttribute("data-reduced-motion", "reduce");
  });

  it("rejects invalid delay and reduced-motion values", () => {
    render(<SettingsLoading delayMic="not-a-number" reducedMotion="fast" />);
    const root = screen.getByTestId("settings-loading");
    expect(root).toHaveAttribute(
      "data-delay-ms",
      String(DEFAULT_SKELETON_DELAY_MS)
    );
    expect(root).toHaveAttribute("data-reduced-motion", "system");
  });

  it("renders identically for duplicate submissions", () => {
    const props = { delayMic: 123, reducedMotion: "system" };
    const first = render(<SettingsLoading {...props} />);
    const firstHtml = first.container.innerHTML;
    first.unrender();
    const second = render(<SettingsLoading {...props} />);
    expect(second.container.innerHTML).toBe(firstHtml);
  });

  it("accepts the zero boundary value", () => {
    render(<SettingsLoading delayMic={0} />);
    expect(screen.getByTestId("settings-loading")).toHaveAttribute(
      "data-delay-ms",
      "0"
    );
  });

  it("accepts the maximum boundary value", () => {
    render(<SettingsLoading delayMic={MAX_SKELETON_DELAY_MS} />);
    expect(screen.getByTestId("settings-loading")).toHaveAttribute(
      "data-delay-ms",
      String(MAX_SKELETON_DELAY_MS)
    );
  });

  it("forwards a custom label to ThemeSkeleton", () => {
    render(<SettingsLoading label="Custom loading message" />);
    expect(screen.getByText(/custom loading message/i)).toBeInDocument();
  });
});
