/**
 * Horizon account helpers.
 *
 * Uses the Horizon REST API directly — no SDK dependency needed.
 */

import { getNetwork } from "./networks.js";
import { NETWORK } from "../config.js";
import { DEFAULT_ENDPOINTS, getEndpoints, parseEndpoints, withFailover } from "./endpoints.js";

export const HORIZON_URLS = {
  testnet: DEFAULT_ENDPOINTS.horizon.testnet[0],
  public: DEFAULT_ENDPOINTS.horizon.public[0],
};

export function getHorizonEndpoints({ network = NETWORK } = {}) {
  const defaults = HORIZON_URLS[network] || HORIZON_URLS.public;
  if (network !== NETWORK) return parseEndpoints(defaults);
  return getEndpoints("horizon", { network, defaultEndpoints: defaults });
}

export const HORIZON_ENDPOINTS = getHorizonEndpoints();

/**
 * Fetch the raw Horizon account record for `address` on `network`.
 *
 * @param {string} address  Stellar public key (G…)
 * @param {string} network  "testnet" | "mainnet" | "pubnet"
 * @returns {Promise<object|null>}  The Horizon account object, or null when
 *   the account does not exist (404) or is unreachable.
 */
export async function fetchAccount(address, network = "testnet", { fetchFn = fetch, endpoints, now, clock, cooldownMs } = {}) {
  const networkConfig = getNetwork(network);
  const explicit = parseEndpoints(endpoints);
  const pool = explicit.length ? explicit : getHorizonEndpoints({ network });
  const defaults = pool.length ? pool : parseEndpoints(networkConfig?.horizonUrl);
  try {
    return await withFailover("horizon", async (endpoint) => {
      const base = endpoint.replace(/\/$/, "");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetchFn(
          `${base}/accounts/${encodeURIComponent(address)}`,
          { signal: controller.signal },
        );
        if (res.status === 404) return null;
        if (res.status >= 500) {
          const error = new Error(`Horizon request failed (${res.status})`);
          error.status = res.status;
          throw error;
        }
        if (!res.ok) return null;
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    }, { network, endpoints: defaults, now, clock, cooldownMs });
  } catch {
    return null;
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

/**
 * Load an account's balances from Horizon.
 * @param {string} address - account public key (G...)
 * @param {object} [opts]
 * @param {string} [opts.network]
 * @param {string} [opts.horizonUrl]
 * @param {function} [opts.fetchFn] - injected fetch (tests)
 * @returns {Promise<{balances: Array<{code: string, issuer: string|null, balance: string, limit: string|null}>, subentryCount: number, numSponsoring: number, numSponsored: number, unfunded?: boolean}>}
 */
export async function loadBalances(address, { network = NETWORK, horizonUrl, fetchFn = fetch, endpoints, now, clock, cooldownMs } = {}) {
  const explicit = parseEndpoints(endpoints ?? horizonUrl);
  const pool = explicit.length ? explicit : getHorizonEndpoints({ network });
  return withFailover("horizon", async (endpoint) => {
    const base = endpoint.replace(/\/$/, "");
    const res = await fetchFn(`${base}/accounts/${encodeURIComponent(address)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      return { unfunded: true, balances: [], subentryCount: 0, numSponsoring: 0, numSponsored: 0 };
    }
    if (!res.ok) {
      const error = new Error(`Horizon request failed (${res.status})`);
      error.status = res.status;
      throw error;
    }
    const data = await res.json();
    const raw = Array.isArray(data?.balances) ? data.balances : [];
    const balances = raw.map((b) => ({
      code: b.asset_type === "native" ? "XLM" : String(b.asset_code ?? ""),
      issuer: b.asset_type === "native" ? null : String(b.asset_issuer ?? ""),
      balance: String(b.balance ?? "0"),
      limit: b.limit != null ? String(b.limit) : null,
    }));
    return {
      balances,
      subentryCount: Number(data?.subentry_count) || 0,
      numSponsoring: Number(data?.num_sponsoring) || 0,
      numSponsored: Number(data?.num_sponsored) || 0,
    };
  }, { network, endpoints: pool, now, clock, cooldownMs });
}
