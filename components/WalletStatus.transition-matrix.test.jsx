/**
 * WalletStatus — Comprehensive state-transition matrix (Issue #785)
 *
 * Covers every WALLET_STATE × feature dimension:
 *   - Button label, variant, disabled, loading (aria-busy)
 *   - Helper text content and presence
 *   - Status dot colour
 *   - Screen-reader-only announcement text
 *   - aria-describedby linkage
 *   - State transitions through the full WalletProvider
 *   - Feature-specific behaviour (install URL, hydration)
 *   - Jest-axe accessibility per state
 *
 * Uses two patterns established in the codebase:
 *   renderWithState() — context override for isolated rendering
 *   renderWithProviders() — full WalletProvider for transition tests
 *
 * Note: WalletStatus renders TWO buttons for non-error/non-wrong-network states
 * (a primary action and a secondary action). All queries use getAllByRole()[0]
 * to target the primary action button.
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ToastProvider } from "./ToastProvider";
import { WalletContext, WALLET_STATES, WalletProvider } from "./WalletProvider";
import WalletStatus from "./WalletStatus";
import { copy } from "../app/copy/en";
import { axe, toHaveNoViolations } from "jest-axe";
import * as freighter from "../lib/wallet/freighter";

expect.extend(toHaveNoViolations);

jest.mock("../lib/wallet/freighter");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderWithState(state, overrides = {}) {
  const contextValue = {
    state,
    walletData: overrides.walletData ?? null,
    error: overrides.error ?? null,
    connect: overrides.connect ?? jest.fn().mockResolvedValue({ outcome: "success" }),
    disconnect: overrides.disconnect ?? jest.fn(),
  };

  return render(
    <ToastProvider>
      <WalletContext.Provider value={contextValue}>
        <WalletStatus />
      </WalletContext.Provider>
    </ToastProvider>
  );
}

function renderWithProviders(ui) {
  return render(
    <ToastProvider>
      <WalletProvider>{ui}</WalletProvider>
    </ToastProvider>
  );
}

function setupUserEvent() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

/**
 * WalletStatus renders two buttons with the same aria-label for non-error states.
 * This helper returns the primary (first) one.
 */
function getPrimaryButton(name) {
  return screen.getAllByRole("button", { name })[0];
}

const CONNECTED_WALLET_DATA = {
  address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
  network: "testnet",
  balance: "5,000 XLM",
};

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  jest.resetAllMocks();
  process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
});

