/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 *
 * @file app/invest/[id]/FundActions.networkMismatch.test.jsx
 *
 * Integration tests verifying that FundActions correctly blocks funding
 * and shows the NetworkMismatchBanner when the wallet is on the wrong
 * Stellar network.
 *
 * Covers:
 *  - Banner visible and funding disabled when network is mismatched
 *  - Banner visible and funding disabled when network is unknown
 *  - Banner visible and funding disabled when wallet is disconnected
 *  - Banner hidden and funding enabled when network matches
 *  - Banner hidden during initial "checking" phase (no flash)
 *  - FundAmountInput disabled when mismatch
 *  - Fund button disabled when mismatch
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import FundActions from "./FundActions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };

jest.mock("@/components/ToastProvider", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/components/WalletContext", () => ({
  WALLET_STATES: {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    NO_WALLET: "no_wallet",
    WRONG_NETWORK: "wrong_network",
    ERROR: "error",
    INVALID_PROVIDER: "invalid_provider",
  },
  useWallet: jest.fn(() => ({
    state: "connected",
    walletData: { address: "GABC123", network: "testnet" },
    connect: jest.fn(),
  })),
}));

// Control the network guard status via the mock.
let mockNetworkGuardResult = {
  status: "ok",
  walletNetwork: "testnet",
  invoiceNetwork: "testnet",
};

jest.mock("@/lib/hooks/useWalletNetworkGuard", () => ({
  useWalletNetworkGuard: jest.fn(() => mockNetworkGuardResult),
}));

// Keep liveRegion silent in integration tests.
jest.mock("@/lib/a11y/liveRegion", () => ({ announce: jest.fn() }));

// Replace FundAmountInput with a minimal stub that exposes the disabled state.
jest.mock("@/components/FundAmountInput", () => ({
  __esModule: true,
  default: function FundAmountInputMock({ onSubmit, disabled }) {
    return (
      <button
        data-testid="fund-amount-submit"
        disabled={disabled}
        onClick={() => onSubmit(100)}
      >
        Fund amount
      </button>
    );
  },
}));

// MarketplaceContext stub.
jest.mock("@/app/invest/MarketplaceContext", () => ({
  useMarketplace: jest.fn(() => ({
    pendingIds: new Set(),
    fundInvoice: jest.fn(),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const { useWalletNetworkGuard } = require("@/lib/hooks/useWalletNetworkGuard");

function renderFundActions(props = {}) {
  const defaults = {
    id: "inv-001",
    status: "Open",
    maxAmount: 5000,
    currency: "USD",
    yieldValue: 5,
  };
  return render(<FundActions {...defaults} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockNetworkGuardResult = { status: "ok", walletNetwork: "testnet", invoiceNetwork: "testnet" };
  useWalletNetworkGuard.mockImplementation(() => mockNetworkGuardResult);
});

describe("FundActions — network mismatch blocking", () => {
  // ── Banner visible when network mismatches ─────────────────────────────────
  describe("banner visible when network mismatches", () => {
    it("shows the NetworkMismatchBanner when status=mismatch", async () => {
      mockNetworkGuardResult = {
        status: "mismatch",
        walletNetwork: "public",
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      await waitFor(() => {
        expect(screen.getByTestId("network-mismatch-banner")).toBeInTheDocument();
      });
    });

    it("shows the banner when status=unknown (wallet network unreadable)", async () => {
      mockNetworkGuardResult = {
        status: "unknown",
        walletNetwork: null,
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      await waitFor(() => {
        expect(screen.getByTestId("network-mismatch-banner")).toBeInTheDocument();
      });
    });

    it("shows the banner when status=disconnected", async () => {
      mockNetworkGuardResult = {
        status: "disconnected",
        walletNetwork: null,
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      await waitFor(() => {
        expect(screen.getByTestId("network-mismatch-banner")).toBeInTheDocument();
      });
    });
  });

  // ── Banner hidden when ok or checking ─────────────────────────────────────
  describe("banner hidden when ok or checking", () => {
    it("does NOT show the banner when status=ok", () => {
      mockNetworkGuardResult = {
        status: "ok",
        walletNetwork: "testnet",
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      expect(screen.queryByTestId("network-mismatch-banner")).not.toBeInTheDocument();
    });

    it("does NOT show the banner when status=checking (no flash on load)", () => {
      mockNetworkGuardResult = {
        status: "checking",
        walletNetwork: null,
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      expect(screen.queryByTestId("network-mismatch-banner")).not.toBeInTheDocument();
    });
  });

  // ── Funding controls disabled when mismatch ───────────────────────────────
  describe("funding controls disabled when mismatch", () => {
    it("disables the FundAmountInput submit button when status=mismatch", async () => {
      mockNetworkGuardResult = {
        status: "mismatch",
        walletNetwork: "public",
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      const submitBtn = screen.getByTestId("fund-amount-submit");
      expect(submitBtn).toBeDisabled();
    });

    it("disables the FundAmountInput submit button when status=unknown", () => {
      mockNetworkGuardResult = {
        status: "unknown",
        walletNetwork: null,
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      expect(screen.getByTestId("fund-amount-submit")).toBeDisabled();
    });

    it("disables the FundAmountInput submit button when status=disconnected", () => {
      mockNetworkGuardResult = {
        status: "disconnected",
        walletNetwork: null,
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      expect(screen.getByTestId("fund-amount-submit")).toBeDisabled();
    });

    it("does NOT disable the FundAmountInput when status=ok", () => {
      mockNetworkGuardResult = {
        status: "ok",
        walletNetwork: "testnet",
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      expect(screen.getByTestId("fund-amount-submit")).not.toBeDisabled();
    });

    it("does NOT disable the FundAmountInput when status=checking", () => {
      mockNetworkGuardResult = {
        status: "checking",
        walletNetwork: null,
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      expect(screen.getByTestId("fund-amount-submit")).not.toBeDisabled();
    });
  });

  // ── Fund button disabled when mismatch ────────────────────────────────────
  describe("Fund button disabled when mismatch", () => {
    it("disables the Fund button when status=mismatch", () => {
      mockNetworkGuardResult = {
        status: "mismatch",
        walletNetwork: "public",
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      const fundBtn = screen.getByRole("button", { name: /Fund this invoice/i });
      expect(fundBtn).toBeDisabled();
    });

    it("the Fund button is enabled when status=ok", () => {
      mockNetworkGuardResult = {
        status: "ok",
        walletNetwork: "testnet",
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      const fundBtn = screen.getByRole("button", { name: /Fund this invoice/i });
      expect(fundBtn).not.toBeDisabled();
    });
  });

  // ── Copy and print buttons remain usable ──────────────────────────────────
  describe("copy and print buttons remain usable during mismatch", () => {
    it("Copy link button is NOT disabled when network mismatches", () => {
      mockNetworkGuardResult = {
        status: "mismatch",
        walletNetwork: "public",
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      const copyBtn = screen.getByRole("button", { name: /Copy link/i });
      expect(copyBtn).not.toBeDisabled();
    });

    it("Print button is NOT disabled when network mismatches", () => {
      mockNetworkGuardResult = {
        status: "mismatch",
        walletNetwork: "public",
        invoiceNetwork: "testnet",
      };
      renderFundActions();
      const printBtn = screen.getByRole("button", { name: /Print or save/i });
      expect(printBtn).not.toBeDisabled();
    });
  });
});
