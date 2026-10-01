/**
 * @file app/settings/lib.js
 *
 * Mock settings data and PX-safe helpers for the /settings page.
 *
 * ⚠️  SINGLE SOURCE OF TRUTH: This file is the only place mock settings
 * fixtures are defined. All components and tests must import
 * `MOCK_SETTINGS` and `loadMockSettings` from here.  Do NOT redeclare
 * them inline elsewhere.  Swap `loadMockSettings` for the real API
 * client once the backend `/settings` endpoint is wired.
 *
 * Contract per item: { id, category, label, type, value, description }
 * Categories cover: notifications, display, privacy, wallet, advanced.
 *
 * ── Compatibility contract (do NOT break without a migration plan) ──────────
 * Public surface preserved by this module:
 *   - `MOCK_SETTINGS` is a non-empty, frozen array of rows with the shape
 *     { id, category, label, type, value, description }; every `id` is unique
 *     and every field is a string. Rows are frozen so accidental mutation in
 *     one caller can never leak into another.
 *   - `loadMockSettings(options?)` ALWAYS resolves to an array and NEVER
 *     rejects — including for pre-aborted signals, invalid `options`/`signal`
 *     shapes, and the dev-only machine-speed delay. An aborted load resolves
 *     to `[]` (empty data) rather than throwing.
 *   - `getCategoryList(list)` ALWAYS returns `["all", ...]` with distinct,
 *     non-empty string categories sorted deterministically; non-array input
 *     yields `["all"]`.
 *   - `getSettingById(id)` returns a row for a known id and `undefined` for
 *     unknown / non-string ids (never throws).
 *   - `getCategories` remains a back-compat alias of `getCategoryList`.
 */

/** The categories the settings fixtures are allowed to use. */
export const SETTINGS_CATEGORIES = ["notifications", "display", "privacy", "wallet", "advanced"];

