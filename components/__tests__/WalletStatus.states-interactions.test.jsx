/**
 * #531 — Wallet component states + primary interactions
 *
 * Covers loading / empty / error / success and primary click + keyboard paths.
 * Uses WalletContext overrides so each state is isolated (no async Freighter).
 * Does not change production behaviour.
 *
 * Note: WalletStatus currently renders two action buttons for non-error states
 * (layout uses flex-row-reverse). Queries use getAllByRole and assert on the
 * first matching control so tests stay stable with the dual-button markup.
 */
import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import WalletStatus from "../WalletStatus";
import { WalletContext, WALLET_STATES } from "../WalletProvider";
import { ToastProvider } from "../ToastProvider";
import { copy } from "../../app/copy/en";

function renderWithState(state, overrides = {}) {
  const connect = overrides.connect ?? jest.fn().mockResolvedValue({ outcome: "success" });
  const disconnect = overrides.disconnect ?? jest.fn();
  const contextValue = {
    state,
    walletData:
      overrides.walletData !== undefined
        ? overrides.walletData
        : state === WALLET_STATES.CONNECTED
          ? {
              address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD",
              network: "testnet",
              balance: "1,234.56 XLM",
            }
          : null,
    error: overrides.error ?? null,
    hydrating: overrides.hydrating ?? false,
    connect,
    disconnect,
  };

  const utils = render(
    <ToastProvider>
      <WalletContext.Provider value={contextValue}>
        <WalletStatus />
      </WalletContext.Provider>
    </ToastProvider>
  );

  return { ...utils, connect, disconnect, contextValue };
}

function primaryActionButtons(name) {
  return screen.getAllByRole("button", { name });
}

