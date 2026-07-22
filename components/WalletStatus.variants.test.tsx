/**
 * WalletStatus variant and loading-state tests.
 *
 * Asserts that for every WALLET_STATE value:
 *   1. The Button renders with the correct `variant` class (derived from
 *      `getStateConfig`'s `buttonVariant` field).
 *   2. The `loading` prop (and therefore aria-busy) is only set for
 *      the CONNECTING state — never for any other state.
 *   3. "loading" is never passed as a variant string (Button has no such
 *      variant and passing it would silently produce a broken className).
 *   4. aria-describedby is omitted when the wallet address row is shown
 *      (CONNECTED state) to avoid dangling IDREF references.
 *   5. The Button is accessible (aria-label matches expected copy text).
 *
 * These tests use the WalletContext override pattern so each state can be
 * asserted in isolation without simulating the full async connect flow.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ToastProvider } from "./ToastProvider";
import { WalletContext, WALLET_STATES } from "./WalletProvider";
import WalletStatus from "./WalletStatus";
import { copy } from "../app/copy/en";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Render WalletStatus with a fixed wallet context value.
 * This bypasses the provider's async state machine so each state can be
 * tested synchronously and in isolation.
 */
function renderWithState(
  state: string,
  overrides: Partial<{
    walletData: Record<string, string> | null;
    error: string | null;
    connect: () => Promise<{ outcome: string }>;
    disconnect: () => void;
  }> = {}
) {
  const contextValue = {
    state,
    walletData: overrides.walletData ?? null,
    error: overrides.error ?? null,
    connect: overrides.connect ?? jest.fn().mockResolvedValue({ outcome: "success" }),
    disconnect: overrides.disconnect ?? jest.fn(),
  };

  return render(
    <ToastProvider>
      <WalletContext.Provider value={contextValue}>
        <WalletStatus />
      </WalletContext.Provider>
    </ToastProvider>
  );
}

/**
 * Returns the CSS classes applied to the rendered Button element.
 * We locate the button by its aria-label to be resilient to text changes.
 */
function getButtonClasses(ariaLabel: RegExp | string): string {
  return screen.getByRole("button", { name: ariaLabel }).className;
}

// ─── Variant token → expected CSS fragment mapping ───────────────────────────
//
// Button.jsx applies these Tailwind classes per variant:
//   primary   → "bg-cyan-500/20 text-cyan-400 ..."
//   secondary → "border border-slate-600 text-slate-300 ..."
//   warning   → "bg-amber-500/20 text-amber-400 ..."
//   external  → "bg-violet-500/20 text-violet-400 ..."
//   danger    → "bg-red-500/20 text-red-400 ..."
//
// We assert on a unique, stable fragment from each set.

const VARIANT_MARKER: Record<string, string> = {
  primary: "bg-cyan-500/20",
  secondary: "border-slate-600",
  warning: "bg-amber-500/20",
  external: "bg-violet-500/20",
  danger: "bg-red-500/20",
};

// ─── Suite: correct variant per state ────────────────────────────────────────

describe("WalletStatus — Button variant per wallet state", () => {
  it("DISCONNECTED → variant=primary (cyan)", () => {
    renderWithState(WALLET_STATES.DISCONNECTED);
    const classes = getButtonClasses(/connect wallet/i);
    expect(classes).toContain(VARIANT_MARKER.primary);
    // Sanity: must not contain markers from other variants
    expect(classes).not.toContain(VARIANT_MARKER.secondary);
    expect(classes).not.toContain(VARIANT_MARKER.warning);
  });

  it("CONNECTING → variant=primary (cyan), NOT 'loading' variant string", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    // Button renders a Spinner inside but its visual variant is still "primary"
    const classes = getButtonClasses(/connecting/i);
    expect(classes).toContain(VARIANT_MARKER.primary);
    // "loading" must never appear in the className — Button has no such variant
    // and variantStyles["loading"] is undefined, which would produce "undefined"
    // in the class string.
    expect(classes).not.toContain("loading");
    expect(classes).not.toContain("undefined");
  });

  it("CONNECTED → variant=secondary (slate border)", () => {
    renderWithState(WALLET_STATES.CONNECTED, {
      walletData: { address: "GABC...XYZ123", network: "testnet", balance: "1,234.56 XLM" },
    });
    const classes = getButtonClasses(/disconnect/i);
    expect(classes).toContain(VARIANT_MARKER.secondary);
    expect(classes).not.toContain(VARIANT_MARKER.primary);
  });

  it("ERROR → variant=primary (cyan, retry action)", () => {
    renderWithState(WALLET_STATES.ERROR, { error: "User rejected connection" });
    const classes = getButtonClasses(/retry/i);
    expect(classes).toContain(VARIANT_MARKER.primary);
  });

  it("WRONG_NETWORK → variant=warning (amber)", () => {
    renderWithState(WALLET_STATES.WRONG_NETWORK, {
      error: 'Wallet is on "public" but the app requires "testnet"',
    });
    const classes = getButtonClasses(/switch network/i);
    expect(classes).toContain(VARIANT_MARKER.warning);
    expect(classes).not.toContain(VARIANT_MARKER.primary);
  });

  it("NO_WALLET → variant=external (violet)", () => {
    renderWithState(WALLET_STATES.NO_WALLET);
    const classes = getButtonClasses(/install wallet/i);
    expect(classes).toContain(VARIANT_MARKER.external);
    expect(classes).not.toContain(VARIANT_MARKER.primary);
  });
});