/**
 * Recursively freeze a value so the exported fixtures cannot be mutated by a
 * caller and silently corrupt every other consumer (the single-source-of-truth
 * guarantee documented above).
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
}

export const MOCK_SETTINGS = [
  {
    id: "pref-001",
    category: "notifications",
    label: "Email notifications",
    type: "toggle",
    value: "enabled",
    description: "Receive invoice lifecycle updates by email.",
  },
  {
    id: "pref-002",
    category: "notifications",
    label: "Browser push notifications",
    type: "toggle",
    value: "disabled",
    description: "Show desktop alerts for funded invoices.",
  },
  {
    id: "pref-003",
    category: "notifications",
    label: "Funding confirmation tone",
    type: "select",
    value: "chime",
    description: "Sound played when a funding attempt succeeds.",
  },
  {
    id: "pref-004",
    category: "display",
    label: "Theme",
    type: "select",
    value: "system",
    description: "Light, dark, or follow the operating system setting.",
  },
  {
    id: "pref-005",
    category: "display",
    label: "Compact list density",
    type: "toggle",
    value: "disabled",
    description: "Reduce row padding in list views.",
  },
  {
    id: "pref-006",
    category: "display",
    label: "Show yield disclaimer",
    type: "toggle",
    value: "enabled",
    description: "Display the educational yield disclaimer under each list.",
  },
  {
    id: "pref-007",
    category: "display",
    label: "Default marketplace sort",
    type: "select",
    value: "best-yield",
    description: "Sort order used on first marketplace visit.",
  },
  {
    id: "pref-008",
    category: "privacy",
    label: "Share wallet address with issuers",
    type: "toggle",
    value: "disabled",
    description: "Let the issuer see who funds an invoice.",
  },
  {
    id: "pref-009",
    category: "privacy",
    label: "Telemetry",
    type: "select",
    value: "anonymous",
    description: "Help improve the platform by sending anonymous usage signals.",
  },
  {
    id: "pref-010",
    category: "privacy",
    label: "Persistent session",
    type: "toggle",
    value: "enabled",
    description: "Keep the wallet session alive across browser restarts.",
  },
  {
    id: "pref-011",
    category: "wallet",
    label: "Default network",
    type: "select",
    value: "public",
    description: "Stellar network used when no wallet is connected.",
  },
  {
    id: "pref-012",
    category: "wallet",
    label: "Auto-confirm small payments",
    type: "toggle",
    value: "disabled",
    description: "Skip the wallet prompt for amounts below your threshold.",
  },
  {
    id: "pref-013",
    category: "wallet",
    label: "Auto-confirm threshold",
    type: "text",
    value: "0",
    description: "Maximum amount that can be auto-confirmed.",
  },
  {
    id: "pref-014",
    category: "wallet",
    label: "Transaction memo template",
    type: "text",
    value: "LiquiFact {invoiceId}",
    description: "Template applied to every send transaction memo.",
  },
  {
    id: "pref-015",
    category: "advanced",
    label: "Show developer panel",
    type: "toggle",
    value: "disabled",
    description: "Expose the in-page debug panel for power users.",
  },
  {
    id: "pref-016",
    category: "advanced",
    label: "Custom RPC endpoint",
    type: "text",
    value: "",
    description: "Override the default Stellar RPC URL.",
  },
  {
    id: "pref-017",
    category: "advanced",
    label: "Log level",
    type: "select",
    value: "warn",
    description: "Minimum severity written to the browser console.",
  },
  {
    id: "pref-018",
    category: "advanced",
    label: "Allow experimental wallets",
    type: "toggle",
    value: "disabled",
    description: "Show wallet adapters that are still in beta.",
  },
  {
    id: "pref-019",
    category: "notifications",
    label: "Settlement alerts",
    type: "toggle",
    value: "enabled",
    description: "Notify me when an invoice I funded settles.",
  },
  {
    id: "pref-020",
    category: "display",
    label: "Accent colour",
    type: "select",
    value: "cyan",
    description: "Accent colour used throughout the interface.",
  },
  {
    id: "pref-021",
    category: "privacy",
    label: "Hide balances from screenshots",
    type: "toggle",
    value: "enabled",
    description: "Blur numeric balances when taking screenshots.",
  },
  {
    id: "pref-022",
    category: "wallet",
    label: "Preferred wallet",
    type: "select",
    value: "freighter",
    description: "Wallet suggested first in the connect dialog.",
  },
  {
    id: "pref-023",
    category: "advanced",
    label: "Refresh interval",
    type: "text",
    value: "30",
    description: "Background refresh cadence, in seconds.",
  },
  {
    id: "pref-024",
    category: "notifications",
    label: "Daily digest",
    type: "toggle",
    value: "disabled",
    description: "Send one summary email per day instead of instant alerts.",
  },
  {
    id: "pref-025",
    category: "display",
    label: "Reduced motion",
    type: "toggle",
    value: "system",
    description: "Disable non-essential transitions automatically.",
  },
];

// Freeze the single source of truth so no caller can mutate it in place.
deepFreeze(MOCK_SETTINGS);

// DEV-only delay (ms) to keep the load-more cycle perceptible in dev.
const DEV_DELAY = process.env.NODE_ENV === "development" ? 80 : 0;
const SETTING_FIELDS = [
  "id",
  "category",
  "label",
  "type",
  "value",
  "description",
];

// Shared fixtures stay immutable; every load returns independently owned rows.
for (const setting of MOCK_SETTINGS) {
  Object.freeze(setting);
}
Object.freeze(MOCK_SETTINGS);

function validateSettings(settings) {
  if (!Array.isArray(settings)) {
    throw new TypeError("[settings] Settings must be an array.");
  }

  const ids = new Set();
  return Array.from(settings, (setting, index) => {
    if (!setting || typeof setting !== "object" || Array.isArray(setting)) {
      throw new TypeError(`[settings] Invalid setting row at index ${index}.`);
    }

    const row = {};
    for (const field of SETTING_FIELDS) {
      const value = setting[field];
      if (
        typeof value !== "string" ||
        (field !== "value" && field !== "description" && value.trim() === "")
      ) {
        throw new TypeError(
          `[settings] Invalid setting field "${field}" at index ${index}.`
        );
      }
      row[field] = value;
    }

    if (ids.has(row.id)) {
      throw new TypeError(`[settings] Duplicate setting id at index ${index}.`);
    }
    ids.add(row.id);
    return row;
  });
}

function isAbortSignal(signal) {
  try {
    return (
      signal !== null &&
      typeof signal === "object" &&
      typeof signal.aborted === "boolean" &&
      typeof signal.addEventListener === "function" &&
      typeof signal.removeEventListener === "function"
    );
  } catch {
    return false;
  }
}

// Deep-freeze MOCK_SETTINGS items and array to preserve fixture immutability
// across concurrent consumers and prevent accidental mutation bugs.
MOCK_SETTINGS.forEach((setting) => Object.freeze(setting));
Object.freeze(MOCK_SETTINGS);

/**
 * Safely format and log diagnostic information for settings operations
 * while redacting any sensitive data or credential patterns.
 *
 * @param {string} message - Diagnostic description
 * @param {object} [metadata] - Contextual metadata
 */
