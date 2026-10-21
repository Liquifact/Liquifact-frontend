/**
 * Friendbot funding helper (testnet-only).
 *
 * Friendbot creates an account and funds it with 10,000 XLM on the
 * Stellar testnet.  It returns HTTP 400 with `{"detail":"…createAccount…"}`
 * when the account already exists — that case is treated as success.
 *
 * Security: this module ONLY calls Friendbot when the caller confirms the
 * configured network is "testnet".  Callers must pass `network` explicitly;
 * the function throws immediately if it is anything other than "testnet".
 */

import { getNetwork } from "./networks.js";

/**
 * @typedef {Object} FriendbotResult
 * @property {"success"|"already_funded"|"error"} status
 * @property {string} message  Human-readable description.
 */

/**
 * Fund `address` via Friendbot on `network`.
 *
 * @param {string} address  Stellar public key (G…)
 * @param {string} network  MUST be "testnet" — throws otherwise.
 * @returns {Promise<FriendbotResult>}
 */
export async function fundWithFriendbot(address, network) {
  if (network !== "testnet") {
    throw new Error("Friendbot is only available on testnet.");
  }

  const { friendbotUrl } = getNetwork(network);
  if (!friendbotUrl) {
    throw new Error("Friendbot URL not configured for this network.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const url = `${friendbotUrl}?addr=${encodeURIComponent(address)}`;
    const res = await fetch(url, { signal: controller.signal });

    if (res.ok) {
      return { status: "success", message: "Account funded with 10,000 XLM." };
    }

    // HTTP 400 from Friendbot means the account already exists
    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      const detail = body?.detail ?? body?.error ?? "";
      if (
        detail.toLowerCase().includes("createaccount") ||
        detail.toLowerCase().includes("already") ||
        detail.toLowerCase().includes("existing")
      ) {
        return {
          status: "already_funded",
          message: "This account is already funded.",
        };
      }
      return {
        status: "error",
        message: detail || `Friendbot returned ${res.status}.`,
      };
    }

    // 429 rate-limited
    if (res.status === 429) {
      return {
        status: "error",
        message: "Rate-limited by Friendbot. Please wait a moment and try again.",
      };
    }

    return {
      status: "error",
      message: `Friendbot returned HTTP ${res.status}.`,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      return { status: "error", message: "Request timed out. Try again." };
    }
    return { status: "error", message: err.message || "Network error." };
  } finally {
    clearTimeout(timer);
  }
}
