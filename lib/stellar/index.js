/**
 * Stellar helpers barrel export.
 * Re-exports from rpc.js, txStore.js, pollTx.js and adds explorer URL helpers.
 */

export * from "./rpc.js";
export * from "./txStore.js";
export * from "./pollTx.js";
export { shortAddress } from "../format.js";

import { CONTRACT_ID, NETWORK, EXPLORER_URL } from "../config.js";

/**
 * Build a stellar.expert transaction URL for the current network.
 * @param {string} hash - 64-char transaction hash
 * @returns {string}
 */
export function explorerTxUrl(hash) {
  const base = EXPLORER_URL.replace(`/contract/${CONTRACT_ID}`, "");
  return `${base}/tx/${hash}`;
}

/**
 * Build a stellar.expert contract URL (re-export from config for convenience).
 */
export function explorerContractUrl() {
  return EXPLORER_URL;
}