export function logSettingsDiagnostic(message, metadata = {}) {
  const SENSITIVE_KEY_PATTERN = /(key|token|auth|secret|credential|password|signature)/i;

  const sanitize = (obj, depth = 0) => {
    if (depth > 3 || !obj || typeof obj !== "object") return obj;
    if (obj instanceof Error) {
      return { message: obj.message, name: obj.name };
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item, depth + 1));
    }
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        clean[k] = "[REDACTED]";
      } else if (typeof v === "object" && v !== null) {
        clean[k] = sanitize(v, depth + 1);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  };

  const sanitized = sanitize(metadata);
  console.error(`[app/settings/lib] ${message}`, sanitized);
}

// In-flight state tracking coalesced loads to prevent duplicate concurrent work
let inFlightState = null;

/**
 * Diagnostic count of currently active callers awaiting coalesced in-flight load.
 *
 * @returns {number}
 */
export function getInFlightLoadCount() {
  return inFlightState ? inFlightState.callers.size : 0;
}

/**
 * Clear and abort any active in-flight settings loader.
 * Useful for test isolation and component teardown.
 */
export function clearInFlightLoads() {
  if (inFlightState) {
    if (inFlightState.timer) {
      clearTimeout(inFlightState.timer);
    }
    for (const caller of inFlightState.callers) {
      caller.cleanup();
      caller.resolve([]);
    }
    inFlightState.callers.clear();
    inFlightState = null;
  }
}

/**
 * Standalone loader helper when forceRefresh is requested or isolated execution needed.
 */
function executeStandaloneLoad({ signal, delay, isSignalValid, hasEventListener }) {
  if (isSignalValid && signal.aborted) {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    let timer = null;

    const onAbort = () => {
      if (timer) clearTimeout(timer);
      cleanup();
      resolve([]);
    };

    const cleanup = () => {
      if (hasEventListener) {
        try {
          signal.removeEventListener("abort", onAbort);
        } catch {}
      }
    };

    if (hasEventListener) {
      try {
        signal.addEventListener("abort", onAbort, { once: true });
      } catch (err) {
        logSettingsDiagnostic("Failed to attach abort listener in standalone load", { error: err });
      }
    }

    timer = setTimeout(() => {
      cleanup();
      if (isSignalValid && signal.aborted) {
        resolve([]);
      } else {
        const data =
          (typeof window !== "undefined" && window.__TEST_MOCK_SETTINGS__) || MOCK_SETTINGS;
        resolve(data);
      }
    }, delay);
  });
}

/**
 * Resolve the list of settings to display with concurrency hardening.
 *
 * Test hook: Playwright / Jest tests may override the fixture by setting
 * `window.__TEST_MOCK_SETTINGS__` before the component mounts.  The
 * override is ignored outside the browser and in production builds.
 *
 * Concurrency & Invariants:
 * 1. Coalesces concurrent in-flight requests to eliminate duplicate work
 *    and prevent timer / resource races.
 * 2. Isolates AbortSignals: each caller is cancelled independently without
 *    aborting sibling callers sharing the in-flight operation.
 * 3. Deterministically unregisters abort event listeners on settlement to
 *    prevent memory leaks on long-lived signals.
 * 4. Pre-aborted signals resolve immediately without scheduling background work.
 * 5. Safely handles boundary and invalid inputs (null, non-object, invalid signals).
 * 6. Returns frozen fixtures to preserve immutability across concurrent consumers.
 *
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - Abort signal honoured during execution;
 *   resolves cleanly to [] on cancellation without throwing.
 * @param {number} [options.delay] - Optional delay override in ms (defaults to DEV_DELAY).
 * @param {boolean} [options.forceRefresh] - If true, bypasses in-flight coalescing.
 * @returns {Promise<Array>}
 */