describe("WalletStatus — loading (hydrating)", () => {
  it("renders WalletSkeleton while hydrating and hides action buttons", () => {
    renderWithState(WALLET_STATES.DISCONNECTED, { hydrating: true });

    expect(screen.getByTestId("wallet-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("wallet-skeleton")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button", { name: /connect wallet/i })).not.toBeInTheDocument();
  });

  it("loading skeleton is exclusive — no connected address or error alert", () => {
    renderWithState(WALLET_STATES.CONNECTED, { hydrating: true });

    expect(screen.getByTestId("wallet-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/GABC/i)).not.toBeInTheDocument();
  });
});

describe("WalletStatus — empty / disconnected state", () => {
  it("shows Connect Wallet with accessible name and empty helper", () => {
    renderWithState(WALLET_STATES.DISCONNECTED);

    const buttons = primaryActionButtons(/connect wallet/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(buttons[0]).toHaveAttribute("aria-label", copy.wallet.connectButton);
    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[0]).toHaveAttribute("aria-busy", "false");

    const helper = document.getElementById("wallet-helper-text");
    expect(helper).toBeTruthy();
    expect(helper).toHaveTextContent(copy.wallet.helperDisconnected);
    expect(helper).toHaveAttribute("role", "status");
  });

  it("sr-only status announces no wallet connected", () => {
    renderWithState(WALLET_STATES.DISCONNECTED);
    expect(screen.getByText(/No wallet connected\./i)).toBeInTheDocument();
  });

  it("primary interaction: click Connect calls connect()", async () => {
    const user = userEvent.setup();
    const { connect } = renderWithState(WALLET_STATES.DISCONNECTED);

    await user.click(primaryActionButtons(/connect wallet/i)[0]);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("keyboard interaction: Enter on Connect triggers connect()", async () => {
    const user = userEvent.setup();
    const { connect } = renderWithState(WALLET_STATES.DISCONNECTED);
    const btn = primaryActionButtons(/connect wallet/i)[0];

    btn.focus();
    expect(btn).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(connect).toHaveBeenCalled();
  });
});

describe("WalletStatus — loading / connecting state", () => {
  it("shows Connecting control, aria-busy, and disabled interaction", () => {
    renderWithState(WALLET_STATES.CONNECTING);

    const buttons = primaryActionButtons(/connecting/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(buttons[0]).toHaveAttribute("aria-busy", "true");
    expect(buttons[0]).toBeDisabled();
    // Visible status + sr-only both mention connecting — assert at least one
    expect(screen.getAllByText(/Connecting wallet/i).length).toBeGreaterThanOrEqual(1);
  });

  it("connecting is exclusive of error alert and connected address", () => {
    renderWithState(WALLET_STATES.CONNECTING);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/1,234\.56 XLM/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /disconnect/i })).not.toBeInTheDocument();
  });

  it("click while connecting does not call connect again (disabled)", async () => {
    const user = userEvent.setup();
    const { connect } = renderWithState(WALLET_STATES.CONNECTING);

    const btn = primaryActionButtons(/connecting/i)[0];
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("WalletStatus — success / connected state", () => {
  it("shows Disconnect, address, and balance", () => {
    renderWithState(WALLET_STATES.CONNECTED);

    const buttons = primaryActionButtons(/disconnect/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(buttons[0]).toHaveAttribute("aria-label", copy.wallet.disconnectButton);
    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[0]).toHaveAttribute("aria-busy", "false");

    expect(
      screen.getByText("GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD")
    ).toBeInTheDocument();
    expect(screen.getByText("1,234.56 XLM")).toBeInTheDocument();
  });

  it("sr-only status announces connected wallet", () => {
    renderWithState(WALLET_STATES.CONNECTED);
    expect(screen.getByText(/Wallet connected\./i)).toBeInTheDocument();
  });

  it("primary interaction: click Disconnect calls disconnect()", async () => {
    const user = userEvent.setup();
    const { disconnect } = renderWithState(WALLET_STATES.CONNECTED);

    await user.click(primaryActionButtons(/disconnect/i)[0]);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("keyboard: Space on Disconnect triggers disconnect()", async () => {
    const user = userEvent.setup();
    const { disconnect } = renderWithState(WALLET_STATES.CONNECTED);
    const btn = primaryActionButtons(/disconnect/i)[0];

    btn.focus();
    await user.keyboard(" ");
    expect(disconnect).toHaveBeenCalled();
  });
});

describe("WalletStatus — error state", () => {
  it("shows error helper, alert role, and retry controls", () => {
    renderWithState(WALLET_STATES.ERROR, { error: "User rejected connection" });

    // Visible alert + sr-only alert both present
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/User rejected connection/i, { selector: "#wallet-helper-text" })
    ).toBeInTheDocument();

    // Primary retry uses copy.wallet.retryButton aria-label; inline "Try again" also present
    expect(
      screen.getByRole("button", { name: copy.wallet.retryButton })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try connecting your wallet again/i })
    ).toBeInTheDocument();
  });

  it("falls back to default helper when error is null", () => {
    renderWithState(WALLET_STATES.ERROR, { error: null });
    expect(screen.getByText(copy.wallet.helperError)).toBeInTheDocument();
  });

  it("primary interaction: retry calls connect()", async () => {
    const user = userEvent.setup();
    const { connect } = renderWithState(WALLET_STATES.ERROR, {
      error: "boom",
    });

    await user.click(screen.getByRole("button", { name: copy.wallet.retryButton }));
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("error is exclusive of connecting spinner busy and connected balance", () => {
    renderWithState(WALLET_STATES.ERROR, { error: "fail" });

    // Avoid /connecting/i — "Try connecting your wallet again" is the retry label
    expect(screen.queryByRole("button", { name: /^Connecting/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/1,234\.56 XLM/)).not.toBeInTheDocument();
    const retries = screen.getAllByRole("button", { name: copy.wallet.retryButton });
    expect(retries[0]).toHaveAttribute("aria-busy", "false");
  });
});

describe("WalletStatus — wrong network + no wallet (edge interactions)", () => {
  it("WRONG_NETWORK shows switch control and alert, click calls connect()", async () => {
    const user = userEvent.setup();
    const { connect } = renderWithState(WALLET_STATES.WRONG_NETWORK, {
      error: copy.wallet.helperWrongNetwork,
    });

    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
    const btn = screen.getByRole("button", { name: copy.wallet.switchNetworkButton });
    await user.click(btn);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("NO_WALLET shows install control and opens https install URL", async () => {
    const user = userEvent.setup();
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
    renderWithState(WALLET_STATES.NO_WALLET);

    const btn = primaryActionButtons(new RegExp(copy.wallet.installWalletButton, "i"))[0];
    expect(btn).toHaveAttribute("aria-label", copy.wallet.installWalletButton);
    await user.click(btn);
    expect(openSpy).toHaveBeenCalledWith(
      copy.wallet.installWalletUrl,
      "_blank",
      "noopener,noreferrer"
    );
    openSpy.mockRestore();
  });
});

describe("WalletStatus — state exclusivity matrix", () => {
  it.each([
    [WALLET_STATES.DISCONNECTED, /connect wallet/i],
    [WALLET_STATES.CONNECTING, /connecting/i],
    [WALLET_STATES.CONNECTED, /disconnect/i],
    [WALLET_STATES.ERROR, new RegExp(copy.wallet.retryButton, "i")],
  ])("%s exposes the expected primary control and not the others", (state, name) => {
    renderWithState(state, state === WALLET_STATES.ERROR ? { error: "x" } : {});

    expect(screen.getAllByRole("button", { name }).length).toBeGreaterThanOrEqual(1);

    if (state !== WALLET_STATES.DISCONNECTED) {
      expect(screen.queryByRole("button", { name: /^Connect Wallet$/i })).toBeNull();
    }
    if (state !== WALLET_STATES.CONNECTED) {
      expect(screen.queryByRole("button", { name: /^Disconnect$/i })).toBeNull();
    }
  });
});
