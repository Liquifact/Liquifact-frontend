/**
 * @file components/WalletStatus.error-recovery.test.tsx
 *
 * Issue #705 — wallet error recovery interaction tests.
 *
 * The tests use a tiny controlled harness around WalletStatus so we can drive
 * the wallet into an error state deterministically, click Retry, and observe
 * both the immediate clearing of the error and the eventual recovery.
 */

import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import WalletStatus from "./WalletStatus";
import { ToastProvider } from "./ToastProvider";
import { WalletContext, WALLET_STATES } from "./WalletProvider";
import { copy } from "../app/copy/en";

type AttemptOutcome =
  | { kind: "success"; address?: string; network?: string }
  | { kind: "failure"; message: string };

const DEFAULT_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderHarness(initialOutcome: AttemptOutcome, retryOutcome: AttemptOutcome) {
  const retryDeferred = createDeferred<void>();
  const connect = jest.fn(async () => {
    setState(WALLET_STATES.CONNECTING);
    setError(null);

    await retryDeferred.promise;

    if (retryOutcome.kind === "failure") {
      setState(WALLET_STATES.ERROR);
      setError(retryOutcome.message);
      return { outcome: "error", message: retryOutcome.message };
    }

    setState(WALLET_STATES.CONNECTED);
    setWalletData({
      address: retryOutcome.address ?? DEFAULT_ADDRESS,
      network: retryOutcome.network ?? "testnet",
      balance: "1,234.56 XLM",
    });
    return { outcome: "success" };
  });

  let setState!: React.Dispatch<React.SetStateAction<string>>;
  let setError!: React.Dispatch<React.SetStateAction<string | null>>;
  let setWalletData!: React.Dispatch<
    React.SetStateAction<{ address: string; network: string; balance: string } | null>
  >;

  function Harness() {
    const [state, _setState] = React.useState(
      initialOutcome.kind === "failure" ? WALLET_STATES.ERROR : WALLET_STATES.CONNECTED
    );
    const [_error, _setError] = React.useState<string | null>(
      initialOutcome.kind === "failure" ? initialOutcome.message : null
    );
    const [_walletData, _setWalletData] = React.useState<
      { address: string; network: string; balance: string } | null
    >(
      initialOutcome.kind === "success"
        ? {
            address: initialOutcome.address ?? DEFAULT_ADDRESS,
            network: initialOutcome.network ?? "testnet",
            balance: "1,234.56 XLM",
          }
        : null
    );

    setState = _setState;
    setError = _setError;
    setWalletData = _setWalletData;

    const contextValue = React.useMemo(
      () => ({
        state,
        error: _error,
        walletData: _walletData,
        hydrating: false,
        connect,
        disconnect: jest.fn(),
      }),
      [state, _error, _walletData]
    );

    return (
      <WalletContext.Provider value={contextValue}>
        <WalletStatus />
      </WalletContext.Provider>
    );
  }

  return {
    ...render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    ),
    retryDeferred,
  };
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe("WalletStatus — error recovery flows (#705)", () => {
  it("clears the error immediately when retry begins and recovers after the retry succeeds", async () => {
    const user = userEvent.setup();
    const { retryDeferred } = renderHarness(
      { kind: "failure", message: "User rejected connection" },
      { kind: "success" }
    );

    expect(screen.getByRole("button", { name: copy.wallet.retryButton })).toBeInTheDocument();
    expect(
      screen.getByText(/User rejected connection/i, { selector: "#wallet-helper-text" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: copy.wallet.retryButton }));

    expect(screen.queryByRole("button", { name: copy.wallet.retryButton })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/User rejected connection/i, { selector: "#wallet-helper-text" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connecting/i })).toBeDisabled();
    expect(screen.getByText(/Connecting wallet\.\.\./i)).toBeInTheDocument();

    await act(async () => {
      retryDeferred.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });
    expect(
      screen.getByText(/GABC/i, { selector: ".wallet-address-text" })
    ).toBeInTheDocument();
  });

  it("shows the error again when the retried connection fails", async () => {
    const user = userEvent.setup();
    const { retryDeferred } = renderHarness(
      { kind: "failure", message: "User rejected connection" },
      { kind: "failure", message: "Still failing" }
    );

    await user.click(screen.getByRole("button", { name: copy.wallet.retryButton }));

    await act(async () => {
      retryDeferred.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: copy.wallet.retryButton })).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Still failing/i, { selector: "#wallet-helper-text" })
    ).toBeInTheDocument();
  });
});
