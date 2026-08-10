/**
 * @file app/invest/marketplace.high-contrast.test.tsx
 * Issue #924 — marketplace forced-colors and high-contrast support.
 *
 * jsdom cannot evaluate CSS media queries, so the stylesheet contract is
 * checked from source. DOM tests verify that the marketplace exposes stable
 * CSS hooks and continues to pass an axe smoke check.
 */

import fs from "fs";
import path from "path";
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

import { InvestMarketplace } from "./page";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/ToastProvider";

expect.extend(toHaveNoViolations);

// Mock next/navigation hooks used by InvestMarketplace
jest.mock("next/navigation", () => ({
  usePathname: () => "/invest",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
}));

// Mock next/link
jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  }
  return { __esModule: true, default: MockLink };
});

// NavMenu is tested independently — provide a minimal placeholder
jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return (
      <header>
        <nav aria-label="Site navigation" />
      </header>
    );
  }
  return { __esModule: true, default: MockNavMenu };
});

// ── Source-loading helpers ────────────────────────────────────────────────────

const GLOBALS_CSS_PATH = path.join(__dirname, "..", "globals.css");

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMediaBlock(source: string, feature: string): string {
  const pattern = new RegExp(
    `@media\\s*\\([^)]*${escapeRegExp(feature)}[^)]*\\)\\s*\\{`,
    "g"
  );
  const bodies: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const openIndex = match.index + match[0].length - 1;
    let depth = 1;
    let cursor = openIndex + 1;

    while (cursor < source.length && depth > 0) {
      if (source[cursor] === "{") depth += 1;
      if (source[cursor] === "}") depth -= 1;
      cursor += 1;
    }

    if (depth !== 0) {
      throw new Error(`Unbalanced CSS media block for ${feature}`);
    }

    bodies.push(source.slice(openIndex + 1, cursor - 1));
    pattern.lastIndex = cursor;
  }

  if (bodies.length === 0) {
    throw new Error(`CSS media block "${feature}" not found in globals.css`);
  }

  return bodies.join("\n");
}

function stripMediaBlocks(source: string): string {
  const output: string[] = [];
  const pattern = /@media\s*\([^)]*\)\s*\{/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    output.push(source.slice(cursor, match.index));

    let depth = 1;
    let index = match.index + match[0].length;
    while (index < source.length && depth > 0) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      index += 1;
    }

    cursor = index;
    pattern.lastIndex = index;
  }

  output.push(source.slice(cursor));
  return output.join("");
}

// ── DOM hook tests ───────────────────────────────────────────────────────────

const loadInvoices = () => Promise.resolve([]);