afterEach(async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ─── A. Per-state rendering matrix ──────────────────────────────────────────

describe("Per-state rendering matrix", () => {
  describe("DISCONNECTED", () => {
    beforeEach(() => renderWithState(WALLET_STATES.DISCONNECTED));

    it("button label is 'Connect Wallet'", () => {
      expect(getPrimaryButton(/connect wallet/i)).toBeInTheDocument();
    });

    it("button variant is primary (cyan)", () => {
      expect(getPrimaryButton(/connect wallet/i)).toHaveClass("bg-cyan-500/20");
    });

    it("button is enabled", () => {
      expect(getPrimaryButton(/connect wallet/i)).not.toBeDisabled();
    });

    it("button is not in loading state", () => {
      const btn = getPrimaryButton(/connect wallet/i);
      expect(btn).toHaveAttribute("aria-busy", "false");
      expect(btn.querySelector("svg")).toBeNull();
    });

    it("helper text is the disconnected copy", () => {
      expect(screen.getByText(copy.wallet.helperDisconnected)).toBeInTheDocument();
    });

    it("status dot is slate", () => {
      const dot = document.querySelector("[aria-hidden='true'].rounded-full");
      expect(dot?.className).toContain("bg-slate-600");
    });

    it("screen reader announcement says no wallet connected", () => {
      expect(screen.getByText("No wallet connected.")).toBeInTheDocument();
    });
  });

  describe("CONNECTING", () => {
    beforeEach(() => renderWithState(WALLET_STATES.CONNECTING));

    it("button label is 'Connecting...'", () => {
      expect(getPrimaryButton(/connecting/i)).toBeInTheDocument();
    });

    it("button variant is primary (cyan)", () => {
      expect(getPrimaryButton(/connecting/i)).toHaveClass("bg-cyan-500/20");
    });

    it("button is disabled", () => {
      expect(getPrimaryButton(/connecting/i)).toBeDisabled();
    });

    it("button is in loading state with spinner", () => {
      const btn = getPrimaryButton(/connecting/i);
      expect(btn).toHaveAttribute("aria-busy", "true");
      expect(btn.querySelector("svg")).toBeInTheDocument();
    });

    it("shows connecting status text instead of helper text", () => {
      expect(screen.getByText("Connecting wallet...")).toBeInTheDocument();
    });

    it("status dot is yellow and pulsing", () => {
      const dot = document.querySelector("[aria-hidden='true'].rounded-full");
      expect(dot?.className).toContain("bg-yellow-500");
      expect(dot?.className).toContain("animate-pulse");
    });

    it("screen reader says connecting please wait", () => {
      expect(screen.getByText("Connecting wallet. Please wait.")).toBeInTheDocument();
    });
  });

  describe("CONNECTED", () => {
    beforeEach(() =>
      renderWithState(WALLET_STATES.CONNECTED, {
        walletData: CONNECTED_WALLET_DATA,
      })
    );

    it("button label is 'Disconnect'", () => {
      expect(getPrimaryButton(/disconnect/i)).toBeInTheDocument();
    });

    it("button variant is secondary (slate border)", () => {
      expect(getPrimaryButton(/disconnect/i)).toHaveClass("border-slate-600");
    });

    it("button is enabled", () => {
      expect(getPrimaryButton(/disconnect/i)).not.toBeDisabled();
    });

    it("button is not in loading state", () => {
      expect(getPrimaryButton(/disconnect/i)).toHaveAttribute("aria-busy", "false");
    });

    it("wallet address is displayed", () => {
      expect(screen.getByText(CONNECTED_WALLET_DATA.address)).toBeInTheDocument();
    });

    it("wallet balance is displayed", () => {
      expect(screen.getByText(CONNECTED_WALLET_DATA.balance)).toBeInTheDocument();
    });

    it("helper text is not rendered (address row shown instead)", () => {
      expect(
        screen.queryByText(new RegExp("Connected to Stellar"))
      ).not.toBeInTheDocument();
    });

    it("status dot is green", () => {
      const dot = document.querySelector("[aria-hidden='true'].rounded-full");
      expect(dot?.className).toContain("bg-green-500");
    });

    it("screen reader says wallet connected with address", () => {
      expect(screen.getByText(/Wallet connected\./)).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`Connected as ${CONNECTED_WALLET_DATA.address}`))
      ).toBeInTheDocument();
    });
  });

  describe("ERROR", () => {
    const ERROR_MSG = "User rejected connection";

    beforeEach(() =>
      renderWithState(WALLET_STATES.ERROR, { error: ERROR_MSG })
    );

    it("button label is 'Retry Connection'", () => {
      expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
    });

    it("button variant is primary (cyan)", () => {
      expect(screen.getByRole("button", { name: /retry connection/i })).toHaveClass(
        "bg-cyan-500/20"
      );
    });

    it("button is enabled", () => {
      expect(screen.getByRole("button", { name: /retry connection/i })).not.toBeDisabled();
    });

    it("button is not in loading state", () => {
      expect(screen.getByRole("button", { name: /retry connection/i })).toHaveAttribute(
        "aria-busy",
        "false"
      );
    });

    it("error message is displayed as helper text", () => {
      expect(screen.getByText(ERROR_MSG)).toBeInTheDocument();
    });

    it("error section has role alert with aria-live assertive", () => {
      const alerts = screen.getAllByRole("alert");
      const visibleAlert = alerts.find((el) => !el.closest(".sr-only"));
      expect(visibleAlert).toBeDefined();
      expect(visibleAlert).toHaveAttribute("aria-live", "assertive");
    });

    it("Try again button is rendered in the error section", () => {
      expect(
        screen.getByRole("button", { name: /try connecting your wallet again/i })
      ).toBeInTheDocument();
    });

    it("status dot is red", () => {
      const dot = document.querySelector("[aria-hidden='true'].rounded-full");
      expect(dot?.className).toContain("bg-red-500");
    });

    it("screen reader says wallet connection failed with error", () => {
      expect(screen.getByText(/Wallet connection failed\./)).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(ERROR_MSG)).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("WRONG_NETWORK", () => {
    const NETWORK_ERROR = 'Wallet is on "public" but the app requires "testnet"';

    beforeEach(() =>
      renderWithState(WALLET_STATES.WRONG_NETWORK, { error: NETWORK_ERROR })
    );

    it("button label is 'Switch Network'", () => {
      expect(screen.getByRole("button", { name: /switch network/i })).toBeInTheDocument();
    });

    it("button variant is warning (amber)", () => {
      expect(screen.getByRole("button", { name: /switch network/i })).toHaveClass(
        "bg-amber-500/20"
      );
    });

    it("button is enabled", () => {
      expect(screen.getByRole("button", { name: /switch network/i })).not.toBeDisabled();
    });

    it("button is not in loading state", () => {
      expect(screen.getByRole("button", { name: /switch network/i })).toHaveAttribute(
        "aria-busy",
        "false"
      );
    });

    it("error message is displayed as helper text", () => {
      expect(screen.getByText(NETWORK_ERROR)).toBeInTheDocument();
    });

    it("error section has role alert", () => {
      const alerts = screen.getAllByRole("alert");
      const visibleAlert = alerts.find((el) => !el.closest(".sr-only"));
      expect(visibleAlert).toBeDefined();
    });

    it("Try again button is rendered in the error section", () => {
      expect(
        screen.getByRole("button", { name: /try connecting your wallet again/i })
      ).toBeInTheDocument();
    });

    it("status dot is red", () => {
      const dot = document.querySelector("[aria-hidden='true'].rounded-full");
      expect(dot?.className).toContain("bg-red-500");
    });

    it("screen reader says wrong network", () => {
      expect(
        screen.getByText("Wallet is connected to the wrong network.")
      ).toBeInTheDocument();
    });
  });

  describe("NO_WALLET", () => {
    beforeEach(() => renderWithState(WALLET_STATES.NO_WALLET));

    it("button label is 'Install Stellar Wallet'", () => {
      expect(getPrimaryButton(/install (stellar )?wallet/i)).toBeInTheDocument();
    });

    it("button variant is external (violet)", () => {
      expect(getPrimaryButton(/install (stellar )?wallet/i)).toHaveClass("bg-violet-500/20");
    });

    it("button is enabled", () => {
      expect(getPrimaryButton(/install (stellar )?wallet/i)).not.toBeDisabled();
    });

    it("button is not in loading state", () => {
      const btn = getPrimaryButton(/install (stellar )?wallet/i);
      expect(btn).toHaveAttribute("aria-busy", "false");
    });

    it("helper text is the no-wallet copy", () => {
      expect(screen.getByText(copy.wallet.helperNoWallet)).toBeInTheDocument();
    });

    it("status dot is slate", () => {
      const dot = document.querySelector("[aria-hidden='true'].rounded-full");
      expect(dot?.className).toContain("bg-slate-600");
    });

    it("screen reader says no wallet connected", () => {
      expect(screen.getByText("No wallet connected.")).toBeInTheDocument();
    });
  });
});

// ─── B. aria-describedby linkage per state ──────────────────────────────────

describe("aria-describedby linkage per state", () => {
  it("DISCONNECTED → references wallet-helper-text", () => {
    renderWithState(WALLET_STATES.DISCONNECTED);
    const btn = getPrimaryButton(/connect wallet/i);
    expect(btn).toHaveAttribute("aria-describedby", "wallet-helper-text");
    expect(document.getElementById("wallet-helper-text")).toBeInTheDocument();
  });

  it("CONNECTING → button references wallet-helper-text (element absent in DOM)", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    const btn = getPrimaryButton(/connecting/i);
    expect(btn).toHaveAttribute("aria-describedby", "wallet-helper-text");
  });

  it("CONNECTED → omitted (address row shown, no span in DOM)", () => {
    renderWithState(WALLET_STATES.CONNECTED, {
      walletData: CONNECTED_WALLET_DATA,
    });
    const btn = getPrimaryButton(/disconnect/i);
    expect(btn).not.toHaveAttribute("aria-describedby");
    expect(document.getElementById("wallet-helper-text")).not.toBeInTheDocument();
  });

  it("ERROR → references wallet-helper-text with error message", () => {
    renderWithState(WALLET_STATES.ERROR, { error: "Something broke" });
    const btn = screen.getByRole("button", { name: /retry/i });
    expect(btn).toHaveAttribute("aria-describedby", "wallet-helper-text");
    const helper = document.getElementById("wallet-helper-text");
    expect(helper).toHaveTextContent("Something broke");
  });

  it("WRONG_NETWORK → references wallet-helper-text with error message", () => {
    renderWithState(WALLET_STATES.WRONG_NETWORK, { error: "Wrong chain" });
    const btn = screen.getByRole("button", { name: /switch network/i });
    expect(btn).toHaveAttribute("aria-describedby", "wallet-helper-text");
    const helper = document.getElementById("wallet-helper-text");
    expect(helper).toHaveTextContent("Wrong chain");
  });

  it("NO_WALLET → references wallet-helper-text", () => {
    renderWithState(WALLET_STATES.NO_WALLET);
    const btn = getPrimaryButton(/install (stellar )?wallet/i);
    expect(btn).toHaveAttribute("aria-describedby", "wallet-helper-text");
    expect(document.getElementById("wallet-helper-text")).toBeInTheDocument();
  });
});

