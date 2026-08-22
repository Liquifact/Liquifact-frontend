/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailClient.motion-contrast.test.tsx
 *
 * Issue #31 — invoice-detail `prefers-reduced-motion` + high-contrast support.
 *
 * Two complementary test surfaces:
 *
 * 1. **CSS source integrity** — jsdom cannot evaluate @media queries at
 *    runtime (the project's `__mocks__/style.js` stub discards real CSS).
 *    These tests read `app/globals.css` as text, use a brace-balanced block
 *    extractor to isolate each @media body, and assert the required rules are
 *    present — the same technique used by the marketplace test
 *    (app/invest/reduced-motion-contrast.test.tsx, issue #689).
 *
 * 2. **Component DOM hooks** — verifies that InvoiceDetailClient.jsx and
 *    FundActions.jsx carry the CSS hook classes that the @media rules target:
 *
 *    • `invoice-detail-section`    → section surface
 *    • `invoice-detail-dt`         → definition-list terms
 *    • `invoice-detail-dd`         → definition-list values
 *    • `invoice-detail-action-btn` → Fund / Copy link / Print buttons
 *    • `invoice-detail-disclaimer` → disclaimer note
 *
 *    The Tailwind `motion-reduce:transition-none` variant on each action
 *    button is also verified (same pattern as UploadZone.motion-contrast).
 *
 * 3. **Regression guard** — existing density, ARIA structure, and axe
 *    results must be unaffected by the CSS-hook additions.
 *
 * Coverage targets (≥ 95 % for impacted modules):
 *   - All five CSS hook classes present on the correct elements
 *   - `motion-reduce:transition-none` on all three action buttons
 *   - `transition-colors` coexists with the motion-reduce override
 *   - CSS rules exist in globals.css for both @media blocks
 *   - No axe violations in comfortable + compact density modes
 *   - No layout regressions (section structure, ARIA, data-density)
 */

import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceDetailClient from "./InvoiceDetailClient";
import { DENSITY_STORAGE_KEY } from "@/lib/hooks/useDensity";

expect.extend(toHaveNoViolations);

// ── CSS source helpers ────────────────────────────────────────────────────────

const GLOBALS_CSS_PATH = path.join(__dirname, "..", "..", "globals.css");
const cssSource = fs.readFileSync(GLOBALS_CSS_PATH, "utf8");

/** Escape a literal string for safe use inside a RegExp. */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the cumulative body of every `@media (...) { … }` block whose
 * media-query text contains `featureFragment`.  Brace-balanced so inner
 * `{ … }` rules are included correctly.  Throws if no block matches.
 */
function extractMediaBlock(source: string, featureFragment: string): string {
  const startPattern = new RegExp(
    `@media\\s*\\([^)]*${escapeRegExp(featureFragment)}[^)]*\\)\\s*\\{`,
    "g"
  );
  const openIndices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = startPattern.exec(source)) !== null) {
    openIndices.push(match.index + match[0].length - 1);
  }
  if (openIndices.length === 0) {
    throw new Error(`CSS media block "${featureFragment}" not found in globals.css`);
  }
  return openIndices
    .map((openIdx) => {
      let depth = 1;
      let i = openIdx + 1;
      while (i < source.length && depth > 0) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") depth--;
        i++;
      }
      return source.slice(openIdx + 1, i - 1);
    })
    .join("\n\n");
}

// ── Shared props ──────────────────────────────────────────────────────────────

const defaultProps = {
  summaryHeading: "Acme Corp",
  labelIssuer: "Issuer",
  labelAmount: "Amount",
  labelYield: "Estimated yield",
  labelMaturity: "Maturity date",
  labelStatus: "Status",
  issuer: "Acme Corp",
  formattedAmount: "$50,000.00",
  formattedYield: "5.25%",
  dueDate: "2025-12-31",
  statusPill: <span data-testid="status-pill">Open</span>,
};

beforeEach(() => {
  window.localStorage.clear();
});

// =============================================================================
// 1. CSS source integrity — @media (prefers-reduced-motion: reduce)
// =============================================================================

