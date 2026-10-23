import {
  requestAccess as freighterRequestAccess,
  signTransaction as freighterSign,
  getNetwork,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "./network.js";

/**
 * Minimal Freighter wallet adapter.
 *
 * Wraps window.freighter / window.freighterApi so that the rest of the app
 * never accesses the global directly. All functions return `null` / `false`
 * when Freighter is not installed or when called in a non-browser
 * environment (SSR, node:test).
 *
 * NOTE: Freighter injects itself as `window.freighterApi` (v1.7+) and also
 * as `window.freighter` for legacy callers. We prefer `freighterApi`.
 */

/** @returns {object|null} raw Freighter API object, or null when absent */
function api() {
  if (typeof window === "undefined") return null;
  return window.freighterApi ?? window.freighter ?? null;
}

/** Whether the Freighter extension is installed. */
export function hasFreighter() {
  return api() !== null;
}

/** True when a Freighter-compatible wallet injected its API into the page. */
export function isFreighterAvailable() {
  return hasFreighter();
}

/**
 * Whether a public key has been authorised for the current origin.
 * Returns false when Freighter is absent or on SSR.
 */
export async function isConnected() {
  const a = api();
  if (!a) return false;
  try {
    // Freighter ≥1.7 exposes isConnected(); older builds use isAllowed()
    const result =
      typeof a.isConnected === "function"
        ? await a.isConnected()
        : typeof a.isAllowed === "function"
          ? await a.isAllowed()
          : false;
    // Some versions return { isConnected: true }, others return a boolean
    if (typeof result === "object" && result !== null) {
      return result.isConnected ?? result.isAllowed ?? false;
    }
    return Boolean(result);
  } catch {
    return false;
  }
}

/**
 * Prompt the user to grant access (opens the Freighter popup).
 * Returns the public key on success, or null on rejection / error.
 */
export async function requestAccess() {
  const a = api();
  if (!a) return null;
  try {
    const result =
      typeof a.requestAccess === "function"
        ? await a.requestAccess()
        : typeof a.setAllowed === "function"
          ? await a.setAllowed()
          : null;
    // result may be the public key string directly
    if (typeof result === "string") return result;
    return result?.publicKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Return the active public key, or null when disconnected / absent.
 */
export async function getPublicKey() {
  const a = api();
  if (!a) return null;
  try {
    const connected = await isConnected();
    if (!connected) return null;
    const key =
      typeof a.getPublicKey === "function" ? await a.getPublicKey() : null;
    return typeof key === "string" && key ? key : null;
  } catch {
    return null;
  }
}

/**
 * Return the network name Freighter is currently set to, lower-cased.
 * e.g. "testnet", "mainnet", "futurenet" — or null on error.
 */
export async function getNetworkName() {
  const a = api();
  if (!a) return null;
  try {
    const result =
      typeof a.getNetwork === "function" ? await a.getNetwork() : null;
    if (!result) return null;
    // Some versions return { network: "TESTNET" }, others return the string
    const raw = typeof result === "string" ? result : result.network ?? null;
    return raw ? raw.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Ask the wallet for access. Resolves to the investor's address.
 * Throws with a human-readable message on rejection or missing wallet.
 */
export async function connectFreighter() {
  if (!isFreighterAvailable()) {
    throw new Error("No Stellar wallet found. Install Freighter to fund on-chain.");
  }
  const { address, error } = await freighterRequestAccess();
  if (error) throw new Error(error.message || "Wallet access was rejected.");
  if (!address) throw new Error("Wallet did not return an address.");
  return address;
}

/**
 * Sign a transaction XDR with Freighter and return the signed XDR.
 * Throws when the wallet is on the wrong network.
 */
export async function signTransactionXdr(xdr, { address, networkPassphrase = NETWORK_PASSPHRASE } = {}) {
  const net = await getNetwork().catch(() => null);
  if (net?.networkPassphrase && net.networkPassphrase !== networkPassphrase) {
    throw new Error(`Freighter is on the wrong network. Switch it to ${networkPassphrase}.`);
  }
  const res = await freighterSign(xdr, { address, networkPassphrase });
  if (res?.error) throw new Error(res.error.message || "Transaction signing was rejected.");
  if (!res?.signedTxXdr) throw new Error("Wallet did not return a signed transaction.");
  return res.signedTxXdr;
}
