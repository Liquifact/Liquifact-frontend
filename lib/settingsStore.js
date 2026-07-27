/** localStorage key where user settings are persisted. */
export const SETTINGS_STORAGE_KEY = "liquifact-settings";

/** localStorage key where the last-changed timestamp (ms epoch) is persisted. */
export const SETTINGS_UPDATED_KEY = "liquifact-settings-updated";

/** @type {{currency: 'USD'|'EUR'|'NGN', emailNotifications: boolean}} */
export const DEFAULT_SETTINGS = {
  currency: "USD",
  emailNotifications: true,
};

/**
 * Read persisted settings from localStorage, merged over the defaults so
 * missing/older keys don't break the UI. Safe to call from the browser only.
 *
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function readStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persist settings to localStorage. Fails silently (private browsing, quota).
 *
 * @param {typeof DEFAULT_SETTINGS} settings
 */
export function writeStoredSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore write failures
  }
}

/**
 * Read the last-changed timestamp for settings from localStorage.
 *
 * @returns {number|null} ms since epoch, or null if never recorded / unavailable.
 */
export function readStoredSettingsUpdatedAt() {
  try {
    const stored = localStorage.getItem(SETTINGS_UPDATED_KEY);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persist the last-changed timestamp for settings. Fails silently.
 *
 * @param {number} updatedAt – ms since epoch
 */
export function writeStoredSettingsUpdatedAt(updatedAt) {
  try {
    localStorage.setItem(SETTINGS_UPDATED_KEY, String(updatedAt));
  } catch {
    // ignore write failures
  }
}