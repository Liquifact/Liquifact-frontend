"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { useRef } from "react";
import Button from "./Button";
import { formatCurrency } from "@/lib/format/currency";
import { formatYield } from "@/lib/format/invoice";
import { copy } from "@/app/copy/en";

/**
 * Maximum decimal places allowed per currency.
 * Most fiat currencies use 2; some (e.g. JPY) use 0.
 */
const CURRENCY_DECIMALS = {
  JPY: 0,
  KRW: 0,
  VND: 0,
};

/**
 * Hard upper bound on the number of characters accepted in the raw input.
 * Prevents pathological inputs (e.g. 1e309, extremely long digit strings)
 * from reaching Number() and keeps validation deterministic.
 */
const MAX_RAW_INPUT_LENGTH = 32;

/**
 * Matches a non-negative decimal number with optional fraction.
 * Rejects scientific notation, signs, whitespace, and locale separators.
 */
const DECIMAL_PATTERN = /^\d*(?:\.\d*)?$/;

/**
 * Returns the allowed decimal precision for a currency code.
 * @param {string} currency
 * @returns {number}
 */
function getDecimalPrecision(currency) {
  const upper = typeof currency === "string" ? currency.trim().toUpperCase() : "";
  return Object.prototype.hasOwnProperty.call(CURRENCY_DECIMALS, upper)
    ? CURRENCY_DECIMALS[upper]
    : 2;
}

/**
 * Validates the raw string value entered by the user.
 *
 * Returns an error message string (from copy) on failure, or `null` when valid.
 *
 * @param {string} rawValue - The current input value (may be empty or non-numeric)
 * @param {number} maxAmount - Maximum fundable balance (the invoice's amountValue)
 * @param {string} currency  - The invoice currency code (e.g. "USD")
 * @returns {string|null}
 */
