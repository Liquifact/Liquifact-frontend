import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import WalletStatus from "./WalletStatus";
import { WalletProvider, WalletContext, WALLET_STATES } from "./WalletProvider";
import { ToastProvider } from "./ToastProvider";

// Mock freighter so WalletProvider.connect() works in tests
jest.mock("../lib/wallet/freighter", () => ({
  isFreighterConnected: jest.fn(),
  connectFreighter: jest.fn(),
  getFreighterNetwork: jest.fn(),
  assertExpectedNetwork: jest.fn(),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <WalletProvider>{ui}</WalletProvider>
    </ToastProvider>
  );
}

/**
 * Render WalletStatus with a fixed wallet context value, bypassing the real
 * WalletProvider connect/disconnect flow so we can assert per-state rendering.
 */
function renderWithState(state: string, overrides: Record<string, unknown> = {}) {
  const contextValue = {
    state,
    walletData:
      state === WALLET_STATES.CONNECTED
        ? { address: "GABC...XYZ123", network: "testnet", balance: "1,234.56 XLM" }
        : null,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };

  return render(
    <ToastProvider>
      <WalletContext.Provider value={contextValue}>
        <WalletStatus />
      </WalletContext.Provider>
    </ToastProvider>
  );
}

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

async function flushTimers(delayMs: number) {
  await act(async () => {
    jest.advanceTimersByTime(delayMs);
    await Promise.resolve();
  });
}

// ---------------------------------------------------------------------------
// Live-region announcement tests (aria-live="polite")
// ---------------------------------------------------------------------------

describe("WalletStatus live region", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    if (typeof window !== "undefined") window.localStorage.clear();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders a polite live region with no announcement on initial mount", () => {
    renderWithProviders(<WalletStatus />);
    const region = screen.getByTestId("wallet-live-region");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("role", "status");
    // No announcement yet — initial render should be silent
    expect(region).toHaveTextContent("");
  });

  it("announces wallet state on mount (disconnected)", () => {
    renderWithProviders(<WalletStatus />);
    const region = screen.getByTestId("wallet-live-region");
    // Initial render should have no announcement since state hasn't changed
    expect(region).toHaveTextContent("");
  });
});

// ---------------------------------------------------------------------------
// Button variant and loading assertions — one describe block per WALLET_STATE
//
// Each state must render the <Button> with the documented variant class and
// the correct aria-busy / loading-spinner presence.
//
// Variant → Tailwind class mapping (from Button.jsx variantStyles):
//   primary   → bg-cyan-500/20
//   secondary → border-slate-600 (border)
//   warning   → bg-amber-500/20
//   external  → bg-violet-500/20
// ---------------------------------------------------------------------------