describe("globals.css — prefers-reduced-motion block (issue #31)", () => {
  it("contains an @media (prefers-reduced-motion: reduce) block", () => {
    expect(cssSource).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
  });

  it("disables .animate-pulse and .animate-spin with animation: none", () => {
    const block = extractMediaBlock(cssSource, "prefers-reduced-motion: reduce");
    expect(block).toMatch(/\.animate-pulse\b/);
    expect(block).toMatch(/\.animate-spin\b/);
    expect(block).toMatch(/\banimation:\s*none\b/);
  });

  it("suppresses .transition, .transition-colors, .transition-all with transition: none", () => {
    const block = extractMediaBlock(cssSource, "prefers-reduced-motion: reduce");
    expect(block).toMatch(/\.transition\b/);
    expect(block).toMatch(/\.transition-colors\b/);
    expect(block).toMatch(/\.transition-all\b/);
    expect(block).toMatch(/\btransition:\s*none\b/);
  });

  it("suppresses .invoice-detail-action-btn transitions", () => {
    const block = extractMediaBlock(cssSource, "prefers-reduced-motion: reduce");
    expect(block).toMatch(/\.invoice-detail-action-btn\b/);
    expect(block).toMatch(/\btransition:\s*none\b/);
  });

  it("suppresses .invoice-detail-section transitions", () => {
    const block = extractMediaBlock(cssSource, "prefers-reduced-motion: reduce");
    expect(block).toMatch(/\.invoice-detail-section\b/);
    expect(block).toMatch(/\btransition:\s*none\b/);
  });

  it("does NOT touch .focus-ring (a11y-essential outline must survive)", () => {
    const block = extractMediaBlock(cssSource, "prefers-reduced-motion: reduce");
    expect(block).not.toMatch(/\.focus-ring\b/);
  });

  it("the reduced-motion block sits below the Tailwind @import", () => {
    const tailwindIdx = cssSource.indexOf('@import "tailwindcss"');
    const motionIdx = cssSource.search(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
    expect(tailwindIdx).toBeGreaterThanOrEqual(0);
    expect(motionIdx).toBeGreaterThan(tailwindIdx);
  });
});

// =============================================================================
// 2. CSS source integrity — @media (forced-colors: active)
// =============================================================================

describe("globals.css — forced-colors block (issue #31)", () => {
  it("contains an @media (forced-colors: active) block", () => {
    expect(cssSource).toMatch(/@media\s*\(\s*forced-colors:\s*active\s*\)/);
  });

  it("maps .invoice-detail-section to Canvas background with CanvasText border", () => {
    const block = extractMediaBlock(cssSource, "forced-colors: active");
    expect(block).toMatch(/\.invoice-detail-section\b/);
    expect(block).toMatch(/\bCanvas\b/);
    expect(block).toMatch(/\bCanvasText\b/);
  });

  it("maps .invoice-detail-dt to GrayText", () => {
    const block = extractMediaBlock(cssSource, "forced-colors: active");
    expect(block).toMatch(/\.invoice-detail-dt\b/);
    expect(block).toMatch(/\bGrayText\b/);
  });

  it("maps .invoice-detail-dd to CanvasText", () => {
    const block = extractMediaBlock(cssSource, "forced-colors: active");
    expect(block).toMatch(/\.invoice-detail-dd\b/);
    expect(block).toMatch(/\bCanvasText\b/);
  });

  it("maps .invoice-detail-action-btn to ButtonFace / ButtonText", () => {
    const block = extractMediaBlock(cssSource, "forced-colors: active");
    expect(block).toMatch(/\.invoice-detail-action-btn\b/);
    expect(block).toMatch(/\bButtonFace\b/);
    expect(block).toMatch(/\bButtonText\b/);
  });

  it("maps .invoice-detail-disclaimer to Canvas background with CanvasText", () => {
    const block = extractMediaBlock(cssSource, "forced-colors: active");
    expect(block).toMatch(/\.invoice-detail-disclaimer\b/);
    expect(block).toMatch(/\bCanvas\b/);
    expect(block).toMatch(/\bCanvasText\b/);
  });

  it("uses forced-color-adjust: none on invoice-detail elements to preserve explicit styling", () => {
    const block = extractMediaBlock(cssSource, "forced-colors: active");
    expect(block).toMatch(/forced-color-adjust\s*:\s*none/);
  });
});

// =============================================================================
// 3. CSS source integrity — @media (prefers-contrast: more)
// =============================================================================

describe("globals.css — prefers-contrast: more block (issue #31)", () => {
  it("contains an @media (prefers-contrast: more) block", () => {
    expect(cssSource).toMatch(/@media\s*\(\s*prefers-contrast:\s*more\s*\)/);
  });

  it("strengthens .invoice-detail-section border and background", () => {
    const block = extractMediaBlock(cssSource, "prefers-contrast: more");
    expect(block).toMatch(/\.invoice-detail-section\b/);
    expect(block).toMatch(/\bborder-color\b/);
    expect(block).toMatch(/\bbackground-color\b/);
  });

  it("strengthens .invoice-detail-dt colour", () => {
    const block = extractMediaBlock(cssSource, "prefers-contrast: more");
    expect(block).toMatch(/\.invoice-detail-dt\b/);
    expect(block).toMatch(/\bcolor\b/);
  });

  it("strengthens .invoice-detail-dd colour to maximum legibility", () => {
    const block = extractMediaBlock(cssSource, "prefers-contrast: more");
    expect(block).toMatch(/\.invoice-detail-dd\b/);
    expect(block).toMatch(/\bcolor\b/);
  });

  it("strengthens .invoice-detail-action-btn borders", () => {
    const block = extractMediaBlock(cssSource, "prefers-contrast: more");
    expect(block).toMatch(/\.invoice-detail-action-btn\b/);
    expect(block).toMatch(/\bborder-color\b/);
  });

  it("strengthens .invoice-detail-disclaimer border and background", () => {
    const block = extractMediaBlock(cssSource, "prefers-contrast: more");
    expect(block).toMatch(/\.invoice-detail-disclaimer\b/);
    expect(block).toMatch(/\bborder-color\b/);
    expect(block).toMatch(/\bbackground-color\b/);
  });
});

// =============================================================================
// 4. InvoiceDetailClient DOM — CSS hook classes
// =============================================================================

describe("InvoiceDetailClient — CSS hook classes for reduced-motion + high-contrast", () => {
  it("section carries the invoice-detail-section hook class", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const section = document.querySelector("section");
    expect(section?.className).toContain("invoice-detail-section");
  });

  it("every <dt> carries the invoice-detail-dt hook class", () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const dts = container.querySelectorAll("dt");
    expect(dts.length).toBeGreaterThan(0);
    dts.forEach((dt) => {
      expect(dt.className).toContain("invoice-detail-dt");
    });
  });

  it("every <dd> carries the invoice-detail-dd hook class", () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const dds = container.querySelectorAll("dd");
    expect(dds.length).toBeGreaterThan(0);
    dds.forEach((dd) => {
      expect(dd.className).toContain("invoice-detail-dd");
    });
  });

  it("section still carries print-invoice-section and rounded-xl for layout", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const section = document.querySelector("section");
    expect(section?.className).toContain("print-invoice-section");
    expect(section?.className).toContain("rounded-xl");
  });

  it("section still carries data-density attribute (density feature unaffected)", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    expect(document.querySelector("section")).toHaveAttribute("data-density");
  });

  it("section still has aria-labelledby='invoice-summary-heading'", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    expect(screen.getByRole("region")).toHaveAttribute(
      "aria-labelledby",
      "invoice-summary-heading"
    );
  });

  it("invoice-detail-dt class coexists with text-slate-500 base style", () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const firstDt = container.querySelector("dt");
    expect(firstDt?.className).toContain("invoice-detail-dt");
    expect(firstDt?.className).toContain("text-slate-500");
  });

  it("invoice-detail-dd class coexists with text-slate-100 base style", () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const firstDd = container.querySelector("dd");
    expect(firstDd?.className).toContain("invoice-detail-dd");
    expect(firstDd?.className).toContain("text-slate-100");
  });
});

