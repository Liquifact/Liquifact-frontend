/** @typedef {{currency: 'USD'|'EUR'|'NGN', emailNotifications: boolean}} Settings */

/** @typedef {{ok: boolean, value: Settings, errors: string[]}} ValidationResult */

/** localStorage key where user settings are persisted. */
export const SETTINGS_STORAGE_KEY = "liquifact-settings";

/** localStorage key where the last-changed timestamp (ms epoch) is persisted. */
export const SETTINGS_UPDATED_KEY = "liquifact-settings-updated";

/** Supported currency codes. Centralized so validation and UI stay in sync. */
export const SUPPORTED_CURRENCIES = Object.freeze(["USD", "EUR", "NGN"]);

/** Currency code used when input is missing or invalid. */
export const DEFAULT_CURRENCY = "USD";

/** Default email-notification flag. */
export const DEFAULT_EMAIL_NOTIFICATIONS = true;

/** Maximum acceptable timestamp (ms epoch). */
export const MAX_UPDATED_AT = 864000000000000; // Year 275760, a generous upper bound.

/** @type {Settings} */
export const DEFAULT_SETTINGS = Object.freeze({
  currency: DEFAULT_CURRENCY,
  emailNotifications: DEFAULT_EMAIL_NOTIFICATIONS,
});

/**
 * Type guard for a supported currency code.
 *
 * @param {unknown} value
 * @returns {value is 'USD'|'EUR'|'NGN'}
 */
export function isSupportedCurrency(value) {
  return typeof value === "string" && SUPPORTED_CURRENCIES.includes(value);
}

/**
 * Type guard for a plain (non-null, non-array) object.
 *
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Type guard for a boolean flag.
 *
 * @param {unknown} value
 * @returns {value is boolean}
 */
export function isBooleanFlag(value) {
  return typeof value === "boolean";
}

/**
 * Normalize an unknown input into a valid Settings object.
 *
 * Valid fields are kept as-is; unknown or invalid fields fall back to the
 * defaults. This is the single source of truth for validation boundaries.
 *
 * @param {unknown} input
 * @returns {Settings}
 */
export function normalizeSettings(input) {
  if (!isPlainObject(input)) {
    return { ...DEFAULT_SETTINGS };
  }

  const currency = isSupportedCurrency(input.currency)
    ? input.currency
    : DEFAULT_SETTINGS.currency;

  const emailNotifications = isBooleanFlag(input.emailNotifications)
    ? input.emailNotifications
    : DEFAULT_SETTINGS.emailNotifications;

  return { currency, emailNotifications };
}

/**
 * Validate an incoming settings object without applying defaults.
 *
 * Returns a result object so callers can surface deterministic errors and
 * avoid silent data loss. The `value` is always a normalized Settings object.
 *
 * @param {unknown} input
 * @returns {ValidationResult}
 */
export function validateSettings(input) {
  const errors = [];

  if (!isPlainObject(input)) {
    errors.push("settings must be a plain object");
    return { ok: false, value: { ...DEFAULT_SETTINGS }, errors };
  }

  if (!isSupportedCurrency(input.currency)) {
    errors.push(
      `currency must be one of ${SUPPORTED_CURRENCIES.join(", ")}`,
    );
  }

  if (!isBooleanFlag(input.emailNotifications)) {
    errors.push("emailNotifications must be a boolean");
  }

  return {
    ok: errors.length === 0,
    value: normalizeSettings(input),
    errors,
  };
}

/** Allowed currency values. */
export const ALLOWED_CURRENCIES = ["USD", "EUR", "NGN"];

/**
 * Error class thrown when settings persistence fails. Carries a
 * machine-readable code so callers can react deterministically without
 * parsing human-messages.
 */
export class SettingsPersistenceError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {{underlying?: unknown}} [options]
   */
  constructor(code, message, options = {}) {
    super(message);
    this.name = "SettingsPersistenceError";
    this.code = code;
    if (options.underlying !== undefined) {
      this.underlying = options.underlying;
    }
  }
}

/**
 * Resolve the active localStorage implementation. Returns null when
 * not available (SSR, tests, non-browser environments).
 *
 * @typedef {Storage | null}
 */
