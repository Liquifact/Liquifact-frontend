/**
 * Comprehensive focus-ring a11y audit.
 *
 * Ensures every interactive component in the UI applies the `.focus-ring`
 * CSS class so keyboard users receive a consistent, high-contrast focus
 * indicator in both light and dark themes.
 *
 * The CSS token `--color-focus-ring` and its contrast ratio are verified
 * in `app/globals.contrast-ratio.test.tsx` — this file focuses on class
 * presence and keyboard operability.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import "@testing-library/jest-dom";

import Button from "./Button";
import NavMenu from "./NavMenu";
import ThemeToggle from "./ThemeToggle";

expect.extend(toHaveNoViolations);

// Mock next/navigation as NavMenu depends on it
const mockPathname = jest.fn(() => "/");
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// WalletStatusLazy uses useWallet context; provide a stub so NavMenu renders cleanly
jest.mock("./WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

// ── Shared helpers ───────────────────────────────────────────────────────────

function getFocusRingElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(".focus-ring"));
}

/**
 * Returns the class-name-based style declarations for the focus-ring token.
 * In JSDOM / test environment the actual CSS file is mocked, so we verify
 * that the convention is applied via class name rather than computed style.
 */

// ── Button ───────────────────────────────────────────────────────────────────

describe("Button focus ring", () => {
  it("applies focus-ring class to the rendered button element", () => {
    render(<Button>Test</Button>);
    const btn = screen.getByRole("button", { name: /test/i });
    expect(btn.className).toContain("focus-ring");
  });

  it("applies focus-ring class across all variants", () => {
    const variants = ["primary", "secondary", "warning", "external", "danger"] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole("button").className).toContain("focus-ring");
      unmount();
    }
  });

  it("applies focus-ring class when loading", () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole("button").className).toContain("focus-ring");
  });

  it("applies focus-ring class when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button").className).toContain("focus-ring");
  });

  it("remains keyboard-focusable when not disabled", async () => {
    const user = userEvent.setup();
    render(<Button>Focusable</Button>);
    const btn = screen.getByRole("button");
    await user.tab();
    expect(btn).toHaveFocus();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Button>Accessible</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── NavMenu ──────────────────────────────────────────────────────────────────

describe("NavMenu focus ring", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  it("applies focus-ring class to the brand link", () => {
    render(<NavMenu />);
    const brandLink = screen.getByRole("link", { name: /LiquiFact/i });
    expect(brandLink.className).toContain("focus-ring");
  });

  it("applies focus-ring class to desktop nav links", () => {
    render(<NavMenu />);
    const homeLink = screen.getByRole("link", { name: /^home$/i });
    const invoicesLink = screen.getByRole("link", { name: /^invoices$/i });
    const investLink = screen.getByRole("link", { name: /^invest$/i });
    expect(homeLink.className).toContain("focus-ring");
    expect(invoicesLink.className).toContain("focus-ring");
    expect(investLink.className).toContain("focus-ring");
  });

  it("applies focus-ring class to the mobile hamburger toggle", () => {
    render(<NavMenu />);
    const toggle = screen.getByRole("button", { name: /open navigation menu/i });
    expect(toggle.className).toContain("focus-ring");
  });

  it("applies focus-ring class to mobile menu links when opened", async () => {
    const user = userEvent.setup();
    render(<NavMenu />);
    const toggle = screen.getByRole("button", { name: /open navigation menu/i });
    await user.click(toggle);

    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
    const links = mobileNav.querySelectorAll("a");
    expect(links.length).toBeGreaterThanOrEqual(3);
    links.forEach((link) => {
      expect(link.className).toContain("focus-ring");
    });
  });

  it("has at least 3 focus-ring elements (brand + 2+ nav links + toggle)", () => {
    const { container } = render(<NavMenu />);
    const focusRingEls = getFocusRingElements(container);
    expect(focusRingEls.length).toBeGreaterThanOrEqual(3);
  });

  it("keyboard-focusable elements within NavMenu can be Tabbed to", async () => {
    const user = userEvent.setup();
    render(<NavMenu />);
    const brandLink = screen.getByRole("link", { name: /LiquiFact/i });
    await user.tab();
    expect(brandLink).toHaveFocus();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<NavMenu />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── ThemeToggle ──────────────────────────────────────────────────────────────

describe("ThemeToggle focus ring", () => {
  it("applies focus-ring class to the toggle button", () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /theme/i });
    expect(toggle.className).toContain("focus-ring");
  });

  it("remains keyboard-focusable", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /theme/i });
    await user.tab();
    expect(toggle).toHaveFocus();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ThemeToggle />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Cross-component audit ────────────────────────────────────────────────────

describe("Focus-ring cross-component audit", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  it("all interactive testable components carry the focus-ring class", () => {
    const { container } = render(
      <div>
        <Button>Audit Button</Button>
        <NavMenu />
        <ThemeToggle />
      </div>
    );

    const focusRingEls = getFocusRingElements(container);
    // Should have: Button + NavMenu brand link + NavMenu desktop nav links
    // (3) + NavMenu hamburger toggle + ThemeToggle
    expect(focusRingEls.length).toBeGreaterThanOrEqual(5);
  });
});

// ── Keyboard traversal with user-event ───────────────────────────────────────

describe("Keyboard focus traversal across interactive components", () => {
  it("cycles through all major interactive elements via Tab", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Button data-testid="btn-1">First</Button>
        <Button data-testid="btn-2">Second</Button>
        <ThemeToggle />
      </div>
    );

    const btn1 = screen.getByTestId("btn-1");
    const btn2 = screen.getByTestId("btn-2");
    const toggle = screen.getByRole("button", { name: /theme/i });

    await user.tab();
    expect(btn1).toHaveFocus();
    await user.tab();
    expect(btn2).toHaveFocus();
    await user.tab();
    expect(toggle).toHaveFocus();
  });
});
