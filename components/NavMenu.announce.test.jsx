/**
 * @file NavMenu.announce.test.jsx
 *
 * Tests for issue #550 — polite aria-live navigation announcements.
 *
 * Covered behaviours:
 *  1.  A single polite live region with data-testid="nav-announce" is rendered.
 *  2.  The region is empty on initial mount (no announcement fires).
 *  3.  After a pathname change, the region is updated with the correct message.
 *  4.  Rapid successive pathname changes are debounced — only the final
 *      destination is announced.
 *  5.  Announcements fire for every known route (Home, Invoices, Invest).
 *  6.  An unknown / nested pathname falls back to the raw pathname string.
 *  7.  The region uses role="status" and aria-live="polite".
 *  8.  The region has aria-atomic="true" so the full string is read.
 *  9.  Navigating to the same pathname does not fire a second announcement.
 * 10.  The announcement copy uses the centralised copy.nav.announceNavigation key.
 * 11.  No axe violations introduced by the new live region.
 * 12.  ANNOUNCE_DEBOUNCE_MS is exported and is a positive number.
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import NavMenu, { ANNOUNCE_DEBOUNCE_MS } from "./NavMenu";
import { copy } from "../app/copy/en";

// ---------------------------------------------------------------------------
// Module-level pathname control
// The variable MUST be prefixed with "mock" for jest.mock hoisting to allow
// the factory to close over it.
// ---------------------------------------------------------------------------

let mockCurrentPathname = "/";

jest.mock("next/navigation", () => ({
  usePathname: () => mockCurrentPathname,
}));

jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("./WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

jest.mock("./NetworkBadge", () => ({
  __esModule: true,
  default: function MockNetworkBadge() {
    return null;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render NavMenu starting at a given pathname. */
function renderAt(pathname = "/") {
  mockCurrentPathname = pathname;
  return render(<NavMenu />);
}

/**
 * Simulate a navigation: change pathname, re-render, then advance fake timers
 * past the debounce. Each step is wrapped in its own `act()` so React flushes
 * effects between steps.
 */
