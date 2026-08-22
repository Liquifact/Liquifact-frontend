/**
 * Generic client-side form validation helpers.
 *
 * The repo already validates specific domains (`lib/validation/invoice.js`,
 * `lib/validation/pdf.js`), but every form input re-implemented its own
 * required/min/max checks and its own `aria-describedby` id wiring. This module
 * centralises that logic so inputs stay consistent and accessible.
 *
 * Design notes:
 * - Pure functions only: no React, no DOM, so this is trivially unit-testable.
 * - Validators return the first error message or `null`, never throw.
 * - These checks MIRROR server-side rules; they never replace them.
 */

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Message builders, kept in one place so copy stays consistent and can be
 * localised later without touching call sites.
 */
export const ValidationMessages = {
  required: (label) => `${label} is required.`,
  minLength: (label, n) => `${label} must be at least ${n} characters.`,
  maxLength: (label, n) => `${label} must be ${n} characters or fewer.`,
  min: (label, n) => `${label} must be ${n} or more.`,
  max: (label, n) => `${label} must be ${n} or less.`,
  number: (label) => `${label} must be a number.`,
  pattern: (label) => `${label} is not in the expected format.`,
};

// ---------------------------------------------------------------------------
// ARIA id helpers
// ---------------------------------------------------------------------------

/** Stable id for a field's error paragraph. */
export function errorId(fieldId) {
  return `${fieldId}-error`;
}

/** Stable id for a field's helper text. */
export function helperId(fieldId) {
  return `${fieldId}-helper`;
}

/**
 * Builds the ARIA props for an input.
 *
 * Only ids that actually exist in the DOM are referenced, because a dangling
 * IDREF is itself an accessibility defect.
 *
 * @param {Object} options
 * @param {string} options.fieldId - Base id for the field.
 * @param {string|null} [options.error] - Current error message, if any.
 * @param {boolean} [options.hasHelper] - Whether helper text is rendered.
 * @returns {{ "aria-invalid": "true"|"false", "aria-describedby": string|undefined }}
 */
export function fieldAriaProps({ fieldId, error = null, hasHelper = false }) {
  const ids = [];
  if (hasHelper) ids.push(helperId(fieldId));
  if (error) ids.push(errorId(fieldId));

  return {
    "aria-invalid": error ? "true" : "false",
    "aria-describedby": ids.length > 0 ? ids.join(" ") : undefined,
  };
}

// ---------------------------------------------------------------------------
// Field validation
// ---------------------------------------------------------------------------

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/**
 * Validates a single value against a rule set.
 *
 * Rules are checked in a deliberate order so the most useful message wins:
 * required, then type, then bounds, then format, then the custom validator.
 *
 * @param {unknown} value - The current field value.
 * @param {Object} [rules] - Rule set.
 * @param {boolean} [rules.required]
 * @param {number} [rules.minLength]
 * @param {number} [rules.maxLength]
 * @param {number} [rules.min]
 * @param {number} [rules.max]
 * @param {RegExp} [rules.pattern]
 * @param {Function} [rules.validate] - Custom check returning a message or null.
 * @param {string} [rules.label] - Human-readable field name used in messages.
 * @returns {string|null} The first error message, or null when valid.
 */
export function validateField(value, rules = {}) {
  const label = rules.label || "This field";

  if (isEmpty(value)) {
    // An empty optional field is valid; skip every remaining rule so we do not
    // report a spurious "must be a number" on a blank input.
    return rules.required ? ValidationMessages.required(label) : null;
  }

  const asString = typeof value === "string" ? value : String(value);

  if (typeof rules.minLength === "number" && asString.length < rules.minLength) {
    return ValidationMessages.minLength(label, rules.minLength);
  }

  if (typeof rules.maxLength === "number" && asString.length > rules.maxLength) {
    return ValidationMessages.maxLength(label, rules.maxLength);
  }

  const needsNumber = typeof rules.min === "number" || typeof rules.max === "number";

  if (needsNumber) {
    const asNumber = typeof value === "number" ? value : Number(asString);

    if (!Number.isFinite(asNumber)) {
      return ValidationMessages.number(label);
    }
    if (typeof rules.min === "number" && asNumber < rules.min) {
      return ValidationMessages.min(label, rules.min);
    }
    if (typeof rules.max === "number" && asNumber > rules.max) {
      return ValidationMessages.max(label, rules.max);
    }
  }

  if (rules.pattern instanceof RegExp && !rules.pattern.test(asString)) {
    return ValidationMessages.pattern(label);
  }

  if (typeof rules.validate === "function") {
    const custom = rules.validate(value);
    if (custom) return custom;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------------------

/**
 * Validates a whole set of values against a schema of rule sets.
 *
 * @param {Object} values - Map of field name to current value.
 * @param {Object} schema - Map of field name to rule set.
 * @returns {{ errors: Object, isValid: boolean, firstErrorField: string|null }}
 */
export function validateForm(values = {}, schema = {}) {
  const errors = {};
  let firstErrorField = null;

  for (const field of Object.keys(schema)) {
    const message = validateField(values[field], schema[field]);
    if (message) {
      errors[field] = message;
      if (firstErrorField === null) {
        firstErrorField = field;
      }
    }
  }

  return {
    errors,
    isValid: firstErrorField === null,
    firstErrorField,
  };
}

/**
 * True when an errors map contains no active messages.
 * Tolerates keys explicitly set to null/undefined, which is how components
 * usually clear a resolved error.
 */
export function isFormValid(errors) {
  if (!errors) return true;
  return Object.values(errors).every((message) => !message);
}

/**
 * Flattens an errors map into an ordered list for an error summary.
 * Entries with no message are omitted.
 *
 * @returns {Array<{ field: string, message: string }>}
 */
export function toErrorList(errors) {
  if (!errors) return [];
  return Object.entries(errors)
    .filter(([, message]) => Boolean(message))
    .map(([field, message]) => ({ field, message }));
}