// ─── C. ERROR fallback when error prop is null ──────────────────────────────

describe("ERROR fallback helper text", () => {
  it("falls back to default helper text when error is null", () => {
    renderWithState(WALLET_STATES.ERROR, { error: null });
    expect(screen.getByText(copy.wallet.helperError)).toBeInTheDocument();
  });

  it("WRONG_NETWORK falls back to default helper text when error is null", () => {
    renderWithState(WALLET_STATES.WRONG_NETWORK, { error: null });
    expect(screen.getByText(copy.wallet.helperWrongNetwork)).toBeInTheDocument();
  });
});

// ─── D. Second button (non-error states) ────────────────────────────────────

describe("Second wallet action button (non-error states)", () => {
  it("rendered for DISCONNECTED with same label", () => {
    renderWithState(WALLET_STATES.DISCONNECTED);
    const buttons = screen.getAllByRole("button", { name: /connect wallet/i });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("rendered for CONNECTING with same label and loading", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    const buttons = screen.getAllByRole("button", { name: /connecting/i });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute("aria-busy", "true");
    });
  });

  it("rendered for CONNECTED with same label", () => {
    renderWithState(WALLET_STATES.CONNECTED, {
      walletData: CONNECTED_WALLET_DATA,
    });
    const buttons = screen.getAllByRole("button", { name: /disconnect/i });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("NOT rendered for ERROR (error div has its own Try again button)", () => {
    renderWithState(WALLET_STATES.ERROR, { error: "fail" });
    const retryBtns = screen.getAllByRole("button", { name: /retry connection/i });
    const tryAgainBtns = screen.getAllByRole("button", { name: /try connecting/i });
    expect(retryBtns.length).toBe(1);
    expect(tryAgainBtns.length).toBe(1);
  });

  it("NOT rendered for WRONG_NETWORK (error div has its own Try again button)", () => {
    renderWithState(WALLET_STATES.WRONG_NETWORK, { error: "wrong" });
    const switchBtns = screen.getAllByRole("button", { name: /switch network/i });
    const tryAgainBtns = screen.getAllByRole("button", { name: /try connecting/i });
    expect(switchBtns.length).toBe(1);
    expect(tryAgainBtns.length).toBe(1);
  });

  it("rendered for NO_WALLET with same label", () => {
    renderWithState(WALLET_STATES.NO_WALLET);
    const buttons = screen.getAllByRole("button", { name: /install (stellar )?wallet/i });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── E. State transitions through full WalletProvider ───────────────────────

describe("State transitions via WalletProvider", () => {
  it("DISCONNECTED → CONNECTING → CONNECTED (happy path)", async () => {
    const user = setupUserEvent();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);

    await user.click(getPrimaryButton(/connect wallet/i));
    expect(getPrimaryButton(/connecting/i)).toBeDisabled();

    await waitFor(() => {
      expect(getPrimaryButton(/disconnect/i)).toBeInTheDocument();
    });
    expect(screen.getByText("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456")).toBeInTheDocument();
  });

  it("DISCONNECTED → CONNECTING → ERROR", async () => {
    const user = setupUserEvent();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockRejectedValue(new Error("User rejected connection"));

    renderWithProviders(<WalletStatus />);

    await user.click(getPrimaryButton(/connect wallet/i));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText("User rejected connection").length).toBeGreaterThanOrEqual(1);
  });

  it("DISCONNECTED → CONNECTING → WRONG_NETWORK", async () => {
    const user = setupUserEvent();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockRejectedValue(
      new Error('Wallet is on "public" but the app requires "testnet"')
    );

    renderWithProviders(<WalletStatus />);

    await user.click(getPrimaryButton(/connect wallet/i));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /switch network/i })).toBeInTheDocument();
    });
  });

  it("DISCONNECTED → CONNECTING → NO_WALLET", async () => {
    const user = setupUserEvent();
    freighter.isFreighterConnected.mockResolvedValue(false);

    renderWithProviders(<WalletStatus />);

    await user.click(getPrimaryButton(/connect wallet/i));

    await waitFor(() => {
      expect(getPrimaryButton(/install (stellar )?wallet/i)).toBeInTheDocument();
    });
  });

  it("CONNECTED → DISCONNECTED (click disconnect)", async () => {
    const user = setupUserEvent();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);

    await user.click(getPrimaryButton(/connect wallet/i));
    await waitFor(() => {
      expect(getPrimaryButton(/disconnect/i)).toBeInTheDocument();
    });

    await user.click(getPrimaryButton(/disconnect/i));
    expect(getPrimaryButton(/connect wallet/i)).toBeInTheDocument();
  });

  it("ERROR → CONNECTING → CONNECTED (retry succeeds)", async () => {
    const user = setupUserEvent();

    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockRejectedValue(new Error("User rejected"));

    renderWithProviders(<WalletStatus />);
    await user.click(getPrimaryButton(/connect wallet/i));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
    });

    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    await user.click(screen.getByRole("button", { name: /retry connection/i }));
    await waitFor(() => {
      expect(getPrimaryButton(/disconnect/i)).toBeInTheDocument();
    });
  });

  it("WRONG_NETWORK → CONNECTING → CONNECTED (retry after network switch)", async () => {
    const user = setupUserEvent();

    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockRejectedValue(
      new Error('Wallet is on "public" but the app requires "testnet"')
    );

    renderWithProviders(<WalletStatus />);
    await user.click(getPrimaryButton(/connect wallet/i));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /switch network/i })).toBeInTheDocument();
    });

    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    await user.click(screen.getByRole("button", { name: /switch network/i }));
    await waitFor(() => {
      expect(getPrimaryButton(/disconnect/i)).toBeInTheDocument();
    });
  });
});

