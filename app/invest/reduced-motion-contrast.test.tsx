/**
 * Issue #689 — Marketplace `prefers-reduced-motion` + `prefers-contrast`
 * support in `app/globals.css`.
 *
 * Two complementary test surfaces:
 *
 * 1. **CSS source integrity** — jsdom cannot evaluate @media queries itself,
 *    and the project's `__mocks__/style.js` stub discards real CSS.
 *    These tests read `app/globals.css` as text, extract the body of each
 *    matching @media block via a brace-balanced character walker, and
 *    assert that the rules the issue requires are present.
 *
 * 2. **Component DOM smoke** — verifies that the marketplace "Soon"
 *    filters wrapper continues to use Tailwind's `opacity-60` utility
 *    (the very class the high-contrast media block overrides), that the
 *    wrapper remains inside the marketplace fieldset, and that
 *    jest-axe is happy with the result.
 */

import fs from "fs";
import path from "path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

import { InvestMarketplace } from "./page";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/ToastProvider";

expect.extend(toHaveNoViolations);

// next/navigation hooks used by InvestMarketplace via useSearchParams.
jest.mock("next/navigation", () => ({
  usePathname: () => "/invest",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
}));

// ── Source-loading helpers ────────────────────────────────────────────────────

const GLOBALS_CSS_PATH = path.join(__dirname, "..", "globals.css");

/** Escape a literal string for safe use inside a RegExp. */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the cumulative body of every `@media (...) { … }` block whose
 * media-query list contains `featureFragment` (e.g.
 * `"prefers-reduced-motion: reduce"`).
 *
 * Uses a brace-balanced character walker so inner `{ … }` rules inside
 * the @media body do not truncate the captured text.
 *
 * Throws if no matching block exists — surfaces mis-spellings immediately.
 */
function extractMediaBlock(source: string, featureFragment: string): string {
  const startPattern = new RegExp(
    `@media\\s*\\([^)]*${escapeRegExp(featureFragment)}[^)]*\\)\\s*\\{`,
    "g"
  );
  const openIndices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = startPattern.exec(source)) !== null) {
    // Index of the `{` character that opens the @media body.
    openIndices.push(match.index + match[0].length - 1);
  }
  if (openIndices.length === 0) {
    throw new Error(`CSS media block "${featureFragment}" not found in globals.css`);
  }

  const bodies = openIndices.map((openIdx) => {
    let depth = 1;
    let i = openIdx + 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    if (depth !== 0) {
      throw new Error(`Unbalanced braces inside @media block opened at ${openIdx}`);
    }
    return source.slice(openIdx + 1, i - 1);
  });

  return bodies.join("\n\n");
}

/** Returns the CSS source with every `@media { … }` block stripped. */
function stripMediaBlocks(source: string): string {
  // Same brace-balanced approach so nested rules are not truncated.
  const stripped: string[] = [];
  const startPattern = /@media\s*\([^)]*\)\s*\{/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = startPattern.exec(source)) !== null) {
    stripped.push(source.slice(cursor, match.index));
    let depth = 1;
    let i = match.index + match[0].length;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      i++;
    }
    cursor = i;
    startPattern.lastIndex = i;
  }
  stripped.push(source.slice(cursor));
  return stripped.join("");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Issue #689 — Marketplace reduced-motion support (CSS source)", () => {
  let cssSource: string;

  beforeAll(() => {
    cssSource = fs.readFileSync(GLOBALS_CSS_PATH, "utf8");
  });

  it("globals.css contains an @media (prefers-reduced-motion: reduce) block", () => {
    expect(cssSource).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
  });

  it("the reduced-motion block disables .animate-pulse and .animate-spin", () => {
    const block = extractMediaBlock(cssSource, "prefers-reduced-motion: reduce");
    expect(block).toMatch(/\.animate-pulse\b/);
    expect(block).toMatch(/\.animate-spin\b/);
    expect(block).toMatch(/\banimation:\s*none\b/);
  });

  it("the reduced-motion block suppresses Tailwind transition utilities", () => {
    const block = extractMediaBlock(cssSource, "prefers-reduced-motion: reduce");
    expect(block).toMatch(/\.transition\b/);
    expect(block).toMatch(/\.transition-colors\b/);
    expect(block).toMatch(/\.transition-all\b/);
    expect(block).toMatch(/\btransition:\s*none\b/);
  });

  it("the reduced-motion block does NOT touch .focus-ring (a11y-essential)", () => {
    const block = extractMediaBlock(cssSource, "prefers-reduced-motion: reduce");
    // Focus ring is a separate concern — must remain styled under reduced motion.
    expect(block).not.toMatch(/\.focus-ring\b/);
  });

  it("the reduced-motion block sits in globals.css below the Tailwind import", () => {
    const tailwindIndex = cssSource.indexOf('@import "tailwindcss"');
    const reducedMotionIndex = cssSource.search(
      /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/
    );
    expect(tailwindIndex).toBeGreaterThanOrEqual(0);
    expect(reducedMotionIndex).toBeGreaterThan(tailwindIndex);
  });
});

describe("Issue #689 — Marketplace high-contrast support (CSS source)", () => {
  let cssSource: string;

  beforeAll(() => {
    cssSource = fs.readFileSync(GLOBALS_CSS_PATH, "utf8");
  });

  it("globals.css contains an @media (prefers-contrast: more) block", () => {
    expect(cssSource).toMatch(/@media\s*\(\s*prefers-contrast:\s*more\s*\)/);
  });

  it("the high-contrast block overrides Tailwind's .opacity-60 utility", () => {
    const block = extractMediaBlock(cssSource, "prefers-contrast: more");
    expect(block).toMatch(/\.opacity-60\b/);
    expect(block).toMatch(/\bopacity:\s*1\b/);
  });

  it("the .opacity-60 override is NOT repeated outside any media block", () => {
    // Pin the rule to its @media context so future refactors can't regress it
    // back to a permanent full-opacity (which would defeat the visual "Soon:" cue).
    const stripped = stripMediaBlocks(cssSource);
    expect(stripped).not.toMatch(/\.opacity-60\s*\{\s*opacity:\s*1\b/);
  });
});

describe("Issue #689 — Marketplace DOM still uses opacity-60 utility", () => {
  const loadInvoices = () => Promise.resolve([]);

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

  it("renders the 'Soon:' filters wrapper with the Tailwind opacity-60 utility", () => {
    renderMarketplace();
    const fieldset = screen.getByRole("group", { name: /Marketplace Filters/i });
    const wrapper = fieldset.querySelector(".opacity-60");
    expect(wrapper).not.toBeNull();
    // The wrapper must STILL be non-interactive so removing opacity under
    // high-contrast does not accidentally enable the controls.
    expect(wrapper?.className).toMatch(/\bpointer-events-none\b/);
  });

  it("passes jest-axe with no accessibility violations (smoke regression guard)", async () => {
    const { container } = renderMarketplace();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
