/**
 * Persistent transaction store for tracking Stellar/Soroban transactions.
 * Stores data in localStorage with schema version and safe parsing.
 */

const STORAGE_KEY = "liquifact-txs";
const SCHEMA_VERSION = 1;
const MAX_ENTRIES = 25;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  UNKNOWN: "UNKNOWN",
};

function createEmptyStore() {
  return { version: SCHEMA_VERSION, entries: [] };
}

function isValidEntry(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.hash === "string" &&
    entry.hash.length === 64 &&
    typeof entry.label === "string" &&
    typeof entry.createdAt === "number" &&
    typeof entry.status === "string" &&
    Object.values(STATUS).includes(entry.status)
  );
}

function parseStorage(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createEmptyStore();
    if (parsed.version !== SCHEMA_VERSION) return createEmptyStore();
    if (!Array.isArray(parsed.entries)) return createEmptyStore();
    const validEntries = parsed.entries.filter(isValidEntry);
    return { version: SCHEMA_VERSION, entries: validEntries };
  } catch {
    return createEmptyStore();
  }
}

function serialize(store) {
  return JSON.stringify(store);
}

/**
 * Create a transaction store with injected storage (for testing).
 * @param {Storage} storage - Storage implementation (localStorage or mock)
 * @returns {Object} Store API
 */
export function createTxStore(storage) {
  let memoryFallback = createEmptyStore();
  let storageAvailable = true;

  function read() {
    if (!storageAvailable) return memoryFallback;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return createEmptyStore();
      return parseStorage(raw);
    } catch {
      storageAvailable = false;
      return memoryFallback;
    }
  }

  function write(store) {
    if (!storageAvailable) {
      memoryFallback = store;
      return;
    }
    try {
      storage.setItem(STORAGE_KEY, serialize(store));
    } catch {
      storageAvailable = false;
      memoryFallback = store;
    }
  }

  function prune(entries) {
    const now = Date.now();
    // Keep last MAX_ENTRIES, drop entries older than MAX_AGE_MS
    return entries
      .filter((e) => now - e.createdAt < MAX_AGE_MS)
      .slice(-MAX_ENTRIES);
  }

  return {
    /**
     * Add a new transaction to track.
     * @param {Object} params
     * @param {string} params.hash - 64-char transaction hash
     * @param {string} params.label - Human-readable label
     * @param {string} [params.invoiceId] - Optional invoice ID
     * @param {number} [params.createdAt] - Timestamp (defaults to now)
     */
    add({ hash, label, invoiceId, createdAt = Date.now() }) {
      const store = read();
      const exists = store.entries.some((e) => e.hash === hash);
      if (exists) return this.update(hash, { label, invoiceId });
      const entry = {
        hash,
        label,
        invoiceId: invoiceId || null,
        createdAt,
        status: STATUS.PENDING,
        updatedAt: createdAt,
      };
      store.entries = prune([...store.entries, entry]);
      write(store);
      return entry;
    },

    /**
     * Update an existing transaction.
     * @param {string} hash - Transaction hash
     * @param {Object} patch - Fields to update
     */
    update(hash, patch) {
      const store = read();
      const idx = store.entries.findIndex((e) => e.hash === hash);
      if (idx === -1) return null;
      const allowed = ["status", "label", "invoiceId", "error"];
      const updated = { ...store.entries[idx] };
      for (const key of allowed) {
        if (patch[key] !== undefined) updated[key] = patch[key];
      }
      updated.updatedAt = Date.now();
      store.entries[idx] = updated;
      store.entries = prune(store.entries);
      write(store);
      return updated;
    },

    /** Get all transactions, newest first. */
    list() {
      const store = read();
      return [...store.entries].sort((a, b) => b.createdAt - a.createdAt);
    },

    /** Get a single transaction by hash. */
    get(hash) {
      const store = read();
      return store.entries.find((e) => e.hash === hash) || null;
    },

    /** Remove a transaction by hash. */
    remove(hash) {
      const store = read();
      store.entries = store.entries.filter((e) => e.hash !== hash);
      write(store);
    },

    /** Clear all transactions. */
    clear() {
      write(createEmptyStore());
    },

    /** Get count of pending transactions. */
    getPendingCount() {
      const store = read();
      return store.entries.filter((e) => e.status === STATUS.PENDING).length;
    },

    /** Get all pending transactions. */
    getPending() {
      const store = read();
      return store.entries.filter((e) => e.status === STATUS.PENDING);
    },

    STATUS,
  };
}

// Default export using localStorage (browser only)
let defaultStore = null;
export function getDefaultStore() {
  if (typeof window === "undefined") {
    // SSR: return a no-op store that throws on mutation
    return {
      add: () => {
        throw new Error("txStore not available during SSR");
      },
      update: () => {
        throw new Error("txStore not available during SSR");
      },
      list: () => [],
      get: () => null,
      remove: () => {},
      clear: () => {},
      getPendingCount: () => 0,
      getPending: () => [],
      STATUS,
    };
  }
  if (!defaultStore) {
    defaultStore = createTxStore(window.localStorage);
  }
  return defaultStore;
}

export { STATUS };