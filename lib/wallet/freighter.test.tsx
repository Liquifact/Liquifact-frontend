// lib/wallet/freighter.test.tsx
/**
 * Tests for lib/wallet/freighter.js
 */

import {
  isFreighterConnected,
  connectFreighter,
  getFreighterNetwork,
  isExpectedNetwork,
  assertExpectedNetwork,
  WrongNetworkError,
} from "./freighter";

jest.mock("@stellar/freighter-api", () => ({
  isConnected: jest.fn(),
  requestAccess: jest.fn(),
  getNetworkDetails: jest.fn(),
}));

import { isConnected, requestAccess, getNetworkDetails } from "@stellar/freighter-api";

const mockIsConnected = isConnected as jest.Mock;
const mockRequestAccess = requestAccess as jest.Mock;
const mockGetNetworkDetails = getNetworkDetails as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
});

// ---------------------------------------------------------------------------
// WrongNetworkError
// ---------------------------------------------------------------------------

describe("WrongNetworkError", () => {
  it("formats message when actual network is known", () => {
    const err = new WrongNetworkError("public", "testnet");
    expect(err.message).toBe('Wallet is on "public" but the app requires "testnet"');
    expect(err.name).toBe("WrongNetworkError");
    expect(err.actual).toBe("public");
    expect(err.expected).toBe("testnet");
    expect(err).toBeInstanceOf(Error);
  });

  it("formats message when actual network is null (unreadable)", () => {
    const err = new WrongNetworkError(null, "testnet");
    expect(err.message).toBe('Unable to read wallet network; the app requires "testnet"');
    expect(err.actual).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isFreighterConnected
// ---------------------------------------------------------------------------

describe("isFreighterConnected", () => {
  it("returns true when the extension is installed and connected", async () => {
    mockIsConnected.mockResolvedValue(true);
    expect(await isFreighterConnected()).toBe(true);
  });

  it("returns false when the extension reports not connected", async () => {
    mockIsConnected.mockResolvedValue(false);
    expect(await isFreighterConnected()).toBe(false);
  });

  it("returns false when isConnected throws", async () => {
    mockIsConnected.mockRejectedValue(new Error("Extension error"));
    expect(await isFreighterConnected()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// connectFreighter
// ---------------------------------------------------------------------------

describe("connectFreighter", () => {
  it("returns the wallet address on a successful connection", async () => {
    mockRequestAccess.mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    expect(await connectFreighter()).toBe("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
  });

  it("throws when the user rejects the connection (empty address)", async () => {
    mockRequestAccess.mockResolvedValue("");
    await expect(connectFreighter()).rejects.toThrow("User rejected connection");
  });

  it("throws when requestAccess itself throws", async () => {
    mockRequestAccess.mockRejectedValue(new Error("User denied"));
    await expect(connectFreighter()).rejects.toThrow("User denied");
  });

  it("throws a fallback message when the error has no message", async () => {
    mockRequestAccess.mockRejectedValue({});
    await expect(connectFreighter()).rejects.toThrow("User rejected connection");
  });
});

// ---------------------------------------------------------------------------
// getFreighterNetwork
// ---------------------------------------------------------------------------

describe("getFreighterNetwork", () => {
  it("returns the lowercased network identifier on success", async () => {
    mockGetNetworkDetails.mockResolvedValue({ network: "TESTNET" });
    expect(await getFreighterNetwork()).toBe("testnet");
  });

  it("returns null when networkDetails has no network property", async () => {
    mockGetNetworkDetails.mockResolvedValue({});
    expect(await getFreighterNetwork()).toBeNull();
  });

  it("returns null when networkDetails is null", async () => {
    mockGetNetworkDetails.mockResolvedValue(null);
    expect(await getFreighterNetwork()).toBeNull();
  });

  it("returns null when getNetworkDetails throws", async () => {
    mockGetNetworkDetails.mockRejectedValue(new Error("Extension unavailable"));
    expect(await getFreighterNetwork()).toBeNull();
  });

  it("does not fall back to 'public' on error (guards against silent mismatch)", async () => {
    mockGetNetworkDetails.mockRejectedValue(new Error("crash"));
    const result = await getFreighterNetwork();
    expect(result).not.toBe("public");
  });
});

// ---------------------------------------------------------------------------
// isExpectedNetwork
// ---------------------------------------------------------------------------

describe("isExpectedNetwork", () => {
  it("returns true when the wallet network matches the configured expected network", async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    mockGetNetworkDetails.mockResolvedValue({ network: "testnet" });
    expect(await isExpectedNetwork()).toBe(true);
  });

  it("returns false when the wallet network does not match", async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    mockGetNetworkDetails.mockResolvedValue({ network: "public" });
    expect(await isExpectedNetwork()).toBe(false);
  });

  it("returns false when the wallet network cannot be read (null)", async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    mockGetNetworkDetails.mockRejectedValue(new Error("crash"));
    expect(await isExpectedNetwork()).toBe(false);
  });

  it("defaults to testnet when NEXT_PUBLIC_STELLAR_NETWORK is not set", async () => {
    mockGetNetworkDetails.mockResolvedValue({ network: "testnet" });
    expect(await isExpectedNetwork()).toBe(true);
  });

  it("is case-insensitive when comparing networks", async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "TESTNET";
    mockGetNetworkDetails.mockResolvedValue({ network: "testnet" });
    expect(await isExpectedNetwork()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// assertExpectedNetwork
// ---------------------------------------------------------------------------

describe("assertExpectedNetwork", () => {
  it("resolves without throwing when the network matches", async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    mockGetNetworkDetails.mockResolvedValue({ network: "testnet" });
    await expect(assertExpectedNetwork()).resolves.toBeUndefined();
  });

  it("throws WrongNetworkError when the network is mismatched", async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    mockGetNetworkDetails.mockResolvedValue({ network: "public" });

    const err = await assertExpectedNetwork().catch((e) => e);
    expect(err).toBeInstanceOf(WrongNetworkError);
    expect(err.name).toBe("WrongNetworkError");
    expect(err.actual).toBe("public");
    expect(err.expected).toBe("testnet");
    expect(err.message).toContain("public");
    expect(err.message).toContain("testnet");
  });

  it("throws WrongNetworkError when getNetworkDetails throws (unreadable network)", async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    mockGetNetworkDetails.mockRejectedValue(new Error("Extension unavailable"));

    const err = await assertExpectedNetwork().catch((e) => e);
    expect(err).toBeInstanceOf(WrongNetworkError);
    expect(err.actual).toBeNull();
    expect(err.message).toContain("Unable to read wallet network");
  });

  it("throws WrongNetworkError when network details returns null", async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    mockGetNetworkDetails.mockResolvedValue(null);

    await expect(assertExpectedNetwork()).rejects.toBeInstanceOf(WrongNetworkError);
  });

  it("uses testnet as the expected network when the env var is absent", async () => {
    mockGetNetworkDetails.mockResolvedValue({ network: "public" });

    const err = await assertExpectedNetwork().catch((e) => e);
    expect(err).toBeInstanceOf(WrongNetworkError);
    expect(err.expected).toBe("testnet");
  });

  it("respects NEXT_PUBLIC_STELLAR_NETWORK = public", async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "public";
    mockGetNetworkDetails.mockResolvedValue({ network: "public" });
    await expect(assertExpectedNetwork()).resolves.toBeUndefined();
  });
});