function getStorage() {
  try {
    if (typeof localStorage === "undefined" || localStorage == null) {
      return null;
    }
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Normalize an arbitrary input into a valid settings object. Unknown
 * keys are dropped and invalid values fall back to defaults. This keeps
 * persisted state deterministic and prevents corrupt data from leaking
 * into the UI.
 *
 * @param {unknown} candidate
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function normalizeSettings(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { ...DEFAULT_SETTINGS };
  }

  const next = { ...DEFAULT_SETTINGS };

  if (ALLOWED_CURRENCIES.includes(candidate.currency)) {
    next.currency = candidate.currency;
  }

  if (typeof candidate.emailNotifications === "boolean") {
    next.emailNotifications = candidate.emailNotifications;
  }

  return next;
}

/**
 * Read persisted settings from localStorage, merged over the defaults so
 * missing/older keys don't break the UI. Safe to call from the browser only.
 *
 * Invariants:
 * - Always returns a fresh object (callers can't mutate the defaults).
 * - Never throws; corrupt or invalid data falls back to defaults.
 * - Never returns unknown or out-of-range fields.
 *
 * @returns {Settings}
 */
export function readStoredSettings() {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_SETTINGS };

  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    // Reject non-object payloads (e.g. `null`, arrays, primitives) so that
    // corrupt storage cannot silently produce a partially-populated state.
    if (!isPlainObject(parsed)) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persist settings to localStorage deterministically. Validates and
 * normalizes the input before writing, then reads it back to confirm the
 * write succeeded. Throws a SettingsPersistenceError on failure so the
 * callers can surface a user-visible error and retry without losing
 * in-memory state.
 *
 * Validation is enforced before writing: invalid input is normalized to the
 * defaults rather than persisted as-is, so corrupt state cannot be written.
 *
 * @param {unknown} settings
 * @returns {boolean} true if the value was persisted.
 */
export function writeStoredSettings(settings) {
  // Reject non-object input outright: writing defaults for garbage input
  // would silently overwrite valid persisted state (data loss).
  if (!isPlainObject(settings)) return false;
  const normalized = normalizeSettings(settings);
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }

  const serialized = JSON.stringify(normalized);

  try {
    storage.setItem(SETTINGS_STORAGE_KEY, serialized);
  } catch (underlying) {
    throw new SettingsPersistenceError(
      "STORAGE_WRITE_FAILED",
      "Settings could not be saved. Please retry.",
      { underlying },
    );
  }

  // Verify the write landed correctly. Some environments (e.g. quota
  // exceeded, private mode) accept setItem without persisting.
  try {
    const readBack = storage.getItem(SETTINGS_STORAGE_KEY);
    if (readBack !== serialized) {
      throw new SettingsPersistenceError(
        "STORAGE_VERIFY_FAILED",
        "Settings did not persist correctly. Please retry.",
      );
    }
  } catch (err) {
    if (err instanceof SettingsPersistenceError) throw err;
    throw new SettingsPersistenceError(
      "STORAGE_VERIFY_FAILED",
      "Settings could not be verified after saving. Please retry.",
      { underlying: err },
    );
  }

  return normalized;
}

/**
 * Read the last-changed timestamp for settings from localStorage.
 *
 * Boundary checks:
 * - must be a finite number
 * - must be >= 0
 * - must be <= MAX_UPDATED_AT
 *
 * @returns {number|null} ms since epoch, or null if never recorded / unavailable.
 */
export function readStoredSettingsUpdatedAt() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const stored = localStorage.getItem(SETTINGS_UPDATED_KEY);
    if (!stored) return null;
    // Only accept canonical decimal integers; reject "1e3", "0x10", " 1",
    // "1.5", "Infinity", etc. so boundary semantics are deterministic.
    if (!/^\d+$/.test(stored)) return null;
    const parsed = Number(stored);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < 0 || parsed > MAX_UPDATED_AT) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist the last-changed timestamp for settings. Throws a SettingsPersistenceError on failure so the caller can recover or report.
 *
 * Invalid or out-of-bounds timestamps are rejected and not written.
 *
 * @param {unknown} updatedAt – ms since epoch
 * @returns {boolean} true if the value was persisted.
 */
export function writeStoredSettingsUpdatedAt(updatedAt) {
  if (typeof updatedAt !== "number") return false;
  if (!Number.isFinite(updatedAt)) return false;
  if (!Number.isInteger(updatedAt)) return false;
  if (updatedAt < 0 || updatedAt > MAX_UPDATED_AT) return false;
  try {
    localStorage.setItem(SETTINGS_UPDATED_KEY, String(updatedAt));
    return true;
  } catch {
    return false;
  }

  const storage = getStorage();
  if (!storage) {
    throw new SettingsPersistenceError(
      "STORAGE_UNAVAILABLE",
      "Settings timestamp could not be saved: browser storage is unavailable.",
    );
  }

  try {
    storage.setItem(SETTINGS_UPDATED_KEY, String(updatedAt));
  } catch (underlying) {
    throw new SettingsPersistenceError(
      "STORAGE_WRITE_FAILED",
      "Settings timestamp could not be saved. Please retry.",
      { underlying },
    );
  }

  return updatedAt;
}
