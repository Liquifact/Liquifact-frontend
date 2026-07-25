import "@testing-library/jest-dom";
import { render, screen, fireEvent, act, within, waitFor } from "@testing-library/react";
import WalletStatus, { WALLET_STATES } from "../WalletStatus";
import { ToastProvider } from "../ToastProvider";
import { WalletProvider } from "../WalletProvider";
import * as freighter from "../../lib/wallet/freighter";

jest.mock("../../lib/wallet/freighter");

function renderWalletStatus() {
  return render(
    <ToastProvider>
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>
    </ToastProvider>
  );
}

function getWalletStatusRegion() {
  return screen.getByTestId("wallet-live-region");
}

function getToastRegion() {
  const regions = screen.getAllByRole("status");
  return regions[regions.length - 1];
}

beforeEach(() => {
  jest.useFakeTimers();
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("WalletStatus — initial (disconnected) state", () => {
  it('renders "Connect Wallet" button when disconnected', () => {
    renderWalletStatus();
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("sr-only status region reflects disconnected state", () => {
    renderWalletStatus();
    expect(getWalletStatusRegion()).toHaveTextContent("");
  });
});

describe("WalletStatus — DISCONNECTED → CONNECTING transition", () => {
  it("transitions to connecting state immediately on click", () => {
    freighter.isFreighterConnected.mockResolvedValue(true);

    renderWalletStatus();
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    expect(screen.getByRole("button", { name: /connecting/i })).toBeInTheDocument();
  });
});

describe("WalletStatus — CONNECTING → CONNECTED (success path)", () => {
  async function connectSuccessfully() {
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWalletStatus();
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));

    await act(async () => {
      await Promise.resolve();
    });
  }

  afterEach(() => jest.restoreAllMocks());

  it('shows "Disconnect" button after successful connection', async () => {
    await connectSuccessfully();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });
  });
});

describe("WalletStatus — CONNECTING → ERROR (error path)", () => {
  async function connectWithError() {
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockRejectedValue(new Error("User rejected connection"));

    renderWalletStatus();
    const btn = screen.getByRole("button", { name: /connect wallet/i });
    fireEvent.click(btn);

    await act(async () => {
      await Promise.resolve();
    });
  }

  afterEach(() => jest.restoreAllMocks());

  it("shows error helper text", async () => {
    await connectWithError();
    await waitFor(() => {
      const helperText = screen.getByText(/User rejected connection/i, {
        selector: "#wallet-helper-text",
      });
      expect(helperText).toBeInTheDocument();
    });
  });

  it("fires an error toast on connection failure", async () => {
    await connectWithError();
    await waitFor(() => {
      expect(within(getToastRegion()).getByText(/Connection failed/i)).toBeInTheDocument();
    });
  });
});
