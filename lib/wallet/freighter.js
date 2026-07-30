import { isConnected, requestAccess, getNetworkDetails } from "@stellar/freighter-api";

export class WrongNetworkError extends Error {
  constructor(actual, expected) {
    const msg = actual
      ? `Wallet is on "${actual}" but the app requires "${expected}"`
      : `Unable to read wallet network; the app requires "${expected}"`;
    super(msg);
    this.name = "WrongNetworkError";
    this.actual = actual;
    this.expected = expected;
  }
}

export class InvalidProviderError extends Error {
  constructor(reason) {
    const msg =
      "The detected Freighter wallet provider failed an integrity check and may " +
      "not be the genuine browser extension. Please verify your extension is installed " +
      "correctly and reload the page." +
      (reason ? ` (Reason: ${reason})` : "");
    super(msg);
    this.name = "InvalidProviderError";
    this.reason = reason || null;
  }
}

const FREIGHTER_REQUIRED_METHODS = Object.freeze([
  "isConnected",
  "requestAccess",
  "getNetworkDetails",
  "getPublicKey",
  "signTransaction",
  "signAuthEntry",
]);

function isBrowserEnv() {
  return typeof window !== "undefined";
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function verifyProviderStructure(freighterApi) {
  if (!freighterApi || typeof freighterApi !== "object") {
    return "provider is not an object";
  }

  for (const method of FREIGHTER_REQUIRED_METHODS) {
    if (!hasOwn(freighterApi, method)) {
      return `missing required method "${method}"`;
    }
    const descriptor = Object.getOwnPropertyDescriptor(freighterApi, method);
    if (!descriptor) {
      return `no property descriptor for "${method}"`;
    }
    if (descriptor.get || descriptor.set) {
      return `"${method}" is defined as an accessor (getter/setter)`;
    }
    if (typeof freighterApi[method] !== "function") {
      return `"${method}" is not a function`;
    }
  }

  const windowDescriptor = Object.getOwnPropertyDescriptor(window, "freighterApi");
  if (windowDescriptor && (windowDescriptor.get || windowDescriptor.set)) {
    return "window.freighterApi is exposed via an accessor (getter/setter)";
  }

  return null;
}

export function verifyFreighterProvider() {
  if (!isBrowserEnv()) {
    return true;
  }

  const freighterApi = window.freighterApi;
  if (freighterApi === undefined || freighterApi === null) {
    return true;
  }

  const reason = verifyProviderStructure(freighterApi);
  if (reason !== null) {
    throw new InvalidProviderError(reason);
  }

  return true;
}

/**
 * Checks if the Freighter wallet extension is installed and accessible.
 * Performs a provider-integrity check first when running in the browser so a
 * page-injected spoof cannot advertise itself as a connected wallet.
 * @returns {Promise<boolean>} True if installed, false otherwise.
 * @throws {InvalidProviderError} When a present provider fails the integrity check.
 */
export async function isFreighterConnected() {
  try {
    verifyFreighterProvider();
  } catch (error) {
    if (error instanceof InvalidProviderError) {
      throw error;
    }
    return false;
  }
  try {
    return await isConnected();
  } catch (error) {
    return false;
  }
}

/**
 * Requests connection to the Freighter wallet.
 * Triggers the extension popup if not already connected.
 *
 * Before delegating to `requestAccess` the provider-integrity check is run.
 * A page-injected object that merely mirrors the interface will be rejected
 * before any wallet-facing prompt is issued.
 *
 * @returns {Promise<string>} The connected account's Stellar public key.
 * @throws {InvalidProviderError} When the provider fails the integrity check.
 * @throws {Error} If the user rejects the connection or an error occurs.
 */
export async function connectFreighter() {
  verifyFreighterProvider();
  try {
    const address = await requestAccess();
    if (!address) {
      throw new Error("User rejected connection");
    }
    return address;
  } catch (error) {
    if (error instanceof InvalidProviderError) {
      throw error;
    }
    throw new Error(error.message || "User rejected connection");
  }
}

/**
 * Retrieves the current network from Freighter.
 * Returns null when the network cannot be read so callers can treat an
 * unreadable network as not-expected rather than silently assuming mainnet.
 * @returns {Promise<string|null>} Network identifier (e.g. 'public', 'testnet') or null.
 */
export async function getFreighterNetwork() {
  try {
    const networkDetails = await getNetworkDetails();
    if (networkDetails && networkDetails.network) {
      return networkDetails.network.toLowerCase();
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Returns true when Freighter's active network matches NEXT_PUBLIC_STELLAR_NETWORK.
 * A null (unreadable) network is treated as a mismatch.
 * @returns {Promise<boolean>}
 */
export async function isExpectedNetwork() {
  const expected = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet").toLowerCase();
  const actual = await getFreighterNetwork();
  return actual !== null && actual === expected;
}

/**
 * Asserts that Freighter's active network matches NEXT_PUBLIC_STELLAR_NETWORK.
 * Throws WrongNetworkError when there is a mismatch or the network cannot be read,
 * so funding flows can use this as a hard gate before submitting transactions.
 * @throws {WrongNetworkError}
 */
export async function assertExpectedNetwork() {
  const expected = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet").toLowerCase();
  const actual = await getFreighterNetwork();
  if (actual === null || actual !== expected) {
    throw new WrongNetworkError(actual, expected);
  }
}