// ─── Suite: loading / aria-busy per state ────────────────────────────────────

describe("WalletStatus — loading prop and aria-busy", () => {
  it("CONNECTING → aria-busy=true (Button receives loading=true)", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    const btn = screen.getByRole("button", { name: /connecting/i });
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("DISCONNECTED → aria-busy=false (not loading)", () => {
    renderWithState(WALLET_STATES.DISCONNECTED);
    const btn = screen.getByRole("button", { name: /connect wallet/i });
    expect(btn).toHaveAttribute("aria-busy", "false");
  });

  it("CONNECTED → aria-busy=false (not loading)", () => {
    renderWithState(WALLET_STATES.CONNECTED, {
      walletData: { address: "GABC...XYZ123", network: "testnet", balance: "1,234.56 XLM" },
    });
    const btn = screen.getByRole("button", { name: /disconnect/i });
    expect(btn).toHaveAttribute("aria-busy", "false");
  });

  it("ERROR → aria-busy=false (not loading)", () => {
    renderWithState(WALLET_STATES.ERROR);
    const btn = screen.getByRole("button", { name: /retry/i });
    expect(btn).toHaveAttribute("aria-busy", "false");
  });

  it("WRONG_NETWORK → aria-busy=false (not loading)", () => {
    renderWithState(WALLET_STATES.WRONG_NETWORK);
    const btn = screen.getByRole("button", { name: /switch network/i });
    expect(btn).toHaveAttribute("aria-busy", "false");
  });

  it("NO_WALLET → aria-busy=false (not loading)", () => {
    renderWithState(WALLET_STATES.NO_WALLET);
    const btn = screen.getByRole("button", { name: /install wallet/i });
    expect(btn).toHaveAttribute("aria-busy", "false");
  });

  it("CONNECTING → Button is disabled while connecting", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    const btn = screen.getByRole("button", { name: /connecting/i });
    expect(btn).toBeDisabled();
  });

  it("CONNECTING → Spinner SVG is present inside the button", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    const btn = screen.getByRole("button", { name: /connecting/i });
    // Button renders a Spinner (aria-hidden SVG) when loading=true
    const spinner = btn.querySelector("svg[aria-hidden='true']");
    expect(spinner).toBeInTheDocument();
  });
});

// ─── Suite: aria-describedby / helper text ────────────────────────────────────

