"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * Result of validating a draft edit value.
 *
 * - `null`  means the value is acceptable and may be saved.
 * - A string is a non-empty error message that explains why the value is
 *   invalid. The InlineEditRow disables Save while this is non-null and
 *   announces it through the row's polite live region.
 *
 * @typedef {(value: string) => string | null} InlineEditValidator
 */

/**
 * @typedef {Object} InlineEditRowProps
 * @property {string}        id            - Unique identifier used to derive stable ids for the input/region. Also exported via `data-row-id` for tests.
 * @property {string}        label         - Visible label for the field (e.g. "Display name").
 * @property {string}        value         - The currently persisted value (read-only display value).
 * @property {InlineEditValidator} [validate]  - Optional synchronous validator invoked with the draft value. Return null when valid.
 * @property {boolean}       [required=false] - When true, applies {@link defaultRequiredValidator} automatically. A caller-supplied `validate` prop still wins.
 * @property {(next: string) => void} onSave   - Called with the validated draft when the user saves.
 * @property {string}        [type='text'] - Underlying `<input>` type. Only "text" and "email" are supported for inline edit.
 * @property {string}        [placeholder] - Placeholder shown in the input while editing.
 * @property {string}        [description] - Optional helper text rendered under the label.
 * @property {string}        [editLabel]   - Accessible label override for the Edit button.
 * @property {string}        [saveLabel]   - Accessible label override for the Save button.
 * @property {string}        [cancelLabel] - Accessible label override for the Cancel button.
 * @property {string}        [emptyText='Not set'] - Text rendered when `value` is empty.
 * @property {string}        [savedAnnouncement]   - Live-region message after a successful save. {label} is substituted.
 * @property {string}        [cancelledAnnouncement] - Live-region message after cancel. {label} is substituted.
 * @property {string}        [formatDisplay]       - Optional formatter for the displayed (read-only) value.
 */

/** Substitute `{label}` / `{error}` tokens in a message string. */
function applyTemplate(template, replacements) {
  if (typeof template !== "string") return "";
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return String(replacements[key]);
    }
    return match;
  });
}

/**
 * Built-in validator for fields marked `required`.  Used by the
 * {@link InlineEditRow} `required` prop.  Always exported for unit
 * tests and for callers that want to compose it with their own checks.
 *
 * @type {InlineEditValidator}
 */
export const defaultRequiredValidator = (value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return "This field cannot be empty.";
  }
  return null;
};

/**
 * Inline-edit row for a settings page.
 *
 * Each row toggles between a read-only **View** mode and an **Edit** mode
 * with a single-line input. The row handles:
 *
 *  - Switching between modes via Edit / Save / Cancel buttons.
 *  - Live validation while the user types (Save stays disabled when invalid).
 *  - Keyboard accessibility: `Enter` saves via the wrapping `<form>`,
 *    `Escape` cancels and returns focus to the Edit button.
 *  - Focus management: focus moves to the input on Edit, and returns to the
 *    Edit button after Save, Cancel, or Escape.
 *  - Polite aria-live announcement of save / cancel / invalid outcomes.
 *
 * The component is intentionally controlled: it does not own the persisted
 * value; it only calls back to `onSave` so the parent page can persist via
 * `useLocalStorage` (or any other store).
 *
 * @param {InlineEditRowProps} props
 */