export function validateFundAmount(rawValue, maxAmount, currency) {
  if (typeof rawValue !== "string") {
    return copy.invest.fundAmount.errorRequired;
  }

  if (rawValue.length > MAX_RAW_INPUT_LENGTH) {
    return copy.invest.fundAmount.errorRequired;
  }

  if (rawValue.trim() === "") {
    return copy.invest.fundAmount.errorRequired;
  }

  const numeric = Number(rawValue);

  if (!Number.isFinite(numeric) || isNaN(numeric)) {
    return copy.invest.fundAmount.errorRequired;
  }

  if (!DECIMAL_PATTERN.test(rawValue)) {
    return copy.invest.fundAmount.errorRequired;
  }

  if (numeric <= 0) {
    return copy.invest.fundAmount.errorPositive;
  }

  if (numeric > maxAmount) {
    return copy.invest.fundAmount.errorExceedsBalance
      .replace("{max}", maxAmount.toString())
      .replace("{currency}", currency);
  }

  // Reject values that lose precision when converted to a Number
  (// (e.g. amounts beyond Number.MAX_SAFE_INTEGER).
  if (!Number.isSafeInteger(Math.round(numeric * 100)) && numeric > Number.MAX_SAFE_INTEGER) {
    return copy.invest.fundAmount.errorExceedsBalance
      .replace("{max}", maxAmount.toString())
      .replace("{currency}", currency);
  }

  const decimals = getDecimalPrecision(currency);
  // Count decimal places in the raw input string (avoid floating-point drift)
  const dotIndex = rawValue.indexOf(".");
  if (dotIndex !== -1) {
    const decimalPart = rawValue.slice(dotIndex + 1);
    if (decimalPart.length > decimals) {
      return copy.invest.fundAmount.errorPrecision
        .replace("{decimals}", decimals.toString())
        .replace("{currency}", currency);
    }
  }

  return null;
}

/**
 * Derives the expected yield amount for the entered partial amount.
 *
 * @param {number} enteredAmount  - The validated numeric amount entered
 * @param {number} totalAmount    - Full invoice amount
 * @param {number} yieldValue     - Invoice yield rate as a percentage (e.g. 8.2 for 8.2%)
 * @returns {number}
 */
export function deriveExpectedYield(enteredAmount, totalAmount, yieldValue) {
  if (!totalAmount || !Number.isFinite(enteredAmount) || enteredAmount <= 0) {
    return 0;
  }
  return (enteredAmount / totalAmount) * totalAmount * (yieldValue / 100);
}

/**
 * A controlled partial-funding amount input with live validation.
 *
 * Features:
 * - Validates that the amount is positive, ≤ remaining balance, and within
 *   the invoice's currency decimal precision.
 * - Inline error messages linked via `aria-describedby` for screen readers.
 * - Shows the derived expected yield for the entered amount.
 * - Disables the submit button while input is invalid or a submission is in flight.
 *
 * @param {Object}   props
 * @param {number}   props.maxAmount   - Maximum fundable amount (invoice amountValue)
 * @param {string}   props.currency    - Invoice currency code (e.g. "USD")
 * @param {number}   props.yieldValue  - Yield rate as a percentage number (e.g. 8.2)
 * @param {Function} [props.onSubmit]  - Called with the validated numeric amount on submit
 * @param {boolean}  [props.disabled]  - Externally disables the entire control
 */
export default function FundAmountInput({
  maxAmount,
  currency,
  yieldValue,
  onSubmit,
  disabled = false,
}) {
  const [rawValue, setRawValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const lastSubmittedRef = useRef(null);

  const inputId = useId();
  const errorId = useId();
  const helperId = useId();
  const yieldId = useId();

  // Validate on every keystroke but only display the error after blur
  const validationError = useMemo(
    () => validateFundAmount(rawValue, maxAmount, currency),
    [rawValue, maxAmount, currency]
  );

  const visibleError = touched ? validationError : null;

  const numericValue = Number(rawValue);
  const isValidNumber = Number.isFinite(numericValue) && rawValue.trim() !== "";

  const expectedYieldAmount = useMemo(() => {
    if (!isValidNumber || validationError) return null;
    return deriveExpectedYield(numericValue, maxAmount, yieldValue);
  }, [isValidNumber, validationError, numericValue, maxAmount, yieldValue]);

  const isSubmitDisabled = disabled || submitting || !isValidNumber || validationError !== null;

  const handleChange = useCallback((e) => {
    const next = e.target.value;
    // Reject oversized input at the source so validation stays deterministic.
    if (typeof next === "string" && next.length > MAX_RAW_INPUT_LENGTH) {
      return;
    }
    // Reject characters that cannot form a valid decimal amount.
    if (typeof next === "string" && next !== "" && !DECIMAL_PATTERN.test(next)) {
      return;
    }
    setRawValue(next);
  }, []);

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      // Force show errors on attempted submit even if not yet touched
      setTouched(true);

      if (validationError !== null) return;

      if (!onSubmit) return;

      // Guard against concurrent/re-entrant submissions (double-click, Enter
      // key repeat, or programmatic dispatch) that could otherwise fire the
      // callback multiple times before React commits the `submitting` state.
      if (submittingRef.current) return;

      // Guard against duplicate submissions of the same amount after a
      // successful submit, which would otherwise re-trigger the callback.
      if (lastSubmittedRef.current === numericValue) return;

      submittingRef.current = true;
      setSubmitting(true);
      try {
        await onSubmit(numericValue);
        lastSubmittedRef.current = numericValue;
      } catch (err) {
        // Do not record a failed submission as the last submitted amount so
        // the caller can retry the same value.
        lastSubmittedRef.current = null;
        throw err;
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [validationError, onSubmit, numericValue]
  );

  const helperText = copy.invest.fundAmount.helper
    .replace("{max}", maxAmount?.toString() ?? "")
    .replace("{currency}", currency ?? "");

  // Build aria-describedby: always include helper; add error/yield when visible
  const describedByIds = [helperId];
  if (visibleError) describedByIds.push(errorId);
  if (expectedYieldAmount !== null) describedByIds.push(yieldId);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6"
    >
      <div className="mb-4">
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300 mb-1">
          {copy.invest.fundAmount.label}{" "}
          <span className="text-slate-500 font-normal">({currency})</span>
        </label>

        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          step="any"
          min="0.01"
          max={maxAmount}
          value={rawValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || submitting}
          placeholder={copy.invest.fundAmount.placeholder}
          aria-describedby={describedByIds.join(" ")}
          aria-invalid={visibleError ? "true" : "false"}
          className={[
            "w-full rounded-lg border bg-slate-950 px-4 py-2.5 text-sm text-slate-100",
            "placeholder:text-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950",
            visibleError
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-700 focus:ring-cyan-500",
            disabled || submitting ? "opacity-50 cursor-not-allowed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />

        {/* Helper text — always present for aria-describedby anchor */}
        <p id={helperId} className="mt-1 text-xs text-slate-500">
          {helperText}
        </p>

        {/* Error message — only shown after blur or submit attempt */}
        {visibleError && (
          <p id={errorId} role="alert" aria-live="polite" className="mt-1 text-xs text-red-400">
            {visibleError}
          </p>
        )}
      </div>

      {/* Expected yield preview */}
      {expectedYieldAmount !== null && (
        <p id={yieldId} aria-live="polite" className="mb-4 text-sm text-slate-300">
          {copy.invest.fundAmount.expectedYieldLabel}{" "}
          <span className="font-semibold text-cyan-400">
            {formatYield(yieldValue)} (≈{formatCurrency(expectedYieldAmount, { currency })})
          </span>
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        disabled={isSubmitDisabled}
        className="w-full sm:w-auto"
        aria-label={copy.invest.fundAmount.submitLabel}
      >
        {submitting ? copy.invest.fundAmount.submittingLabel : copy.invest.fundAmount.submitLabel}
      </Button>
    </form>
  );
}
