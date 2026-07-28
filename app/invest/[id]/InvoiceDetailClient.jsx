"use client";

/**
 * @file app/invest/[id]/InvoiceDetailClient.jsx
 *
 * Client boundary for the density-aware invoice metadata section.
 *
 * Why a separate client component?
 * ─────────────────────────────────
 * The page shell (`page.js`) is a Server Component — it cannot use hooks.
 * Density preference is stored in `localStorage` and read via `useDensity`,
 * which requires a React hook.  Rather than converting the entire detail
 * page to a client component (losing all RSC benefits), this thin wrapper:
 *
 *   1. Accepts pre-formatted invoice values as props (all formatting stays
 *      server-side in `page.js`).
 *   2. Owns the density preference state via `useDensity` and passes it down
 *      to `DensityToggle` as controlled props so both components react to the
 *      same state without prop-drilling through multiple layers.
 *   3. Applies spacing variants to the metadata `<dl>` based on density.
 *   4. Renders the Reference row with CopyButton when `referenceId` is set.
 *   5. Supports inline editing of issuer, amount, yield, and maturity rows
 *      with save/cancel buttons, validation, keyboard shortcuts (Escape to
 *      cancel, Enter to save), and polite aria-live announcements.
 *
 * Spacing variants
 * ─────────────────
 * • compact     → `gap-2 p-4`   (tighter grid, smaller section padding)
 * • comfortable → `gap-4 p-6`   (default spacing, matches original design)
 *
 * Inline edit
 * ─────────────
 * Each editable row has an "Edit" button (visible on hover / focus). Clicking
 * it replaces the `<dd>` with an `<input>` and Save / Cancel buttons.
 * Pressing Escape in the input cancels; pressing Enter saves (unless the field
 * is the date input, which already uses Enter for date-picker navigation).
 * Validation errors are announced via the same polite aria-live region used
 * for success / cancel confirmations.
 *
 * The `onSave` callback (optional) receives the field key and the new raw
 * value string when a save succeeds. The parent (page.js) may wire this to
 * an API call in future.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import CopyButton from "@/components/CopyButton";
import DensityToggle from "@/components/DensityToggle";
import { useDensity } from "@/lib/hooks/useDensity";
import { getInvoiceFieldValidator } from "@/lib/validation/invoice";
import { copy } from "@/app/copy/en";

/** @type {Record<string, {gap: string, padding: string}>} */
const SPACING = {
  compact: { gap: "gap-2", padding: "p-4" },
  comfortable: { gap: "gap-4", padding: "p-6" },
};

const ie = copy.invest.detail.inlineEdit;

// ─────────────────────────────────────────────────────────────────────────────
// EditableRow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single dt/dd pair that can switch between view and inline-edit mode.
 *
 * @param {object}   props
 * @param {string}   props.field         - Machine key (e.g. "issuer", "amount")
 * @param {string}   props.label         - Human-readable label shown in the <dt>
 * @param {string}   props.displayValue  - Pre-formatted value shown in view mode
 * @param {string}   props.rawValue      - Editable raw value (unformatted)
 * @param {'text'|'number'|'date'} [props.inputType='text'] - Input type
 * @param {string}   [props.inputPattern] - Optional pattern attribute
 * @param {(value:string) => string | null} [props.validator] - Live validator
 *   returning `null` when valid or an error message string. Defaults to
 *   {@link getInvoiceFieldValidator} keyed off `field`.
 * @param {(field:string, value:string)=>void} props.onSave - Callback on success
 * @param {(msg:string)=>void} props.onAnnounce - Shared live-region setter
 */
