/**
 * YieldCalculator — live payout / annualized-rate projection for an invoice.
 *
 * Mounted in app/marketplace/[id]/InvoiceDetail.jsx. The amount is prefilled
 * from the fund form and stays in sync with it; edits here are local and never
 * touch the funding form itself.
 *
 * Props:
 *   amount    string  - current fund-form amount ("" when empty)
 *   yieldBps  number  - invoice yield in basis points
 *   dueDate   string  - invoice due date (ISO date)
 *   currency  string  - invoice currency (defaults to USDC)
 *   nowMs     number  - optional clock override for tests
 */
"use client";

import { useEffect, useId, useState } from "react";
import { bpsToPercent } from "@/lib/format";
import * as money from "@/lib/money";
import { annualizedRate, daysToDue, expectedPayout } from "@/lib/yield";

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function project({ value, currency, yieldBps, days }) {
  const trimmed = value.trim();
  if (!trimmed) return { kind: "empty" };

  let principal;
  try {
    principal = money.parse(trimmed, currency);
  } catch {
    return { kind: "invalid" };
  }
  if (principal <= 0n) return { kind: "zero" };

  const payout = expectedPayout({ amount: trimmed, yieldBps, currency });
  const profit = money.sub(payout, principal, { clamp: true });
  return { kind: "ok", payout, profit, days, apr: annualizedRate({ yieldBps, days }) };
}

export default function YieldCalculator({ amount = "", yieldBps, dueDate, currency = "USDC", nowMs }) {
  const [value, setValue] = useState(amount ?? "");
  const titleId = useId();
  const inputId = useId();
  const hintId = useId();
  const resultId = useId();

  // Follow the fund form's amount without lifting its state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync calculator input with parent form amount
    setValue(amount ?? "");
  }, [amount]);

  const days = daysToDue(dueDate, nowMs);
  const result = project({ value, currency, yieldBps, days });

  return (
    <section className="card yield-calculator" aria-labelledby={titleId}>
      <h3 id={titleId}>Yield calculator</h3>
      <p className="muted" style={{ fontSize: "0.88rem", marginTop: 4 }}>
        Projected payout if you fund this invoice and hold it to maturity.
      </p>
      <div className="form" style={{ marginTop: 14 }}>
        <div className="field">
          <label htmlFor={inputId}>Investment amount ({currency})</label>
          <input
            id={inputId}
            className="focus-ring"
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            aria-describedby={hintId}
          />
          <span className="hint" id={hintId}>
            Yield {bpsToPercent(yieldBps)} at maturity.
          </span>
        </div>
      </div>
      <div
        id={resultId}
        className="yield-calculator-result"
        aria-live="polite"
        aria-atomic="true"
        style={{ marginTop: 14 }}
      >
        {result.kind === "ok" ? (
          <>
            <div className="kv">
              <div>
                <span className="k">Projected payout</span>
                {money.format(result.payout, currency, { maxFractionDigits: 7 })}
              </div>
              <div>
                <span className="k">Profit</span>
                {money.format(result.profit, currency, { maxFractionDigits: 7 })}
              </div>
              <div>
                <span className="k">Days to due</span>
                {result.days}
              </div>
              <div>
                <span className="k">Annualized rate</span>
                {result.apr === null ? "Not available" : percentFormatter.format(result.apr / 100)}
              </div>
            </div>
            {result.apr === null && (
              <p className="muted" style={{ fontSize: "0.85rem", marginTop: 10 }}>
                This invoice is past due, so no annualized rate is shown.
              </p>
            )}
          </>
        ) : (
          <p className="muted" style={{ fontSize: "0.88rem" }}>
            {result.kind === "zero"
              ? "Enter an amount greater than zero to see the projection."
              : result.kind === "invalid"
                ? "Enter a valid amount (up to 7 decimal places)."
                : "Enter an amount to see your projected payout."}
          </p>
        )}
      </div>
    </section>
  );
}
