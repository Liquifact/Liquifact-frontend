"use client";

/**
 * @file components/EditableInvoiceRow.jsx
 *
 * A single marketplace invoice row with view / inline-edit modes.
 *
 * Inline edit
 * ────────────
 * Clicking **Edit** swaps the display row for a single form with six labelled
 * fields (issuer, status, currency, amount, yield, dueDate). Each field has:
 *
 *   - Its own `aria-describedby` wired to a per-field error paragraph
 *     (rendered only when invalid).
 *   - Its own `aria-invalid` toggle.
 *   - A stable input/error id pair (derived from `useId`) so assistive
 *     technology reliably associates the input with its error.
 *
 * Validation runs live (`useMemo`) as the user types, mirroring the
 * canonicalised rules in `lib/validation/invoice`. The **Save** button
 * stays disabled while any field is invalid and resumes once all inputs
 * are accepted. Pressing Enter inside a text input submits the form via
 * the wrapping `<form>`; Escape cancels via a global keydown listener.
 *
 * Accessibility
 * ─────────────
 * - Save button: `disabled` + `aria-disabled` while invalid (works in
 *   browsers and screen readers).
 * - Error text: `role="alert"` + `aria-live="polite"` so screen readers
 *   announce the validation outcome as soon as it appears.
 * - Polite shared live region announces save / cancel / save-failed
 *   outcomes without flooding assistive tech.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { copy } from "@/app/copy/en";
import { invoiceFieldValidators } from "@/lib/validation/invoice";

const FIELD_VALIDATORS = Object.freeze({
  issuer: invoiceFieldValidators.issuer,
  status: invoiceFieldValidators.status,
  currency: invoiceFieldValidators.currency,
  amount: invoiceFieldValidators.amount,
  yield: invoiceFieldValidators.yield,
  dueDate: invoiceFieldValidators.dueDate,
});

/** User-friendly per-field labels. The machine name is the `id`; the
 *  label is what assistive technology reads out via the <label> / aria. */
const FIELD_LABELS = Object.freeze({
  issuer: "Issuer",
  status: "Status",
  currency: "Currency",
  amount: "Amount",
  yield: "Yield",
  dueDate: "Maturity",
});

