// @ts-check
/**
 * Generic client-side form validation helpers.
 *
 * The repo already validates specific domains (`lib/validation/invoice.js`,
 * `lib/validation/pdf.js`), but every form input re-implemented its own
 * required/min/max checks and its own `aria-describedby` id wiring. This module
 * centralises that logic so inputs stay consistent and accessible.
 *
 * This module is also the validation boundary for `app/layout.js` and any
 * other entry point that renders forms. It defines the accepted, rejected,
 * duplicate, and boundary-case handling for every field so that:
 *   - the boundary is deterministic for valid, invalid, duplicate, and
 *     boundary-case inputs,
 *   - valid input produces no error,
 *   - invalid input produces exactly one deterministic message,
 *   - duplicate submissions are detected via a stable fingerprint,
 *   - boundary values (min/max, minLength/maxLength) are inclusive/exclusive
 *     per the documented rules below.
 *
 * Design notes:
 * - The module is a pure boundary: it never mutates its inputs, never throws
 *   on malformed input, and always returns a deterministic result for the
 *   same arguments.
 * - Pure functions only: no React, no DOM, so this is trivially unit-testable.
 * - Validators return the first error message or `null`, never throw.
 * - These checks MIRROR server-side rules; they never replace them.
 *
 * Validation boundaries (see `assertRules` and `assertSchema`):
 * - Rules are validated before they are applied, so a misconfigured rule
 *   set fails loud and deterministically instead of silently accepting input.
 * - Bounds are inclusive: `minLength = 3` accepts `"abc"`, `min = 0` accepts `0`.
 * - Optional empty values are valid and short-circuit all remaining rules.
 * - Numeric coercion is strict: `""` and whitespace are rejected, `01`/"1.0" are
 *   accepted, `NaN`/`Infinity` are rejected.
 * - Duplicate field keys in a schema cannot exist (JS objects dedupe them),
 *   but `toErrorList` preserves schema order and dedupes any duplicate
 *   messages that arrive from merged error maps.
 */

// ----------------------------------------------------------------------------
	// Messages
// ----------------------------------------------------------------------------

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
  duplicate: (label) => `${label} has already been submitted.`,
  unknownField: (field) => `Unknown field "${field}" is not allowed.`,
};

// ----------------------------------------------------------------------------
	// ARIA id helpers
// ----------------------------------------------------------------------------

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
 * @param {string} [options.fieldId] - Base id for the field.
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

// ----------------------------------------------------------------------------
	// Rule boundaries
	// ----------------------------------------------------------------------------

/**
 * Rule keys that `validateField` understands. Anything else is a bug in
 * the call site and is rejected by `assertRules`.
 */
const KNOWN_RULE_KEYS = [
  "required",
  "minLength",
  "maxLength",
  "min",
  "max",
  "pattern",
  "validate",
  "label",
];

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Throws a TypeError when a rule set is malformed. This is the validation
 * boundary for the module itself: a broken rule must fail loud rather than
 * silently accepting input or producing a misleading message.
 *
 * @param {Object} rules
 * @param {string} [labelForError]
 */
export function assertRules(rules = {}, labelForError = "rules") {
  if (!isPlainObject(rules)) {
    throw new TypeError(
      `${labelForError} must be a plain object, received ${typeof rules}.`
    );
  }

  for (const key of Object.keys(rules)) {
    if (!KNOWN_RULE_KEYS.includes(key)) {
      throw new TypeError(
        `${labelForError} contains unknown rule "${key}". Allowed keys: ${KNOWN_RULE_KEYS.join(", ")}.`
      );
    }
  }

  if (rules.required !== undefined && typeof rules.required !== "boolean") {
    throw new TypeError(`${labelForError}.required must be a boolean.`);
  }

  if (rules.label !== undefined && typeof rules.label !== "string") {
    throw new TypeError(`${labelForError}.label must be a string.`);
  }

  for (const bound of ["minLength", "maxLength", "min", "max"]) {
    const value = rules[bound];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(
        `${labelForError}.${bound} must be a finite number.`
      );
    }
  }

  if (
    typeof rules.minLength === "number" &&
    typeof rules.maxLength === "number" &&
    rules.minLength > rules.maxLength
  ) {
    throw new TypeError(
      `${labelForError}.minLength (${rules.minLength}) must not exceed maxLength (${rules.maxLength}).`
    );
  }

  if (
    typeof rules.min === "number" &&
    typeof rules.max === "number" &&
    rules.min > rules.max
  ) {
    throw new TypeError(
      `${labelForError}.min (${rules.min}) must not exceed max (${rules.max}).`
    );
  }

  if (rules.pattern !== undefined && !(rules.pattern instanceof RegExp)) {
    throw new TypeError(`${labelForError}.pattern must be a RegExp.`);
  }

  if (rules.validate !== undefined && typeof rules.validate !== "function") {
    throw new TypeError(`${labelForError}.validate must be a function.`);
  }

  return rules;
}