describe("marketplace high-contrast DOM hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderMarketplace() {
    return render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={loadInvoices} />
        </WalletProvider>
      </ToastProvider>
    );
  }

  it("marks the filters section with a CSS hook", () => {
    renderMarketplace();
    const fieldset = screen.getByRole("group", { name: /Marketplace Filters/i });
    expect(fieldset).toHaveClass("marketplace-filters-section");
  });

  it("marks the 'Soon:' filter label with a CSS hook", () => {
    renderMarketplace();
    const soonLabel = screen.getByText(/These filter controls/i);
    expect(soonLabel).toHaveClass("marketplace-filters-coming-soon");
  });

  it("marks the empty state container with a CSS hook", async () => {
    renderMarketplace();
    const empty = await screen.findByText(/No investable invoices/i);
    // The empty-state div is the closest parent with marketplace-empty-state class
    expect(empty.closest(".marketplace-empty-state")).toBeInTheDocument();
  });

  it("marks invoice cards with a CSS hook when invoices are loaded", async () => {
    const loadWithData = () =>
      Promise.resolve([
        {
          id: "inv-001",
          issuer: "Test Corp",
          amount: "1,000",
          currency: "USD",
          dueDate: "2026-12-31",
          yield: "5.0%",
          status: "Open",
        },
      ]);

    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={loadWithData} />
        </WalletProvider>
      </ToastProvider>
    );

    const card = await screen.findByText(/Test Corp/i);
    const cardLi = card.closest("li");
    expect(cardLi).toHaveClass("marketplace-card");
  });

  it("marks the status badge with a CSS hook", async () => {
    const loadWithData = () =>
      Promise.resolve([
        {
          id: "inv-001",
          issuer: "Test Corp",
          amount: "1,000",
          currency: "USD",
          dueDate: "2026-12-31",
          yield: "5.0%",
          status: "Open",
        },
      ]);

    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={loadWithData} />
        </WalletProvider>
      </ToastProvider>
    );

    const badge = await screen.findByText(/^Open$/);
    expect(badge).toHaveClass("marketplace-status-badge");
  });

  it("marks the muted text with a CSS hook", async () => {
    const loadWithData = () =>
      Promise.resolve([
        {
          id: "inv-001",
          issuer: "Test Corp",
          amount: "1,000",
          currency: "USD",
          dueDate: "2026-12-31",
          yield: "5.0%",
          status: "Open",
        },
      ]);

    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={loadWithData} />
        </WalletProvider>
      </ToastProvider>
    );

    const mutedElements = await screen.findAllByText(/USD/);
    expect(mutedElements.length).toBeGreaterThanOrEqual(1);
    mutedElements.forEach((el) => {
      expect(el.closest(".marketplace-muted-text")).toBeInTheDocument();
    });
  });

  it("marks the load-more button with a CSS hook when paginated", async () => {
    const manyInvoices = Array.from({ length: 15 }, (_, i) => ({
      id: `inv-${String(i + 1).padStart(3, "0")}`,
      issuer: `Issuer ${i + 1}`,
      amount: "1,000",
      currency: i % 2 === 0 ? "USD" : "EUR",
      dueDate: "2026-12-31",
      yield: "5.0%",
      status: "Open",
    }));

    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={() => Promise.resolve(manyInvoices)} />
        </WalletProvider>
      </ToastProvider>
    );

    const loadMore = await screen.findByRole("button", { name: /load more/i });
    expect(loadMore).toHaveClass("marketplace-load-more");
  });

  it("passes an axe smoke check in the empty state", async () => {
    const { container } = renderMarketplace();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ── forced-colors stylesheet contract ─────────────────────────────────────────

describe("marketplace forced-colors stylesheet contract", () => {
  const cssSource = fs.readFileSync(GLOBALS_CSS_PATH, "utf8");
  const block = extractMediaBlock(cssSource, "forced-colors: active");

  it("uses system colors for marketplace surfaces", () => {
    expect(block).toMatch(/\.marketplace-card\b/);
    expect(block).toMatch(/\.marketplace-filters-section\b/);
    expect(block).toMatch(/\.marketplace-empty-state\b/);
    expect(block).toMatch(/background-color\s*:\s*Canvas/);
    expect(block).toMatch(/forced-color-adjust\s*:\s*none/);
  });

  it("uses system CanvasText for marketplace muted text and labels", () => {
    expect(block).toMatch(/\.marketplace-muted-text\b/);
    expect(block).toMatch(/\.marketplace-filters-coming-soon\b/);
    expect(block).toMatch(/color\s*:\s*CanvasText/);
  });

  it("keeps the status badge readable with non-colour cues", () => {
    expect(block).toMatch(/\.marketplace-status-badge\b/);
    expect(block).toMatch(/border\s*:\s*2px\s+solid\s+CanvasText/);
    expect(block).toMatch(/background-color\s*:\s*Canvas/);
    expect(block).toMatch(/color\s*:\s*CanvasText/);
  });

  it("provides a readable forced-colors treatment for the load-more button", () => {
    expect(block).toMatch(/\.marketplace-load-more\b/);
    expect(block).toMatch(/background-color\s*:\s*ButtonFace/);
    expect(block).toMatch(/color\s*:\s*ButtonText/);
    expect(block).toMatch(/border\s*:\s*2px\s+solid\s+ButtonText/);
  });

  it("provides a readable forced-colors treatment for the disclaimer", () => {
    expect(block).toMatch(/\.marketplace-disclaimer\b/);
    expect(block).toMatch(/background-color\s*:\s*Canvas/);
    expect(block).toMatch(/color\s*:\s*CanvasText/);
  });

  it("keeps the divider visible under forced-colors", () => {
    expect(block).toMatch(/\.marketplace-divider\b/);
    expect(block).toMatch(/border-top-color\s*:\s*CanvasText/);
  });
});

// ── prefers-contrast stylesheet contract ──────────────────────────────────────

describe("marketplace prefers-contrast stylesheet contract", () => {
  const cssSource = fs.readFileSync(GLOBALS_CSS_PATH, "utf8");
  const block = extractMediaBlock(cssSource, "prefers-contrast: more");

  it("strengthens marketplace surface borders and backgrounds", () => {
    expect(block).toMatch(/\.marketplace-card\b/);
    expect(block).toMatch(/\.marketplace-filters-section\b/);
    expect(block).toMatch(/\.marketplace-empty-state\b/);
    expect(block).toMatch(/border-color\s*:/);
    expect(block).toMatch(/background-color\s*:\s*#0f172a/);
  });

  it("strengthens muted text contrast", () => {
    expect(block).toMatch(/\.marketplace-muted-text\b/);
    expect(block).toMatch(/\.marketplace-filters-coming-soon\b/);
    expect(block).toMatch(/color\s*:\s*#cbd5e1/);
  });

  it("strengthens the status badge", () => {
    expect(block).toMatch(/\.marketplace-status-badge\b/);
    expect(block).toMatch(/border-color\s*:\s*#67e8f9/);
  });

  it("strengthens the load-more button", () => {
    expect(block).toMatch(/\.marketplace-load-more\b/);
    expect(block).toMatch(/border-color\s*:\s*#67e8f9/);
    expect(block).toMatch(/color\s*:\s*#f1f5f9/);
  });

  it("strengthens the disclaimer", () => {
    expect(block).toMatch(/\.marketplace-disclaimer\b/);
    expect(block).toMatch(/border-color\s*:\s*#475569/);
    expect(block).toMatch(/color\s*:\s*#cbd5e1/);
  });

  it("strengthens the divider", () => {
    expect(block).toMatch(/\.marketplace-divider\b/);
    expect(block).toMatch(/border-top-color\s*:\s*#475569/);
  });

  it("keeps marketplace-specific CSS out of normal mode", () => {
    const normalModeCss = stripMediaBlocks(cssSource);
    expect(normalModeCss).not.toMatch(
      /\.marketplace-(?:card|filters-section|filters-coming-soon|empty-state|muted-text|status-badge|load-more|disclaimer|divider)\b/
    );
  });
});