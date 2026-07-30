/**
 * @file app/page.high-contrast.test.tsx
 * Issue #954 — dashboard forced-colors and high-contrast support.
 *
 * jsdom cannot evaluate CSS media queries, so the stylesheet contract is
 * checked from source. DOM tests verify that the dashboard exposes stable
 * CSS hooks and continues to pass an axe smoke check.
 */

import fs from "fs";
import path from "path";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

import Home from "./page";
import { getHealth } from "../lib/api/health";

expect.extend(toHaveNoViolations);

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("../components/WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

jest.mock("../components/NavMenu", () => ({
  __esModule: true,
  default: function MockNavMenu() {
    return <div data-testid="nav-menu">NavMenu</div>;
  },
}));

jest.mock("../lib/api/health", () => ({
  __esModule: true,
  getHealth: jest.fn(),
}));

const mockGetHealth = getHealth as jest.Mock;
const cssSource = fs.readFileSync(path.join(__dirname, "globals.css"), "utf8");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    throw new Error(`CSS media block "${feature}" not found`);
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

describe("dashboard high-contrast DOM hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks dashboard surfaces and interactive controls without changing structure", () => {
    const { container } = render(<Home />);

    expect(container.querySelector(".dashboard-page")).toBeInTheDocument();
    expect(container.querySelector(".dashboard-main")).toBeInTheDocument();

    const dashboardCards = screen
      .getAllByRole("link")
      .filter((link) => link.classList.contains("dashboard-link-card"));

    expect(dashboardCards).toHaveLength(2);
    dashboardCards.forEach((card) => {
      expect(card).toHaveClass("dashboard-focus");
    });

    expect(container.querySelector(".dashboard-api-panel")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /check backend health/i })
    ).toHaveClass("dashboard-action", "dashboard-focus");
  });

  it("keeps a text label and dashboard hook for every health status badge", async () => {
    mockGetHealth.mockResolvedValue({
      status: "degraded",
      message: "Backend responded with 500",
      details: { error: "Internal Server Error" },
    });

    render(<Home />);
    fireEvent.click(
      screen.getByRole("button", { name: /check backend health/i })
    );

    const badge = await screen.findByText(/degraded/i);
    const badgeContainer = badge.closest("[data-dashboard-status]");

    expect(badgeContainer).toHaveAttribute("data-dashboard-status", "degraded");
    expect(badgeContainer).toHaveClass("dashboard-status-badge");
    expect(badgeContainer).toHaveTextContent(/degraded/i);
    expect(screen.getByRole("status")).toHaveClass("dashboard-status-panel");
  });

  it("passes an axe smoke check in the normal dashboard state", async () => {
    const { container } = render(<Home />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("passes an axe smoke check after health content loads", async () => {
    mockGetHealth.mockResolvedValue({
      status: "connected",
      message: "Backend is healthy",
      details: { status: "ok" },
    });

    const { container } = render(<Home />);
    fireEvent.click(
      screen.getByRole("button", { name: /check backend health/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/backend is healthy/i)).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("dashboard forced-colors stylesheet contract", () => {
  const block = extractMediaBlock(cssSource, "forced-colors: active");

  it("uses system colors for dashboard surfaces, links, controls, and disabled text", () => {
    expect(block).toMatch(/\.dashboard-page\b/);
    expect(block).toMatch(/\.dashboard-link-card\b/);
    expect(block).toMatch(/\.dashboard-api-panel\b/);
    expect(block).toMatch(/\.dashboard-status-panel\b/);
    expect(block).toMatch(/\bCanvas\b/);
    expect(block).toMatch(/\bCanvasText\b/);
    expect(block).toMatch(/\bLinkText\b/);
    expect(block).toMatch(/\bButtonFace\b/);
    expect(block).toMatch(/\bButtonText\b/);
    expect(block).toMatch(/\bGrayText\b/);
  });

  it("keeps keyboard focus visible with a Highlight outline", () => {
    expect(block).toMatch(/\.dashboard-focus:focus-visible\s*\{/);
    expect(block).toMatch(/outline\s*:\s*3px\s+solid\s+Highlight/);
    expect(block).toMatch(/outline-offset\s*:\s*3px/);
  });

  it("keeps status readable without relying on author colours", () => {
    expect(block).toMatch(/\.dashboard-status-badge\s*\{/);
    expect(block).toMatch(/forced-color-adjust\s*:\s*none/);
    expect(block).toMatch(/background-color\s*:\s*ButtonFace/);
    expect(block).toMatch(/color\s*:\s*ButtonText/);
  });

  it("provides a readable forced-colors treatment for the loading skeleton", () => {
    expect(block).toMatch(/health-status-skeleton/);
    expect(block).toMatch(/background-color\s*:\s*Canvas/);
  });
});

describe("dashboard prefers-contrast stylesheet contract", () => {
  const block = extractMediaBlock(cssSource, "prefers-contrast: more");

  it("strengthens dashboard borders and foreground text", () => {
    expect(block).toMatch(/\.dashboard-link-card\b/);
    expect(block).toMatch(/border-width\s*:\s*2px/);
    expect(block).toMatch(/border-color\s*:\s*var\(--color-fg\)/);
    expect(block).toMatch(/\.dashboard-muted-text\b/);
    expect(block).toMatch(/color\s*:\s*var\(--color-fg\)/);
  });

  it("strengthens the focus outline without affecting layout", () => {
    expect(block).toMatch(/\.dashboard-focus:focus-visible\s*\{/);
    expect(block).toMatch(/outline-width\s*:\s*3px/);
    expect(block).toMatch(/outline-offset\s*:\s*3px/);
  });

  it("keeps dashboard-specific CSS out of normal mode", () => {
    const normalModeCss = stripMediaBlocks(cssSource);
    expect(normalModeCss).not.toMatch(
      /\.dashboard-(?:page|link-card|api-panel|status-panel|focus)\b/
    );
  });
});
