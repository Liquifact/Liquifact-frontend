import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletProvider, useWallet } from "@/components/wallet/WalletProvider";
import { WalletButton } from "@/components/wallet/WalletButton";
import { resetFreighterApi, setFreighterApi } from "@/lib/stellar/freighter";

const ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOP";
const STORAGE_KEY = "liquifact-wallet";

function createApi(overrides = {}) {
  const watchers = [];

  class WatchWalletChanges {
    constructor() {
      this.cb = null;
      this.stopped = false;
      watchers.push(this);
    }
    watch(cb) {
      this.cb = cb;
      return {};
    }
    stop() {
      this.stopped = true;
    }
  }

  return {
    isConnected: vi.fn(async () => ({ isConnected: true })),
    requestAccess: vi.fn(async () => ({ address: ADDRESS })),
    getAddress: vi.fn(async () => ({ address: ADDRESS })),
    isAllowed: vi.fn(async () => ({ isAllowed: true })),
    getNetworkDetails: vi.fn(async () => ({
      network: "testnet",
      networkUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    })),
    signTransaction: vi.fn(async () => ({
      signedTxXdr: "signed-xdr",
      signerAddress: ADDRESS,
    })),
    WatchWalletChanges,
    watchers,
    ...overrides,
  };
}

function renderButton() {
  return render(
    <WalletProvider>
      <WalletButton />
    </WalletProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  resetFreighterApi();
  window.localStorage.clear();
  delete window.freighter;
});

describe("WalletButton", () => {
  it("offers to connect while no wallet is connected", () => {
    setFreighterApi(createApi());
    renderButton();

    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeTruthy();
  });

  it("shows a disabled button and a busy state while connecting", async () => {
    let release;
    setFreighterApi(
      createApi({
        requestAccess: vi.fn(
          () =>
            new Promise((resolve) => {
              release = resolve;
            }),
        ),
      }),
    );
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));

    const button = await screen.findByRole("button", { name: /connecting/i });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");

    await waitFor(() => expect(release).toBeTypeOf("function"));
    release({ address: ADDRESS });
  });

  it("shows the short address once the wallet is connected", async () => {
    setFreighterApi(createApi());
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));

    const trigger = await screen.findByRole("button", { name: /GABCDE/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
  });

  it("opens a menu with the address, the explorer link and disconnect", async () => {
    setFreighterApi(createApi());
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    const trigger = await screen.findByRole("button", { name: /GABCDE/ });

    await userEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /copy address/i })).toBeTruthy();

    const explorer = within(menu).getByRole("menuitem", { name: /view on stellar.expert/i });
    expect(explorer.getAttribute("href")).toContain(ADDRESS);

    expect(within(menu).getByRole("menuitem", { name: /disconnect/i })).toBeTruthy();
  });

  it("closes the menu on Escape and returns the focus to the trigger", async () => {
    setFreighterApi(createApi());
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    const trigger = await screen.findByRole("button", { name: /GABCDE/ });

    await userEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeTruthy();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("disconnects back to the connect button", async () => {
    setFreighterApi(createApi());
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    const trigger = await screen.findByRole("button", { name: /GABCDE/ });

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("menuitem", { name: /disconnect/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /connect wallet/i })).toBeTruthy(),
    );
  });

  it("links to the Freighter download when no extension is installed", async () => {
    delete window.freighter;
    setFreighterApi(createApi({ isConnected: vi.fn(async () => ({ isConnected: false })) }));
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));

    const link = await screen.findByRole("link", { name: /install freighter/i });
    expect(link.getAttribute("href")).toContain("freighter.app");
  });

  it("shows an inline error with a retry when the user rejects the request", async () => {
    setFreighterApi(
      createApi({
        requestAccess: vi.fn(async () => ({
          error: { code: 4001, message: "User rejected the request." },
        })),
      }),
    );
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("User rejected the request.");
    expect(within(alert).getByRole("button", { name: /retry/i })).toBeTruthy();
  });

  it("restores the session on reload without asking the extension for access", async () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    const api = createApi();
    setFreighterApi(api);
    renderButton();

    await screen.findByRole("button", { name: /GABCDE/ });

    expect(api.isAllowed).toHaveBeenCalled();
    expect(api.getAddress).toHaveBeenCalled();
    expect(api.requestAccess).not.toHaveBeenCalled();
  });

  it("does not restore a session when the browser does not remember one", async () => {
    const api = createApi();
    setFreighterApi(api);
    renderButton();

    await screen.findByRole("button", { name: /connect wallet/i });

    expect(api.isAllowed).not.toHaveBeenCalled();
    expect(api.requestAccess).not.toHaveBeenCalled();
  });
});

function SessionProbe() {
  const { status, networkPassphrase, disconnect } = useWallet();
  return <>
    <output data-testid="session-state">{status}</output>
    <output data-testid="session-network">{networkPassphrase}</output>
    <button onClick={disconnect}>Cancel session</button>
  </>;
}

describe("wallet session synchronization", () => {
  it("does not revive a connection after disconnecting during the access prompt", async () => {
    let release;
    setFreighterApi(createApi({ requestAccess: vi.fn(() => new Promise(resolve => { release = resolve; })) }));
    render(<WalletProvider><WalletButton /><SessionProbe /></WalletProvider>);
    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    await waitFor(() => expect(release).toBeTypeOf("function"));
    await userEvent.click(screen.getByRole("button", { name: "Cancel session" }));
    await act(async () => { release({ address: ADDRESS }); });
    expect(screen.getByTestId("session-state").textContent).toBe("disconnected");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not restore a session that was disconnected while authorization was loading", async () => {
    let release;
    localStorage.setItem(STORAGE_KEY, "1");
    const api = createApi({ isAllowed: vi.fn(() => new Promise(resolve => { release = resolve; })) });
    setFreighterApi(api);
    render(<WalletProvider><WalletButton /><SessionProbe /></WalletProvider>);
    await waitFor(() => expect(release).toBeTypeOf("function"));
    await userEvent.click(screen.getByRole("button", { name: "Cancel session" }));
    await act(async () => { release({ isAllowed: true }); });
    expect(screen.getByTestId("session-state").textContent).toBe("disconnected");
    expect(api.getAddress).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("syncs network-only changes without requiring an account switch", async () => {
    const api = createApi();
    setFreighterApi(api);
    render(<WalletProvider><WalletButton /><SessionProbe /></WalletProvider>);
    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    await screen.findByRole("button", { name: /GABCDE/ });
    await waitFor(() => expect(api.watchers.length).toBeGreaterThan(0));
    await act(async () => {
      api.watchers[0].cb({ address: ADDRESS, network: "mainnet",
        networkPassphrase: "Public Global Stellar Network ; September 2015" });
    });
    expect(screen.getByTestId("session-network").textContent).toBe(
      "Public Global Stellar Network ; September 2015",
    );
  });
});
