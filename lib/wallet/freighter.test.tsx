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
  verifyFreighterProvider,
  WrongNetworkError,
  InvalidProviderError,
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

const GENUINE_FREIGHTER_API = Object.freeze({
  isConnected: jest.fn(),
  requestAccess: jest.fn(),
  getNetworkDetails: jest.fn(),
  getPublicKey: jest.fn(),
  signTransaction: jest.fn(),
  signAuthEntry: jest.fn(),
});

function installSpoofedProvider(api: unknown) {
  (window as unknown as { freighterApi: unknown }).freighterApi = api;
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  if (typeof window !== "undefined") {
    delete (window as unknown as { freighterApi?: unknown }).freighterApi;
  }
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
// InvalidProviderError
// ---------------------------------------------------------------------------

describe("InvalidProviderError", () => {
  it("builds the user-facing message and attaches the reason", () => {
    const err = new InvalidProviderError('missing required method "signTransaction"');
    expect(err.name).toBe("InvalidProviderError");
    expect(err).toBeInstanceOf(Error);
    expect(err.reason).toBe('missing required method "signTransaction"');
    expect(err.message).toContain("integrity check");
    expect(err.message).toContain("genuine browser extension");
    expect(err.message).toContain('missing required method "signTransaction"');
  });

  it("omits the reason suffix when none is provided", () => {
    const err = new InvalidProviderError(undefined);
    expect(err.reason).toBeNull();
    expect(err.message).not.toContain("(Reason:");
  });

  it("coerces falsy reason (empty string) to null", () => {
    const err = new InvalidProviderError("");
    expect(err.reason).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// verifyFreighterProvider
// ---------------------------------------------------------------------------

describe("verifyFreighterProvider", () => {
  it("returns true when window.freighterApi is not present", () => {
    expect(verifyFreighterProvider()).toBe(true);
  });

  it("returns true when the provider has a full genuine-shaped API", () => {
    installSpoofedProvider({ ...GENUINE_FREIGHTER_API });
    expect(verifyFreighterProvider()).toBe(true);
  });

  it("throws InvalidProviderError when provider is not an object", () => {
    installSpoofedProvider("not-an-object" as unknown);
    expect(() => verifyFreighterProvider()).toThrow(InvalidProviderError);
  });

  it("throws when provider object is null (not undefined)", () => {
    installSpoofedProvider(null);
    expect(() => verifyFreighterProvider()).toThrow(InvalidProviderError);
  });

  it("throws when provider is missing a required method", () => {
    const spoof = { ...GENUINE_FREIGHTER_API };
    delete (spoof as unknown as { signAuthEntry?: unknown }).signAuthEntry;
    installSpoofedProvider(spoof);
    const err = new InvalidProviderError("stub");
    try {
      verifyFreighterProvider();
      fail("expected verifyFreighterProvider to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidProviderError);
      expect((e as typeof err).reason).toContain('"signAuthEntry"');
    }
  });

  it("throws when a required 'method' is not a function", () => {
    const spoof = {
      ...GENUINE_FREIGHTER_API,
      signTransaction: "i-am-a-string",
    };
    installSpoofedProvider(spoof);
    const err = new InvalidProviderError("stub");
    try {
      verifyFreighterProvider();
      fail("expected verifyFreighterProvider to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidProviderError);
      expect((e as typeof err).reason).toContain("not a function");
      expect((e as typeof err).reason).toContain('"signTransaction"');
    }
  });

  it("throws when a method is exposed via a getter (accessor hook)", () => {
    const malicious = { ...GENUINE_FREIGHTER_API };
    let callCount = 0;
    Object.defineProperty(malicious, "requestAccess", {
      configurable: true,
      enumerable: true,
      get() {
        callCount += 1;
        return () => Promise.resolve("GFAKE...");
      },
    });
    installSpoofedProvider(malicious);
    expect(() => verifyFreighterProvider()).toThrow(InvalidProviderError);
  });

  it("throws when window.freighterApi itself is an accessor (page-injected hook)", () => {
    Object.defineProperty(window, "freighterApi", {
      configurable: true,
      enumerable: true,
      get() {
        return { ...GENUINE_FREIGHTER_API };
      },
    });
    try {
      expect(() => verifyFreighterProvider()).toThrow(InvalidProviderError);
    } finally {
      delete (window as unknown as { freighterApi?: unknown }).freighterApi;
    }
  });

  it("throws when a method inherits from the prototype chain instead of being own", () => {
    class SpoofBase {
      isConnected = () => Promise.resolve(false);
      requestAccess = () => Promise.resolve("");
      getNetworkDetails = () => Promise.resolve({ network: "testnet" });
      getPublicKey = () => Promise.resolve("");
      signTransaction = () => Promise.resolve("");
    }
    class Spoof extends SpoofBase {}
    Object.defineProperty(Spoof.prototype, "signAuthEntry", {
      value: () => Promise.resolve(""),
      writable: true,
      configurable: true,
      enumerable: true,
    });
    installSpoofedProvider(new Spoof());
    expect(() => verifyFreighterProvider()).toThrow(InvalidProviderError);
  });

  it("rejects a minimal 3-method spoof (only isConnected/requestAccess/getNetworkDetails)", () => {
    const minimalSpoof = {
      isConnected: () => Promise.resolve(true),
      requestAccess: () => Promise.resolve("GABC..."),
      getNetworkDetails: () => Promise.resolve({ network: "testnet" }),
    };
    installSpoofedProvider(minimalSpoof);
    expect(() => verifyFreighterProvider()).toThrow(InvalidProviderError);
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

  it("propagates InvalidProviderError when the provider is a spoofed minimal object", async () => {
    const minimalSpoof = {
      isConnected: () => Promise.resolve(true),
      requestAccess: () => Promise.resolve("GFAKE..."),
      getNetworkDetails: () => Promise.resolve({ network: "testnet" }),
    };
    installSpoofedProvider(minimalSpoof);
    mockIsConnected.mockResolvedValue(true);
    await expect(isFreighterConnected()).rejects.toBeInstanceOf(InvalidProviderError);
  });

  it("propagates InvalidProviderError when requestAccess is a getter hook", async () => {
    const malicious = { ...GENUINE_FREIGHTER_API };
    Object.defineProperty(malicious, "requestAccess", {
      configurable: true,
      enumerable: true,
      get() {
        return () => Promise.resolve("GFAKE...");
      },
    });
    installSpoofedProvider(malicious);
    mockIsConnected.mockResolvedValue(true);
    const err = await isFreighterConnected().catch((e) => e);
    expect(err).toBeInstanceOf(InvalidProviderError);
    expect(err.reason).toContain("accessor");
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

  it("throws InvalidProviderError before invoking requestAccess on a minimal spoofed provider", async () => {
    const requestAccessSpy = jest.fn(() => Promise.resolve("GFAKE..."));
    const minimalSpoof = {
      isConnected: () => Promise.resolve(true),
      requestAccess: requestAccessSpy,
      getNetworkDetails: () => Promise.resolve({ network: "testnet" }),
    };
    installSpoofedProvider(minimalSpoof);
    mockRequestAccess.mockImplementation(requestAccessSpy);

    const err = await connectFreighter().catch((e) => e);
    expect(err).toBeInstanceOf(InvalidProviderError);
    expect(requestAccessSpy).not.toHaveBeenCalled();
  });

  it("rejects InvalidProviderError (not a generic Error) when window.freighterApi is an accessor", async () => {
    Object.defineProperty(window, "freighterApi", {
      configurable: true,
      enumerable: true,
      get() {
        return { ...GENUINE_FREIGHTER_API };
      },
    });
    try {
      const err = await connectFreighter().catch((e) => e);
      expect(err).toBeInstanceOf(InvalidProviderError);
      expect(err.name).toBe("InvalidProviderError");
    } finally {
      delete (window as unknown as { freighterApi?: unknown }).freighterApi;
    }
  });

  it("preserves InvalidProviderError rather than wrapping it in a generic rejection message", async () => {
    const spoof = { ...GENUINE_FREIGHTER_API };
    delete (spoof as unknown as { signAuthEntry?: unknown }).signAuthEntry;
    installSpoofedProvider(spoof);

    const err = await connectFreighter().catch((e) => e);
    expect(err).toBeInstanceOf(InvalidProviderError);
    expect(err.message).toContain("integrity check");
    expect(err.message).not.toMatch(/user rejected/i);
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
