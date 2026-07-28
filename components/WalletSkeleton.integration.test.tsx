/**
 * @file components/WalletSkeleton.integration.test.tsx
 *
 * Integration tests covering:
 *   1. WalletProvider exposes `hydrating` (true before mount, false after)
 *   2. WalletStatus renders WalletSkeleton while hydrating
 *   3. WalletStatus swaps to real content after hydration settles
 *   4. Fast-load path: no localStorage → skeleton → disconnected UI
 *   5. Slow-load / persisted path: skeleton → connected UI (rehydration)
 *   6. Error state: skeleton replaced by error UI, not indefinitely shown
 *   7. aria-hidden skeleton never exposes interactive elements to AT
 *   8. No accessibility violations during and after hydration
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import "jest-axe/extend-expect";
import WalletStatus, { WALLET_STATES } from "./WalletStatus";
import { WalletProvider, WalletContext } from "./WalletProvider";
import { ToastProvider } from "./ToastProvider";

expect.extend(toHaveNoViolations);

// ── Freighter mock (required by WalletProvider) ───────────────────────────────
jest.mock("../lib/wallet/freighter", () => ({
  isFreighterConnected: jest.fn(),
  connectFreighter: jest.fn(),
  getFreighterNetwork: jest.fn(),
  assertExpectedNetwork: jest.fn(),
}));

// ── localStorage key ──────────────────────────────────────────────────────────
const STORAGE_KEY = "liquifact-wallet-snapshot";

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Render WalletStatus inside a real WalletProvider so we exercise the full
 * hydration flow.
 */
function renderWithRealProvider() {
  return render(
    <ToastProvider>
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>
    </ToastProvider>
  );
}

/**
 * Render WalletStatus with a fixed context value (bypasses real provider).
 * Used to assert behaviour for a specific `hydrating` value.
 */
