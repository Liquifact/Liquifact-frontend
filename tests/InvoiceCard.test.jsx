import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoiceCard from "../components/InvoiceCard";

describe("InvoiceCard component", () => {
  it("renders RiskBadge beside StatusBadge for open invoice", () => {
    const invoice = {
      id: "INV_0002",
      sme: "Northwind Textiles",
      debtor: "Initech Wholesale",
      amount: 25000,
      currency: "USDC",
      fundedAmount: 18000,
      yieldBps: 650,
      dueDate: "2026-12-30",
      status: "open",
      onChain: false,
    };

    render(<InvoiceCard invoice={invoice} medians={{ medianYield: 700, medianTicketSize: 20000 }} />);

    expect(screen.getByText("open")).not.toBeNull();
    // Risk badge should be rendered
    const riskBadge = screen.getByRole("status");
    expect(riskBadge.getAttribute("aria-label")).toMatch(/Risk:/);
  });

  it("does not render RiskBadge for settled invoice", () => {
    const invoice = {
      id: "INV_0004",
      sme: "Sunrise Agritech",
      debtor: "Stark Industries",
      amount: 12500,
      currency: "USDC",
      fundedAmount: 12500,
      yieldBps: 900,
      dueDate: "2026-09-30",
      status: "settled",
      onChain: false,
    };

    render(<InvoiceCard invoice={invoice} />);

    expect(screen.getByText("settled")).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not render RiskBadge for cancelled invoice", () => {
    const invoice = {
      id: "INV_0005",
      sme: "Cancelled Corp",
      debtor: "Acme Buyer",
      amount: 10000,
      currency: "USDC",
      fundedAmount: 0,
      yieldBps: 800,
      dueDate: "2026-11-30",
      status: "cancelled",
      onChain: false,
    };

    render(<InvoiceCard invoice={invoice} />);

    expect(screen.getByText("cancelled")).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
