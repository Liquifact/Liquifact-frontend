"use client";

import { useCallback, useRef } from "react";

/**
 * Radio group of yield lock options.
 * Follows the WAI-ARIA radiogroup pattern: arrow keys move + select the
 * next/previous enabled option, skipping disabled ones. Tab enters/leaves
 * the group; Enter/Space select the focused option via the native input.
 */
export default function TierSelector({ options, value, onChange, name = "yield-tier", disabled = false }) {
  const refs = useRef([]);

  const focusOption = useCallback(
    (fromIndex, step) => {
      const count = options.length;
      if (!count) return;
      let idx = fromIndex;
      for (let i = 0; i < count; i += 1) {
        idx = (idx + step + count) % count; // wrap around
        const opt = options[idx];
        if (!opt.disabled) {
          const input = refs.current[idx];
          if (input) {
            input.focus();
            onChange(opt.lockSecs);
          }
          return;
        }
      }
    },
    [options, onChange]
  );

  const onKeyDown = (e) => {
    if (disabled) return;
    const current = options.findIndex((o) => o.lockSecs === value);
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        focusOption(current < 0 ? 0 : current, 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        focusOption(current < 0 ? options.length - 1 : current, -1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="tier-selector">
      <div className="tier-legend" id="tier-legend">
        Yield lock
      </div>
      <div role="radiogroup" aria-labelledby="tier-legend" aria-disabled={disabled || undefined} onKeyDown={onKeyDown}>
        {options.map((opt, i) => (
          <label key={opt.id} className={`tier-option${opt.lockSecs === value ? " selected" : ""}${opt.disabled ? " disabled" : ""}`}>
            <input
              type="radio"
              name={name}
              value={opt.lockSecs}
              checked={opt.lockSecs === value}
              disabled={opt.disabled || disabled}
              onChange={() => onChange(opt.lockSecs)}
              ref={(el) => {
                refs.current[i] = el;
              }}
            />
            <span className="tier-label">{opt.label}</span>
            {opt.disabled && opt.reason ? (
              <span className="tier-reason" aria-hidden="true">
                {opt.reason}
              </span>
            ) : null}
          </label>
        ))}
      </div>
    </div>
  );
}
