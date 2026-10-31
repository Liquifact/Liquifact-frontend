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
 * Adapter around `@stellar/freighter-api`.
 *
 * The Freighter API never throws for a rejected request: it resolves with
 * `{ error: { code, message } }`. This module normalises that once, so the
 * rest of the app only ever sees a `WalletError` with a stable `code`.
 *
 * The adapter is intentionally narrow (Freighter only) so that other wallets
 * (xBull, Albedo, WalletConnect) can be added later behind the same
 * interface.
 */

export const WALLET_ERROR_CODE = Object.freeze({
  /** No wallet extension is installed in the browser. */
  NO_WALLET: "NO_WALLET",
  /** The user declined the request in the extension. */
  USER_REJECTED: "USER_REJECTED",
  /** Anything else the extension reported. */
  UNKNOWN: "UNKNOWN",
});

/**
 * Error codes the Freighter extension uses when the user declines a request.
 *
 * @see https://github.com/stellar/freighter
 */
const USER_REJECTED_CODES = new Set([-4, 4001, 4100]);

/**
 * A wallet failure with a stable, machine readable code.
 */
export class WalletError extends Error {
  /**
   * @param {string} code one of {@link WALLET_ERROR_CODE}
   * @param {string} message human readable reason
   * @param {unknown} [cause] the original error, when there is one
   */
  constructor(code, message, cause) {
    super(message);
    this.name = "WalletError";
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

/** Test seam: an injected API is used instead of the real extension. */
let injectedApi = null;
/** Cached dynamic import of the real extension API. */
let cachedApi = null;

/**
 * Injects a Freighter-compatible API. Used by the tests; never call this in
 * application code.
 *
 * @param {object | null} api
 */
export function setFreighterApi(api) {
  injectedApi = api;
  cachedApi = null;
}

/**
 * Removes an injected API and drops the cached import.
 */
export function resetFreighterApi() {
  injectedApi = null;
  cachedApi = null;
}

/** Detect through the supported SDK API, never an assumed injected global. */
export async function isAvailable() {
  if (typeof window === "undefined" && !injectedApi) return false;
  const api = await getApi();
  try {
    const result = unwrap(await api.isConnected());
    return Boolean(result?.isConnected);
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw toWalletError(error);
  }
}

/**
 * Normalises a Freighter error payload into a {@link WalletError}.
 *
 * @param {{ code?: number, message?: string } | null | undefined} error
 * @returns {WalletError}
 */
export function toWalletError(error) {
  const message = (error && error.message) || "The wallet extension returned an error.";
  const code = error && typeof error.code === "number" ? error.code : null;
  if (code !== null && USER_REJECTED_CODES.has(code)) {
    return new WalletError(WALLET_ERROR_CODE.USER_REJECTED, message, error);
  }
  return new WalletError(WALLET_ERROR_CODE.UNKNOWN, message, error);
}

/**
 * Runs a call against the extension and maps every failure onto a
 * {@link WalletError}.
 *
 * @param {() => Promise<unknown>} operation
 * @returns {Promise<unknown>}
 */
async function callFreighter(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof WalletError) throw error;
    if (!(await isAvailable())) {
      throw new WalletError(
        WALLET_ERROR_CODE.NO_WALLET,
        "No Stellar wallet extension was detected in this browser.",
        error,
      );
    }
    throw new WalletError(
      WALLET_ERROR_CODE.UNKNOWN,
      (error && error.message) || "The wallet request failed.",
      error,
    );
  }
}

/**
 * Throws when a Freighter result carries an error payload.
 *
 * @param {{ error?: object } | null | undefined} result
 * @returns {object} the result without its error
 */
function unwrap(result) {
  if (result && result.error) throw toWalletError(result.error);
  return result;
}

/**
 * Asks the extension for the API, using the injected one when present.
 *
 * The extension is imported dynamically so that nothing touches `window`
 * during server rendering.
 *
 * @returns {Promise<object>}
 */
async function getApi() {
  if (injectedApi) return injectedApi;
  if (!cachedApi) {
    cachedApi = import("@stellar/freighter-api").then((mod) => mod.default || mod);
  }
  return cachedApi;
}

/**
 * Requests access to the wallet. Resolves with the selected address.
 *
 * @returns {Promise<string>}
 */
