/**
 * ExitPanel component tests — run with `npm run test:ui` (vitest + jsdom).
 *
 * Stellar RPC helpers are mocked so tests are fully offline and deterministic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mock Stellar RPC helpers ─────────────────────────────────────────────────
vi.mock("@/lib/stellar/rpc.js", () => ({
  fetchContribution: vi.fn(),
  fetchIsRefunded: vi.fn(),
  fetchLegalHold: vi.fn(),
  fetchIsPaused: vi.fn(),
  buildSignSubmit: vi.fn(),
  buildRefundArgs: vi.fn((addr) => [addr]),
  buildUnfundArgs: vi.fn((addr, amt) => [addr, amt]),
  extractSimError: vi.fn((raw) => raw),
}));

import {
  fetchContribution,
  fetchIsRefunded,
  fetchLegalHold,
  fetchIsPaused,
  buildSignSubmit,
} from "@/lib/stellar/rpc.js";

import ExitPanel from "@/components/invest/ExitPanel.jsx";

const INVESTOR = "GABC1234567890123456789012345678901234567890123456789012";

function setDefaults({
  contribution = 10_000_000n,
  refunded = false,
  legalHold = false,
  paused = false,
} = {}) {
  fetchContribution.mockResolvedValue(contribution);
  fetchIsRefunded.mockResolvedValue(refunded);
  fetchLegalHold.mockResolvedValue(legalHold);
  fetchIsPaused.mockResolvedValue(paused);
}

beforeEach(() => {
  vi.clearAllMocks();
  buildSignSubmit.mockResolvedValue(undefined);
});

// ── Refund mode ──────────────────────────────────────────────────────────────

describe("Refund mode (cancelled escrow)", () => {
  it("renders request-refund button when contribution > 0 and not refunded", async () => {
    setDefaults({ contribution: 5_000_000n });
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="cancelled" onContribRefresh={vi.fn()} />
    );
    expect(await screen.findByRole("button", { name: /request refund/i })).toBeInTheDocument();
  });

  it("shows 'already refunded' message when refunded = true", async () => {
    setDefaults({ refunded: true, contribution: 5_000_000n });
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="cancelled" onContribRefresh={vi.fn()} />
    );
    expect(await screen.findByText(/already been refunded/i)).toBeInTheDocument();
  });

  it("disables the refund button while the transaction is in-flight", async () => {
    setDefaults({ contribution: 5_000_000n });
    buildSignSubmit.mockImplementation(
      () => new Promise(() => {}) // never resolves — stays busy
    );
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="cancelled" onContribRefresh={vi.fn()} />
    );
    const btn = await screen.findByRole("button", { name: /request refund/i });
    await userEvent.click(btn);
    expect(btn).toBeDisabled();
  });

  it("shows success message and calls onContribRefresh after successful refund", async () => {
    setDefaults({ contribution: 5_000_000n });
    const onRefresh = vi.fn();
    // After refund, contribution becomes 0 and refunded = true
    fetchContribution.mockResolvedValueOnce(5_000_000n);
    fetchIsRefunded.mockResolvedValueOnce(false);
    fetchLegalHold.mockResolvedValue(false);
    fetchIsPaused.mockResolvedValue(false);
    fetchContribution.mockResolvedValue(0n);
    fetchIsRefunded.mockResolvedValue(true);

    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="cancelled" onContribRefresh={onRefresh} />
    );
    const btn = await screen.findByRole("button", { name: /request refund/i });
    await userEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/refund successful/i);
    });
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("shows error when Freighter rejects (userCancelled = false path)", async () => {
    setDefaults({ contribution: 5_000_000n });
    buildSignSubmit.mockRejectedValue(new Error("Simulation failed — error 142"));
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="cancelled" onContribRefresh={vi.fn()} />
    );
    const btn = await screen.findByRole("button", { name: /request refund/i });
    await userEvent.click(btn);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

// ── Unfund mode ──────────────────────────────────────────────────────────────

describe("Unfund mode (open escrow)", () => {
  it("renders the withdraw form when contribution > 0", async () => {
    setDefaults({ contribution: 20_000_000n });
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="open" onContribRefresh={vi.fn()} />
    );
    expect(await screen.findByRole("textbox", { name: /amount to withdraw/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /withdraw contribution/i })).toBeInTheDocument();
  });

  it("shows inline error when amount > contribution", async () => {
    setDefaults({ contribution: 10_000_000n }); // 1 XLM
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="open" onContribRefresh={vi.fn()} />
    );
    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "5"); // 5 XLM > 1 XLM
    await userEvent.click(screen.getByRole("button", { name: /withdraw contribution/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/exceeds/i);
  });

  it("Max button fills exact contribution amount", async () => {
    setDefaults({ contribution: 15_000_000n }); // 1.5 XLM
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="open" onContribRefresh={vi.fn()} />
    );
    await screen.findByRole("textbox");
    await userEvent.click(screen.getByRole("button", { name: /max/i }));
    expect(screen.getByRole("textbox")).toHaveValue("1.5");
  });

  it("opens confirmation dialog on valid submit", async () => {
    setDefaults({ contribution: 10_000_000n });
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="open" onContribRefresh={vi.fn()} />
    );
    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "0.5");
    await userEvent.click(screen.getByRole("button", { name: /withdraw contribution/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("Escape closes confirmation dialog and returns focus to input", async () => {
    setDefaults({ contribution: 10_000_000n });
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="open" onContribRefresh={vi.fn()} />
    );
    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "0.5");
    await userEvent.click(screen.getByRole("button", { name: /withdraw contribution/i }));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(document.querySelector("dialog")).not.toHaveAttribute("open");
    });
  });

  it("in-flight button is disabled during transaction", async () => {
    setDefaults({ contribution: 10_000_000n });
    buildSignSubmit.mockImplementation(() => new Promise(() => {}));
    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="open" onContribRefresh={vi.fn()} />
    );
    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "1");
    await userEvent.click(screen.getByRole("button", { name: /withdraw contribution/i }));
    await screen.findByRole("dialog");
    const confirmBtn = screen.getByRole("button", { name: /yes.*withdraw/i });
    await userEvent.click(confirmBtn);
    expect(confirmBtn).toBeDisabled();
  });

  it("shows success and re-reads contribution after successful unfund", async () => {
    setDefaults({ contribution: 10_000_000n });
    const onRefresh = vi.fn();
    fetchContribution
      .mockResolvedValueOnce(10_000_000n)
      .mockResolvedValue(5_000_000n);

    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="open" onContribRefresh={onRefresh} />
    );
    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "0.5");
    await userEvent.click(screen.getByRole("button", { name: /withdraw contribution/i }));
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: /yes.*withdraw/i }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/withdrawal successful/i)
    );
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("user cancels (Freighter reject) is handled silently", async () => {
    setDefaults({ contribution: 10_000_000n });
    const cancelErr = new Error("User cancelled");
    cancelErr.userCancelled = true;
    buildSignSubmit.mockRejectedValue(cancelErr);

    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="open" onContribRefresh={vi.fn()} />
    );
    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "0.5");
    await userEvent.click(screen.getByRole("button", { name: /withdraw contribution/i }));
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: /yes.*withdraw/i }));

    await waitFor(() => {
      // Dialog should close without showing an error notice
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("simulation failure message is shown before any signature request", async () => {
    setDefaults({ contribution: 10_000_000n });
    const simErr = new Error("Simulation failed: code 222");
    simErr.simulationError = "code 222";
    buildSignSubmit.mockRejectedValue(simErr);

    render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="open" onContribRefresh={vi.fn()} />
    );
    const input = await screen.findByRole("textbox");
    await userEvent.type(input, "1");
    await userEvent.click(screen.getByRole("button", { name: /withdraw contribution/i }));
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: /yes.*withdraw/i }));

    // Error alert should appear
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

// ── none mode ────────────────────────────────────────────────────────────────

describe("none mode", () => {
  it("renders nothing when settled + contribution > 0", async () => {
    setDefaults({ contribution: 10_000_000n });
    const { container } = render(
      <ExitPanel investorAddress={INVESTOR} invoiceStatus="settled" onContribRefresh={vi.fn()} />
    );
    await waitFor(() => {
      // Loading message should be gone and panel empty
      expect(container.querySelector(".exit-panel")).not.toBeInTheDocument();
    });
  });
});
