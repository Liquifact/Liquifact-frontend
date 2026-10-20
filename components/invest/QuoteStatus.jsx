"use client";

import { bpsToPercent } from "@/lib/format";
import { formatLockEndDate, lockEndsAt } from "@/lib/invest/tiers";

/**
 * Contract-quoted yield line with loading and error states.
 * The region is aria-live="polite" so async status changes are announced.
 */
export default function QuoteStatus({ state, nowSec, lockSecs }) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <p className="tier-quote" role="status" aria-live="polite">
        Getting contract quote…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p className="tier-quote tier-quote-err" role="status" aria-live="polite">
        Quote unavailable: {state.error}
      </p>
    );
  }

  const { effectiveYieldBps, matchedLockSecs } = state.quote;
  const ends = lockEndsAt(nowSec, matchedLockSecs || lockSecs);
  return (
    <p className="tier-quote" role="status" aria-live="polite">
      Contract quote: <strong>{bpsToPercent(effectiveYieldBps)}</strong>
      {matchedLockSecs > 0 ? <> · lock ends {formatLockEndDate(ends)}</> : <> · no lock</>}
    </p>
  );
}
