import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server.node";
import {
  WalletProvider,
  WALLET_STATES,
  clearStoredSnapshot,
  isBrowser,
  readStoredSnapshot,
  sanitizeSnapshot,
  truncateAddress,
  useWallet,
  writeStoredSnapshot,
} from "./WalletProvider";
import {
  isFreighterConnected,
  connectFreighter,
  getFreighterNetwork,
  assertExpectedNetwork,
} from "../lib/wallet/freighter";

jest.mock("../lib/wallet/freighter", () => ({
  isFreighterConnected: jest.fn(),
  connectFreighter: jest.fn(),
  getFreighterNetwork: jest.fn(),
  assertExpectedNetwork: jest.fn(),
}));

const STORAGE_KEY = "liquifact-wallet-snapshot";

function WalletProbe() {
  const { state, walletData, connect, disconnect } = useWallet();

  return (
    <div>
      <span data-testid="wallet-state">{state}</span>
      <span data-testid="wallet-address">{walletData?.address ?? ""}</span>
      <span data-testid="wallet-network">{walletData?.network ?? ""}</span>
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
  process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
});

afterEach(() => {
  jest.useRealTimers();
  localStorage.clear();
  jest.restoreAllMocks();
});

describe("truncateAddress", () => {
  it("truncates long Stellar addresses", () => {
    expect(truncateAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456")).toBe("GABC...123456");
  });

  it("returns short addresses unchanged", () => {
    expect(truncateAddress("GABC...XYZ")).toBe("GABC...XYZ");
  });

  it("returns empty string for invalid input", () => {
    expect(truncateAddress(null)).toBe("");
    expect(truncateAddress("")).toBe("");
  });
});

describe("sanitizeSnapshot", () => {
  it("accepts a valid connected snapshot", () => {
    const result = sanitizeSnapshot({
      version: 1,
      state: WALLET_STATES.CONNECTED,
      address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
      network: "public",
    });

    expect(result).toEqual({
      version: 1,
      state: WALLET_STATES.CONNECTED,
      address: "GABC...123456",
      network: "public",
    });
  });

  it("rejects corrupt or unsupported payloads", () => {
    expect(sanitizeSnapshot(null)).toBeNull();
    expect(sanitizeSnapshot("not-json")).toBeNull();
    expect(
      sanitizeSnapshot({
        version: 2,
        state: WALLET_STATES.CONNECTED,
        address: "GABC",
        network: "public",
      })
    ).toBeNull();
    expect(
      sanitizeSnapshot({
        version: 1,
        state: WALLET_STATES.ERROR,
        address: "GABC",
        network: "public",
      })
    ).toBeNull();
    expect(
      sanitizeSnapshot({
        version: 1,
        state: WALLET_STATES.CONNECTED,
        address: "",
        network: "public",
      })
    ).toBeNull();
    expect(
      sanitizeSnapshot({
        version: 1,
        state: WALLET_STATES.CONNECTED,
        address: "GABC",
        network: "invalid",
      })
    ).toBeNull();
    expect(
      sanitizeSnapshot({
        version: 1,
        state: WALLET_STATES.CONNECTED,
        address: "SABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123456789012345678901234",
        network: "public",
      })
    ).toBeNull();
  });
});

describe("storage helpers", () => {
  it("writes only truncated address and network without balance", () => {
    writeStoredSnapshot(WALLET_STATES.CONNECTED, {
      address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
      network: "public",
      balance: "1,234.56 XLM",
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored).toEqual({
      version: 1,
      state: WALLET_STATES.CONNECTED,
      address: "GABC...123456",
      network: "public",
    });
    expect(stored.balance).toBeUndefined();
  });

  it("clears storage for non-connected states", () => {
    writeStoredSnapshot(WALLET_STATES.CONNECTED, {
      address: "GABC...XYZ123",
      network: "public",
    });
    writeStoredSnapshot(WALLET_STATES.DISCONNECTED, null);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null for corrupt storage payloads", () => {
    localStorage.setItem(STORAGE_KEY, "{not-valid-json");
    expect(readStoredSnapshot()).toBeNull();
  });

  it("detects browser runtime", () => {
    expect(isBrowser()).toBe(true);
  });
});

describe("useWallet", () => {
  it("throws when used outside WalletProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<WalletProbe />)).toThrow("useWallet must be used within a WalletProvider");

    consoleError.mockRestore();
  });
});

describe("WalletProvider", () => {
  it("rehydrates a persisted connected snapshot after mount", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: WALLET_STATES.CONNECTED,
        address: "GABC...XYZ123",
        network: "public",
        balance: "should-not-rehydrate",
      })
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.CONNECTED);
    });
    expect(screen.getByTestId("wallet-address")).toHaveTextContent("GABC...XYZ123");
    expect(screen.getByTestId("wallet-network")).toHaveTextContent("public");
  });

  it("does not access localStorage during server render", () => {
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem");

    renderToString(
      <WalletProvider>
        <div>child</div>
      </WalletProvider>
    );

    expect(getItemSpy).not.toHaveBeenCalled();
    getItemSpy.mockRestore();
  });

  it("persists a connected snapshot after a successful connect", async () => {
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

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.state).toBe(WALLET_STATES.CONNECTED);
    expect(stored.address).toBe("GABC...123456");
    expect(stored.network).toBe("testnet");
    expect(stored.balance).toBeUndefined();
  });

  it("clears storage on disconnect after rehydration", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: WALLET_STATES.CONNECTED,
        address: "GABC...XYZ123",
        network: "public",
      })
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.CONNECTED);
    });

    await act(async () => {
      screen.getByRole("button", { name: "Disconnect" }).click();
    });

    expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.DISCONNECTED);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("ignores corrupt storage and stays disconnected", async () => {
    localStorage.setItem(STORAGE_KEY, "{bad-json");

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.DISCONNECTED);
    });
    expect(screen.getByTestId("wallet-address")).toHaveTextContent("");
  });

  it("clears storage when connect resolves to error", async () => {
    (isFreighterConnected as jest.Mock).mockResolvedValue(true);
    (connectFreighter as jest.Mock).mockRejectedValue(new Error("User rejected connection"));

    renderWithProvider();

    await act(async () => {
      screen.getByRole("button", { name: "Connect" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.ERROR);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clears storage when connect resolves to wrong network", async () => {
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
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("exposes clearStoredSnapshot for explicit cleanup", () => {
    writeStoredSnapshot(WALLET_STATES.CONNECTED, {
      address: "GABC...XYZ123",
      network: "public",
    });
    clearStoredSnapshot();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not clear storage while connection is in progress", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: WALLET_STATES.CONNECTED,
        address: "GABC...XYZ123",
        network: "public",
      })
    );

    let resolveConnect: (value: string) => void = () => {};
    const connectPromise = new Promise<string>((resolve) => {
      resolveConnect = resolve;
    });

    (isFreighterConnected as jest.Mock).mockResolvedValue(true);
    (connectFreighter as jest.Mock).mockReturnValue(connectPromise);
    (assertExpectedNetwork as jest.Mock).mockResolvedValue(undefined);
    (getFreighterNetwork as jest.Mock).mockResolvedValue("testnet");

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.CONNECTED);
    });

    await act(async () => {
      screen.getByRole("button", { name: "Connect" }).click();
    });

    expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.CONNECTING);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    await act(async () => {
      resolveConnect("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    });

    await waitFor(() => {
      expect(screen.getByTestId("wallet-state")).toHaveTextContent(WALLET_STATES.CONNECTED);
    });
  });
});
