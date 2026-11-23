import { THEME_KEY } from "./theme.js";

export const BROWSER_NOTIFICATIONS_KEY = "liquifact-browser-notifications";
export const LOCAL_DATA_CHANGED_EVENT = "liquifact-local-data-changed";
export const STORAGE_KEYS = Object.freeze([
  THEME_KEY,
  "liquifact.notifications.v1",
  "liquifact-txs",
  "liquifact-submit-draft",
  BROWSER_NOTIFICATIONS_KEY,
]);

function knownKeys(keys) {
  return [...new Set(Array.isArray(keys) ? keys : [])].filter((key) => STORAGE_KEYS.includes(key));
}

/** Inspect only known app keys. Bytes are estimated UTF-16 key/value storage. */
export function describeLocalData(storage, keys = STORAGE_KEYS) {
  const entries = knownKeys(keys).map((key) => {
    try {
      if (!storage) throw new Error("unavailable");
      const value = storage.getItem(key);
      const present = typeof value === "string";
      return { key, present, bytes: present ? (key.length + value.length) * 2 : 0, readable: true };
    } catch { return { key, present: false, bytes: 0, readable: false }; }
  });
  return {
    entries,
    count: entries.filter((entry) => entry.present).length,
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    available: entries.every((entry) => entry.readable),
  };
}

/** Never clear the origin or unknown keys; continue after individual failures. */
export function clearLocalData(storage, keys = STORAGE_KEYS) {
  const removed = [];
  const failed = [];
  for (const key of knownKeys(keys)) {
    try {
      if (!storage) throw new Error("unavailable");
      storage.removeItem(key);
      removed.push(key);
    } catch { failed.push(key); }
  }
  return { removed, failed, success: failed.length === 0 };
}