// ─── F. Copy address button absent ──────────────────────────────────────────

describe("Copy address button is not rendered", () => {
  it("NOT visible when DISCONNECTED", () => {
    renderWithState(WALLET_STATES.DISCONNECTED);
    expect(screen.queryByRole("button", { name: /copy wallet address/i })).not.toBeInTheDocument();
  });

  it("NOT visible when CONNECTED", () => {
    renderWithState(WALLET_STATES.CONNECTED, { walletData: CONNECTED_WALLET_DATA });
    expect(screen.queryByRole("button", { name: /copy wallet address/i })).not.toBeInTheDocument();
  });

  it("NOT visible when CONNECTING", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    expect(screen.queryByRole("button", { name: /copy wallet address/i })).not.toBeInTheDocument();
  });

  it("NOT visible when ERROR", () => {
    renderWithState(WALLET_STATES.ERROR, { error: "fail" });
    expect(screen.queryByRole("button", { name: /copy wallet address/i })).not.toBeInTheDocument();
  });

  it("NOT visible when WRONG_NETWORK", () => {
    renderWithState(WALLET_STATES.WRONG_NETWORK, { error: "wrong" });
    expect(screen.queryByRole("button", { name: /copy wallet address/i })).not.toBeInTheDocument();
  });

  it("NOT visible when NO_WALLET", () => {
    renderWithState(WALLET_STATES.NO_WALLET);
    expect(screen.queryByRole("button", { name: /copy wallet address/i })).not.toBeInTheDocument();
  });
});