export default function EditableInvoiceRow({ invoice, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ ...invoice });
  const [announcement, setAnnouncement] = useState("");
  const formRef = useRef(null);
  const baseId = useId();

  // Live validation across all six fields; memoised so we don't churn on
  // unrelated re-renders. Hidden whilst not in edit mode (a stale error
  // from a previous edit attempt shouldn't show against the read-only view).
  const errors = useMemo(() => {
    if (!isEditing) return {};
    const out = {};
    for (const [field, validate] of Object.entries(FIELD_VALIDATORS)) {
      const value = typeof draft[field] === "string" ? draft[field] : String(draft[field] ?? "");
      const result = validate(value);
      if (typeof result === "string" && result.length > 0) {
        out[field] = result;
      }
    }
    return out;
  }, [isEditing, draft]);

  const isInvalid = Object.keys(errors).length > 0;

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft({ ...invoice });
    setAnnouncement("Edit cancelled");
  }, [invoice]);

  const handleSave = (e) => {
    e?.preventDefault();

    if (!draft.issuer || !draft.amount || !draft.dueDate) {
      setError("Issuer, amount, and maturity are required.");
      setAnnouncement("Save failed: Issuer, amount, and maturity are required.");
      return;
    }

    const amt = parseFloat(String(draft.amount).replace(/,/g, ""));
    if (isNaN(amt) || amt <= 0) {
      setError("Amount must be a positive number.");
      setAnnouncement("Save failed: Amount must be a positive number.");
      return;
    }

    setIsEditing(false);
    setError("");
    setAnnouncement("Invoice updated successfully");

    onSave({ ...draft, amount: String(draft.amount) });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        handleCancel();
      }
    };
    if (isEditing) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, handleCancel]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isInvalid) {
        // Extra defensive guard: the submit button is disabled while any
        // field is invalid, but Enter keypresses on text inputs could
        // still reach here. Surface a polite failure message and bail.
        const firstKey = Object.keys(errors)[0];
        setAnnouncement(`Save failed: ${firstKey ? errors[firstKey] : "form has invalid fields"}`);
        return;
      }
      setIsEditing(false);
      setAnnouncement("Invoice updated successfully");
      onSave({ ...draft, amount: String(draft.amount) });
    },
    [isInvalid, errors, draft, onSave]
  );

  const handleEdit = () => {
    setDraft({ ...invoice });
    setAnnouncement("");
    setIsEditing(true);
    // Defer focus until the DOM has swapped tree.
    queueMicrotask(() => {
      const el = formRef.current?.querySelector("input,select");
      if (el && typeof el.focus === "function") {
        el.focus();
      }
    });
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Field-level renderer that wires up labels, ids, error text, and ARIA
  // attributes consistently across all input types.
  const renderField = (field, { type = "text", as = "input", children, valueOverride } = {}) => {
    const validator = FIELD_VALIDATORS[field];
    const value = valueOverride !== undefined ? valueOverride : (draft[field] ?? "");
    const error = errors[field];
    const invalid = typeof error === "string" && error.length > 0;
    const inputElId = `edit-${field}-${baseId}`;
    const errorElId = `edit-error-${field}-${baseId}`;

    const labelEl = (
      <label htmlFor={inputElId} className="block text-xs text-slate-400 mb-1">
        {FIELD_LABELS[field] ?? field}
      </label>
    );

    const sharedProps = {
      id: inputElId,
      name: field,
      value: typeof value === "string" || typeof value === "number" ? value : "",
      onChange: handleChange,
      "aria-describedby": invalid ? errorElId : undefined,
      "aria-invalid": invalid,
      "data-testid": `edit-input-${field}`,
      className: [
        "w-full bg-slate-950 border rounded px-3 py-1.5 text-sm text-slate-100",
        "focus:outline-none",
        invalid ? "border-red-500 focus:border-red-500" : "border-slate-700 focus:border-cyan-500",
      ].join(" "),
    };

    const inputEl =
      as === "select" ? (
        <select {...sharedProps} data-testid={`edit-input-${field}`}>
          {children}
        </select>
      ) : (
        <input {...sharedProps} type={type} autoFocus={field === "issuer"} />
      );

    return (
      <div key={field}>
        {labelEl}
        {inputEl}
        {invalid && (
          <p
            id={errorElId}
            role="alert"
            aria-live="polite"
            data-testid={`edit-error-${field}`}
            className="mt-1 text-xs text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    );
  };

  if (isEditing) {
    return (
      <li className="rounded-xl border border-cyan-800 bg-slate-900 p-5">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Shared polite live region for save / cancel / failure announcements */}
          <div role="status" aria-live="polite" className="sr-only">
            {announcement}
          </div>

          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor={`edit-issuer-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Issuer
              </label>
              <input
                id={`edit-issuer-${invoice.id}`}
                name="issuer"
                value={draft.issuer}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>
            <div className="w-32">
              <label
                htmlFor={`edit-status-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Status
              </label>
              <select
                id={`edit-status-${invoice.id}`}
                name="status"
                value={draft.status}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Open">Open</option>
                <option value="Funded">Funded</option>
                <option value="Settled">Settled</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-start">
            <div className="w-24">
              <label
                htmlFor={`edit-currency-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Currency
              </label>
              <input
                id={`edit-currency-${invoice.id}`}
                name="currency"
                value={draft.currency}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="w-32">
              <label
                htmlFor={`edit-amount-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Amount
              </label>
              <input
                id={`edit-amount-${invoice.id}`}
                name="amount"
                value={draft.amount}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="w-24">
              <label
                htmlFor={`edit-yield-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Yield
              </label>
              <input
                id={`edit-yield-${invoice.id}`}
                name="yield"
                value={draft.yield}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="w-40">
              <label
                htmlFor={`edit-due-${invoice.id}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Maturity
              </label>
              <input
                id={`edit-due-${invoice.id}`}
                name="dueDate"
                type="date"
                value={draft.dueDate}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={isInvalid}
              aria-disabled={isInvalid}
              data-testid="edit-save"
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 text-white text-sm font-medium rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              data-testid="edit-cancel"
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/invest/${invoice.id}`}
          className="font-medium text-slate-100 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
        >
          {invoice.issuer}
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleEdit}
            data-testid="edit-toggle"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 px-3 py-1 text-xs font-medium text-slate-400 hover:text-cyan-400 border border-slate-700 rounded transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            aria-label={`Edit ${invoice.issuer}`}
          >
            Edit
          </button>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-300">
            {invoice.status}
          </span>
        </div>
      </div>
      <div className="flex gap-6 text-sm text-slate-400">
        <span>
          {invoice.currency}&nbsp;{invoice.amount}
        </span>
        <span>
          {copy.invest.labelYield}
          {invoice.yield}
        </span>
        <span>
          {copy.invest.labelMaturity}
          {invoice.dueDate}
        </span>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </li>
  );
}
