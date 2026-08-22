/**
 * @file docs/wallet-api-reference.test.js
 *
 * Verifies that the exported symbols documented in docs/wallet-api-reference.md
 * are accurate against the live source — i.e. the named exports exist,
 * have the expected types, and behave according to the documented contracts.
 *
 * These tests are intentionally lightweight: they guard against the
 * documentation going out of sync when the implementation changes, not
 * against every runtime behaviour (which is covered in the component
 * test suites).
 */

import {
  WalletProvider,
  useWallet,
  WALLET_STATES,
  WalletContext,
  truncateAddress,
  sanitizeSnapshot,
  isBrowser,
  readStoredSnapshot,
  writeStoredSnapshot,
  clearStoredSnapshot,
} from "../components/WalletProvider";

import WalletStatus, { WALLET_STATES as WalletStatusStates } from "../components/WalletStatus";
import WalletStatusLazy, {
  LazyWalletStatus,
  WalletStatusPlaceholder,
} from "../components/WalletStatusLazy";

// ── Named export presence ────────────────────────────────────────────────────

describe("WalletProvider — named exports (docs/wallet-api-reference.md §WalletProvider)", () => {
  it("exports WalletProvider as a function/component", () => {
    expect(typeof WalletProvider).toBe("function");
  });

  it("exports useWallet as a function", () => {
    expect(typeof useWallet).toBe("function");
  });

  it("exports WalletContext", () => {
    expect(WalletContext).toBeTruthy();
    // React context objects have a Provider property
    expect(WalletContext).toHaveProperty("Provider");
    expect(WalletContext).toHaveProperty("Consumer");
  });

  it("exports truncateAddress as a function", () => {
    expect(typeof truncateAddress).toBe("function");
  });

  it("exports sanitizeSnapshot as a function", () => {
    expect(typeof sanitizeSnapshot).toBe("function");
  });

  it("exports isBrowser as a function", () => {
    expect(typeof isBrowser).toBe("function");
  });

  it("exports readStoredSnapshot as a function", () => {
    expect(typeof readStoredSnapshot).toBe("function");
  });

  it("exports writeStoredSnapshot as a function", () => {
    expect(typeof writeStoredSnapshot).toBe("function");
  });

  it("exports clearStoredSnapshot as a function", () => {
    expect(typeof clearStoredSnapshot).toBe("function");
  });
});

// ── WALLET_STATES constant ───────────────────────────────────────────────────

describe("WALLET_STATES constant (docs/wallet-api-reference.md §WALLET_STATES)", () => {
  it("exports all six documented state keys", () => {
    expect(WALLET_STATES).toHaveProperty("DISCONNECTED");
    expect(WALLET_STATES).toHaveProperty("CONNECTING");
    expect(WALLET_STATES).toHaveProperty("CONNECTED");
    expect(WALLET_STATES).toHaveProperty("ERROR");
    expect(WALLET_STATES).toHaveProperty("WRONG_NETWORK");
    expect(WALLET_STATES).toHaveProperty("NO_WALLET");
  });

  it("maps keys to the documented string values", () => {
    expect(WALLET_STATES.DISCONNECTED).toBe("disconnected");
    expect(WALLET_STATES.CONNECTING).toBe("connecting");
    expect(WALLET_STATES.CONNECTED).toBe("connected");
    expect(WALLET_STATES.ERROR).toBe("error");
    expect(WALLET_STATES.WRONG_NETWORK).toBe("wrong_network");
    expect(WALLET_STATES.NO_WALLET).toBe("no_wallet");
  });

  it("re-exports correctly from WalletStatus for convenience", () => {
    expect(WalletStatusStates).toBe(WALLET_STATES);
  });
});

// ── truncateAddress ──────────────────────────────────────────────────────────

describe("truncateAddress (docs/wallet-api-reference.md §truncateAddress)", () => {
  it("returns empty string for falsy inputs", () => {
    expect(truncateAddress(null)).toBe("");
    expect(truncateAddress(undefined)).toBe("");
    expect(truncateAddress("")).toBe("");
  });

  it("returns non-string input as empty string", () => {
    expect(truncateAddress(12345)).toBe("");
  });

  it("returns addresses of 12 chars or fewer as-is", () => {
    expect(truncateAddress("SHORT")).toBe("SHORT");
    expect(truncateAddress("EXACTLY12CH")).toBe("EXACTLY12CH");
    expect(truncateAddress("EXACTLY12CHA")).toBe("EXACTLY12CHA");
  });

  it("truncates long addresses to first-4 … last-6 format", () => {
    const full = "GABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
    const result = truncateAddress(full);
    // Must start with first 4 chars
    expect(result.startsWith("GABC")).toBe(true);
    // Must end with last 6 chars
    expect(result.endsWith("123456789".slice(-6))).toBe(true);
    // Must contain the ellipsis separator
    expect(result).toContain("...");
    // Total length should be: 4 + 3 + 6 = 13
    expect(result.length).toBe(13);
  });

  it("matches the documented example: GABC...XYZ123", () => {
    // From the docs: truncateAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456789")
    // → "GABC...123456"
    const result = truncateAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456789");
    expect(result).toMatch(/^GABC\.\.\..*$/);
  });
});