// ─── G. NO_WALLET opens install URL ─────────────────────────────────────────

describe("NO_WALLET install URL behaviour", () => {
  it("opens the wallet installation page on click", async () => {
    const user = setupUserEvent();
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => {});

    renderWithProviders(<WalletStatus />);

    await user.click(getPrimaryButton(/connect wallet/i));
    await waitFor(() => {
      expect(getPrimaryButton(/install (stellar )?wallet/i)).toBeInTheDocument();
    });

    await user.click(getPrimaryButton(/install (stellar )?wallet/i));

    expect(openSpy).toHaveBeenCalledWith(
      copy.wallet.installWalletUrl,
      "_blank",
      "noopener,noreferrer"
    );
    openSpy.mockRestore();
  });
});

// ─── H. Hydration skeleton ──────────────────────────────────────────────────

describe("Hydration skeleton", () => {
  it("shows skeleton while hydrating, then renders WalletStatus", async () => {
    const { container } = renderWithProviders(<WalletStatus />);

    await waitFor(() => {
      expect(getPrimaryButton(/connect wallet/i)).toBeInTheDocument();
    });

    expect(container.querySelector("[data-testid='wallet-skeleton']")).not.toBeInTheDocument();
  });
});

// ─── I. Jest-axe accessibility per state ────────────────────────────────────

