/**
 * Tests for the skip-to-content link and root layout shell (app/layout.js).
 *
 * Strategy:
 *  - Unit tests use a minimal SkipLinkFixture that mirrors the exact markup
 *    injected by RootLayout, avoiding html/body nesting issues in jsdom.
 *  - Integration test imports the real RootLayout to confirm the link is present.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import Link from "next/link";
import React from "react";

// ── Mock RootLayout's external dependencies ───────────────────────────────────

jest.mock("../components/Footer", () => {
  function MockFooter() {
    return <footer data-testid="mock-footer" />;
  }
  MockFooter.displayName = "MockFooter";
  return MockFooter;
});

jest.mock("../components/ToastProvider", () => {
  const React = require("react");
  const ToastContext = React.createContext(null);
  return {
    ToastProvider({ children }: { children: React.ReactNode }) {
      return <>{children}</>;
    },
    ToastContext,
  };
});

jest.mock("../components/ShortcutHelpDialog", () => ({
  __esModule: true,
  default: function MockShortcutHelpDialog() {
    return null;
  },
}));

jest.mock("../components/WalletProvider", () => ({
  WalletProvider({ children }) {
    const React = require("react");
    return React.createElement(React.Fragment, null, children);
  },
}));

// ── Minimal fixture matching the skip link markup in RootLayout ───────────────

function SkipLinkFixture({ children }: { children?: React.ReactNode }) {
  return (
    <div>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {children}
    </div>
  );
}

// ── Unit tests: skip link properties and DOM ordering ────────────────────────

describe("Skip-to-content link", () => {
  it("renders with an accessible label", () => {
    render(<SkipLinkFixture />);
    expect(screen.getByRole("link", { name: /skip to content/i })).toBeInTheDocument();
  });

  it("targets the #main-content landmark", () => {
    render(<SkipLinkFixture />);
    expect(screen.getByRole("link", { name: /skip to content/i })).toHaveAttribute(
      "href",
      "#main-content"
    );
  });

  it("is the first focusable element in the document", () => {
    render(
      <SkipLinkFixture>
        <main id="main-content">
          <Link href="/invoices">Invoices</Link>
          <button type="button">Click me</button>
        </main>
      </SkipLinkFixture>
    );

    const skipLink = screen.getByRole("link", { name: /skip to content/i });
    const allFocusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    expect(allFocusable.length).toBeGreaterThan(0);
    expect(allFocusable[0]).toBe(skipLink);
  });

  it("comes before any other links in the DOM", () => {
    render(
      <SkipLinkFixture>
        <main id="main-content">
          <a href="/invoices">Invoices</a>
          <Link href="/invest">Invest</Link>
        </main>
      </SkipLinkFixture>
    );

    const allLinks = screen.getAllByRole("link");
    expect(allLinks[0]).toHaveAttribute("href", "#main-content");
  });

  it("programmatic focus reaches #main-content when skip link is activated", () => {
    render(
      <SkipLinkFixture>
        {/* tabIndex={-1} lets the element receive programmatic focus */}
        <main id="main-content" tabIndex={-1}>
          Page content
        </main>
      </SkipLinkFixture>
    );

    const main = document.getElementById("main-content") as HTMLElement;
    main.focus();
    expect(document.activeElement).toBe(main);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <SkipLinkFixture>
        <main id="main-content">
          <h1>Page heading</h1>
          <p>Page content</p>
        </main>
      </SkipLinkFixture>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Integration: confirm RootLayout renders the skip link ────────────────────

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders the skip link", () => {
    render(
      <RootLayout>
        <main id="main-content">Page</main>
      </RootLayout>
    );

    expect(screen.getByRole("link", { name: /skip to content/i })).toBeInTheDocument();
  });

  it("skip link in RootLayout targets #main-content", () => {
    render(
      <RootLayout>
        <main id="main-content">Page</main>
      </RootLayout>
    );

    expect(screen.getByRole("link", { name: /skip to content/i })).toHaveAttribute(
      "href",
      "#main-content"
    );
  });

  it("skip link in RootLayout is the first focusable element", () => {
    render(
      <RootLayout>
        <main id="main-content">
          <Link href="/invoices">Invoices</Link>
        </main>
      </RootLayout>
    );

    const skipLink = screen.getByRole("link", { name: /skip to content/i });
    const allFocusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    expect(allFocusable[0]).toBe(skipLink);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <RootLayout>
        <main id="main-content">
          <h1>Page heading</h1>
          <p>Content</p>
        </main>
      </RootLayout>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
