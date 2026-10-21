import { KNOWN_ASSETS, sacContractId, NETWORK_PASSPHRASES } from "./assets.js";

const DEFAULT_NETWORK = "testnet";

export function identifyToken(tokenId, network = DEFAULT_NETWORK) {
  const assets = KNOWN_ASSETS[network] || {};
  for (const key of Object.keys(assets)) {
    const asset = assets[key];
    try {
      if (sacContractId(asset, NETWORK_PASSPHRASES[network]) === tokenId) {
        return { ...asset, decimals: 7, network };
      }
    } catch (e) {}
  }
  // try direct code match? no
  return { unknown: true, tokenId };
}

export function checkCurrency(invoiceCurrency, identified) {
  if (!identified || identified.unknown) return { ok: false, reason: "unknown-token" };
  if (identified.decimals !== 7) return { ok: false, reason: "decimals" };
  if (identified.code !== invoiceCurrency) return { ok: false, reason: "mismatch" };
  return { ok: true, reason: "match" };
}

export async function resolveFundingToken(contractId) {
  // Minimal: return contractId as token id placeholder; real RPC later.
  return contractId;
}

export function useFundingTokenCheck(invoice) {
  // React hook placeholder; component handles async.
  return { ok: true, reason: "match", loading: false };
}
