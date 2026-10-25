import freighter from "@stellar/freighter-api";
import { networkPassphrase } from "./rpc.js";

const {
  isConnected: sdkIsConnected,
  requestAccess: sdkRequestAccess,
  getAddress: sdkGetAddress,
  getNetworkDetails: sdkGetNetworkDetails,
  signTransaction: sdkSignTransaction,
} = freighter;

export class SignatureCancelled extends Error {
  constructor() { super("Signature cancelled"); this.name = "SignatureCancelled"; }
}
export function walletError(error) {
  const message = typeof error === "string" ? error : error?.message || "Freighter request failed.";
  if (error?.code === -4 || /(?:user.*(?:reject|declin|cancel)|(?:reject|declin|cancel).*user)/i.test(message)) {
    return new SignatureCancelled();
  }
  return new Error(message);
}
async function checkNetwork() {
  const result = await sdkGetNetworkDetails();
  if (result.error) throw walletError(result.error);
  if (result.networkPassphrase !== networkPassphrase()) throw new Error("Switch Freighter to the configured Stellar network, then reconnect.");
}
/** Connect Freighter via @stellar/freighter-api, checking the configured network. */
export async function connectFreighter() {
  const installed = await sdkIsConnected();
  if (!installed.isConnected) throw new Error("Install or unlock Freighter to connect your wallet.");
  const result = await sdkRequestAccess();
  if (result.error) throw walletError(result.error);
  if (!result.address) throw new Error("Freighter did not return an account.");
  await checkNetwork();
  return result.address;
}
/** Sign with Freighter after re-checking network and that the signer account did not change. */
export async function signWithFreighter(xdr, options) {
  await checkNetwork();
  const current = await sdkGetAddress();
  if (current.error) throw walletError(current.error);
  if (current.address !== options.address) throw new Error("Wallet account changed. Reconnect before funding.");
  const result = await sdkSignTransaction(xdr, options);
  if (result.error) throw walletError(result.error);
  return result;
}

/**
 * Minimal Freighter wallet adapter.
 *
 * Wraps window.freighter / window.freighterApi so that the rest of the app
 * never accesses the global directly.  All functions return `null` /
 * `false` when Freighter is not installed or when called in a non-browser
 * environment (SSR, node:test).
 *
 * NOTE: Freighter injects itself as `window.freighterApi` (v1.7+) and also
 * as `window.freighter` for legacy callers.  We prefer `freighterApi`.
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

// --- Balance/signing helpers (investor balance + trustline PR) ---

export function getFreighterApi() {
  if (typeof window !== "undefined" && window.freighterApi) return window.freighterApi;
  return null;
}

export async function isFreighterConnected() {
  const api = getFreighterApi();
  if (!api || !api.isConnected) return false;
  try {
    const res = await api.isConnected();
    return Boolean(res?.isConnected ?? res);
  } catch {
    return false;
  }
}

/** Current wallet address, or null when unavailable/unauthorised. */
export async function getWalletAddress() {
  const api = getFreighterApi();
  if (!api || !api.getAddress) return null;
  try {
    const res = await api.getAddress();
    const address = res?.address ?? res;
    return typeof address === "string" && address ? address : null;
  } catch {
    return null;
  }
}

/** Sign a transaction XDR with Freighter on the given network passphrase. */
export async function signTransaction(xdr, networkPassphrase) {
  const api = getFreighterApi();
  if (!api || !api.signTransaction) throw new Error("Freighter is not available");
  const res = await api.signTransaction(xdr, { networkPassphrase });
  return res?.signedTxXdr ?? res;
}
