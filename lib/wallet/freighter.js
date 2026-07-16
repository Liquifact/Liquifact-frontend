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

/**
 * Checks if the Freighter wallet extension is installed and accessible.
 * @returns {Promise<boolean>} True if installed, false otherwise.
 */
export async function isFreighterConnected() {
  try {
    return await getFreighterApi().isConnected();
  } catch (error) {
    return false;
  }
}

/**
 * Requests connection to the Freighter wallet.
 * Triggers the extension popup if not already connected.
 * @returns {Promise<string>} The connected account's Stellar public key.
 * @throws {Error} If the user rejects the connection or an error occurs.
 */
export async function connectFreighter() {
  try {
    const address = await getFreighterApi().requestAccess();
    if (!address) {
      throw new Error("User rejected connection");
    }
    return address;
  } catch (error) {
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
    const networkDetails = await getFreighterApi().getNetworkDetails();
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