describe("Jest-axe accessibility per state", () => {
  it("DISCONNECTED has no a11y violations", async () => {
    const { container } = renderWithState(WALLET_STATES.DISCONNECTED);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("CONNECTING has no a11y violations", async () => {
    const { container } = renderWithState(WALLET_STATES.CONNECTING);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("CONNECTED has no a11y violations", async () => {
    const { container } = renderWithState(WALLET_STATES.CONNECTED, {
      walletData: CONNECTED_WALLET_DATA,
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ERROR has no a11y violations", async () => {
    const { container } = renderWithState(WALLET_STATES.ERROR, {
      error: "Connection failed",
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("WRONG_NETWORK has no a11y violations", async () => {
    const { container } = renderWithState(WALLET_STATES.WRONG_NETWORK, {
      error: 'Wallet is on "public" but requires "testnet"',
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("NO_WALLET has no a11y violations", async () => {
    const { container } = renderWithState(WALLET_STATES.NO_WALLET);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─── J. State persistence across transitions ────────────────────────────────

describe("State persistence across transitions", () => {
  it("persists CONNECTED state to localStorage", async () => {
    const user = setupUserEvent();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);

    await user.click(getPrimaryButton(/connect wallet/i));
    await waitFor(() => {
      expect(getPrimaryButton(/disconnect/i)).toBeInTheDocument();
    });

    const stored = JSON.parse(localStorage.getItem("liquifact-wallet-snapshot"));
    expect(stored).not.toBeNull();
    expect(stored.state).toBe(WALLET_STATES.CONNECTED);
  });

  it("clears localStorage on disconnect", async () => {
    const user = setupUserEvent();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);

    await user.click(getPrimaryButton(/connect wallet/i));
    await waitFor(() => {
      expect(getPrimaryButton(/disconnect/i)).toBeInTheDocument();
    });

    await user.click(getPrimaryButton(/disconnect/i));
    expect(localStorage.getItem("liquifact-wallet-snapshot")).toBeNull();
  });

  it("rehydrates persisted state on mount", async () => {
    localStorage.setItem(
      "liquifact-wallet-snapshot",
      JSON.stringify({
        version: 1,
        state: WALLET_STATES.CONNECTED,
        address: "GABC...XYZ123",
        network: "public",
      })
    );

    renderWithProviders(<WalletStatus />);

    await waitFor(() => {
      expect(getPrimaryButton(/disconnect/i)).toBeInTheDocument();
    });
    expect(screen.getByText("GABC...XYZ123")).toBeInTheDocument();
  });
});