// =============================================================================
// 5. FundActions DOM — motion-reduce and CSS hook classes
// =============================================================================

// FundActions has multiple deps that need mocking — replicate the minimal mock
// set from FundActions.announce.test.tsx.

jest.mock("@/components/ToastProvider", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock("@/components/WalletContext", () => ({
  WALLET_STATES: {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    NO_WALLET: "no_wallet",
    WRONG_NETWORK: "wrong_network",
  },
  useWallet: jest.fn(() => ({ state: "connected", connect: jest.fn() })),
}));

jest.mock("@/app/invest/MarketplaceContext", () => ({
  useMarketplace: jest.fn(() => ({
    invoices: [],
    setInvoices: jest.fn(),
    pendingIds: new Set(),
    fundInvoice: jest.fn().mockResolvedValue(true),
  })),
}));

import FundActions from "./FundActions";

const fundActionProps = { id: "inv-001", status: "Open" };

describe("FundActions — motion-reduce:transition-none on action buttons", () => {
  it("Fund button carries motion-reduce:transition-none to suppress hover transition", () => {
    render(<FundActions {...fundActionProps} />);
    const buttons = document.querySelectorAll("button.invoice-detail-action-btn");
    // At minimum the three action buttons must be present
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    buttons.forEach((btn) => {
      expect(btn.className).toContain("motion-reduce:transition-none");
    });
  });

  it("Fund button still carries transition-colors for non-motion-sensitive users", () => {
    render(<FundActions {...fundActionProps} />);
    // The primary Fund button
    const fundBtn = screen.getByRole("button", { name: /fund this invoice/i });
    expect(fundBtn.className).toContain("transition-colors");
    expect(fundBtn.className).toContain("motion-reduce:transition-none");
  });

  it("Copy link button carries both transition-colors and motion-reduce:transition-none", () => {
    render(<FundActions {...fundActionProps} />);
    const copyBtn = screen.getByRole("button", { name: /copy link/i });
    expect(copyBtn.className).toContain("transition-colors");
    expect(copyBtn.className).toContain("motion-reduce:transition-none");
  });

  it("Print button carries both transition-colors and motion-reduce:transition-none", () => {
    render(<FundActions {...fundActionProps} />);
    const printBtn = screen.getByRole("button", { name: /print/i });
    expect(printBtn.className).toContain("transition-colors");
    expect(printBtn.className).toContain("motion-reduce:transition-none");
  });
});

describe("FundActions — CSS hook classes for high-contrast", () => {
  it("all three action buttons carry the invoice-detail-action-btn hook", () => {
    render(<FundActions {...fundActionProps} />);
    const buttons = document.querySelectorAll("button.invoice-detail-action-btn");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("disclaimer note carries the invoice-detail-disclaimer hook class", () => {
    const { container } = render(<FundActions {...fundActionProps} />);
    const disclaimer = container.querySelector(".invoice-detail-disclaimer");
    expect(disclaimer).toBeInTheDocument();
    // The disclaimer is hidden from print
    expect(disclaimer?.className).toContain("no-print");
  });

  it("invoice-detail-action-btn coexists with focus-ring for keyboard users", () => {
    render(<FundActions {...fundActionProps} />);
    const fundBtn = screen.getByRole("button", { name: /fund this invoice/i });
    expect(fundBtn.className).toContain("invoice-detail-action-btn");
    expect(fundBtn.className).toContain("focus-ring");
  });
});

// =============================================================================
// 6. Reduced-motion branch — disabled-state invariant
// =============================================================================

describe("InvoiceDetailClient — reduced-motion disabled-state invariant", () => {
  it("compact/comfortable spacing still works correctly with hook classes present", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);

    // Default: comfortable (p-6, gap-4)
    expect(document.querySelector("section")?.className).toContain("p-6");
    expect(document.querySelector("dl")?.className).toContain("gap-4");

    // Switch to compact
    const compactBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-density") === "compact");
    await act(async () => {
      fireEvent.click(compactBtn!);
    });

    expect(document.querySelector("section")?.className).toContain("p-4");
    expect(document.querySelector("dl")?.className).toContain("gap-2");
  });

  it("section still carries invoice-detail-section after toggling to compact", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);

    const compactBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-density") === "compact");
    await act(async () => {
      fireEvent.click(compactBtn!);
    });

    expect(document.querySelector("section")?.className).toContain("invoice-detail-section");
  });

  it("dts and dds retain hook classes after density toggle", async () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);

    const compactBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-density") === "compact");
    await act(async () => {
      fireEvent.click(compactBtn!);
    });

    container.querySelectorAll("dt").forEach((dt) => {
      expect(dt.className).toContain("invoice-detail-dt");
    });
    container.querySelectorAll("dd").forEach((dd) => {
      expect(dd.className).toContain("invoice-detail-dd");
    });
  });

  it("hook classes survive localStorage-restored compact density", async () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "compact");
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);

    await waitFor(() => {
      expect(document.querySelector("section")?.className).toContain("p-4");
    });

    expect(document.querySelector("section")?.className).toContain("invoice-detail-section");
    container.querySelectorAll("dt").forEach((dt) => {
      expect(dt.className).toContain("invoice-detail-dt");
    });
    container.querySelectorAll("dd").forEach((dd) => {
      expect(dd.className).toContain("invoice-detail-dd");
    });
  });
});

// =============================================================================
// 7. No-regression axe checks
// =============================================================================

describe("InvoiceDetailClient — axe regressions (motion-contrast additions)", () => {
  it("passes axe in comfortable mode with hook classes present", async () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe in compact mode with hook classes present", async () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const compactBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-density") === "compact");
    await act(async () => {
      fireEvent.click(compactBtn!);
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("FundActions — axe regression (motion-contrast additions)", () => {
  it("passes axe with invoice-detail hook classes and motion-reduce variants", async () => {
    const { container } = render(<FundActions {...fundActionProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
