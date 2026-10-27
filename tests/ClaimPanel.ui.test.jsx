import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ClaimPanel from "../components/invest/ClaimPanel.jsx";

const INVESTOR = "GINVESTOR";
const NOW = 1_800_000_000;

const settled = (overrides = {}) => ({
  status: 2,
  amount: 125_000_000n,
  claimed: false,
  unlockAt: 0,
  legalHold: false,
  paused: false,
  ...overrides,
});

function renderPanel({ state = settled(), submitClaim = vi.fn(), loadState } = {}) {
  const load = loadState ?? vi.fn().mockResolvedValue(state);
  render(
    <ClaimPanel
      investorAddress={INVESTOR}
      currency="USDC"
      loadState={load}
      submitClaim={submitClaim}
      now={() => NOW}
    />,
  );
  return { load, submitClaim };
}

/** Matches a paragraph by its full text, even when parts are wrapped in <strong>/<span>. */
const paragraph = (pattern) => (_content, element) =>
  element?.tagName === "P" && pattern.test(element.textContent ?? "");

const claimButton = () => screen.queryByRole("button", { name: /claim payout/i });

describe("ClaimPanel", () => {
  it.each([
    ["claimable", settled(), /Claimable now:\s*12\.5 USDC/],
    ["claimed", settled({ claimed: true, amount: 0n }), /Already claimed/],
    ["nothing", settled({ amount: 0n }), /Nothing to claim/],
    ["not-settled", settled({ status: 1 }), /has not settled yet/],
    ["blocked (legal hold)", settled({ legalHold: true }), /legal hold/i],
    ["blocked (paused)", settled({ paused: true }), /paused/i],
    ["locked", settled({ unlockAt: NOW + 90_061 }), /lock ends in\s*1d 1h 1m/],
  ])("renders the %s copy", async (_kind, state, copy) => {
    renderPanel({ state });
    expect(await screen.findByText(paragraph(copy))).toBeInTheDocument();
  });

  it("shows the Claim payout button only when claimable", async () => {
    for (const state of [
      settled({ claimed: true }),
      settled({ amount: 0n }),
      settled({ status: 0 }),
      settled({ paused: true }),
      settled({ unlockAt: NOW + 10 }),
    ]) {
      const { unmount } = render(
        <ClaimPanel investorAddress={INVESTOR} loadState={async () => state} now={() => NOW} />,
      );
      await screen.findByRole("heading", { name: "Your payout" });
      expect(claimButton()).toBeNull();
      unmount();
    }
    renderPanel();
    expect(await screen.findByRole("button", { name: "Claim payout" })).toBeEnabled();
  });

  it("claims with the connected address, prevents double submission, then shows Already claimed", async () => {
    let finish;
    const submitClaim = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    const loadState = vi
      .fn()
      .mockResolvedValueOnce(settled())
      .mockResolvedValue(settled({ claimed: true, amount: 0n }));
    renderPanel({ submitClaim, loadState });

    const button = await screen.findByRole("button", { name: "Claim payout" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(submitClaim).toHaveBeenCalledTimes(1);
    expect(submitClaim.mock.calls[0][0]).toBe(INVESTOR);
    expect(screen.getByRole("button", { name: "Claiming…" })).toBeDisabled();

    await act(async () => finish({ hash: "abc123" }));

    expect(await screen.findByText(/Already claimed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View transaction: abc123/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/tx/abc123"),
    );
    expect(loadState).toHaveBeenCalledTimes(2);
  });

  it("returns to idle without an error when the user rejects the signature", async () => {
    const cancelled = Object.assign(new Error("Transaction cancelled by user"), { userCancelled: true });
    const submitClaim = vi.fn().mockRejectedValue(cancelled);
    renderPanel({ submitClaim });

    await userEvent.click(await screen.findByRole("button", { name: "Claim payout" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Claim payout" })).toBeEnabled());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explains a contract rejection", async () => {
    const failure = Object.assign(new Error("Simulation failed"), { simulationError: "Error(Contract, #128)" });
    renderPanel({ submitClaim: vi.fn().mockRejectedValue(failure) });

    await userEvent.click(await screen.findByRole("button", { name: "Claim payout" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("commitment lock has not expired");
  });

  it("is reachable and operable from the keyboard", async () => {
    const submitClaim = vi.fn().mockResolvedValue({ hash: "h" });
    renderPanel({ submitClaim });
    const button = await screen.findByRole("button", { name: "Claim payout" });

    await userEvent.tab();
    expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(submitClaim).toHaveBeenCalledTimes(1);
  });

  it("announces async status in a polite live region", async () => {
    renderPanel();
    await screen.findByRole("button", { name: "Claim payout" });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("asks a disconnected user to connect their wallet", () => {
    render(<ClaimPanel investorAddress={null} loadState={vi.fn()} />);
    expect(screen.getByText("Connect your wallet to see your payout.")).toBeInTheDocument();
  });
});