function EditableRow({
  field,
  label,
  displayValue,
  rawValue,
  inputType = "text",
  inputPattern,
  validator,
  onSave,
  onAnnounce,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(rawValue);
  const inputRef = useRef(null);
  const reactId = useId();
  const inputElId = `inline-edit-${field}-${reactId}`;
  const errorElId = `inline-edit-error-${field}-${reactId}`;

  // Resolve the live validator: caller-supplied wins, otherwise fall back to
  // the field-keyed validator from `lib/validation/invoice`. We freeze the
  // function reference in a useCallback so the useMemo below is a pure
  // function of (draft, isEditing) and won't churn on every render.
  const effectiveValidator = useMemo(
    () => (typeof validator === "function" ? validator : getInvoiceFieldValidator(field)),
    [validator, field]
  );

  // Live validation: derived on every keystroke. We deliberately stop
  // validating as soon as we leave edit mode so error copy from a previous
  // keystroke does not flash against the read-only view.
  const error = useMemo(() => {
    if (!isEditing) return null;
    if (typeof effectiveValidator !== "function") return null;
    const result = effectiveValidator(draft);
    // Coerce non-string / empty-string returns to null per the
    // InvoiceFieldValidator contract ("a non-empty error message").
    return typeof result === "string" && result.length > 0 ? result : null;
  }, [isEditing, effectiveValidator, draft]);

  const isInvalid = error !== null;
  const trimmedDraft = draft.trim();

  // Focus the input whenever we enter edit mode (independent of validity;
  // an invalid pre-existing value is rare but possible and we still want
  // the user to start typing).
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEdit = () => {
    setDraft(rawValue);
    setIsEditing(true);
  };

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft(rawValue);
    onAnnounce(ie.announceCancelled);
  }, [rawValue, onAnnounce]);

  const handleSave = useCallback(() => {
    if (isInvalid) {
      // Defensive guard: Save button is `disabled` while invalid, but an
      // Enter keypress on a non-disabled text input could still reach here
      // if the browser fires a synthetic click. Announce without saving so
      // the user understands why nothing happened.
      onAnnounce(`Save failed: ${error ?? ie.errorRequired.replace("{field}", label)}`);
      return;
    }
    setIsEditing(false);
    onAnnounce(ie.announceSaved.replace("{field}", label));
    onSave(field, trimmedDraft);
  }, [isInvalid, error, label, field, onSave, onAnnounce, trimmedDraft]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (e.key === "Enter" && inputType !== "date") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleCancel, handleSave, inputType]
  );

  const handleChange = (e) => {
    setDraft(e.target.value);
  };

  const editBtnLabel = ie.editButton.replace("{field}", label);

  return (
    <div>
      <dt className="invoice-detail-dt text-slate-500">{label}</dt>
      <dd className="invoice-detail-dd text-slate-100">
        {isEditing ? (
          <div className="flex flex-col gap-2 mt-1">
            <input
              ref={inputRef}
              id={inputElId}
              type={inputType}
              value={draft}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              aria-label={label}
              aria-describedby={isInvalid ? errorElId : undefined}
              aria-invalid={isInvalid}
              pattern={inputPattern}
              data-testid={`inline-edit-input-${field}`}
              className={[
                "w-full bg-slate-950 border rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus-ring",
                isInvalid
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-700 focus:border-cyan-500",
              ].join(" ")}
            />
            {isInvalid && (
              <p
                id={errorElId}
                role="alert"
                aria-live="polite"
                data-testid={`inline-edit-error-${field}`}
                className="text-red-400 text-xs"
              >
                {error}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={isInvalid}
                aria-disabled={isInvalid}
                data-testid={`inline-edit-save-${field}`}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 text-white text-xs font-medium rounded transition-colors focus-ring"
              >
                {ie.saveButton}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                data-testid={`inline-edit-cancel-${field}`}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors focus-ring"
              >
                {ie.cancelButton}
              </button>
            </div>
          </div>
        ) : (
          <span className="group/row flex items-center gap-2">
            <span data-testid={`detail-value-${field}`}>{displayValue}</span>
            <button
              type="button"
              onClick={handleEdit}
              aria-label={editBtnLabel}
              data-testid={`inline-edit-btn-${field}`}
              className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 text-xs text-slate-400 hover:text-cyan-400 border border-slate-700 rounded px-2 py-0.5 transition-all focus-ring"
            >
              {copy.invest.detail.inlineEdit.editButton.replace("{field}", "")}
            </button>
          </span>
        )}
      </dd>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InvoiceDetailClient
// ─────────────────────────────────────────────────────────────────────────────

export default function InvoiceDetailClient({
  labelIssuer,
  labelAmount,
  labelYield,
  labelMaturity,
  labelStatus,
  labelReference,
  issuer,
  formattedAmount,
  formattedYield,
  dueDate,
  referenceId,
  statusPill,
  summaryHeading,
  /** Raw (unformatted) values used as the initial input drafts */
  rawIssuer,
  rawAmount,
  rawYield,
  rawDueDate,
  /**
   * Optional callback fired after a successful inline save.
   * @type {(field: string, value: string) => void}
   */
  onSave,
}) {
  // Density state is owned here and passed to DensityToggle as controlled props
  // so that both this component and the toggle always reflect the same value.
  const [density, setDensity] = useDensity();
  const spacing = SPACING[density] ?? SPACING.comfortable;

  // Single polite aria-live region shared by all editable rows so announcements
  // do not stack up in the DOM (one region, one message at a time).
  const [announcement, setAnnouncement] = useState("");

  const handleAnnounce = useCallback((msg) => {
    setAnnouncement(msg);
  }, []);

  const handleSave = useCallback(
    (field, value) => {
      onSave?.(field, value);
    },
    [onSave]
  );

  // Clear announcement after it has been read (100 ms grace period keeps it
  // in the DOM long enough for screen readers to pick it up).
  useEffect(() => {
    if (!announcement) return;
    const id = setTimeout(() => setAnnouncement(""), 2000);
    return () => clearTimeout(id);
  }, [announcement]);

  return (
    <section
      aria-labelledby="invoice-summary-heading"
      className={[
        // invoice-detail-section: CSS hook for @media (forced-colors) and
        // @media (prefers-contrast: more) rules in globals.css (issue #31).
        "invoice-detail-section",
        "print-invoice-section rounded-xl border border-slate-800 bg-slate-900/50",
        spacing.padding,
        "mb-6",
      ].join(" ")}
      data-density={density}
    >
      {/* Shared polite live region for all inline-edit announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="inline-edit-announcement"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Density toggle — top-right corner of the section */}
      <div className="no-print flex items-center justify-between mb-4">
        <h2 id="invoice-summary-heading" className="text-xl font-semibold">
          {summaryHeading}
        </h2>
        <DensityToggle density={density} onDensityChange={setDensity} />
      </div>

      <dl
        className={[
          "grid grid-cols-1 sm:grid-cols-2 text-sm",
          spacing.gap,
        ].join(" ")}
      >
        <EditableRow
          field="issuer"
          label={labelIssuer}
          displayValue={issuer}
          rawValue={rawIssuer ?? issuer}
          onSave={handleSave}
          onAnnounce={handleAnnounce}
        />
        <EditableRow
          field="amount"
          label={labelAmount}
          displayValue={formattedAmount}
          rawValue={rawAmount ?? formattedAmount}
          inputType="text"
          onSave={handleSave}
          onAnnounce={handleAnnounce}
        />
        <EditableRow
          field="yield"
          label={labelYield}
          displayValue={formattedYield}
          rawValue={rawYield ?? formattedYield}
          onSave={handleSave}
          onAnnounce={handleAnnounce}
        />
        <EditableRow
          field="dueDate"
          label={labelMaturity}
          displayValue={dueDate}
          rawValue={rawDueDate ?? dueDate}
          inputType="date"
          onSave={handleSave}
          onAnnounce={handleAnnounce}
        />
        <div>
          {/* invoice-detail-dt/dd: CSS hooks for high-contrast colour overrides */}
          <dt className="invoice-detail-dt text-slate-500">{labelStatus}</dt>
          <dd className="invoice-detail-dd text-slate-100">{statusPill}</dd>
        </div>
        {referenceId ? (
          <div>
            <dt className="text-slate-500">{labelReference || "Reference"}</dt>
            <dd className="text-slate-100 flex items-center gap-1.5">
              <span className="font-mono">{referenceId}</span>
              <CopyButton
                text={referenceId}
                label={copy.invoiceDetail.copyIdLabel}
                successMessage={copy.invoiceDetail.copyIdSuccess}
                errorMessage={copy.invoiceDetail.copyIdError}
              />
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
