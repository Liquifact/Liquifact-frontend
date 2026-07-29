"use client";

import { useCallback, useId, useMemo, useState } from "react";
import Button from "./Button";
import { copy } from "@/app/copy/en";

/**
 * Validates the watchlist inputs.
 * Returns an object with error strings or null for each field.
 */
export function validateWatchlistInputs(name, targetYield) {
  const errors = { name: null, targetYield: null };

  // Name validation
  const trimmedName = name.trim();
  if (trimmedName === "") {
    errors.name = "Watchlist name is required.";
  } else if (trimmedName.length > 50) {
    errors.name = "Watchlist name cannot exceed 50 characters.";
  } else if (/[^a-zA-Z0-9\s-_]/.test(trimmedName)) {
    errors.name = "Watchlist name contains invalid characters."; // format error
  }

  // Target yield validation (optional, but if provided must be valid)
  if (targetYield.trim() !== "") {
    const yieldNum = Number(targetYield);
    if (!Number.isFinite(yieldNum) || isNaN(yieldNum)) {
      errors.targetYield = "Target yield must be a valid number.";
    } else if (yieldNum < 0 || yieldNum > 100) {
      errors.targetYield = "Target yield must be between 0 and 100."; // out of range
    }
  }

  return errors;
}

export default function WatchlistInput({ onSubmit, disabled = false }) {
  const [name, setName] = useState("");
  const [targetYield, setTargetYield] = useState("");
  const [touchedName, setTouchedName] = useState(false);
  const [touchedYield, setTouchedYield] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameId = useId();
  const nameErrorId = useId();
  const yieldId = useId();
  const yieldErrorId = useId();
  const helperId = useId();

  const errors = useMemo(() => validateWatchlistInputs(name, targetYield), [name, targetYield]);

  const visibleNameError = touchedName ? errors.name : null;
  const visibleYieldError = touchedYield ? errors.targetYield : null;

  const isInvalid = errors.name !== null || errors.targetYield !== null;
  const isSubmitDisabled = disabled || submitting || isInvalid;

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setTouchedName(true);
      setTouchedYield(true);

      if (errors.name !== null || errors.targetYield !== null) return;

      if (onSubmit) {
        setSubmitting(true);
        try {
          await onSubmit({
            name: name.trim(),
            targetYield: targetYield.trim() ? Number(targetYield) : null,
          });
          setName("");
          setTargetYield("");
          setTouchedName(false);
          setTouchedYield(false);
        } finally {
          setSubmitting(false);
        }
      }
    },
    [errors, onSubmit, name, targetYield]
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
    >
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Create New Watchlist</h3>

      <div className="mb-4">
        <label htmlFor={nameId} className="block text-sm font-medium text-slate-300 mb-1">
          Watchlist Name
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouchedName(true)}
          disabled={disabled || submitting}
          placeholder="e.g. High Yield Invoices"
          aria-describedby={`${helperId} ${visibleNameError ? nameErrorId : ""}`.trim()}
          aria-invalid={visibleNameError ? "true" : "false"}
          className={[
            "w-full rounded-lg border bg-slate-950 px-4 py-2 text-sm text-slate-100",
            "focus-visible:outline-none focus-ring",
            visibleNameError ? "border-red-500" : "border-slate-700"
          ].join(" ")}
        />
        {visibleNameError && (
          <p id={nameErrorId} role="alert" className="mt-1 text-xs text-red-400">
            {visibleNameError}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor={yieldId} className="block text-sm font-medium text-slate-300 mb-1">
          Target Yield (%) <span className="text-slate-500 font-normal">(Optional)</span>
        </label>
        <input
          id={yieldId}
          type="number"
          step="0.1"
          value={targetYield}
          onChange={(e) => setTargetYield(e.target.value)}
          onBlur={() => setTouchedYield(true)}
          disabled={disabled || submitting}
          placeholder="e.g. 8.5"
          aria-describedby={visibleYieldError ? yieldErrorId : undefined}
          aria-invalid={visibleYieldError ? "true" : "false"}
          className={[
            "w-full rounded-lg border bg-slate-950 px-4 py-2 text-sm text-slate-100",
            "focus-visible:outline-none focus-ring",
            visibleYieldError ? "border-red-500" : "border-slate-700"
          ].join(" ")}
        />
        {visibleYieldError && (
          <p id={yieldErrorId} role="alert" className="mt-1 text-xs text-red-400">
            {visibleYieldError}
          </p>
        )}
      </div>

      <p id={helperId} className="sr-only">
        Enter a unique name for your watchlist.
      </p>

      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        disabled={isSubmitDisabled}
        aria-label="Create Watchlist"
      >
        Create Watchlist
      </Button>
    </form>
  );
}
