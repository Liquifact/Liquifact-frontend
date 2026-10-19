import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/api", () => ({
  getInvoice: vi.fn(),
  fundInvoice: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

import { getInvoice, fundInvoice } from "@/lib/api";
import InvoiceDetail from "@/app/marketplace/[id]/InvoiceDetail";

const XLM = 10000000n;
const invoice = {
  id: "INV_0001", sme: "Acme Ltd", debtor: "Buyer Co", amount: 1000, fundedAmount: 300,
  currency: "XLM", yieldBps: 800, dueDate: "2026-12-01", status: "open", onChain: true,
};

const openRules = {
  minContributionFloor: 10n * XLM,
  maxPerInvestorCap: 400n * XLM,
  remainingCapacity: 700n * XLM,
  fundingDeadline: null,
  paused: false, legalHold: false, status: 0, contribution: 100n * XLM, errors: [],
};

function setup(constraintsResult, invoiceOverride) {
  getInvoice.mockResolvedValue({ data: { ...invoice, ...invoiceOverride }, offline: false });
  const loadConstraintsFn = vi.fn().mockResolvedValue(constraintsResult);
  render(<InvoiceDetail id="INV_0001" loadConstraintsFn={loadConstraintsFn} />);
  return { loadConstraintsFn };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("InvoiceDetail fund form with escrow constraints", () => {
  it("keeps the form usable while rules are being checked", async () => {
    setup(new Promise(() => {})); // never resolves -> still checking
    const input = await screen.findByLabelText(/Amount/);
    expect(screen.getByText(/Checking escrow rules/)).toBeTruthy();
    expect(input.disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Fund invoice" }).disabled).toBe(false);
  });

  it("Max button fills min(cap - contribution, remaining capacity)", async () => {
    setup(Promise.resolve(openRules));
    const user = userEvent.setup();
    const maxBtn = await screen.findByRole("button", { name: "Max" });
    await user.click(maxBtn);
    // cap 400 - contribution 100 = 300 < capacity 700 -> "300"
    expect(screen.getByLabelText(/Amount/).value).toBe("300");
  });

  it("disables Fund with the reason when the escrow is paused", async () => {
    setup(Promise.resolve({ ...openRules, paused: true }));
    const btn = await screen.findByRole("button", { name: /paused/i });
    await waitFor(() => expect(btn.disabled).toBe(true));
  });

  it("disables Fund with the reason on legal hold", async () => {
    setup(Promise.resolve({ ...openRules, legalHold: true }));
    const btn = await screen.findByRole("button", { name: /legal hold/i });
    await waitFor(() => expect(btn.disabled).toBe(true));
  });

  it("disables Fund with the reason when the deadline passed", async () => {
    setup(Promise.resolve({ ...openRules, fundingDeadline: 1_000_000_000 }));
    const btn = await screen.findByRole("button", { name: /deadline has passed/i });
    await waitFor(() => expect(btn.disabled).toBe(true));
  });

  it("shows an inline aria-linked error above the cap room and never submits", async () => {
    setup(Promise.resolve(openRules));
    const user = userEvent.setup();
    const input = await screen.findByLabelText(/Amount/);
    await user.type(input, "350"); // cap room is 300
    await screen.findByText(/exceeds your remaining per-investor cap/);
    expect(input.getAttribute("aria-describedby")).toContain("amount-error");
    expect(document.getElementById("amount-error").textContent).toMatch(/per-investor cap/);
    expect(screen.getByRole("button", { name: "Fund invoice" }).disabled).toBe(true);
    expect(fundInvoice).not.toHaveBeenCalled();
  });

  it("accepts an amount within every bound and submits", async () => {
    fundInvoice.mockResolvedValue({ data: { ...invoice, fundedAmount: 550 } });
    setup(Promise.resolve(openRules));
    const user = userEvent.setup();
    const input = await screen.findByLabelText(/Amount/);
    await user.type(input, "250");
    await waitFor(() => expect(screen.getByRole("button", { name: "Fund invoice" }).disabled).toBe(false));
    await user.click(screen.getByRole("button", { name: "Fund invoice" }));
    await waitFor(() => expect(fundInvoice).toHaveBeenCalledWith("INV_0001", 250));
  });

  it("falls back to amount > 0 validation when the read fails", async () => {
    getInvoice.mockResolvedValue({ data: invoice, offline: false });
    const loadConstraintsFn = vi.fn().mockRejectedValue(new Error("rpc down"));
    render(<InvoiceDetail id="INV_0001" loadConstraintsFn={loadConstraintsFn} />);
    const user = userEvent.setup();
    const input = await screen.findByLabelText(/Amount/);
    expect(await screen.findByText(/falling back to basic validation/)).toBeTruthy();
    await user.type(input, "25");
    const btn = screen.getByRole("button", { name: "Fund invoice" });
    await waitFor(() => expect(btn.disabled).toBe(false));
    fundInvoice.mockResolvedValue({ data: { ...invoice, fundedAmount: 325 } });
    await user.click(btn);
    await waitFor(() => expect(fundInvoice).toHaveBeenCalledWith("INV_0001", 25));
  });

  it("skips constraint loading for off-chain invoices", async () => {
    setup(Promise.resolve(openRules), { onChain: false });
    const input = await screen.findByLabelText(/Amount/);
    expect(input).toBeTruthy();
    expect(screen.queryByText(/Checking escrow rules/)).toBeNull();
  });
});
