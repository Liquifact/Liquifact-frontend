import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./ToastProvider";
import { WalletProvider } from "./WalletProvider";
import WalletStatus from "./WalletStatus";
import * as freighter from "../lib/wallet/freighter";

jest.mock("../lib/wallet/freighter");

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

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

describe("WalletStatus", () => {
  it("renders the initial disconnected state", () => {
    renderWithProviders(<WalletStatus />);

    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    expect(
      screen.getByText(/connect your stellar wallet/i, { selector: "span" })
    ).toBeInTheDocument();
  });

  it("shows a connecting state and then a successful connection", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);

    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    // Wait for connection to complete
    await screen.findByRole("button", { name: /disconnect/i });
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("disconnects the wallet when the disconnect button is clicked", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockResolvedValue(undefined);
    freighter.getFreighterNetwork.mockResolvedValue("testnet");

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    await screen.findByRole("button", { name: /disconnect/i });
    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("shows an error state and allows retry", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockRejectedValue(new Error("User rejected connection"));

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    await screen.findByRole("button", { name: /retry connection/i });
    expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
  });

  it("shows a wrong network state and allows retry", async () => {
    const user = setup();
    freighter.isFreighterConnected.mockResolvedValue(true);
    freighter.connectFreighter.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    freighter.assertExpectedNetwork.mockRejectedValue(
      new Error('Wallet is on "public" but the app requires "testnet"')
    );

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    await screen.findByRole("button", { name: /switch network/i });
    expect(screen.getByRole("button", { name: /switch network/i })).toBeInTheDocument();
  });

  it("shows a no-wallet state and opens the wallet installation page", async () => {
    const user = setup();
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => {});
    freighter.isFreighterConnected.mockResolvedValue(false);

    renderWithProviders(<WalletStatus />);
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    await screen.findByRole("button", { name: /install wallet/i });
    await user.click(screen.getByRole("button", { name: /install wallet/i }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.stellar.org/wallets",
      "_blank",
      "noopener,noreferrer"
    );

    openSpy.mockRestore();
  });
});
