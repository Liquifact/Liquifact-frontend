import { KNOWN_ASSETS, NETWORK_PASSPHRASES, sacContractId } from "../stellar/assets.js";
import { simulateCall } from "../stellar/rpc.js";
import { CONTRACT_ID, NETWORK } from "../config.js";

/**
 * Map an on-chain token contract id to a known asset for the network.
 * Matching is by SAC contract id, which is derived from code + issuer, so a
 * token labelled "USDC" from a different issuer never matches.
 * @returns {{code: string, issuer: string, decimals: number, network: string} | {unknown: true, tokenId: string}}
 */
export function identifyToken(tokenId, network = NETWORK) {
  const assets = KNOWN_ASSETS[network] || {};
  const passphrase = NETWORK_PASSPHRASES[network];
  for (const asset of Object.values(assets)) {
    try {
      if (passphrase && sacContractId(asset, passphrase) === tokenId) {
        return { ...asset, decimals: 7, network };
      }
    } catch {
      // ignore malformed registry entries
    }
  }
  return { unknown: true, tokenId };
}

/**
 * Compare the invoice's advertised currency with the identified escrow token.
 * @returns {{ok: boolean, reason: "match" | "mismatch" | "unknown-token" | "decimals"}}
 */
export function checkCurrency(invoiceCurrency, identified) {
  if (!identified || identified.unknown) return { ok: false, reason: "unknown-token" };
  if (identified.decimals !== 7) return { ok: false, reason: "decimals" };
  if (identified.code !== invoiceCurrency) return { ok: false, reason: "mismatch" };
  return { ok: true, reason: "match" };
}

/** Read the escrow's funding token contract id via `get_funding_token`. */
export async function resolveFundingToken(contractId = CONTRACT_ID, { call = simulateCall } = {}) {
  const token = await call({ contractId: contractId || CONTRACT_ID, method: "get_funding_token" });
  if (typeof token !== "string" || !token) throw new Error("get_funding_token returned no address");
  return token;
}