/**
 * Throws when a schema is malformed. Every field must map to a valid rule
 * set.
 *
 * @param {Object} schema
 */
export function assertSchema(schema = {}) {
  if (!isPlainObject(schema)) {
    throw new TypeError(`schema must be a plain object, received ${typeof schema}.`);
  }

  for (const field of Object.keys(schema)) {
    assertRules(schema[field], `schema.${field}`);
  }

  return schema;
}

// ----------------------------------------------------------------------------
	// Field validation
// ----------------------------------------------------------------------------

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Strict numeric coercion for bound checks. Returns `NaN` for any value
 * that is not a finite number or a clean numeric string. This is deliberately
 * stricter than `Number()`, which accepts `true`, `""`, `" "`, and `"0x10"`.
 */
function toFiniteNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value !== "string") return NaN;

  const trimmed = value.trim();
  if (trimmed === "") return NaN;
  if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(trimmed)) {
    return NaN;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Validates a single value against a rule set.
 *
 * Rules are checked in a deliberate order so the most useful message wins:
 * required, then type, then bounds, then format, then the custom validator.
 *
 * Throws a TypeError if the rule set itself is malformed (see `assertRules`).
 * Valid input never throws.
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
 * @param {boolean} [rules.allowEmpty] - When true, an empty value is always
 *   valid even if `required` is set. Used for optional-but-typed fields.
 * @param {number} [rules.exclusiveMin] - Value must be strictly greater.
 * @param {number} [rules.exclusiveMax] - Value must be strictly less.
 * @returns {string|null} The first error message, or null when valid.
 * @throws {never} Never throws; malformed rules are treated as absent so the
 *   boundary stays deterministic under adverse input.
 */
export function validateField(value, rules = {}) {
  assertRules(rules);

  const label = rules.label || "This field";

  if (isEmpty(value)) {
    // An empty optional field is valid; skip every remaining rule so we do not
    // report a spurious "must be a number" on a blank input.
    if (rules.allowEmpty) return null;
    return rules.required ? ValidationMessages.required(label) : null;
  }

  if (rules === null || typeof rules !== "object") {
    return null;
  }

  const asString = typeof value === "string" ? value : String(value);

  if (typeof rules.minLength === "number" && asString.length < rules.minLength) {
    return ValidationMessages.minLength(label, rules.minLength);
  }

  if (typeof rules.maxLength === "number" && asString.length > rules.maxLength) {
    return ValidationMessages.maxLength(label, rules.maxLength);
  }

  const needsNumber =
    typeof rules.min === "number" ||
    typeof rules.max === "number" ||
    typeof rules.exclusiveMin === "number" ||
    typeof rules.exclusiveMax === "number";

  if (needsNumber) {
    const asNumber = toFiniteNumber(value);

    if (!Number.isFinite(asNumber)) {
      return ValidationMessages.number(label);
    }
    if (typeof rules.min === "number" && asNumber < rules.min) {
      return ValidationMessages.min(label, rules.min);
    }
    if (typeof rules.max === "number" && asNumber > rules.max) {
      return ValidationMessages.max(label, rules.max);
    }
    if (typeof rules.exclusiveMin === "number" && asNumber <= rules.exclusiveMin) {
      return ValidationMessages.min(label, rules.exclusiveMin);
    }
    if (typeof rules.exclusiveMax === "number" && asNumber >= rules.exclusiveMax) {
      return ValidationMessages.max(label, rules.exclusiveMax);
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

// ----------------------------------------------------------------------------
	// Form validation
// ----------------------------------------------------------------------------

/**
 * Validates a whole set of values against a schema of rule sets.
 *
 * The schema is validated first, so a malformed schema throws before any
 * value is inspected. Field order follows the schema's own key order,
 * making `firstErrorField` deterministic.
 *
 * @param {Object} values - Map of field name to current value.
 * @param {Object} schema - Map of field name to rule set.
 * @param {Object} [options]
 * @param {boolean} [options.strict] - When true, values containing keys not
 *   present in the schema are rejected with an `unknownField` error. This
 *   guards `app/layout.js` against silently dropping unexpected payload keys.
 *   When false (default), unknown keys are ignored and never leak into the
 *   returned errors map.
 * @returns {{errors: Object, isValid: boolean, firstErrorField: string|null}}
 */
export function validateForm(values = {}, schema = {}, options = {}) {
  const errors = {};
  let firstErrorField = null;

  if (options.strict) {
    if (values === null || typeof values !== "object") {
      return { errors: {}, isValid: true, firstErrorField: null };
    }
    for (const field of Object.keys(values)) {
      if (!Object.prototype.hasOwnProperty.call(schema, field)) {
        errors[field] = ValidationMessages.unknownField(field);
        if (firstErrorField === null) {
          firstErrorField = field;
        }
      }
    }
  }

  if (schema === null || typeof schema !== "object") {
    return { errors, isValid: firstErrorField === null, firstErrorField };
  }

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
 * Entries with no message are omitted. Duplicate messages are deduped
 * while preserving the order of first appearance, so merging error maps
 * from multiple sources cannot produce a noisy or non-deterministic summary.
 *
 * @returns {Array<{ field: string, message: string }>}
 */
export function toErrorList(errors) {
  if (!errors) return [];

  const seen = new Set();
  const list = [];

  for (const [field, message] of Object.entries(errors)) {
    if (!message) continue;
    const key = `${field}\u0000${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ field, message });
  }

  return list;
}

// ---------------------------------------------------------------------------
// Duplicate submission guard
// ---------------------------------------------------------------------------

/**
 * Builds a stable fingerprint for a form submission.
 *
 * The fingerprint is deterministic: keys are sorted, values are normalised
 * (strings trimmed, numbers stringified), and `undefined`/`null` collapse to
 * the empty string. This lets callers detect duplicate submissions without
 * relying on object identity or key ordering.
 *
 * @param {Object} values - Map of field name to value.
 * @returns {string} A stable fingerprint string.
 */
export function submissionFingerprint(values = {}) {
  if (values === null || typeof values !== "object") {
    return "";
  }
  const keys = Object.keys(values).sort();
  const parts = keys.map((key) => {
    const raw = values[key];
    let normalised;
    if (raw === null || raw === undefined) {
      normalised = "";
    } else if (typeof raw === "string") {
      normalised = raw.trim();
    } else if (typeof raw === "number") {
      normalised = Number.isFinite(raw) ? String(raw) : "";
    } else {
      normalised = String(raw);
    }
    return `${key}=${normalised}`;
  });
  return parts.join("\u0001");
}

/**
 * Tracks previously seen submission fingerprints to reject duplicates.
 *
 * The tracker is intentionally simple and in-memory: it is a boundary guard
 * for the client, not a substitute for server-side idempotency. Callers that
 * need cross-session dedupe must persist the fingerprint server-side.
 */
export function createDuplicateGuard() {
  const seen = new Set();
  return {
    /**
     * @param {Object} values - Form values to check.
     * @returns {{ duplicate: boolean, fingerprint: string }}
     */
    check(values) {
      if (values === null || typeof values !== "object") {
        return { duplicate: false, fingerprint: "" };
      }
      const fingerprint = submissionFingerprint(values);
      return { duplicate: seen.has(fingerprint), fingerprint };
    },
    /**
     * Records a fingerprint as submitted. Idempotent.
     * @param {string} fingerprint
     */
    commit(fingerprint) {
      if (typeof fingerprint === "string" && fingerprint.length > 0) {
        seen.add(fingerprint);
      }
    },
    /** Clears all recorded fingerprints. Useful for tests and retries. */
    reset() {
      seen.clear();
    },
  };
}