describe("WalletStatus — aria-describedby and helper text", () => {
  it("DISCONNECTED → aria-describedby references the helper text span", () => {
    renderWithState(WALLET_STATES.DISCONNECTED);
    const btn = screen.getByRole("button", { name: /connect wallet/i });
    expect(btn).toHaveAttribute("aria-describedby", "wallet-helper-text");
    // The referenced element must exist in the DOM
    expect(document.getElementById("wallet-helper-text")).toBeInTheDocument();
  });

  it("CONNECTING → aria-describedby references the helper text span", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    const btn = screen.getByRole("button", { name: /connecting/i });
    expect(btn).toHaveAttribute("aria-describedby", "wallet-helper-text");
    expect(document.getElementById("wallet-helper-text")).toBeInTheDocument();
  });

  it("CONNECTED → aria-describedby is omitted (address row shown, span not in DOM)", () => {
    renderWithState(WALLET_STATES.CONNECTED, {
      walletData: { address: "GABC...XYZ123", network: "testnet", balance: "1,234.56 XLM" },
    });
    const btn = screen.getByRole("button", { name: /disconnect/i });
    // When address row is shown, #wallet-helper-text span is absent — no dangling IDREF
    expect(btn).not.toHaveAttribute("aria-describedby");
    expect(document.getElementById("wallet-helper-text")).not.toBeInTheDocument();
  });

  it("ERROR → aria-describedby references the helper text span with error message", () => {
    renderWithState(WALLET_STATES.ERROR, { error: "User rejected connection" });
    const btn = screen.getByRole("button", { name: /retry/i });
    expect(btn).toHaveAttribute("aria-describedby", "wallet-helper-text");
    const helper = document.getElementById("wallet-helper-text");
    expect(helper).toBeInTheDocument();
    expect(helper).toHaveTextContent("User rejected connection");
  });

  it("WRONG_NETWORK → helper text shows the error message", () => {
    const msg = 'Wallet is on "public" but the app requires "testnet"';
    renderWithState(WALLET_STATES.WRONG_NETWORK, { error: msg });
    const helper = document.getElementById("wallet-helper-text");
    expect(helper).toBeInTheDocument();
    expect(helper).toHaveTextContent(msg);
  });

  it("WRONG_NETWORK → falls back to copy when error is null", () => {
    renderWithState(WALLET_STATES.WRONG_NETWORK, { error: null });
    const helper = document.getElementById("wallet-helper-text");
    expect(helper).toHaveTextContent(copy.wallet.helperWrongNetwork);
  });
});

// ─── Suite: copy text per state ───────────────────────────────────────────────

describe("WalletStatus — button text per wallet state", () => {
  const cases: Array<[string, string | RegExp, Record<string, unknown>?]> = [
    [WALLET_STATES.DISCONNECTED, copy.wallet.connectButton],
    [WALLET_STATES.CONNECTING, copy.wallet.connectingButton],
    [
      WALLET_STATES.CONNECTED,
      copy.wallet.disconnectButton,
      { walletData: { address: "GABC...XYZ123", network: "testnet", balance: "0 XLM" } },
    ],
    [WALLET_STATES.ERROR, copy.wallet.retryButton],
    [WALLET_STATES.WRONG_NETWORK, copy.wallet.switchNetworkButton],
    [WALLET_STATES.NO_WALLET, copy.wallet.installWalletButton],
  ];

  test.each(cases)("state=%s → button text is '%s'", (state, expectedText, overrides = {}) => {
    renderWithState(state, overrides as Parameters<typeof renderWithState>[1]);
    // The button renders as aria-label (confirmed by how WalletStatus sets it)
    expect(screen.getByRole("button", { name: expectedText as string })).toBeInTheDocument();
  });
});

// ─── Suite: status dot colour per state ──────────────────────────────────────

describe("WalletStatus — status dot colour indicator", () => {
  it("CONNECTED → green dot", () => {
    renderWithState(WALLET_STATES.CONNECTED, {
      walletData: { address: "GABC...XYZ123", network: "testnet", balance: "0 XLM" },
    });
    // The status dot is aria-hidden; locate by class substring
    const dot = document.querySelector("[aria-hidden='true'].rounded-full");
    expect(dot?.className).toContain("bg-green-500");
  });

  it("CONNECTING → yellow pulsing dot", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    const dot = document.querySelector("[aria-hidden='true'].rounded-full");
    expect(dot?.className).toContain("bg-yellow-500");
    expect(dot?.className).toContain("animate-pulse");
  });

  it("ERROR → red dot", () => {
    renderWithState(WALLET_STATES.ERROR);
    const dot = document.querySelector("[aria-hidden='true'].rounded-full");
    expect(dot?.className).toContain("bg-red-500");
  });

  it("WRONG_NETWORK → red dot", () => {
    renderWithState(WALLET_STATES.WRONG_NETWORK);
    const dot = document.querySelector("[aria-hidden='true'].rounded-full");
    expect(dot?.className).toContain("bg-red-500");
  });

  it("DISCONNECTED → slate dot", () => {
    renderWithState(WALLET_STATES.DISCONNECTED);
    const dot = document.querySelector("[aria-hidden='true'].rounded-full");
    expect(dot?.className).toContain("bg-slate-600");
  });

  it("NO_WALLET → slate dot (not connected, not error)", () => {
    renderWithState(WALLET_STATES.NO_WALLET);
    const dot = document.querySelector("[aria-hidden='true'].rounded-full");
    expect(dot?.className).toContain("bg-slate-600");
  });
});