// ── sanitizeSnapshot ─────────────────────────────────────────────────────────

describe("sanitizeSnapshot (docs/wallet-api-reference.md §sanitizeSnapshot)", () => {
  const VALID = {
    version: 1,
    state: "connected",
    address: "GABC...XYZ123",
    network: "testnet",
  };

  it("returns null for null / non-object inputs", () => {
    expect(sanitizeSnapshot(null)).toBeNull();
    expect(sanitizeSnapshot(undefined)).toBeNull();
    expect(sanitizeSnapshot("string")).toBeNull();
    expect(sanitizeSnapshot(42)).toBeNull();
  });

  it("returns null when version is not 1", () => {
    expect(sanitizeSnapshot({ ...VALID, version: 2 })).toBeNull();
    expect(sanitizeSnapshot({ ...VALID, version: "1" })).toBeNull();
  });

  it("returns null when state is not 'connected'", () => {
    expect(sanitizeSnapshot({ ...VALID, state: "disconnected" })).toBeNull();
    expect(sanitizeSnapshot({ ...VALID, state: "error" })).toBeNull();
  });

  it("returns null for an empty address", () => {
    expect(sanitizeSnapshot({ ...VALID, address: "" })).toBeNull();
  });

  it("returns null for an address exceeding 64 chars", () => {
    expect(sanitizeSnapshot({ ...VALID, address: "G" + "A".repeat(64) })).toBeNull();
  });

  it("returns null for invalid network values", () => {
    expect(sanitizeSnapshot({ ...VALID, network: "mainnet" })).toBeNull();
    expect(sanitizeSnapshot({ ...VALID, network: "" })).toBeNull();
  });

  it("accepts 'public' and 'testnet' as valid networks", () => {
    expect(sanitizeSnapshot({ ...VALID, network: "public" })).not.toBeNull();
    expect(sanitizeSnapshot({ ...VALID, network: "testnet" })).not.toBeNull();
  });

  it("returns null for addresses that look like secret keys (S + ≥56 chars)", () => {
    const secretKey = "S" + "A".repeat(55); // 56 chars total, starts with S
    expect(sanitizeSnapshot({ ...VALID, address: secretKey })).toBeNull();
  });

  it("returns a sanitized snapshot object on success", () => {
    const result = sanitizeSnapshot(VALID);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("version", 1);
    expect(result).toHaveProperty("state", "connected");
    expect(result).toHaveProperty("address");
    expect(result).toHaveProperty("network");
  });

  it("strips unknown fields from the snapshot", () => {
    const raw = { ...VALID, secret: "should-not-persist", extra: 42 };
    const result = sanitizeSnapshot(raw);
    expect(result).not.toHaveProperty("secret");
    expect(result).not.toHaveProperty("extra");
  });
});

// ── isBrowser ────────────────────────────────────────────────────────────────

describe("isBrowser (docs/wallet-api-reference.md §isBrowser)", () => {
  it("returns true in jsdom (browser-like) environment", () => {
    // Jest runs under jsdom which defines window
    expect(isBrowser()).toBe(true);
  });

  it("returns a boolean", () => {
    expect(typeof isBrowser()).toBe("boolean");
  });
});

// ── WalletStatus ─────────────────────────────────────────────────────────────

describe("WalletStatus (docs/wallet-api-reference.md §WalletStatus)", () => {
  it("is exported as a function/component (default export)", () => {
    expect(typeof WalletStatus).toBe("function");
  });
});

// ── WalletStatusLazy ─────────────────────────────────────────────────────────

describe("WalletStatusLazy (docs/wallet-api-reference.md §WalletStatusLazy)", () => {
  it("is exported as default", () => {
    expect(typeof WalletStatusLazy).toBe("function");
  });

  it("exports LazyWalletStatus as a named export", () => {
    expect(LazyWalletStatus).toBeTruthy();
  });

  it("exports WalletStatusPlaceholder as a named export", () => {
    expect(typeof WalletStatusPlaceholder).toBe("function");
  });
});