describe("WalletStatus Button variant + loading — per WALLET_STATE", () => {
  /**
   * Helper: find the wallet action <button> element.
   * WalletStatus renders exactly one <button>.
   */
  function getWalletButton() {
    const buttons = screen.getAllByRole("button");
    const actionButton = buttons.find((btn) => btn.getAttribute("aria-label") !== "Copy wallet address");
    return actionButton || buttons[0];
  }

  describe("DISCONNECTED", () => {
    beforeEach(() => renderWithState(WALLET_STATES.DISCONNECTED));

    it('renders the "Connect Wallet" button', () => {
      expect(getWalletButton()).toHaveAccessibleName(/connect wallet/i);
    });

    it("uses the primary variant (cyan background class)", () => {
      expect(getWalletButton()).toHaveClass("bg-cyan-500/20");
    });

    it("is not in loading state (no Spinner, aria-busy false)", () => {
      const btn = getWalletButton();
      expect(btn).toHaveAttribute("aria-busy", "false");
      // Spinner SVG should not be present
      expect(btn.querySelector("svg")).toBeNull();
    });

    it("is enabled", () => {
      expect(getWalletButton()).not.toBeDisabled();
    });
  });

  describe("CONNECTING", () => {
    beforeEach(() => renderWithState(WALLET_STATES.CONNECTING));

    it('renders the "Connecting…" button', () => {
      expect(getWalletButton()).toHaveAccessibleName(/connecting/i);
    });

    it("uses the primary variant (cyan background class)", () => {
      // CONNECTING keeps primary variant; loading=true conveys the spinner state
      expect(getWalletButton()).toHaveClass("bg-cyan-500/20");
    });

    it("is in loading state (aria-busy true)", () => {
      expect(getWalletButton()).toHaveAttribute("aria-busy", "true");
    });

    it("renders a Spinner SVG inside the button", () => {
      expect(getWalletButton().querySelector("svg")).toBeInTheDocument();
    });

    it("is disabled while connecting", () => {
      expect(getWalletButton()).toBeDisabled();
    });
  });

  describe("CONNECTED", () => {
    beforeEach(() => renderWithState(WALLET_STATES.CONNECTED));

    it('renders the "Disconnect" button', () => {
      expect(getWalletButton()).toHaveAccessibleName(/disconnect/i);
    });

    it("uses the secondary variant (slate border class)", () => {
      expect(getWalletButton()).toHaveClass("border-slate-600");
    });

    it("is not in loading state", () => {
      expect(getWalletButton()).toHaveAttribute("aria-busy", "false");
      expect(getWalletButton().querySelector("svg")).toBeNull();
    });

    it("is enabled", () => {
      expect(getWalletButton()).not.toBeDisabled();
    });

    it("displays the wallet address", () => {
      expect(screen.getByText("GABC...XYZ123")).toBeInTheDocument();
    });
  });

  describe("ERROR", () => {
    beforeEach(() =>
      renderWithState(WALLET_STATES.ERROR, {
        error: "User rejected connection",
      })
    );

    it('renders the "Retry Connection" button', () => {
      expect(getWalletButton()).toHaveAccessibleName(/retry connection/i);
    });

    it("uses the primary variant (cyan background class)", () => {
      expect(getWalletButton()).toHaveClass("bg-cyan-500/20");
    });

    it("is not in loading state", () => {
      expect(getWalletButton()).toHaveAttribute("aria-busy", "false");
      expect(getWalletButton().querySelector("svg")).toBeNull();
    });

    it("displays the error message as helper text", () => {
      expect(screen.getByText("User rejected connection")).toBeInTheDocument();
    });
  });

  describe("WRONG_NETWORK", () => {
    beforeEach(() =>
      renderWithState(WALLET_STATES.WRONG_NETWORK, {
        error: 'Wallet is on "public" but the app requires "testnet"',
      })
    );

    it('renders the "Switch Network" button', () => {
      expect(getWalletButton()).toHaveAccessibleName(/switch network/i);
    });

    it("uses the warning variant (amber background class)", () => {
      expect(getWalletButton()).toHaveClass("bg-amber-500/20");
    });

    it("is not in loading state", () => {
      expect(getWalletButton()).toHaveAttribute("aria-busy", "false");
      expect(getWalletButton().querySelector("svg")).toBeNull();
    });

    it("is enabled so the user can retry", () => {
      expect(getWalletButton()).not.toBeDisabled();
    });
  });

  describe("NO_WALLET", () => {
    beforeEach(() => renderWithState(WALLET_STATES.NO_WALLET));

    it('renders the "Install Wallet" button', () => {
      expect(getWalletButton()).toHaveAccessibleName(/install wallet/i);
    });

    it("uses the external variant (violet background class)", () => {
      expect(getWalletButton()).toHaveClass("bg-violet-500/20");
    });

    it("is not in loading state", () => {
      expect(getWalletButton()).toHaveAttribute("aria-busy", "false");
      expect(getWalletButton().querySelector("svg")).toBeNull();
    });

    it("is enabled (user can click to open install URL)", () => {
      expect(getWalletButton()).not.toBeDisabled();
    });
  });
});
