/**
 * TierSelector — radio group for choosing a yield-tier lock commitment.
 *
 * Shown above the amount field only when the escrow has a tier table and
 * the investor has no prior contribution (the tier choice is immutable and
 * only allowed on the first deposit — TieredSecondDeposit = 108).
 *
 * When the investor already has a contribution, the component collapses to
 * a single line of text: "Your yield is fixed at X% from your first deposit."
 *
 * Accessibility:
 *   - role="radiogroup" container with aria-labelledby
 *   - role="radio" options with roving tabindex and arrow-key navigation
 *   - Tab enters at the checked (or first) radio, exits to the next field
 *   - Arrow Up/Down and Left/Right move selection
 *   - The contract-quote region uses aria-live="polite" for async updates
 *
 * @param {object} props
 * @param {Array} props.options - output of tierOptions()
 * @param {number} props.selectedLock - currently selected lockSecs
 * @param {function} props.onSelect - (lockSecs) => void
 * @param {boolean} props.hasContribution - investor already funded
 * @param {number|null} props.fixedYieldBps - locked yield for returning investors
 * @param {string} [props.amount] - current amount input (for the quote)
 * @param {object|null} [props.quote] - contract quote from useYieldPreview
 * @param {boolean} [props.quoteLoading]
 * @param {string|null} [props.quoteError]
 * @param {boolean} [props.quoteEnabled] - whether to show the quote region
 */
"use client";

import { useId, useRef } from "react";
import { bpsToPercent } from "@/lib/format";

function lockEndLabel(lockEndSecs) {
  if (!lockEndSecs) return "";
  const d = new Date(Number(lockEndSecs) * 1000);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function TierSelector({
  options,
  selectedLock,
  onSelect,
  hasContribution,
  fixedYieldBps,
  amount,
  quote,
  quoteLoading,
  quoteError,
  quoteEnabled = true,
}) {
  const uid = useId();
  const groupLabelId = `${uid}-label`;
  const radiosRef = useRef([]);

  // Returning investor: show fixed-yield text, no selector.
  if (hasContribution) {
    const yieldText = fixedYieldBps != null ? bpsToPercent(fixedYieldBps) : null;
    return (
      <div className="tier-fixed" role="status" aria-live="polite">
        <p className="muted" style={{ fontSize: "0.9rem", margin: 0 }}>
          {yieldText
            ? <>Your yield is fixed at <strong>{yieldText}</strong> from your first deposit.</>
            : "Your yield was fixed at your first deposit."}
        </p>
      </div>
    );
  }

  // No tiers configured — render nothing.
  if (!options || options.length === 0) return null;

  const selectedIndex = options.findIndex((o) => o.lockSecs === selectedLock);
  const checkedIndex = selectedIndex >= 0 ? selectedIndex : 0;

  // ── Keyboard navigation (arrow keys move selection) ────────────────────
  function onKeyDown(e) {
    const count = options.length;
    if (count === 0) return;
    const step = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1
      : (e.key === "ArrowUp" || e.key === "ArrowLeft") ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();

    // Move through options, skipping disabled ones.
    let next = checkedIndex;
    let iterations = 0;
    do {
      next = (next + step + count) % count;
      iterations++;
    } while (options[next].disabled && iterations < count);

    if (!options[next].disabled) {
      onSelect(options[next].lockSecs);
    }
    const el = radiosRef.current[next];
    if (el) el.focus();
  }

  return (
    <div className="tier-selector">
      <div
        role="radiogroup"
        aria-labelledby={groupLabelId}
        onKeyDown={onKeyDown}
      >
        <span id={groupLabelId} className="field-label">
          Yield commitment
        </span>
        {options.map((opt, i) => {
          const isSelected = opt.lockSecs === selectedLock;
          const tabIndex = i === checkedIndex ? 0 : -1;
          return (
            <label
              key={opt.lockSecs}
              className={`tier-option${isSelected ? " tier-option-selected" : ""}${opt.disabled ? " tier-option-disabled" : ""}`}
            >
              <input
                ref={(el) => { radiosRef.current[i] = el; }}
                type="radio"
                role="radio"
                name={`${uid}-tier`}
                aria-checked={isSelected}
                tabIndex={tabIndex}
                checked={isSelected}
                onChange={() => !opt.disabled && onSelect(opt.lockSecs)}
                disabled={opt.disabled}
                className="tier-radio focus-ring"
              />
              <span className="tier-label">{opt.label}</span>
              {opt.disabled && <span className="tier-disabled-reason">{opt.reason}</span>}
            </label>
          );
        })}
      </div>

      {/* ── Contract quote (debounced, aria-live) ─────────────────────────── */}
      {quoteEnabled && selectedLock > 0 && amount && amount.trim() && (
        <div className="tier-quote" aria-live="polite" aria-atomic="true">
          {quoteLoading && <span className="muted">Getting contract quote…</span>}
          {quoteError && <span className="tier-quote-error" role="alert">{quoteError}</span>}
          {!quoteLoading && !quoteError && quote && (
              <span>
              Contract quote: <strong>{bpsToPercent(quote.effective_yield_bps)}</strong>
              {quote.lock_end_secs > 0 && (
                <> · lock ends {lockEndLabel(quote.lock_end_secs)}</>
              )}
            </span>
          )}
          {!quoteLoading && !quoteError && !quote && (
            <span className="muted">Select a lock to preview your yield.</span>
          )}
        </div>
      )}
    </div>
  );
}
