"use client";

import { useEffect, useState } from "react";
import {
  fetchYieldTiers,
  fetchInvestorYieldBps,
  fetchContributionFor,
} from "../stellar/yieldTiers.js";

const INITIAL = {
  loading: false,
  tiers: null,
  contribution: 0n,
  fixedYieldBps: null,
  error: null,
};

/**
 * Fetch the escrow yield-tier table, the investor's existing contribution,
 * and (when they already have one) their locked yield — all via injected
 * simulate helpers so no network is needed in tests.
 *
 * @param {object} opts
 * @param {string|null} opts.contractId - escrow contract address
 * @param {string|null} opts.investor - connected wallet G-address
 * @param {boolean} [opts.enabled] - gate the fetch (on-chain + open)
 * @param {function} [opts.fetchTiersFn] - injected (tests)
 * @param {function} [opts.fetchContributionFn] - injected (tests)
 * @param {function} [opts.fetchYieldFn] - injected (tests)
 */
export function useYieldTiers({
  contractId,
  investor,
  enabled = true,
  fetchTiersFn = fetchYieldTiers,
  fetchContributionFn = fetchContributionFor,
  fetchYieldFn = fetchInvestorYieldBps,
} = {}) {
  const [state, setState] = useState(INITIAL);

  useEffect(() => {
    if (!enabled || !contractId || !investor) return undefined;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const tiers = await fetchTiersFn({ contractId });
        const contribution = await fetchContributionFn({ contractId, investor });
        const hasContrib = contribution > 0n;
        const fixedYieldBps = hasContrib ? await fetchYieldFn({ contractId, investor }) : null;

        if (alive) {
          setState({ loading: false, tiers, contribution, fixedYieldBps, error: null });
        }
      } catch (err) {
        if (alive) {
          setState({ loading: false, tiers: null, contribution: 0n, fixedYieldBps: null, error: err?.message || "Failed to load yield tiers" });
        }
      }
    })();

    return () => { alive = false; };
  }, [enabled, contractId, investor, fetchTiersFn, fetchContributionFn, fetchYieldFn]);

  return state;
}
