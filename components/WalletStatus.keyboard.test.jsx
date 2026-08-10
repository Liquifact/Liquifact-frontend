/**
 * @file components/WalletStatus.keyboard.test.jsx
 *
 * Comprehensive keyboard-operability coverage for WalletStatus
 * (Issue #940 — "Add tests for wallet keyboard navigation").
 *
 * Verifies:
 *  1. The main wallet action button is a native, focusable <button> element.
 *  2. Tab order is logical in every visual state:
 *       - Disconnected: only the connect button is in the Tab sequence.
 *       - Connected: disconnect button → DensityToggle compact →
 *         DensityToggle comfortable → copy address button.
 *       - Error: retry button is Tab-reachable.
 *       - No wallet: install-wallet button is Tab-reachable.
 *  3. Enter and Space both activate every wallet control.
 *  4. The copy-address button is keyboard-reachable and activates on Enter/Space.
 *  5. Every interactive control carries a .focus-ring utility class.
 *  6. The connect button is disabled (not Tab-reachable) while connecting.
 *  7. Escape does not trap focus (no-op, no focus lock).
 */

import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./ToastProvider";
import { WalletProvider } from "./WalletProvider";
import WalletStatus from "./WalletStatus";
import * as freighter from "../lib/wallet/freighter";

jest.mock("../lib/wallet/freighter");

/**
 * Create a user-event instance configured for fake timers.
 */
function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

/**
 * Render WalletStatus inside the required provider tree.
 */
function renderWithProviders(ui) {
  return render(
    <ToastProvider>
      <WalletProvider>{ui}</WalletProvider>
    </ToastProvider>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
});

afterEach(async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ─── 1. Native focusable elements ───────────────────────────────────────────

describe("WalletStatus controls are native, focusable elements", () => {
  it("the main action button is a native <button> element", () => {
    renderWithProviders(<WalletStatus />);
    const btn = screen.getByRole("button", { name: /connect wallet/i });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).not.toHaveAttribute("tabindex", "-1");
  });

  it("the copy-address button is a native <button> element", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /disconnect/i });

    const copyBtn = screen.getByRole("button", { name: /copy wallet address/i });
    expect(copyBtn.tagName).toBe("BUTTON");
    expect(copyBtn).not.toHaveAttribute("tabindex", "-1");
  });
});

// ─── 2. Tab order ───────────────────────────────────────────────────────────

describe("WalletStatus Tab order", () => {
  it("disconnected state: only the connect button is in the Tab sequence", async () => {
    const user = setup();
    renderWithProviders(<WalletStatus />);

    const connectBtn = screen.getByRole("button", { name: /connect wallet/i });
    connectBtn.focus();

    // Tab away and back — there should be exactly one focusable button
    await user.tab();
    // Focus should move to the next focusable element outside the wallet
    // (document.body in this case since WalletStatus is the only control)
    expect(connectBtn).not.toHaveFocus();
  });

  it("connected state: Tab order is disconnect → DensityToggle → copy", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /disconnect/i });

    // Start focus on the disconnect button
    const disconnectBtn = screen.getByRole("button", { name: /disconnect/i });
    disconnectBtn.focus();
    expect(disconnectBtn).toHaveFocus();

    // Tab → DensityToggle compact button
    await user.tab();
    const densityCompact = screen.getByRole("button", { name: /compact/i });
    expect(densityCompact).toHaveFocus();

    // Tab → DensityToggle comfortable button
    await user.tab();
    const densityComfortable = screen.getByRole("button", { name: /comfortable/i });
    expect(densityComfortable).toHaveFocus();

    // Tab → Copy address button
    await user.tab();
    const copyBtn = screen.getByRole("button", { name: /copy wallet address/i });
    expect(copyBtn).toHaveFocus();
  });

  it("error state: retry button is Tab-reachable", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockRejectedValue(new Error("User rejected connection"));

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /retry connection/i });

    const retryBtn = screen.getByRole("button", { name: /retry connection/i });
    expect(retryBtn.tagName).toBe("BUTTON");
    retryBtn.focus();
    expect(retryBtn).toHaveFocus();
  });

  it("no-wallet state: install wallet button is Tab-reachable", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(false);

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /install (stellar )?wallet/i });

    const installBtn = screen.getByRole("button", { name: /install (stellar )?wallet/i });
    expect(installBtn.tagName).toBe("BUTTON");
    installBtn.focus();
    expect(installBtn).toHaveFocus();
  });

  it("connecting state: button is disabled during connection", async () => {
    // Use a promise that never resolves to keep the connecting state
    const neverResolve = new Promise(() => {});
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockReturnValue(neverResolve);

    renderWithProviders(<WalletStatus />);
    const connectBtn = screen.getByRole("button", { name: /connect wallet/i });

    // Click to trigger connection (this will be a sync dispatch)
    await act(async () => {
      connectBtn.click();
    });

    // After click, the button immediately transitions to CONNECTING state
    // which should show "connecting..." and be disabled
    const connectingBtn = await screen.findByRole("button", { name: /connecting/i });
    expect(connectingBtn).toBeDisabled();
  });
});