export async function connect() {
  if (!(await isAvailable())) {
    throw new WalletError(WALLET_ERROR_CODE.NO_WALLET, "No Stellar wallet extension was detected in this browser.");
  }
  const api = await getApi();
  const result = unwrap(await callFreighter(() => api.requestAccess()));
  if (!result || typeof result.address !== "string" || result.address === "") {
    throw new WalletError(
      WALLET_ERROR_CODE.UNKNOWN,
      "The wallet did not return an address.",
    );
  }
  return result.address;
}

/**
 * Reads the address of the currently active account.
 *
 * @returns {Promise<string>}
 */
export async function getAddress() {
  const api = await getApi();
  const result = unwrap(await callFreighter(() => api.getAddress()));
  if (!result || typeof result.address !== "string" || result.address === "") {
    throw new WalletError(
      WALLET_ERROR_CODE.UNKNOWN,
      "The wallet did not return an address.",
    );
  }
  return result.address;
}

/**
 * True when the site is already allowed to talk to the extension. Used for
 * the silent session restore: no prompt is shown when this is true.
 *
 * @returns {Promise<boolean>}
 */
export async function isAllowed() {
  const api = await getApi();
  const result = unwrap(await callFreighter(() => api.isAllowed()));
  return Boolean(result && result.isAllowed);
}

/**
 * Reads the network the extension is currently on.
 *
 * @returns {Promise<{ network: string | null, networkPassphrase: string | null }>}
 */
export async function getNetwork() {
  const api = await getApi();
  const result = unwrap(await callFreighter(() => api.getNetworkDetails()));
  return {
    network: (result && result.network) || null,
    networkPassphrase: (result && result.networkPassphrase) || null,
  };
}

/**
 * Signs a transaction XDR with the connected account.
 *
 * @param {string} xdr the transaction to sign
 * @param {{ networkPassphrase?: string, address?: string }} [options]
 * @returns {Promise<string>} the signed transaction XDR
 */
export async function signTransaction(xdr, options = {}) {
  const api = await getApi();
  const result = unwrap(await callFreighter(() => api.signTransaction(xdr, options)));
  if (!result || typeof result.signedTxXdr !== "string") {
    throw new WalletError(
      WALLET_ERROR_CODE.UNKNOWN,
      "The wallet did not return a signed transaction.",
    );
  }
  return result.signedTxXdr;
}

/**
 * Subscribes to account and network changes inside the extension.
 *
 * @param {(change: { address: string | null, network: string | null, networkPassphrase: string | null, error?: WalletError }) => void} callback
 * @returns {Promise<() => void>} an unsubscribe function
 */
export async function watch(callback) {
  const api = await getApi();
  const watcher = new api.WatchWalletChanges();
  const started = watcher.watch((params) => {
    if (params && params.error) {
      callback({
        address: null,
        network: null,
        networkPassphrase: null,
        error: toWalletError(params.error),
      });
      return;
    }
    callback({
      address: (params && params.address) || null,
      network: (params && params.network) || null,
      networkPassphrase: (params && params.networkPassphrase) || null,
    });
  });
  if (started && started.error) throw toWalletError(started.error);
  return () => watcher.stop();
}

// Preserve the existing onboarding API while sharing the supported SDK adapter.
export async function hasFreighter() {
  try { return await isAvailable(); } catch { return false; }
}
export async function isConnected() {
  try { return await isAllowed(); } catch { return false; }
}
export async function requestAccess() {
  try { return await connect(); } catch { return null; }
}
export async function getPublicKey() {
  try { return await isAllowed() ? await getAddress() : null; } catch { return null; }
}
export async function getNetworkName() {
  try { return (await getNetwork()).network?.toLowerCase() ?? null; } catch { return null; }
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

/** Sign a prepared Soroban transaction with Freighter. */
export async function signTransaction(xdr, networkPassphrase) {
  const a = api();
  if (!a || typeof a.signTransaction !== "function") {
    throw new Error("Freighter is required to sign this transaction.");
  }
  const address = await getPublicKey();
  if (!address) throw new Error("Connect your Freighter wallet before continuing.");

  const result = await a.signTransaction(xdr, {
    address,
    networkPassphrase,
  });
  const signedXdr =
    typeof result === "string" ? result : result?.signedTxXdr ?? result?.signedXdr;
  if (typeof signedXdr !== "string" || !signedXdr) {
    throw new Error(result?.error || "Freighter did not return a signed transaction.");
  }
  return signedXdr;
}
