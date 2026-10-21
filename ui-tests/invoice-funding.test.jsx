import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceDetail from "@/app/marketplace/[id]/InvoiceDetail";
import { getInvoice, fundInvoice, getEscrowLive } from "@/lib/api";
import { connectFreighter, SignatureCancelled } from "@/lib/stellar/freighter";
import { submitFund } from "@/lib/stellar/fund";
import { CONTRACT_ID } from "@/lib/config";

vi.mock("@/lib/api", () => ({ getInvoice: vi.fn(), fundInvoice: vi.fn(), getEscrowLive: vi.fn() }));
vi.mock("@/lib/stellar/fund", () => ({ submitFund: vi.fn() }));
vi.mock("@/lib/stellar/freighter", async (original) => ({ ...await original(), connectFreighter: vi.fn(), signWithFreighter: vi.fn() }));
const invoice = { id: "INV_0001", sme: "Acme", debtor: "Globex", amount: 100, fundedAmount: 0, currency: "XLM", status: "open", onChain: true, yieldBps: 800, dueDate: "2027-01-17" };
const address = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";
const hash = "a".repeat(64);
beforeEach(() => {
  getInvoice.mockResolvedValue({ data: { ...invoice }, offline: false });
  getEscrowLive.mockResolvedValue({ contractId: CONTRACT_ID, escrow: { invoice_id: invoice.id, funding_target: "1000000000", funded_amount: "10000000", status: 0 } });
  connectFreighter.mockResolvedValue(address);
  submitFund.mockResolvedValue({ status: "SUCCESS", hash });
});
afterEach(cleanup);
async function setup() {
  const user = userEvent.setup();
  render(<InvoiceDetail id={invoice.id} />);
  await screen.findByRole("heading", { name: "Fund this invoice" });
  return user;
}
async function connect(user) { await user.click(screen.getByRole("button", { name: "Connect Freighter" })); await screen.findByText(/Connected:/); }

test("on-chain funding requires a wallet and has accessible status", async () => {
  await setup();
  expect(screen.getByRole("button", { name: "Sign & fund" }).disabled).toBe(true);
  expect(screen.getByLabelText("Amount (XLM)")).toBeTruthy();
  expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
  expect(fundInvoice).not.toHaveBeenCalled();
});
test("off-chain invoice still calls the existing API only", async () => {
  getInvoice.mockResolvedValue({ data: { ...invoice, onChain: false }, offline: false });
  fundInvoice.mockResolvedValue({ data: { ...invoice, onChain: false, fundedAmount: 2 } });
  const user = await setup();
  await user.type(screen.getByLabelText("Amount (XLM)"), "2");
  await user.click(screen.getByRole("button", { name: "Fund invoice" }));
  await screen.findByText(/Contribution of 2 XLM recorded/);
  expect(fundInvoice).toHaveBeenCalledWith(invoice.id, 2);
  expect(submitFund).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Connect Freighter" })).toBeNull();
});
test("in-flight submit cannot be triggered twice even through form events", async () => {
  let finish;
  submitFund.mockImplementation(({ onStatus }) => { onStatus("Waiting for signature"); return new Promise((resolve) => { finish = resolve; }); });
  const user = await setup(); await connect(user);
  await user.type(screen.getByLabelText("Amount (XLM)"), "1");
  const button = screen.getByRole("button", { name: "Sign & fund" });
  fireEvent.submit(button.closest("form")); fireEvent.submit(button.closest("form"));
  expect(submitFund).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: /Waiting for signature/ }).disabled).toBe(true);
  finish({ status: "SUCCESS", hash });
  await screen.findByText("Confirmed");
});
test("success shows hash and refreshes invoice and live escrow", async () => {
  const user = await setup(); await connect(user);
  await user.type(screen.getByLabelText("Amount (XLM)"), "1");
  await user.click(screen.getByRole("button", { name: "Sign & fund" }));
  expect((await screen.findByRole("link", { name: /View transaction/ })).href).toBe(`https://stellar.expert/explorer/testnet/tx/${hash}`);
  await waitFor(() => expect(getInvoice).toHaveBeenCalledTimes(2));
  expect(getEscrowLive).toHaveBeenCalledTimes(1);
  expect(submitFund.mock.calls[0][0].amountStroops).toBe(10000000n);
  await screen.findByText(/1 XLM/);
});
for (const amount of ["0.00000001", "101", "1e3", "-1"]) {
  test(`invalid amount ${amount} never requests a transaction`, async () => {
    const user = await setup(); await connect(user);
    await user.type(screen.getByLabelText("Amount (XLM)"), amount);
    await user.click(screen.getByRole("button", { name: "Sign & fund" }));
    await screen.findByText("Failed");
    expect(submitFund).not.toHaveBeenCalled();
  });
}
test("signature cancellation returns to idle with neutral copy", async () => {
  submitFund.mockRejectedValue(new SignatureCancelled());
  const user = await setup(); await connect(user);
  await user.type(screen.getByLabelText("Amount (XLM)"), "1");
  await user.click(screen.getByRole("button", { name: "Sign & fund" }));
  const message = await screen.findByText("Signature cancelled");
  expect(message.closest(".notice").className).not.toContain("notice-err");
  expect(screen.getByRole("button", { name: "Sign & fund" }).disabled).toBe(false);
});
test("timeout preserves hash and blocks another contribution", async () => {
  submitFund.mockResolvedValue({ status: "TIMEOUT", hash });
  const user = await setup(); await connect(user);
  await user.type(screen.getByLabelText("Amount (XLM)"), "1");
  await user.click(screen.getByRole("button", { name: "Sign & fund" }));
  await screen.findByText("Pending confirmation");
  expect(screen.getByRole("button", { name: "Sign & fund" }).disabled).toBe(true);
  expect(screen.getByRole("link", { name: /View transaction/ })).toBeTruthy();
});
test("keyboard connects and submits in form order", async () => {
  const user = await setup();
  const button = screen.getByRole("button", { name: "Connect Freighter" });
  button.focus(); await user.keyboard("{Enter}"); await screen.findByText(/Connected:/);
  await user.tab(); expect(document.activeElement).toBe(screen.getByLabelText("Amount (XLM)"));
  await user.keyboard("1"); await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sign & fund" }));
  await user.keyboard(" "); await screen.findByText("Confirmed");
});

for (const [status, label] of [[3, "withdrawn"], [4, "cancelled"]]) {
  test(`refresh respects live escrow status ${label}`, async () => {
    getEscrowLive.mockResolvedValue({ contractId: CONTRACT_ID, escrow: { invoice_id: invoice.id, amount: "1000000000", funded_amount: "1000000000", status } });
    const user = await setup(); await connect(user);
    await user.type(screen.getByLabelText("Amount (XLM)"), "1");
    await user.click(screen.getByRole("button", { name: "Sign & fund" }));
    await screen.findByText(/no longer accepts contributions/);
    expect(screen.queryByRole("button", { name: "Sign & fund" })).toBeNull();
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });
}