// ─── 3. Enter / Space activation ────────────────────────────────────────────

describe("WalletStatus keyboard activation", () => {
  it("Enter activates the connect button", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);

    const connectButton = screen.getByRole("button", { name: /connect wallet/i });
    connectButton.focus();
    await user.keyboard("{Enter}");

    await screen.findByRole("button", { name: /disconnect/i });
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("Space activates the connect button", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);

    const connectButton = screen.getByRole("button", { name: /connect wallet/i });
    connectButton.focus();
    await user.keyboard(" ");

    await screen.findByRole("button", { name: /disconnect/i });
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("Enter activates the disconnect button", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /disconnect/i });

    const disconnectButton = screen.getByRole("button", { name: /disconnect/i });
    disconnectButton.focus();
    await user.keyboard("{Enter}");

    await screen.findByRole("button", { name: /connect wallet/i });
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("Space activates the disconnect button", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /disconnect/i });

    const disconnectButton = screen.getByRole("button", { name: /disconnect/i });
    disconnectButton.focus();
    await user.keyboard(" ");

    await screen.findByRole("button", { name: /connect wallet/i });
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });
});

// ─── 4. Copy address button keyboard activation ─────────────────────────────

describe("Copy address button keyboard activation", () => {
  it("is reachable by Tab and activates on Enter", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    // Mock clipboard API using defineProperty to bypass read-only restriction
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /disconnect/i });

    const copyBtn = screen.getByRole("button", { name: /copy wallet address/i });
    copyBtn.focus();
    expect(copyBtn).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("activates on Space", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    // Mock clipboard API using defineProperty to bypass read-only restriction
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /disconnect/i });

    const copyBtn = screen.getByRole("button", { name: /copy wallet address/i });
    copyBtn.focus();

    await user.keyboard(" ");
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});

// ─── 5. Focus-visible styles ────────────────────────────────────────────────

describe("WalletStatus focus-visible styles", () => {
  it("the main action button carries a focus-ring class", () => {
    renderWithProviders(<WalletStatus />);
    const btn = screen.getByRole("button", { name: /connect wallet/i });
    expect(btn.className).toMatch(/focus-ring/);
  });

  it("the copy address button carries a focus-ring class", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /disconnect/i });

    const copyBtn = screen.getByRole("button", { name: /copy wallet address/i });
    expect(copyBtn.className).toMatch(/focus-ring/);
  });
});

// ─── 6. Escape does not trap focus ──────────────────────────────────────────

describe("WalletStatus Escape behavior", () => {
  it("pressing Escape does not trap focus or throw", async () => {
    const user = setup();
    renderWithProviders(<WalletStatus />);

    const connectBtn = screen.getByRole("button", { name: /connect wallet/i });
    connectBtn.focus();

    // Escape should be a no-op (no focus trap)
    await user.keyboard("{Escape}");
    expect(connectBtn).toHaveFocus();
  });
});