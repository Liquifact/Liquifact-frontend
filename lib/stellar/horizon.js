/**
 * Horizon account helpers.
 *
 * Uses the Horizon REST API directly — no SDK dependency needed.
 */

import { getNetwork } from "./networks.js";

/**
 * Fetch the raw Horizon account record for `address` on `network`.
 *
 * @param {string} address  Stellar public key (G…)
 * @param {string} network  "testnet" | "mainnet" | "pubnet"
 * @returns {Promise<object|null>}  The Horizon account object, or null when
 *   the account does not exist (404) or is unreachable.
 */
export async function fetchAccount(address, network = "testnet") {
  const { horizonUrl } = getNetwork(network);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `${horizonUrl}/accounts/${encodeURIComponent(address)}`,
      { signal: controller.signal },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Return a summary of relevant on-chain state for `address`.
 *
 * @param {string} address
 * @param {string} network
 * @returns {Promise<{ exists: boolean, xlmBalance: number, trustlines: string[] }>}
 */
export async function getAccountState(address, network = "testnet") {
  const account = await fetchAccount(address, network);
  if (!account) return { exists: false, xlmBalance: 0, trustlines: [] };

  const xlmBalance = account.balances
    ? parseFloat(
        account.balances.find((b) => b.asset_type === "native")?.balance ?? "0",
      )
    : 0;

  const trustlines = (account.balances ?? [])
    .filter((b) => b.asset_type !== "native" && b.asset_code)
    .map((b) => b.asset_code.toUpperCase());

  return { exists: true, xlmBalance, trustlines };
}
