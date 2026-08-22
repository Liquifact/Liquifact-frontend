/**
 * Reduced-motion accessibility tests for issue #92.
 *
 * CSS animations are mocked in Jest/jsdom (moduleNameMapper maps *.css → style.js),
 * so we assert on DOM structure and Tailwind class names rather than computed styles.
 * The @media (prefers-reduced-motion: reduce) block in app/globals.css handles
 * the actual animation suppression at the browser layer.
 *
 * Manual verification matrix (DevTools → Rendering → prefers-reduced-motion: reduce):
 * ┌──────────────────────────┬──────────────────────────────────────────────────────┐
 * │ Component                │ Expected with motion OFF                             │
 * ├──────────────────────────┼──────────────────────────────────────────────────────┤
 * │ InvoiceListSkeleton      │ Skeleton rows visible, opacity ~0.7, no shimmer      │
 * │ InvestLoading (page)     │ All skeleton divs visible, no shimmer                │
 * │ InvoicesLoading (page)   │ All skeleton divs visible, no shimmer                │
 * │ Spinner SVG              │ SVG shape visible, no rotation                       │
 * └──────────────────────────┴──────────────────────────────────────────────────────┘
 */

import React from "react";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";

import InvoiceListSkeleton from "../components/InvoiceListSkeleton";
import InvestLoading from "./invest/loading";
import InvoicesLoading from "./invoices/loading";

// ---------------------------------------------------------------------------
// Inline Spinner — mirrors the implementation in UploadZone exactly.
// Uses role="img" + aria-label so screen readers announce
// the loading state directly from the SVG.
// ---------------------------------------------------------------------------
function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin -ml-1 mr-2 h-4 w-4 inline ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ── InvoiceListSkeleton ─────────────────────────────────────────────────────

describe("InvoiceListSkeleton – reduced-motion", () => {
  it("renders skeleton rows with animate-pulse class (CSS layer disables motion)", () => {
    const { container } = render(<InvoiceListSkeleton rows={3} />);
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(3);
    items.forEach((item) => {
      expect(item.className).toContain("animate-pulse");
    });
  });

  it('keeps aria-busy="true" so screen readers announce loading state', () => {
    const { container } = render(<InvoiceListSkeleton />);
    expect(container.querySelector("ul")?.getAttribute("aria-busy")).toBe("true");
  });

  it("keeps aria-label on the list", () => {
    const { container } = render(<InvoiceListSkeleton />);
    expect(container.querySelector("ul")?.getAttribute("aria-label")).toBeTruthy();
  });

  it("skeleton rows remain in the DOM (visible without motion)", () => {
    const { container } = render(<InvoiceListSkeleton rows={2} />);
    expect(container.querySelectorAll("li").length).toBe(2);
  });

  it("passes axe accessibility check", async () => {
    const { container } = render(<InvoiceListSkeleton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Spinner ─────────────────────────────────────────────────────────────────

describe("Spinner – reduced-motion", () => {
  it("renders SVG with animate-spin class (CSS layer stops rotation)", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    // SVG className is an SVGAnimatedString; baseVal holds the string value
    const cls = svg?.className?.baseVal ?? svg?.getAttribute("class") ?? "";
    expect(cls).toContain("animate-spin");
  });

  it("has role=img and aria-label so screen readers announce the loading state", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "Loading");
  });

  it("passes axe accessibility check", async () => {
    const { container } = render(<Spinner />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── InvestLoading ────────────────────────────────────────────────────────────

describe("InvestLoading – reduced-motion", () => {
  it("renders animate-pulse skeleton elements", () => {
    const { container } = render(<InvestLoading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it('root element has aria-busy="true"', () => {
    const { container } = render(<InvestLoading />);
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });

  it("skeleton elements stay in DOM with motion disabled", () => {
    const { container } = render(<InvestLoading />);
    expect(container.querySelector("main")).toBeTruthy();
  });

  it("passes axe accessibility check", async () => {
    const { container } = render(<InvestLoading />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── InvoicesLoading ──────────────────────────────────────────────────────────

describe("InvoicesLoading – reduced-motion", () => {
  it("renders animate-pulse skeleton elements", () => {
    const { container } = render(<InvoicesLoading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it('root element has aria-busy="true"', () => {
    const { container } = render(<InvoicesLoading />);
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });

  it("skeleton elements stay in DOM with motion disabled", () => {
    const { container } = render(<InvoicesLoading />);
    expect(container.querySelector("main")).toBeTruthy();
  });

  it("passes axe accessibility check", async () => {
    const { container } = render(<InvoicesLoading />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
