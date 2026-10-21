import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TxReviewDialog from "../components/TxReviewDialog.jsx";

// The XDR decoder is exercised with real signed-byte fixtures in
// tests/txReview.test.mjs (node). Here we test the dialog's gating behaviour
// independently of the SDK's browser build.
const { reviewMock } = vi.hoisted(() => ({ reviewMock: vi.fn() }));

vi.mock("@/lib/stellar/txReview", () => ({
  reviewTransactionXdr: reviewMock,
}));

const SUMMARY = {
  network: "testnet",
  fee: "100",
  source: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  operations: [
    {
      kind: "contract_call",
      contractId: "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526",
      functionName: "fund",
      args: [12_500_000n],
    },
  ],
};

function review(ok, problems = []) {
  return { summary: SUMMARY, verification: { ok, problems } };
}

beforeEach(() => {
  reviewMock.mockReset();
});

describe("TxReviewDialog", () => {
  it("shows a verified contract call and only then enables signing", async () => {
    reviewMock.mockReturnValue(review(true));
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <TxReviewDialog
        open
        xdr="prepared-xdr"
        network="testnet"
        intent={{ contractId: SUMMARY.operations[0].contractId, functionName: "fund" }}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/matches the requested action/i)).toBeTruthy();
    const confirm = screen.getByRole("button", { name: /confirm and sign/i });
    expect(confirm.disabled).toBe(false);

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("blocks signing when the amount does not match", () => {
    reviewMock.mockReturnValue(
      review(false, ["The amount in the transaction does not match the amount you entered."])
    );

    render(
      <TxReviewDialog
        open
        xdr="prepared-xdr"
        network="testnet"
        intent={{ contractId: SUMMARY.operations[0].contractId, functionName: "fund", amount: 1n }}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText(/does not match the action you requested/i)).toBeTruthy();
    expect(screen.getByText(/amount in the transaction/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /confirm and sign/i }).disabled).toBe(true);
  });

  it("blocks signing for a different contract", () => {
    reviewMock.mockReturnValue(
      review(false, ["The target contract does not match the expected contract."])
    );

    render(
      <TxReviewDialog
        open
        xdr="prepared-xdr"
        network="testnet"
        intent={{ contractId: "COTHER", functionName: "fund" }}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText(/target contract does not match/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /confirm and sign/i }).disabled).toBe(true);
  });

  it("shows a friendly error and blocks signing for malformed XDR", () => {
    reviewMock.mockImplementation(() => {
      throw new Error("This transaction is not valid on testnet.");
    });

    render(
      <TxReviewDialog
        open
        xdr="not-xdr"
        network="testnet"
        intent={{ contractId: SUMMARY.operations[0].contractId, functionName: "fund" }}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/not valid on testnet/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /confirm and sign/i }).disabled).toBe(true);
  });
});
