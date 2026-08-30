/**
 * @file lib/hooks/useWalletNetworkGuard.js
 *
 * Reads the connected wallet network and compares it with the expected
 * invoice environment network (NEXT_PUBLIC_STELLAR_NETWORK).
 *
 * ## Design
 * - Returns a stable `{ status, walletNetwork, invoiceNetwork }` object.
 * - Re-checks the wallet network whenever the wallet state changes (e.g.
 *   the user switches accounts or reconnects), so the banner stays current
 *   without requiring a page reload.
 * - Does NOT perform automatic network switching — that is explicitly out of
 *   scope per Issue #1048.
 * - The hook is SSR-safe: `getFreighterNetwork` is only called inside
 *   `useEffect` (client-only).
 *
 * ## Statuses
 * | status          | Meaning                                                  |
 * |-----------------|----------------------------------------------------------|
 * | "ok"            | Wallet is connected and on the expected network.         |
 * | "mismatch"      | Wallet is connected but on the wrong network.            |
 * | "unknown"       | Wallet is connected but the network could not be read.   |
 * | "disconnected"  | No wallet connected (or still connecting).               |
 * | "checking"      | Initial async check is in-flight.                        |
 *
 * ## Security / UX notes
 * - `invoiceNetwork` is read from `env.stellarNetwork` (build-time constant),
 *   NOT from the invoice payload — the expected network is always the
 *   app-configured value, preventing a malicious invoice from claiming to
 *   require a different (e.g. testnet) network.
 * - The hook never exposes private keys or wallet secrets.
 * - When the wallet state changes to DISCONNECTED, ERROR, or WRONG_NETWORK
 *   the in-flight async check is abandoned via the `cancelled` flag in the
 *   cleanup function to avoid stale state updates.
 */

import { useEffect, useState } from "react";
import { WALLET_STATES } from "@/components/WalletProvider";
import { useWallet } from "@/components/WalletProvider";
import { getFreighterNetwork } from "@/lib/wallet/freighter";
import { env } from "@/lib/config/env";

/**
 * @typedef {"ok" | "mismatch" | "unknown" | "disconnected" | "checking"} NetworkGuardStatus
 */

/**
 * @typedef {Object} NetworkGuardResult
 * @property {NetworkGuardStatus} status      - Current guard status.
 * @property {string | null}      walletNetwork  - Network reported by the wallet, or null.
 * @property {string}             invoiceNetwork - Expected network from env config.
 */

/**
 * Checks whether the connected wallet network matches the invoice environment.
 *
 * @returns {NetworkGuardResult}
 */
export function useWalletNetworkGuard() {
  const { state: walletState, walletData } = useWallet();
  const invoiceNetwork = (env.stellarNetwork || "testnet").toLowerCase();

  const [status, setStatus] = useState(/** @type {NetworkGuardStatus} */ ("checking"));
  const [walletNetwork, setWalletNetwork] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // Not connected — no network check needed.
      if (
        walletState === WALLET_STATES.DISCONNECTED ||
        walletState === WALLET_STATES.CONNECTING ||
        walletState === WALLET_STATES.NO_WALLET ||
        walletState === WALLET_STATES.INVALID_PROVIDER ||
        walletState === WALLET_STATES.ERROR
      ) {
        if (!cancelled) {
          setStatus("disconnected");
          setWalletNetwork(null);
        }
        return;
      }

      // WRONG_NETWORK is already a known mismatch from WalletProvider — surface
      // it immediately without an extra RPC call.
      if (walletState === WALLET_STATES.WRONG_NETWORK) {
        const knownNetwork = walletData?.network ?? null;
        if (!cancelled) {
          setStatus("mismatch");
          setWalletNetwork(knownNetwork);
        }
        return;
      }

      // CONNECTED — read the live network from Freighter.
      if (!cancelled) {
        setStatus("checking");
      }

      const network = await getFreighterNetwork();

      if (cancelled) return;

      if (network === null) {
        setStatus("unknown");
        setWalletNetwork(null);
        return;
      }

      setWalletNetwork(network);

      if (network === invoiceNetwork) {
        setStatus("ok");
      } else {
        setStatus("mismatch");
      }
    }

    check();

    return () => {
      cancelled = true;
    };
    // Re-run whenever the wallet state changes (account switch, reconnect, etc.)
    // walletData.address change covers the "user switches accounts" edge case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletState, walletData?.address, invoiceNetwork]);

  return { status, walletNetwork, invoiceNetwork };
}
