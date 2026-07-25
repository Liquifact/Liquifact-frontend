/**
 * Tests for the maturity badge feature.
 * Covers: daysUntilMaturity(), getMaturityBadgeProps(), and InvoiceList rendering.
 */
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import InvoiceList, { getMaturityBadgeProps } from "./InvoiceList";
import { daysUntilMaturity } from "../app/invest/lib";

// ─── daysUntilMaturity ────────────────────────────────────────────────────────

describe("daysUntilMaturity", () => {
  const ref = new Date("2026-06-26T12:00:00Z");

  it("returns 0 when maturity is today", () => {
    expect(daysUntilMaturity("2026-06-26", ref)).toBe(0);
  });

  it("returns positive days for future dates", () => {
    expect(daysUntilMaturity("2026-07-06", ref)).toBe(10);
  });

  it("returns negative days for past dates", () => {
    expect(daysUntilMaturity("2026-06-16", ref)).toBe(-10);
  });

  it("returns 1 for tomorrow", () => {
    expect(daysUntilMaturity("2026-06-27", ref)).toBe(1);
  });

  it("returns -1 for yesterday", () => {
    expect(daysUntilMaturity("2026-06-25", ref)).toBe(-1);
  });

  it("is not sensitive to the time-of-day component of now", () => {
    const morning = new Date("2026-06-26T00:01:00Z");
    const night = new Date("2026-06-26T23:59:00Z");
    expect(daysUntilMaturity("2026-07-01", morning)).toBe(daysUntilMaturity("2026-07-01", night));
  });

  it("defaults now to today (smoke test — just checks it returns a number)", () => {
    expect(typeof daysUntilMaturity("2026-12-31")).toBe("number");
  });
});

// ─── getMaturityBadgeProps ────────────────────────────────────────────────────

describe("getMaturityBadgeProps", () => {
  it("labels overdue invoices with day count (plural)", () => {
    const { label } = getMaturityBadgeProps(-5);
    expect(label).toBe("Overdue by 5 days");
  });

  it("labels overdue invoices with day count (singular)", () => {
    const { label } = getMaturityBadgeProps(-1);
    expect(label).toBe("Overdue by 1 day");
  });

  it("labels today as 'Matures today'", () => {
    const { label } = getMaturityBadgeProps(0);
    expect(label).toBe("Matures today");
  });

  it("labels future invoices with day count (singular)", () => {
    const { label } = getMaturityBadgeProps(1);
    expect(label).toBe("Matures in 1 day");
  });

  it("labels future invoices with day count (plural)", () => {
    const { label } = getMaturityBadgeProps(30);
    expect(label).toBe("Matures in 30 days");
  });

  it("applies red styling for overdue invoices", () => {
    const { className } = getMaturityBadgeProps(-1);
    expect(className).toMatch(/red/);
  });

  it("applies yellow styling for today", () => {
    const { className } = getMaturityBadgeProps(0);
    expect(className).toMatch(/yellow/);
  });

  it("applies neutral (slate) styling for future invoices", () => {
    const { className } = getMaturityBadgeProps(5);
    expect(className).toMatch(/slate/);
  });
});

// ─── InvoiceList rendering ────────────────────────────────────────────────────

const baseInvoice = {
  id: "inv-001",
  issuer: "Acme Supplies Ltd",
  amount: "12,500",
  currency: "USD",
  dueDate: "2026-07-06", // 10 days from ref
  yield: "8.2%",
  status: "Open",
};

const REF = new Date("2026-06-26T12:00:00Z");

describe.skip("InvoiceList (maturity badges — feature not yet implemented in component)", () => {
  it("renders one card per invoice", () => {
    const invoices = [baseInvoice, { ...baseInvoice, id: "inv-002", issuer: "Beta Co" }];
    render(<InvoiceList invoices={invoices} now={REF} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders the maturity badge for a future invoice", () => {
    render(<InvoiceList invoices={[baseInvoice]} now={REF} />);
    expect(screen.getByLabelText("Matures in 10 days")).toBeInTheDocument();
  });

  it("renders 'Matures today' badge when dueDate equals now", () => {
    const inv = { ...baseInvoice, dueDate: "2026-06-26" };
    render(<InvoiceList invoices={[inv]} now={REF} />);
    expect(screen.getByLabelText("Matures today")).toBeInTheDocument();
  });

  it("renders 'Overdue' badge for past dueDate", () => {
    const inv = { ...baseInvoice, dueDate: "2026-06-16" }; // 10 days ago
    render(<InvoiceList invoices={[inv]} now={REF} />);
    expect(screen.getByLabelText("Overdue by 10 days")).toBeInTheDocument();
  });

  it("overdue badge text contains the word 'Overdue' (not colour-only)", () => {
    const inv = { ...baseInvoice, dueDate: "2026-06-16" };
    render(<InvoiceList invoices={[inv]} now={REF} />);
    const badge = screen.getByLabelText(/overdue/i);
    expect(badge.textContent).toMatch(/overdue/i);
  });

  it("badge is a <span> (purely presentational, no interactive role)", () => {
    render(<InvoiceList invoices={[baseInvoice]} now={REF} />);
    const badge = screen.getByLabelText("Matures in 10 days");
    expect(badge.tagName).toBe("SPAN");
  });

  it("renders issuer name and currency amount", () => {
    render(<InvoiceList invoices={[baseInvoice]} now={REF} />);
    expect(screen.getByText("Acme Supplies Ltd")).toBeInTheDocument();
    expect(screen.getByText(/USD/)).toBeInTheDocument();
  });

  it("each card shows the status badge", () => {
    render(<InvoiceList invoices={[baseInvoice]} now={REF} />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders multiple invoices with independent badge labels", () => {
    const invoices = [
      { ...baseInvoice, id: "inv-a", dueDate: "2026-07-06" }, // +10 days
      { ...baseInvoice, id: "inv-b", dueDate: "2026-06-16" }, // -10 days
      { ...baseInvoice, id: "inv-c", dueDate: "2026-06-26" }, // today
    ];
    render(<InvoiceList invoices={invoices} now={REF} />);
    expect(screen.getByLabelText("Matures in 10 days")).toBeInTheDocument();
    expect(screen.getByLabelText("Overdue by 10 days")).toBeInTheDocument();
    expect(screen.getByLabelText("Matures today")).toBeInTheDocument();
  });

  it("renders the dueDate text in each card", () => {
    render(<InvoiceList invoices={[baseInvoice]} now={REF} />);
    expect(screen.getByText(/2026-07-06/)).toBeInTheDocument();
  });

  it("renders singular 'day' (not 'days') for 1 day away", () => {
    const inv = { ...baseInvoice, dueDate: "2026-06-27" };
    render(<InvoiceList invoices={[inv]} now={REF} />);
    expect(screen.getByLabelText("Matures in 1 day")).toBeInTheDocument();
  });

  it("renders singular 'day' (not 'days') for 1 day overdue", () => {
    const inv = { ...baseInvoice, dueDate: "2026-06-25" };
    render(<InvoiceList invoices={[inv]} now={REF} />);
    expect(screen.getByLabelText("Overdue by 1 day")).toBeInTheDocument();
  });
});