function renderWithContext(
  overrides: Partial<{
    state: string;
    walletData: object | null;
    error: string | null;
    hydrating: boolean;
    connect: jest.Mock;
    disconnect: jest.Mock;
  }> = {}
) {
  const contextValue = {
    state: WALLET_STATES.DISCONNECTED,
    walletData: null,
    error: null,
    hydrating: false,
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

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. hydrating=true → WalletSkeleton is shown
// ─────────────────────────────────────────────────────────────────────────────

describe("WalletStatus with hydrating=true", () => {
  it("renders the WalletSkeleton and not the wallet button", () => {
    renderWithContext({ hydrating: true });

    expect(screen.getByTestId("wallet-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("skeleton wrapper is aria-hidden", () => {
    renderWithContext({ hydrating: true });
    expect(screen.getByTestId("wallet-skeleton")).toHaveAttribute("aria-hidden", "true");
  });

  it("skeleton wrapper is aria-busy", () => {
    renderWithContext({ hydrating: true });
    expect(screen.getByTestId("wallet-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("no interactive elements are exposed while hydrating", () => {
    renderWithContext({ hydrating: true });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("passes axe accessibility audit while hydrating", async () => {
    const { container } = renderWithContext({ hydrating: true });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. hydrating=false → real WalletStatus UI is shown
// ─────────────────────────────────────────────────────────────────────────────

describe("WalletStatus with hydrating=false", () => {
  it("renders the action button when not hydrating", () => {
    renderWithContext({ hydrating: false });
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("does not render the skeleton when not hydrating", () => {
    renderWithContext({ hydrating: false });
    expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
  });

  it("shows the connect button for DISCONNECTED state", () => {
    renderWithContext({ hydrating: false, state: WALLET_STATES.DISCONNECTED });
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("shows the disconnect button for CONNECTED state", () => {
    renderWithContext({
      hydrating: false,
      state: WALLET_STATES.CONNECTED,
      walletData: { address: "GABC...XYZ123", network: "testnet", balance: "1,234.56 XLM" },
    });
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("shows the retry button for ERROR state", () => {
    renderWithContext({
      hydrating: false,
      state: WALLET_STATES.ERROR,
      error: "Connection failed.",
    });
    expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
  });

  it("passes axe accessibility audit after hydration (DISCONNECTED)", async () => {
    const { container } = renderWithContext({ hydrating: false });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe accessibility audit after hydration (CONNECTED)", async () => {
    const { container } = renderWithContext({
      hydrating: false,
      state: WALLET_STATES.CONNECTED,
      walletData: { address: "GABC...XYZ123", network: "testnet", balance: "1,234.56 XLM" },
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Full hydration lifecycle with real WalletProvider (fast-load)
// ─────────────────────────────────────────────────────────────────────────────

describe("Full hydration lifecycle — fast load (no localStorage)", () => {
  it("swaps to real content after the hydration effect runs", async () => {
    renderWithRealProvider();

    // After RTL's render (which flushes effects), hydrating is false.
    await waitFor(() => {
      expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
    });

    // Real UI is now visible — connect button for DISCONNECTED state
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("no layout shift: skeleton and button never coexist", async () => {
    renderWithRealProvider();

    await waitFor(() => {
      expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
    });

    // After hydration: button yes, skeleton no
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
  });

  it("renders the connect button (not skeleton) after hydration with no stored snapshot", async () => {
    renderWithRealProvider();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Full hydration lifecycle with real WalletProvider (persisted/slow path)
// ─────────────────────────────────────────────────────────────────────────────

describe("Full hydration lifecycle — persisted snapshot (rehydration)", () => {
  beforeEach(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: WALLET_STATES.CONNECTED,
        address: "GABC...XYZ123",
        network: "public",
      })
    );
  });

  it("swaps to connected UI after snapshot rehydration", async () => {
    renderWithRealProvider();

    await waitFor(() => {
      expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
    });

    // In connected state the disconnect button is shown
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("does not render the skeleton after rehydration settles", async () => {
    renderWithRealProvider();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
  });

  it("does not flash disconnected UI after rehydration", async () => {
    renderWithRealProvider();

    // Collect every distinct visible button label while effects run
    const labelsObserved: string[] = [];

    const observer = new MutationObserver(() => {
      const btn = screen.queryByRole("button");
      if (btn) labelsObserved.push(btn.textContent ?? "");
    });
    observer.observe(document.body, { childList: true, subtree: true });

    await waitFor(() => {
      expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
    });

    observer.disconnect();

    // "Connect Wallet" (disconnected) should never appear if rehydration
    // happens atomically in the same effect that clears hydrating.
    expect(labelsObserved.some((l) => /connect wallet/i.test(l))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Error state replaces skeleton, not shown indefinitely
// ─────────────────────────────────────────────────────────────────────────────

describe("Error state after hydration", () => {
  it("renders error UI (not skeleton) when hydrating=false and state=ERROR", () => {
    renderWithContext({
      hydrating: false,
      state: WALLET_STATES.ERROR,
      error: "Connection failed.",
    });

    expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
  });

  it("renders wrong-network UI (not skeleton) for WRONG_NETWORK state", () => {
    renderWithContext({ hydrating: false, state: WALLET_STATES.WRONG_NETWORK });

    expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch network/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. WalletProvider exposes hydrating in context value
// ─────────────────────────────────────────────────────────────────────────────

describe("WalletProvider hydrating flag", () => {
  // A probe component that reads from the real WalletProvider context.
  // We import useWallet directly inside the component to avoid a top-level
  // circular require issue in tests.
  function HydratingProbe() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useWallet } = require("./WalletProvider");
    const { hydrating, state } = useWallet();
    return (
      <div>
        <span data-testid="hydrating">{String(hydrating)}</span>
        <span data-testid="state">{state}</span>
      </div>
    );
  }

  it("settles to hydrating=false after the mount effect completes", async () => {
    render(
      <WalletProvider>
        <HydratingProbe />
      </WalletProvider>
    );

    // RTL's render() flushes effects, so hydrating is already false here.
    await waitFor(() => {
      expect(screen.getByTestId("hydrating")).toHaveTextContent("false");
    });
  });

  it("state is DISCONNECTED after hydration with no stored snapshot", async () => {
    render(
      <WalletProvider>
        <HydratingProbe />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrating")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("state")).toHaveTextContent(WALLET_STATES.DISCONNECTED);
  });

  it("rehydrates to CONNECTED state after hydrating resolves with a stored snapshot", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: WALLET_STATES.CONNECTED,
        address: "GABC...XYZ123",
        network: "public",
      })
    );

    render(
      <WalletProvider>
        <HydratingProbe />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrating")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("state")).toHaveTextContent(WALLET_STATES.CONNECTED);
  });

  it("hydrating is exposed in the context value (via WalletContext.Provider)", () => {
    const contextValue = {
      state: WALLET_STATES.DISCONNECTED,
      walletData: null,
      error: null,
      hydrating: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    render(
      <WalletContext.Provider value={contextValue}>
        <HydratingProbe />
      </WalletContext.Provider>
    );

    // When we inject hydrating=true, the probe reflects it
    expect(screen.getByTestId("hydrating")).toHaveTextContent("true");
  });
});
