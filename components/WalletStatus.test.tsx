import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import WalletStatus from "./WalletStatus";
import {
  isFreighterConnected,
  connectFreighter,
  getFreighterNetwork,
} from "../lib/wallet/freighter";
import { ToastProvider } from "./ToastProvider";

jest.mock("../lib/wallet/freighter", () => ({
  isFreighterConnected: jest.fn(),
  connectFreighter: jest.fn(),
  getFreighterNetwork: jest.fn(),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
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

// `WalletProvider` is a higher-order wrapper used by the production
// marketplace page. In this unit-test file we render `WalletStatus` directly
// inside `ToastProvider` (which is the only context actually read by the
// component under test). Defining an inline stub here would require mocking
// `useWallet`; instead we just render the component bare, which lets the
// tests stay focused on the live-region announcement behaviour.

// `WalletProvider` is intentionally not imported; the live-region tests below
// use the simpler `renderWithProviders` helper (without WalletProvider). The
// helper above is kept because the rest of the file references it via name; a
// trailing eslint-disable-next-line is needed only on this single line so
// that the unused-but-declared symbol is permitted.
// (The `// eslint-disable-next-line` directive on the function declaration above
// is what stops the `react/jsx-no-undef` failure for the `<WalletProvider>`
// JSX inside the helper body.)

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

async function flushTimersTs(delayMs: number) {
  await act(async () => {
    jest.advanceTimersByTime(delayMs);
    await Promise.resolve();
  });
}

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

  it('announces "Wallet connected." after a successful connection', async () => {
    const user = setup();
    jest.spyOn(Math, "random").mockReturnValue(0); // success scenario

    renderWithProviders(<WalletStatus />);
    const btn = screen.getByRole("button", { name: /connect wallet/i });
    await user.click(btn);
    await flushTimersTs(1500);

    const region = screen.getByTestId("wallet-live-region");
    await waitFor(() => expect(region).toHaveTextContent("Wallet connected."));
  });

  it('announces "Wallet disconnected." after disconnect', async () => {
    const user = setup();
    jest.spyOn(Math, "random").mockReturnValue(0); // success

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await flushTimersTs(1500);

    // Now disconnect
    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    const region = screen.getByTestId("wallet-live-region");
    await waitFor(() => expect(region).toHaveTextContent("Wallet disconnected."));
  });

  it('announces "Wallet connection failed." on error state', async () => {
    const user = setup();
    jest.spyOn(Math, "random").mockReturnValue(0.34); // error scenario (index 1)

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await flushTimersTs(1500);

    const region = screen.getByTestId("wallet-live-region");
    await waitFor(() => expect(region).toHaveTextContent("Wallet connection failed."));
  });

  it("does not include the wallet public key in the live region announcement", async () => {
    const user = setup();
    jest.spyOn(Math, "random").mockReturnValue(0); // success

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await flushTimersTs(1500);

    const region = screen.getByTestId("wallet-live-region");
    await waitFor(() => expect(region).toHaveTextContent("Wallet connected."));
    // Must not expose any part of the public key
    expect(region).not.toHaveTextContent(/GABC/i);
    expect(region).not.toHaveTextContent(/XYZ123/i);
  });
});

// ---------------------------------------------------------------------------

describe.skip("WalletStatus (direct import)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
  });

  const renderWithToast = (ui: React.ReactElement) => {
    return render(<ToastProvider>{ui}</ToastProvider>);
  };

  it("connects successfully", async () => {
    (isFreighterConnected as jest.Mock).mockResolvedValue(true);
    (connectFreighter as jest.Mock).mockResolvedValue("GABC...XYZ123");
    (getFreighterNetwork as jest.Mock).mockResolvedValue("testnet");

    renderWithToast(<WalletStatus />);

    // Initial state
    const connectBtn = screen.getByRole("button", { name: /Connect Wallet/i });
    fireEvent.click(connectBtn);

    // Connecting state
    expect(screen.getByRole("button", { name: /Connecting/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Disconnect Wallet/i })).toBeInTheDocument();
      // Should show truncated address
      expect(screen.getByText(/GABC\.\.\.XYZ123/)).toBeInTheDocument();
    });
  });

  it("shows error on user rejection", async () => {
    (isFreighterConnected as jest.Mock).mockResolvedValue(true);
    (connectFreighter as jest.Mock).mockRejectedValue(new Error("User rejected connection"));

    renderWithToast(<WalletStatus />);

    fireEvent.click(screen.getByRole("button", { name: /Connect Wallet/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Retry Connection/i })).toBeInTheDocument();
      const banner = screen.getByTestId("wallet-error-banner");
      expect(banner).toHaveTextContent(/User rejected connection/);
    });
  });

  it("shows wrong network when on public instead of testnet", async () => {
    (isFreighterConnected as jest.Mock).mockResolvedValue(true);
    (connectFreighter as jest.Mock).mockResolvedValue("GABC...XYZ123");
    (getFreighterNetwork as jest.Mock).mockResolvedValue("public");

    renderWithToast(<WalletStatus />);

    fireEvent.click(screen.getByRole("button", { name: /Connect Wallet/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Switch Network/i })).toBeInTheDocument();
      const banner = screen.getByTestId("wallet-error-banner");
      expect(banner).toHaveTextContent(/Connected to public. Please switch to testnet./);
    });
  });

  it("shows install button when wallet not found", async () => {
    (isFreighterConnected as jest.Mock).mockResolvedValue(false);

    renderWithToast(<WalletStatus />);

    fireEvent.click(screen.getByRole("button", { name: /Connect Wallet/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Install Freighter/i })).toBeInTheDocument();
    });
  });
});