export default function InlineEditRow({
  id,
  label,
  value,
  validate,
  onSave,
  type = "text",
  placeholder,
  description,
  required = false,
  editLabel,
  saveLabel,
  cancelLabel,
  emptyText = "Not set",
  savedAnnouncement,
  cancelledAnnouncement,
  formatDisplay,
}) {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const messageId = useId();

const editButtonRef = useRef(null);
const inputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => value);
  // Status messages announced via the row's live region. Empty string means
  // "nothing to announce right now". The component never renders the empty
  // placeholder so screen readers don't read the empty content as a change.
  const [announcement, setAnnouncement] = useState("");

  // Resolve the effective validator: caller-supplied wins, otherwise fall
  // back to `defaultRequiredValidator` when `required` is true, else null.
  const effectiveValidate = useMemo(() => {
    if (typeof validate === "function") return validate;
    if (required) return defaultRequiredValidator;
    return null;
  }, [validate, required]);

  // Run validator on every keystroke; memoised to keep the disabled-Save
  // decision pure with respect to (draft, effectiveValidate).
  const error = useMemo(() => {
    if (!isEditing) return null;
    if (effectiveValidate === null) return null;
    const result = effectiveValidate(draft);
    // Coerce non-string / empty-string returns to null per the @typedef
    // contract ("a non-empty error message"). This means a validator that
    // returns "" or undefined is treated as "no error".
    return typeof result === "string" && result.length > 0 ? result : null;
  }, [draft, effectiveValidate, isEditing]);

  const isInvalid = error !== null;
  const trimmedDraft = draft.trim();

  // Enter edit mode: seed the draft from the persisted value, focus the
  // input, clear any stale announcements.
  const enterEdit = useCallback(() => {
    setDraft(value);
    setIsEditing(true);
    setAnnouncement("");
  }, [value]);

  const focusInput = useCallback(() => {
    // Defer focus until React has flushed the DOM swap from view → edit mode.
    queueMicrotask(() => {
      const el = inputRef.current;
      if (el && typeof el.focus === "function") {
        el.focus();
        // Select the existing text so the user can immediately overwrite.
        if (typeof el.select === "function") el.select();
      }
    });
  }, []);

  // Cancel edit: reset draft, optionally announce cancellation (only when
  // the draft actually differs from the stored value, to avoid screen-reader
  // noise on no-op Escape presses), and return focus to Edit.
  const cancel = useCallback(
    (announceWhenChanged = true) => {
      const trimmedDraft = (draft ?? "").trim();
      const trimmedValue = (value ?? "").trim();
      const changed =
        isInvalid || trimmedDraft !== trimmedValue;
      setIsEditing(false);
      setDraft(value);
      if (announceWhenChanged && changed) {
        setAnnouncement(applyTemplate(cancelledAnnouncement, { label }));
      } else {
        setAnnouncement("");
      }
      queueMicrotask(() => {
        const el = editButtonRef.current;
        if (el && typeof el.focus === "function") el.focus();
      });
    },
    [draft, value, isInvalid, cancelledAnnouncement, label]
  );

  // Persist a valid draft and return to view mode with a "saved" announcement.
  const save = useCallback(() => {
    if (isInvalid) {
      // Extra defensive guard: Submit button is disabled while invalid, but
      // an Enter on the form or a programmatic submit could still get here.
      setAnnouncement(applyTemplate("{label} not saved: {error}", { label, error }));
      return;
    }
    onSave(trimmedDraft);
    setIsEditing(false);
    setAnnouncement(applyTemplate(savedAnnouncement, { label }));
    queueMicrotask(() => {
      const el = editButtonRef.current;
      if (el && typeof el.focus === "function") el.focus();
    });
  }, [isInvalid, onSave, trimmedDraft, savedAnnouncement, label, error]);

  // Once we transition into edit mode, focus the input. We use an effect
  // (rather than calling focusInput inside enterEdit) to avoid touching the
  // DOM before React commits the new tree.
  useEffect(() => {
    if (isEditing) {
      focusInput();
    }
  }, [isEditing, focusInput]);

  // Form submission triggers save — Enter inside the input bubbles up here.
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      save();
    },
    [save]
  );

  // Escape cancels — wired to the form so it works regardless of which
  // element inside the form currently holds focus (input, save, cancel).
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel(true);
      }
    },
    [cancel]
  );

  const displayValue =
    typeof value === "string" && value.length > 0
      ? (typeof formatDisplay === "function" ? formatDisplay(value) : value)
      : emptyText;

  const editButtonAccessible = editLabel ?? `Edit ${label}`;
  const saveButtonAccessible = saveLabel ?? `Save ${label}`;
  const cancelButtonAccessible = cancelLabel ?? `Cancel editing ${label}`;

  const renderDescription = description || null;

  // ───────────────────────────────── View mode ──────────────────────────────────
  if (!isEditing) {
    return (
      <li
        data-row-id={id}
        className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span
              id={`${id}-label`}
              className="text-sm font-medium text-slate-300"
            >
              {label}
            </span>
          </div>
          <p
            id={`${id}-display`}
            data-testid={`${id}-display`}
            className="mt-1 text-base text-slate-100 break-words"
          >
            {displayValue}
          </p>
          {renderDescription && (
            <p
              id={descriptionId}
              className="mt-1 text-xs text-slate-500"
            >
              {renderDescription}
            </p>
          )}
        </div>

        <button
          ref={editButtonRef}
          type="button"
          onClick={enterEdit}
          aria-label={editButtonAccessible}
          data-testid={`${id}-edit`}
          className="self-start sm:self-center inline-flex items-center justify-center rounded-full border border-cyan-700/60 bg-cyan-900/20 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-900/40 focus-ring"
        >
          Edit
        </button>

        {/* Polite live region for row-level announcements (saves / cancels).
            We always mount the node so screen readers wire their observers up,
            but its text is only set when there is something to announce. */}
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid={`${id}-live`}
          id={messageId}
          className="sr-only"
        >
          {announcement}
        </p>
      </li>
    );
  }

  // ───────────────────────────────── Edit mode ──────────────────────────────────
  return (
    <li
      data-row-id={id}
      className="flex flex-col gap-3 rounded-xl border border-cyan-700/60 bg-slate-900/70 p-4"
    >
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        noValidate
        aria-labelledby={`${id}-label`}
      >
        <label
          id={`${id}-label`}
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-200"
        >
          {label}
        </label>
        {renderDescription && (
          <p id={descriptionId} className="mt-1 text-xs text-slate-500">
            {renderDescription}
          </p>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type={type === "email" ? "email" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          aria-describedby={
            [description && descriptionId, isInvalid && errorId]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={isInvalid ? "true" : "false"}
          data-testid={`${id}-input`}
          className={[
            "mt-3 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100",
            "placeholder:text-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950",
            isInvalid
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-700 focus:ring-cyan-500",
          ].join(" ")}
        />

        {/* Validation error message — only present when invalid. Linked via
            aria-describedby above so screen readers read it on focus. */}
        {isInvalid && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            data-testid={`${id}-error`}
            className="mt-2 text-xs text-red-400"
          >
            {error}
          </p>
        )}

        {/* Polite live region for save / cancel announcements. Always
            mounted so the assistive tech observer is wired up. */}
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          id={messageId}
          data-testid={`${id}-live`}
          className="sr-only"
        >
          {announcement}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={isInvalid}
            aria-label={saveButtonAccessible}
            aria-disabled={isInvalid ? "true" : "false"}
            data-testid={`${id}-save`}
            className="inline-flex items-center justify-center rounded-full bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/30 focus-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => cancel(true)}
            aria-label={cancelButtonAccessible}
            data-testid={`${id}-cancel`}
            className="inline-flex items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-ring"
          >
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}

// Named export for unit tests that want the raw validator without JSX.
export { applyTemplate };
