"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMinor, parseAmount, projectReturn } from "@/lib/returns";

const QUICK_PERCENTAGES = [25, 50, 100];

export default function ReturnCalculator({
  amount,
  dueDate,
  currency = "USDC",
  nowMs,
  onAmountChange,
  remaining = 0,
  yieldBps,
}) {
  const [settledAmount, setSettledAmount] = useState(amount);

  useEffect(() => {
    const timer = setTimeout(() => setSettledAmount(amount), 400);
    return () => clearTimeout(timer);
  }, [amount]);

  const remainingMinor = useMemo(() => {
    try {
      return parseAmount(String(remaining ?? 0));
    } catch {
      return null;
    }
  }, [remaining]);

  const result = useMemo(() => {
    if (!settledAmount || !settledAmount.trim()) {
      return { error: null, projection: null };
    }
    try {
      return {
        error: null,
        projection: projectReturn({
          principal: settledAmount,
          yieldBps,
          dueDate,
          nowMs,
        }),
      };
    } catch (err) {
      return { error: err.message || "Invalid amount", projection: null };
    }
  }, [dueDate, nowMs, settledAmount, yieldBps]);

  function applyPercentage(percentage) {
    if (remainingMinor === null || remainingMinor <= 0n || !onAmountChange) {
      return;
    }
    const next = (remainingMinor * BigInt(percentage)) / 100n;
    onAmountChange(formatMinor(next));
  }

  const projection = result.projection;

  return (
    <div className="return-calc">
      <div className="return-calc__chips" role="group" aria-label="Quick amounts">
        {QUICK_PERCENTAGES.map((percentage) => (
          <button
            key={percentage}
            type="button"
            className="return-calc__chip"
            aria-label={`Use ${percentage}% of remaining`}
            disabled={!remainingMinor || remainingMinor <= 0n}
            onClick={() => applyPercentage(percentage)}
          >
            {percentage}%
          </button>
        ))}
      </div>

      <div className="return-calc__result" aria-live="polite">
        {result.error ? (
          <span className="err">{result.error}</span>
        ) : projection?.overdue ? (
          <span className="return-calc__warn">
            This invoice is overdue; the projected return is unavailable.
          </span>
        ) : projection ? (
          <>
            You receive <strong>{projection.payout} {currency}</strong> at settlement
            {` (+${projection.coupon} ${currency})`} · {projection.termDays}-day term ·
            {" ≈ "}
            {projection.annualisedPct}% annualised
          </>
        ) : (
          <span className="muted">Enter an amount to see the projected return.</span>
        )}
      </div>

      <p className="hint return-calc__disclaimer">
        Flat coupon for the invoice term; settlement depends on the debtor paying.
      </p>
    </div>
  );
}