function navigateWithFakeTimers(rerender, pathname, ms = ANNOUNCE_DEBOUNCE_MS + 10) {
  mockCurrentPathname = pathname;
  act(() => {
    rerender(<NavMenu />);
  });
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NavMenu — aria-live navigation announcements (#550)", () => {
  beforeEach(() => {
    mockCurrentPathname = "/";
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── 1. Live region presence ───────────────────────────────────────────────

  describe("live region presence", () => {
    it("renders exactly one nav-announce region", () => {
      renderAt("/");
      expect(screen.getAllByTestId("nav-announce")).toHaveLength(1);
    });

    it("has role='status'", () => {
      renderAt("/");
      expect(screen.getByTestId("nav-announce")).toHaveAttribute("role", "status");
    });

    it("has aria-live='polite'", () => {
      renderAt("/");
      expect(screen.getByTestId("nav-announce")).toHaveAttribute("aria-live", "polite");
    });

    it("has aria-atomic='true'", () => {
      renderAt("/");
      expect(screen.getByTestId("nav-announce")).toHaveAttribute("aria-atomic", "true");
    });

    it("carries the sr-only class so it is visually hidden", () => {
      renderAt("/");
      expect(screen.getByTestId("nav-announce")).toHaveClass("sr-only");
    });
  });

  // ── 2. No announcement on mount ───────────────────────────────────────────

  describe("no announcement on mount", () => {
    it("live region is empty immediately after first render", () => {
      renderAt("/");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("");
    });

    it("live region stays empty after the debounce delay on initial mount", () => {
      renderAt("/");
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS + 50);
      });
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("");
    });

    it("live region is empty on mount for /invoices", () => {
      renderAt("/invoices");
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS + 50);
      });
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("");
    });

    it("live region is empty on mount for /invest", () => {
      renderAt("/invest");
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS + 50);
      });
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("");
    });
  });

  // ── 3. Correct announcement after navigation ──────────────────────────────

  describe("announces correct page label after navigation", () => {
    it("announces 'Navigated to Invoices' when navigating to /invoices", () => {
      const { rerender } = renderAt("/");
      navigateWithFakeTimers(rerender, "/invoices");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Invoices");
    });

    it("announces 'Navigated to Invest' when navigating to /invest", () => {
      const { rerender } = renderAt("/");
      navigateWithFakeTimers(rerender, "/invest");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Invest");
    });

    it("announces 'Navigated to Home' when navigating back to /", () => {
      const { rerender } = renderAt("/invoices");
      // Flush mount — no announcement expected
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS + 50);
      });
      navigateWithFakeTimers(rerender, "/");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Home");
    });

    it("uses the copy.nav.announceNavigation template with the correct label", () => {
      const { rerender } = renderAt("/");
      navigateWithFakeTimers(rerender, "/invoices");
      const expected = copy.nav.announceNavigation.replace("{label}", "Invoices");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent(expected);
    });

    it("updates the announcement on each subsequent navigation", () => {
      const { rerender } = renderAt("/");

      // / → /invoices
      navigateWithFakeTimers(rerender, "/invoices");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Invoices");

      // /invoices → /invest
      navigateWithFakeTimers(rerender, "/invest");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Invest");

      // /invest → /
      navigateWithFakeTimers(rerender, "/");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Home");
    });
  });

  // ── 4. Debounce — rapid updates collapsed ─────────────────────────────────

  describe("debounce — rapid successive updates", () => {
    it("does not announce intermediate routes when navigating rapidly", () => {
      const { rerender } = renderAt("/");

      // / → /invoices: advance only part of the debounce window
      mockCurrentPathname = "/invoices";
      act(() => {
        rerender(<NavMenu />);
      });
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS - 50);
      });

      // Timer for /invoices is still pending — no announcement yet
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("");

      // Rapid second update: the /invoices timer is cancelled, new timer started
      mockCurrentPathname = "/invest";
      act(() => {
        rerender(<NavMenu />);
      });
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS + 50);
      });

      // Only the final destination (/invest) should be announced
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Invest");
    });

    it("does not announce before ANNOUNCE_DEBOUNCE_MS has elapsed", () => {
      const { rerender } = renderAt("/");

      mockCurrentPathname = "/invoices";
      act(() => {
        rerender(<NavMenu />);
      });
      // Advance time but NOT past the full debounce yet
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS - 10);
      });

      expect(screen.getByTestId("nav-announce")).toHaveTextContent("");
    });

    it("announces exactly once after the debounce settles", () => {
      const { rerender } = renderAt("/");
      navigateWithFakeTimers(rerender, "/invoices");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Invoices");

      // Extra time should not trigger additional updates
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS * 3);
      });
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Invoices");
    });
  });

  // ── 5. Unknown / nested pathnames ────────────────────────────────────────

  describe("unknown and nested pathnames", () => {
    it("falls back to the raw pathname when no NAV_LINKS entry matches", () => {
      const { rerender } = renderAt("/");
      navigateWithFakeTimers(rerender, "/invest/abc-123");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to /invest/abc-123");
    });

    it("falls back for a deeply nested unknown route", () => {
      const { rerender } = renderAt("/");
      navigateWithFakeTimers(rerender, "/invoices/detail/xyz/789");
      expect(screen.getByTestId("nav-announce")).toHaveTextContent(
        "Navigated to /invoices/detail/xyz/789"
      );
    });

    it("does not announce on mount even for unknown pathnames", () => {
      renderAt("/some/unknown/path");
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS + 50);
      });
      expect(screen.getByTestId("nav-announce")).toHaveTextContent("");
    });
  });

  // ── 6. Same-pathname re-renders do not re-announce ────────────────────────

  describe("no re-announcement when pathname is unchanged", () => {
    it("does not update the announcement when other state changes (e.g. mobile toggle)", () => {
      const { rerender } = renderAt("/");

      // Navigate once to get a baseline announcement
      navigateWithFakeTimers(rerender, "/invoices");
      const firstAnnouncement = screen.getByTestId("nav-announce").textContent;
      expect(firstAnnouncement).toBe("Navigated to Invoices");

      // Re-render with the same pathname (simulates unrelated state change)
      act(() => {
        rerender(<NavMenu />);
      });
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS + 50);
      });

      // Announcement should remain — no new timer was set
      expect(screen.getByTestId("nav-announce")).toHaveTextContent(firstAnnouncement);
    });
  });

  // ── 7. ANNOUNCE_DEBOUNCE_MS export ───────────────────────────────────────

  describe("ANNOUNCE_DEBOUNCE_MS constant", () => {
    it("is exported from NavMenu", () => {
      expect(ANNOUNCE_DEBOUNCE_MS).toBeDefined();
    });

    it("is a positive number", () => {
      expect(typeof ANNOUNCE_DEBOUNCE_MS).toBe("number");
      expect(ANNOUNCE_DEBOUNCE_MS).toBeGreaterThan(0);
    });
  });

  // ── 8. copy.nav.announceNavigation key ───────────────────────────────────

  describe("copy.nav.announceNavigation", () => {
    it("is defined in the copy dictionary", () => {
      expect(copy.nav).toBeDefined();
      expect(copy.nav.announceNavigation).toBeDefined();
    });

    it("is a non-empty string", () => {
      expect(typeof copy.nav.announceNavigation).toBe("string");
      expect(copy.nav.announceNavigation.length).toBeGreaterThan(0);
    });

    it("contains the {label} placeholder", () => {
      expect(copy.nav.announceNavigation).toContain("{label}");
    });

    it("replaces {label} correctly", () => {
      expect(copy.nav.announceNavigation.replace("{label}", "Home")).toBe("Navigated to Home");
      expect(copy.nav.announceNavigation.replace("{label}", "Invoices")).toBe(
        "Navigated to Invoices"
      );
      expect(copy.nav.announceNavigation.replace("{label}", "Invest")).toBe("Navigated to Invest");
    });
  });

  // ── 9. No axe violations ─────────────────────────────────────────────────

  describe("accessibility — no new axe violations", () => {
    it("has no axe violations with an empty live region (initial mount)", async () => {
      jest.useRealTimers(); // axe needs real timers
      const { container } = renderAt("/");
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations after a navigation announcement fires", async () => {
      jest.useRealTimers();
      const { container, rerender } = renderAt("/");
      mockCurrentPathname = "/invoices";
      act(() => {
        rerender(<NavMenu />);
      });
      // Wait for the real debounce to fire
      await waitFor(
        () => {
          expect(screen.getByTestId("nav-announce")).toHaveTextContent("Navigated to Invoices");
        },
        { timeout: ANNOUNCE_DEBOUNCE_MS + 300 }
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