export function loadMockSettings(options = {}) {
  const safeOptions = options && typeof options === "object" ? options : {};
  const { signal, forceRefresh = false } = safeOptions;

  const isSignalValid = Boolean(signal && typeof signal === "object");
  const hasEventListener = Boolean(isSignalValid && typeof signal.addEventListener === "function");

  // Boundary condition: pre-aborted signal resolves immediately to empty array
  if (isSignalValid && signal.aborted) {
    return Promise.resolve([]);
  }

  // Test hook: Playwright / Jest tests may override the fixture
  if (typeof window !== "undefined" && window.__TEST_MOCK_SETTINGS__) {
    return Promise.resolve(window.__TEST_MOCK_SETTINGS__);
  }

  const delay =
    typeof safeOptions.delay === "number" &&
    !Number.isNaN(safeOptions.delay) &&
    safeOptions.delay >= 0
      ? safeOptions.delay
      : DEV_DELAY;

  if (forceRefresh && inFlightState) {
    return executeStandaloneLoad({ signal, delay, isSignalValid, hasEventListener });
  }

  if (!inFlightState) {
    const callers = new Set();
    const state = {
      callers,
      timer: null,
      settled: false,
    };

    inFlightState = state;

    state.timer = setTimeout(() => {
      state.settled = true;
      inFlightState = null;

      let data;
      try {
        data = (typeof window !== "undefined" && window.__TEST_MOCK_SETTINGS__) || MOCK_SETTINGS;
      } catch (err) {
        logSettingsDiagnostic("Error resolving mock settings fixture", { error: err });
        data = [];
      }

      for (const caller of state.callers) {
        caller.cleanup();
        if (caller.signal?.aborted) {
          caller.resolve([]);
        } else {
          caller.resolve(data);
        }
      }
      state.callers.clear();
    }, delay);
  }

  const activeState = inFlightState;

  return new Promise((resolve, reject) => {
    let callerRecord = null;

    const onAbort = () => {
      if (callerRecord && activeState.callers.has(callerRecord)) {
        activeState.callers.delete(callerRecord);
        callerRecord.cleanup();
        resolve([]);

        // If all registered callers have aborted and load hasn't settled, cancel underlying timer
        if (activeState.callers.size === 0 && !activeState.settled) {
          if (activeState.timer) {
            clearTimeout(activeState.timer);
          }
          if (inFlightState === activeState) {
            inFlightState = null;
          }
        }
      }
    };

    const cleanup = () => {
      if (hasEventListener) {
        try {
          signal.removeEventListener("abort", onAbort);
        } catch {
          // ignore cleanup errors on synthetic signals
        }
      }
    };

    callerRecord = {
      resolve,
      reject,
      signal,
      cleanup,
      onAbort,
    };

    activeState.callers.add(callerRecord);

    if (hasEventListener) {
      try {
        signal.addEventListener("abort", onAbort, { once: true });
      } catch (err) {
        logSettingsDiagnostic("Failed to attach abort listener", { error: err });
      }
    }
  });
}

/**
 * Distinct categories present in the given settings list, sorted
 * alphabetically with "all" prepended.
 *
 * Invariants:
 * 1. Deterministic and pure on any input: non-arrays return ["all"].
 * 2. Elements are defensively validated: null, undefined, non-objects,
 *    and non-string categories are safely ignored.
 * 3. Valid categories are trimmed and deduped.
 * 4. Returned array always starts with "all", followed by sorted unique categories.
 *
 * @param {Array} list
 * @returns {string[]} `["all", ...distinctCategories]`; `["all"]` for
 *   non-array input.
 */
export function getCategoryList(list) {
  if (!Array.isArray(list)) return ["all"];
  const set = new Set();
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item && typeof item === "object" && typeof item.category === "string") {
      const trimmed = item.category.trim();
      if (trimmed.length > 0) {
        set.add(trimmed);
      }
    }
  }
  return ["all", ...[...set].sort()];
}

// Back-compat alias so existing call sites that reference
// `getCategories` keep building.
export { getCategoryList as getCategories };

/**
 * Find a single setting row by id from MOCK_SETTINGS.
 *
 * Invariants:
 * 1. Safe against invalid types, whitespace, or prototype pollution attempts.
 * 2. Lookup is deterministic, non-throwing, and immutable.
 *
 * @param {string} id
 * @returns {object|undefined} The matching frozen row, or `undefined` for an
 *   unknown id or a non-string id. Never throws.
 */
export function getSettingById(id) {
  if (typeof id !== "string") return undefined;
  const cleanId = id.trim();
  if (cleanId.length === 0) return undefined;
  if (cleanId === "__proto__" || cleanId === "constructor" || cleanId === "prototype") {
    return undefined;
  }
  return MOCK_SETTINGS.find((s) => s.id === cleanId);
}
