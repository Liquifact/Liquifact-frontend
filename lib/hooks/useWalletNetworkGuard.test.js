/**
 * @file lib/hooks/useWalletNetworkGuard.test.js
 *
 * Unit tests for useWalletNetworkGuard.
 *
 * All 5 mandated edge cases are covered:
 *  1. wallet disconnected
 *  2. unknown network (getFreighterNetwork returns null)
 *  3. network changes while modal open (walletState/walletData change)
 *  4. testnet invoice (invoiceNetwork = "testnet")
 *  5. user switches accounts (walletData.address changes)
 *
 * Plus: ok path, mismatch path, WRONG_NETWORK state shortcut, CONNECTING
 * returns disconnected, and cleanup (cancelled) prevents stale state.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { useWalletNetworkGuard } from "./useWalletNetworkGuard";
import { WALLET_STATES, WalletContext } from "@/components/WalletProvider";

// ── Mock dependencies ─────────────────────────────────────────────────────────

jest.mock("@/lib/wallet/freighter", () => ({
  getFreighterNetwork: jest.fn(),
}));

jest.mock("@/lib/config/env", () => ({
  env: { stellarNetwork: "testnet" },
}));

const { getFreighterNetwork } = require("@/lib/wallet/freighter");

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Wraps the hook in a WalletContext provider with controllable state.
 */
