/**
 * @file components/InvoiceCard.test.tsx
 * Unit + accessibility tests for the shared InvoiceCard component.
 * Target: ≥ 95% branch coverage for InvoiceCard.jsx
 *
 * Status is now delegated to the shared `StatusPill` component.  These
 * tests intentionally assert only the *wiring* (the badge is rendered,
 * the link aria-label mentions the status, the TitleCase canonical values
 * are accepted); per-tone class assertions live in `components/StatusPill.test.tsx`.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceCard from "./InvoiceCard";

expect.extend(toHaveNoViolations);

// Next.js Link renders an <a> in tests; mock it simply.
jest.mock("next/link", () => {
  const Link = ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  Link.displayName = "Link";
  return Link;
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_INVOICE = {
  id: "INV-001",
  issuer: "Acme Corp",
  amount: 50000,
  currency: "USDC",
  dueDate: "2025-09-30",
  yield: 8.5,
  status: "Open",
};

function renderCard(overrides = {}) {
  const invoice = { ...BASE_INVOICE, ...overrides };
  return render(<InvoiceCard invoice={invoice} />);
}

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe("InvoiceCard — basic rendering", () => {
  it("renders the issuer name", () => {
    renderCard();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders the invoice id", () => {
    renderCard();
    expect(screen.getByText("INV-001")).toBeInTheDocument();
  });

  it("renders the amount via the shared currency formatter", () => {
    renderCard({ amount: 50000, currency: "USD" });
    expect(screen.getByText("$50,000")).toBeInTheDocument();
  });

  it("falls back to the shared default currency when the currency code is unsupported", () => {
    renderCard();
    expect(screen.getByText("$50,000")).toBeInTheDocument();
  });

  it("renders the yield percentage", () => {
    renderCard();
    expect(screen.getByText("8.5%")).toBeInTheDocument();
  });

  it("renders the formatted due date", () => {
    renderCard();
    // "Sep 30, 2025" or locale-equivalent
    expect(screen.getByText(/sep.+30.+2025/i)).toBeInTheDocument();
  });

  it("renders a status badge with the correct label", () => {
    renderCard({ status: "Open" });
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("Open");
  });

  it("links to the invoice detail page", () => {
    renderCard({ id: "INV-042" });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/invest/INV-042");
  });

  it("renders percent-string yields without a duplicated % suffix", () => {
    renderCard({ yield: "8.5%" });
    expect(screen.getByText("8.5%")).toBeInTheDocument();
  });

  it("renders numeric yields with a trailing %", () => {
    renderCard({ yield: 8.5 });
    expect(screen.getByText("8.5%")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Status variants — canonical TitleCase values
// ---------------------------------------------------------------------------

describe("InvoiceCard — status variants", () => {
  it.each([
    ["Open", "Open"],
    ["Funded", "Funded"],
    ["Settled", "Settled"],
    ["Overdue", "Overdue by maturity"],
  ])("renders status '%s' as '%s'", (status, label) => {
    renderCard({ status });
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(label);
  });

  it("falls back to a neutral 'Unknown' pill for unrecognised status values", () => {
    renderCard({ status: "unknown-value" });
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Unknown");
    expect(badge).toHaveAttribute("data-status", "Unknown");
  });

  it("falls back to 'Unknown' when status is null", () => {
    renderCard({ status: null as any });
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("Unknown");
  });

  it("falls back to 'Unknown' when status is undefined", () => {
    const { status, ...rest } = BASE_INVOICE;
    render(<InvoiceCard invoice={rest as any} />);
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("Unknown");
  });
});

// ---------------------------------------------------------------------------
// Edge cases — missing optional fields
// ---------------------------------------------------------------------------

describe("InvoiceCard — missing optional fields", () => {
  it("renders em-dash when amount is missing", () => {
    renderCard({ amount: undefined });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders em-dash when amount is null", () => {
    renderCard({ amount: null as any });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders parsed numeric strings through the shared currency formatter", () => {
    renderCard({ amount: "12,500", currency: "USD" });
    expect(screen.getByText("$12,500")).toBeInTheDocument();
  });

  it("renders em-dash when amount is NaN", () => {
    renderCard({ amount: Number.NaN });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders em-dash when dueDate is missing", () => {
    renderCard({ dueDate: undefined });
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders em-dash when yield is missing", () => {
    renderCard({ yield: undefined });
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders em-dash when yield is NaN", () => {
    renderCard({ yield: Number.NaN });
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders fallback text when issuer is missing", () => {
    renderCard({ issuer: undefined });
    expect(screen.getByText(/unknown issuer/i)).toBeInTheDocument();
  });

  it("handles an invalid date string without throwing", () => {
    renderCard({ dueDate: "not-a-date" });
    expect(screen.getByText("not-a-date")).toBeInTheDocument();
  });

  it("renders the entire row when invoice is null (uses fallback branches)", () => {
    // InvoiceCard tolerates a nullish invoice via `invoice ?? {}` and renders
    // a row of em-dashes / "Unknown issuer" / "Unknown" status.
    expect(() => render(<InvoiceCard invoice={null as any} />)).not.toThrow();
    expect(screen.getByText(/unknown issuer/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Long issuer names
// ---------------------------------------------------------------------------

describe("InvoiceCard — long issuer names", () => {
  it("renders without layout-breaking for a very long issuer name", () => {
    const longName = "A".repeat(120);
    renderCard({ issuer: longName });
    expect(screen.getByText(longName)).toBeInTheDocument();
    expect(screen.getByText(longName)).toHaveClass("truncate");
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe("InvoiceCard — accessibility", () => {
  it("has no axe violations for a complete invoice", async () => {
    const { container } = renderCard();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations when optional fields are missing", async () => {
    const { container } = renderCard({
      issuer: undefined,
      amount: undefined,
      dueDate: undefined,
      yield: undefined,
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has an accessible aria-label on the link describing the invoice", () => {
    renderCard();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-label");
    expect(link.getAttribute("aria-label")).toMatch(/acme corp/i);
    expect(link.getAttribute("aria-label")).toMatch(/open/i);
  });

  it("status badge has role='status' and an aria-label naming the state", () => {
    renderCard({ status: "Funded" });
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toHaveAttribute("aria-label", "Status: Funded");
  });

  it("status badge carries data-status='Funded' (canonical, not label-text)", () => {
    renderCard({ status: "Funded" });
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toHaveAttribute("data-status", "Funded");
  });

  it("link aria-label does NOT include the 'Unknown' trailer when status is nullish", () => {
    // Regression guard for the conditional statusSuffix: nullish status
    // must result in an aria-label of the form
    // "Invoice <id> from <issuer>" — NOT "... \u2014 Unknown".
    renderCard({ status: null as any });
    const link = screen.getByRole("link");
    const aria = link.getAttribute("aria-label") ?? "";
    expect(aria).toMatch(/acme corp/i);
    expect(aria).not.toMatch(/unknown/i);
    expect(aria).not.toMatch(/\u2014/);
  });

  it("link aria-label does NOT include the 'Unknown' trailer for an unrecognised status", () => {
    renderCard({ status: "garbage" as any });
    const link = screen.getByRole("link");
    const aria = link.getAttribute("aria-label") ?? "";
    expect(aria).not.toMatch(/unknown/i);
    expect(aria).not.toMatch(/\u2014/);
  });

  it("link aria-label DOES include the canonical status (with the em-dash trailer)", () => {
    renderCard({ status: "Settled" });
    const link = screen.getByRole("link");
    const aria = link.getAttribute("aria-label") ?? "";
    expect(aria).toMatch(/settled/i);
    expect(aria).toMatch(/\u2014 settled/i);
  });
});

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

describe("InvoiceCard — snapshot", () => {
  it("matches snapshot for a complete invoice", () => {
    const { asFragment } = renderCard();
    expect(asFragment()).toMatchSnapshot();
  });
});
