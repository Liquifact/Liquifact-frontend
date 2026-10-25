import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import SmeActionsCard from "../components/sme/SmeActionsCard.jsx";
import { getPublicKey } from "../lib/stellar/freighter.js";
import { readSmeEscrow, submitSmeAction } from "../lib/stellar/soroban.js";

vi.mock("../lib/stellar/freighter.js", () => ({
  getPublicKey: vi.fn(),
}));
vi.mock("../lib/stellar/soroban.js", () => ({
  readSmeEscrow: vi.fn(),
  submitSmeAction: vi.fn(),
}));

const snapshot = {
  escrow: { sme_address: "GSME", status: 1, funded_amount: 1_000_000_000n },
  readiness: {
    ready_now: false,
    funded: true,
    maturity_reached: false,
    no_legal_hold: false,
  },
  protocolFeeBps: 100,
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  getPublicKey.mockResolvedValue("GSME");
  readSmeEscrow.mockResolvedValue(snapshot);
});

describe("SmeActionsCard", () => {
  it("is hidden when the connected account is not the SME", async () => {
    getPublicKey.mockResolvedValue("GOTHER");
    readSmeEscrow.mockResolvedValue({
      ...snapshot,
      escrow: { ...snapshot.escrow, sme_address: "GSME" },
    });
    render(<SmeActionsCard contractId="CESCROW" currency="USDC" />);
    await waitFor(() => expect(readSmeEscrow).toHaveBeenCalled());
    expect(screen.queryByRole("region", { name: "SME actions" })).toBeNull();
  });

  it("shows readiness reasons for unavailable settlement", async () => {
    render(<SmeActionsCard contractId="CESCROW" currency="USDC" />);
    expect(await screen.findByText("Maturity has not been reached.")).toBeTruthy();
    expect(screen.getByText("A legal hold is active.")).toBeTruthy();
  });

  it("requires confirmation, submits, and refreshes after success", async () => {
    const onRefresh = vi.fn();
    submitSmeAction.mockResolvedValue({ hash: "TX_HASH" });
    render(
      <SmeActionsCard
        contractId="CESCROW"
        currency="USDC"
        onRefresh={onRefresh}
      />,
    );
    const withdraw = await screen.findByRole("button", { name: "Withdraw liquidity" });
    expect(withdraw.disabled).toBe(false);
    fireEvent.click(withdraw);
    expect(submitSmeAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and sign" }));
    await screen.findByText("Transaction confirmed: TX_HASH");
    expect(submitSmeAction).toHaveBeenCalledWith({
      contractId: "CESCROW",
      source: "GSME",
      method: "withdraw",
    });
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(readSmeEscrow).toHaveBeenCalledTimes(2);
  });

  it("shows wallet rejection and leaves the action available to retry", async () => {
    submitSmeAction.mockRejectedValue(new Error("User rejected the request."));
    render(<SmeActionsCard contractId="CESCROW" currency="USDC" />);
    fireEvent.click(await screen.findByRole("button", { name: "Withdraw liquidity" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm and sign" }));
    expect(await screen.findByText("User rejected the request.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm and sign" }).disabled).toBe(false);
  });
});
