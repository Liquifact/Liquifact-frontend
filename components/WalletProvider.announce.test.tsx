/**
 * @file components/WalletProvider.announce.test.jsx
 *
 * Tests for issue #737 – wallet async action results (connect, disconnect,
 * connect failure) are announced to screen readers via a polite live region
 * managed by lib/a11y/liveRegion.
 */

import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { WalletProvider, WALLET_STATES, WalletContext } from "./WalletProvider";
import {
  isFreighterConnected,
  connectFreighter,
  getFreighterNetwork,
  assertExpectedNetwork,
} from "../lib/wallet/freighter";
import { ensureLiveRegion, resetAnnouncer, DEBOUNCE_MS } from "../lib/a11y/liveRegion";

jest.mock("../lib/wallet/freighter", () => ({
  isFreighterConnected: jest.fn(),
  connectFreighter: jest.fn(),
  getFreighterNetwork: jest.fn(),
  assertExpectedNetwork: jest.fn(),
}));

const REGION_ID = "a11y-wallet-live-region";

function WalletProbe() {
  const { state, connect, disconnect } = React.useContext(WalletContext);
  return (
    <div>
      <span data-testid="wallet-state">{state}</span>
      <button type="button" onClick={() => connect()}>
        Connect
      </button>
      <button type="button" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
}

function renderWithProvider(ui = <WalletProbe />) {
  return render(<WalletProvider>{ui}</WalletProvider>);
}

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  resetAnnouncer();
  const existing = document.getElementById(REGION_ID);
  if (existing) existing.remove();
  process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
});

afterEach(() => {
  resetAnnouncer();
  const existing = document.getElementById(REGION_ID);
  if (existing) existing.remove();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("WalletProvider — live region announcements (issue #737)", () => {
  describe("successful wallet connect", () => {
    it("announces 'Wallet connected successfully' after debounce", async () => {
      (isFreighterConnected as jest.Mock).mockResolvedValue(true);
      (connectFreighter as jest.Mock).mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
      (assertExpectedNetwork as jest.Mock).mockResolvedValue(undefined);
      (getFreighterNetwork as jest.Mock).mockResolvedValue("testnet");

      renderWithProvider();

      await act(async () => {
        screen.getByRole("button", { name: "Connect" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.CONNECTED);
      });

      // Not yet — debounce still pending.
      expect(document.getElementById(REGION_ID)).toBeNull();

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      await waitFor(() => {
        expect(document.getElementById(REGION_ID).textContent).toBe(
          "Wallet connected successfully"
        );
      });
    });
  });

  describe("failed wallet connect", () => {
    it("announces 'Wallet connection failed' when the wallet is not installed", async () => {
      (isFreighterConnected as jest.Mock).mockResolvedValue(false);

      renderWithProvider();

      await act(async () => {
        screen.getByRole("button", { name: "Connect" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.NO_WALLET);
      });

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      await waitFor(() => {
        expect(document.getElementById(REGION_ID).textContent).toBe("Wallet connection failed");
      });
    });

    it("announces 'Wallet connection failed' on wrong network", async () => {
      (isFreighterConnected as jest.Mock).mockResolvedValue(true);
      (connectFreighter as jest.Mock).mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
      (assertExpectedNetwork as jest.Mock).mockRejectedValue(
        new Error('Wallet is on "public" but the app requires "testnet"')
      );

      renderWithProvider();

      await act(async () => {
        screen.getByRole("button", { name: "Connect" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.WRONG_NETWORK);
      });

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      await waitFor(() => {
        expect(document.getElementById(REGION_ID).textContent).toBe("Wallet connection failed");
      });
    });

    it("announces 'Wallet connection failed' on connectFreighter error", async () => {
      (isFreighterConnected as jest.Mock).mockResolvedValue(true);
      (connectFreighter as jest.Mock).mockRejectedValue(new Error("User rejected connection"));

      renderWithProvider();

      await act(async () => {
        screen.getByRole("button", { name: "Connect" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.ERROR);
      });

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      await waitFor(() => {
        expect(document.getElementById(REGION_ID).textContent).toBe("Wallet connection failed");
      });
    });
  });

  describe("wallet disconnect", () => {
    it("announces 'Wallet disconnected' after debounce", async () => {
      renderWithProvider();

      await act(async () => {
        screen.getByRole("button", { name: "Disconnect" }).click();
      });

      expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.DISCONNECTED);

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      await waitFor(() => {
        expect(document.getElementById(REGION_ID).textContent).toBe("Wallet disconnected");
      });
    });
  });

  describe("debounce behaviour", () => {
    it("debounces rapid wallet actions so only the last message is announced", async () => {
      (isFreighterConnected as jest.Mock).mockResolvedValue(true);
      (connectFreighter as jest.Mock).mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
      (assertExpectedNetwork as jest.Mock).mockResolvedValue(undefined);
      (getFreighterNetwork as jest.Mock).mockResolvedValue("testnet");

      renderWithProvider();

      // First: connect successfully.
      await act(async () => {
        screen.getByRole("button", { name: "Connect" }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.CONNECTED);
      });

      // Before debounce fires, disconnect (second action).
      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS - 50);
      });

      await act(async () => {
        screen.getByRole("button", { name: "Disconnect" }).click();
      });

      // Let the restarted debounce window elapse.
      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      // Only the latest (disconnect) result is announced.
      await waitFor(() => {
        expect(document.getElementById(REGION_ID).textContent).toBe("Wallet disconnected");
      });
    });
  });

  describe("live region attributes", () => {
    it("region has role=status, aria-live=polite, and aria-atomic=true", async () => {
      renderWithProvider();

      await act(async () => {
        screen.getByRole("button", { name: "Disconnect" }).click();
      });

      act(() => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      await waitFor(() => {
        const region = document.getElementById(REGION_ID);
        expect(region).toBeTruthy();
        expect(region.getAttribute("role")).toBe("status");
        expect(region.getAttribute("aria-live")).toBe("polite");
        expect(region.getAttribute("aria-atomic")).toBe("true");
        expect(region.classList.contains("sr-only")).toBe(true);
      });
    });
  });
});
