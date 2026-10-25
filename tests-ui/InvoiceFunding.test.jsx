import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/api", () => ({
  getInvoice: vi.fn(),
  fundInvoice: vi.fn(),
}));
vi.mock("@/components/NotificationsProvider", () => ({
  useNotifications: () => ({ follow: vi.fn(), unfollow: vi.fn(), isFollowing: () => false }),
}));
// The escrow funding token (#1381) resolves to the native XLM SAC, matching the invoice currency.
vi.mock("@/lib/escrow/token", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveFundingToken: vi.fn(async () => "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"),
}));
// On-chain invoices fund through Freighter (#1364): mock the wallet + submit layer.
vi.mock("@/lib/stellar/freighter", async (importOriginal) => ({
  ...(await importOriginal()),
  connectFreighter: vi.fn(),
  signWithFreighter: vi.fn(),
}));
vi.mock("@/lib/stellar/fund", () => ({ submitFund: vi.fn() }));
vi.mock("@/components/wallet/BalanceHint", () => ({ default: () => null }));
vi.mock("@/components/escrow/FundersTable", () => ({ default: () => null }));
vi.mock("@/components/invest/ExitPanel", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

import { getInvoice, fundInvoice } from "@/lib/api";
import { connectFreighter } from "@/lib/stellar/freighter";
import { submitFund } from "@/lib/stellar/fund";
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

const WALLET = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";

async function connectWallet(user) {
  await user.click(await screen.findByRole("button", { name: "Connect Freighter" }));
  await screen.findByText(/Connected:/);
}

beforeEach(() => {
  vi.clearAllMocks();
  connectFreighter.mockResolvedValue(WALLET);
  submitFund.mockResolvedValue({ status: "SUCCESS", hash: "a".repeat(64) });
});

afterEach(cleanup);

describe("InvoiceDetail fund form with escrow constraints", () => {
  it("keeps the form usable while rules are being checked", async () => {
    setup(new Promise(() => {})); // never resolves -> still checking
    const user = userEvent.setup();
    const input = await screen.findByLabelText(/Amount/);
    expect(await screen.findByText(/Checking escrow rules/)).toBeTruthy();
    expect(input.disabled).toBe(false);
    await connectWallet(user);
    // Only the wallet + funding-token check (fail-closed) gate the button; pending rules do not.
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign & fund" }).disabled).toBe(false));
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
    expect(screen.getByRole("button", { name: "Sign & fund" }).disabled).toBe(true);
    expect(fundInvoice).not.toHaveBeenCalled();
    expect(submitFund).not.toHaveBeenCalled();
  });

  it("accepts an amount within every bound and submits", async () => {
    setup(Promise.resolve(openRules));
    const user = userEvent.setup();
    await connectWallet(user);
    const input = await screen.findByLabelText(/Amount/);
    await user.type(input, "250");
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign & fund" }).disabled).toBe(false));
    await user.click(screen.getByRole("button", { name: "Sign & fund" }));
    await waitFor(() => expect(submitFund).toHaveBeenCalledTimes(1));
    expect(submitFund.mock.calls[0][0].amountStroops).toBe(250n * XLM);
    expect(fundInvoice).not.toHaveBeenCalled();
  });

  it("falls back to amount > 0 validation when the read fails", async () => {
    getInvoice.mockResolvedValue({ data: invoice, offline: false });
    const loadConstraintsFn = vi.fn().mockRejectedValue(new Error("rpc down"));
    render(<InvoiceDetail id="INV_0001" loadConstraintsFn={loadConstraintsFn} />);
    const user = userEvent.setup();
    const input = await screen.findByLabelText(/Amount/);
    expect(await screen.findByText(/falling back to basic validation/)).toBeTruthy();
    await connectWallet(user);
    await user.type(input, "25");
    const btn = screen.getByRole("button", { name: "Sign & fund" });
    await waitFor(() => expect(btn.disabled).toBe(false));
    await user.click(btn);
    await waitFor(() => expect(submitFund).toHaveBeenCalledTimes(1));
    expect(submitFund.mock.calls[0][0].amountStroops).toBe(25n * XLM);
  });

  it("skips constraint loading for off-chain invoices", async () => {
    setup(Promise.resolve(openRules), { onChain: false });
    const input = await screen.findByLabelText(/Amount/);
    expect(input).toBeTruthy();
    expect(screen.queryByText(/Checking escrow rules/)).toBeNull();
  });
});