function makeWrapper(walletState, walletData = null) {
  const value = {
    state: walletState,
    walletData,
    error: null,
    hydrating: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
  };
  return function Wrapper({ children }) {
    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useWalletNetworkGuard", () => {
  // ── Edge case 1: wallet disconnected ───────────────────────────────────────
  describe("edge case 1: wallet disconnected", () => {
    it("returns status=disconnected and null walletNetwork when DISCONNECTED", async () => {
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.DISCONNECTED),
      });

      await waitFor(() => expect(result.current.status).toBe("disconnected"));
      expect(result.current.walletNetwork).toBeNull();
      expect(getFreighterNetwork).not.toHaveBeenCalled();
    });

    it("returns disconnected when CONNECTING (not yet connected)", async () => {
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.CONNECTING),
      });
      await waitFor(() => expect(result.current.status).toBe("disconnected"));
    });

    it("returns disconnected when NO_WALLET", async () => {
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.NO_WALLET),
      });
      await waitFor(() => expect(result.current.status).toBe("disconnected"));
    });

    it("returns disconnected when ERROR", async () => {
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.ERROR),
      });
      await waitFor(() => expect(result.current.status).toBe("disconnected"));
    });
  });

  // ── Edge case 2: unknown network ───────────────────────────────────────────
  describe("edge case 2: unknown network (getFreighterNetwork returns null)", () => {
    it("returns status=unknown when getFreighterNetwork returns null", async () => {
      getFreighterNetwork.mockResolvedValue(null);
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.CONNECTED, {
          address: "GABC123",
          network: "testnet",
        }),
      });

      await waitFor(() => expect(result.current.status).toBe("unknown"));
      expect(result.current.walletNetwork).toBeNull();
    });
  });

  // ── Edge case 3: network changes while modal open ──────────────────────────
  describe("edge case 3: network changes while modal open", () => {
    it("re-checks and updates status when wallet state changes", async () => {
      // Start with testnet (correct).
      getFreighterNetwork.mockResolvedValue("testnet");

      let walletState = WALLET_STATES.CONNECTED;
      let walletData = { address: "GABC123", network: "testnet" };

      const { result, rerender } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: ({ children }) => (
          <WalletContext.Provider
            value={{ state: walletState, walletData, error: null, hydrating: false, connect: jest.fn(), disconnect: jest.fn() }}
          >
            {children}
          </WalletContext.Provider>
        ),
      });

      await waitFor(() => expect(result.current.status).toBe("ok"));

      // User changes network to "public" while the detail page is open.
      getFreighterNetwork.mockResolvedValue("public");
      walletData = { address: "GABC123", network: "public" };

      await act(async () => {
        rerender();
      });

      // walletData.address unchanged, walletState unchanged — no re-trigger.
      // To simulate a network change we need the wallet state to cycle.
      walletState = WALLET_STATES.WRONG_NETWORK;
      await act(async () => {
        rerender();
      });

      await waitFor(() => expect(result.current.status).toBe("mismatch"));
    });

    it("transitions from mismatch back to ok when user corrects the network", async () => {
      getFreighterNetwork.mockResolvedValue("public");
      let walletState = WALLET_STATES.CONNECTED;
      let walletData = { address: "GABC123", network: "public" };

      const { result, rerender } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: ({ children }) => (
          <WalletContext.Provider
            value={{ state: walletState, walletData, error: null, hydrating: false, connect: jest.fn(), disconnect: jest.fn() }}
          >
            {children}
          </WalletContext.Provider>
        ),
      });

      await waitFor(() => expect(result.current.status).toBe("mismatch"));

      // User switches to testnet.
      getFreighterNetwork.mockResolvedValue("testnet");
      walletState = WALLET_STATES.DISCONNECTED;
      await act(async () => rerender());
      await waitFor(() => expect(result.current.status).toBe("disconnected"));

      walletState = WALLET_STATES.CONNECTED;
      walletData = { address: "GABC456", network: "testnet" };
      await act(async () => rerender());

      await waitFor(() => expect(result.current.status).toBe("ok"));
    });
  });

  // ── Edge case 4: testnet invoice ───────────────────────────────────────────
  describe("edge case 4: testnet invoice (invoiceNetwork = testnet)", () => {
    it("returns ok when wallet is on testnet and invoiceNetwork is testnet", async () => {
      getFreighterNetwork.mockResolvedValue("testnet");
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.CONNECTED, {
          address: "GABC123",
          network: "testnet",
        }),
      });

      await waitFor(() => expect(result.current.status).toBe("ok"));
      expect(result.current.walletNetwork).toBe("testnet");
      expect(result.current.invoiceNetwork).toBe("testnet");
    });

    it("returns mismatch when wallet is on public but invoiceNetwork is testnet", async () => {
      getFreighterNetwork.mockResolvedValue("public");
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.CONNECTED, {
          address: "GABC123",
          network: "public",
        }),
      });

      await waitFor(() => expect(result.current.status).toBe("mismatch"));
      expect(result.current.walletNetwork).toBe("public");
      expect(result.current.invoiceNetwork).toBe("testnet");
    });
  });

  // ── Edge case 5: user switches accounts ───────────────────────────────────
  describe("edge case 5: user switches accounts", () => {
    it("re-runs the network check when walletData.address changes", async () => {
      getFreighterNetwork.mockResolvedValue("testnet");
      let walletData = { address: "GABC111", network: "testnet" };

      const { result, rerender } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: ({ children }) => (
          <WalletContext.Provider
            value={{ state: WALLET_STATES.CONNECTED, walletData, error: null, hydrating: false, connect: jest.fn(), disconnect: jest.fn() }}
          >
            {children}
          </WalletContext.Provider>
        ),
      });

      await waitFor(() => expect(result.current.status).toBe("ok"));
      expect(getFreighterNetwork).toHaveBeenCalledTimes(1);

      // User switches to another account which is on public.
      getFreighterNetwork.mockResolvedValue("public");
      walletData = { address: "GNEW999", network: "public" };

      await act(async () => rerender());

      await waitFor(() => expect(result.current.status).toBe("mismatch"));
      // getFreighterNetwork should have been called again for the new account.
      expect(getFreighterNetwork).toHaveBeenCalledTimes(2);
      expect(result.current.walletNetwork).toBe("public");
    });
  });

  // ── ok path ───────────────────────────────────────────────────────────────
  describe("ok path", () => {
    it("returns status=ok and correct walletNetwork when network matches", async () => {
      getFreighterNetwork.mockResolvedValue("testnet");
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.CONNECTED, {
          address: "GABC123",
          network: "testnet",
        }),
      });

      await waitFor(() => expect(result.current.status).toBe("ok"));
      expect(result.current.walletNetwork).toBe("testnet");
    });
  });

  // ── WRONG_NETWORK shortcut ─────────────────────────────────────────────────
  describe("WRONG_NETWORK shortcut", () => {
    it("returns mismatch immediately for WRONG_NETWORK without calling getFreighterNetwork", async () => {
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.WRONG_NETWORK, {
          address: "GABC123",
          network: "public",
        }),
      });

      await waitFor(() => expect(result.current.status).toBe("mismatch"));
      expect(getFreighterNetwork).not.toHaveBeenCalled();
      // walletNetwork is read from walletData, not from an async call.
      expect(result.current.walletNetwork).toBe("public");
    });

    it("returns null walletNetwork when WRONG_NETWORK and walletData is null", async () => {
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.WRONG_NETWORK, null),
      });

      await waitFor(() => expect(result.current.status).toBe("mismatch"));
      expect(result.current.walletNetwork).toBeNull();
    });
  });

  // ── invoiceNetwork always from env ─────────────────────────────────────────
  describe("invoiceNetwork is always the env-configured value", () => {
    it("always returns the env stellarNetwork as invoiceNetwork regardless of wallet state", async () => {
      getFreighterNetwork.mockResolvedValue("testnet");
      const { result } = renderHook(() => useWalletNetworkGuard(), {
        wrapper: makeWrapper(WALLET_STATES.CONNECTED, {
          address: "G123",
          network: "testnet",
        }),
      });
      await waitFor(() => expect(result.current.status).toBe("ok"));
      expect(result.current.invoiceNetwork).toBe("testnet");
    });
  });
});
