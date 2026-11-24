// Persisted notification state in localStorage.
// Versioned and corruption-safe. Inject `storage` and `eventTarget` for tests.

const VERSION = 1;
const MAX_EVENTS = 50;
const DEFAULT_KEY = "liquifact.notifications.v1";

const defaultState = () => ({
  version: VERSION,
  snapshot: {},
  events: [],
  followedIds: [],
  chainCursors: {},
});

/**
 * Create a notification store backed by a storage-like object (default localStorage).
 *
 * @param {Object} options
 * @param {Storage} [options.storage] - defaults to localStorage
 * @param {EventTarget} [options.eventTarget] - defaults to window (for cross-tab storage events)
 * @param {string} [options.key] - storage key
 * @param {number} [options.version] - schema version
 * @param {number} [options.maxEvents] - max events to retain
 */
export function createNotificationStore({
  storage = typeof localStorage !== "undefined" ? localStorage : null,
  eventTarget = typeof window !== "undefined" ? window : null,
  key = DEFAULT_KEY,
  version = VERSION,
  maxEvents = MAX_EVENTS,
} = {}) {
  let state = defaultState();
  const listeners = new Set();

  function parse(raw) {
    if (typeof raw !== "string" || !raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || parsed.version !== version) return null;
      return {
        version,
        snapshot: parsed.snapshot && typeof parsed.snapshot === "object" && !Array.isArray(parsed.snapshot)
          ? parsed.snapshot
          : {},
        events: Array.isArray(parsed.events) ? parsed.events : [],
        followedIds: Array.isArray(parsed.followedIds) ? parsed.followedIds : [],
        chainCursors: parsed.chainCursors && typeof parsed.chainCursors === "object" && !Array.isArray(parsed.chainCursors) ? parsed.chainCursors : {},
      };
    } catch {
      return null;
    }
  }

  function read() {
    try {
      if (!storage) return defaultState();
      const raw = storage.getItem(key);
      if (!raw) return defaultState();
      return parse(raw) || defaultState();
    } catch {
      // Corrupt or unreadable payload - fall back to a clean state.
      return defaultState();
    }
  }

  function write(next) {
    try {
      if (storage) storage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage quota or private-mode denial - persist best effort, keep running in memory.
    }
  }

  function notify() {
    for (const fn of listeners) {
      try {
        fn();
      } catch {
        /* isolate subscriber errors */
      }
    }
  }

  function onStorage(event) {
    if (!event) return;
    if (event.key !== null && event.key !== key) return;
    if (event.storageArea && storage && event.storageArea !== storage) return;

    // Storage cleared or key removed in another tab.
    if (event.key === null || event.newValue === null) {
      state = defaultState();
      notify();
      return;
    }

    const next = parse(event.newValue);
    if (!next) return; // Ignore corrupt or incompatible payloads.

    // Update in-memory state and notify without writing back (avoids echo loops).
    state = next;
    notify();
  }

  state = read();

  if (eventTarget && typeof eventTarget.addEventListener === "function") {
    eventTarget.addEventListener("storage", onStorage);
  }

  return {
    /** Rehydrate after settings or another tab removes persisted app data. */
    reload() { state = read(); },
    /** Subscribe to store updates (including cross-tab sync). Returns an unsubscribe function. */
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Remove the cross-tab storage event listener. */
    dispose() {
      if (eventTarget && typeof eventTarget.removeEventListener === "function") {
        eventTarget.removeEventListener("storage", onStorage);
      }
      listeners.clear();
    },

    /** Shallow copy of the invoice snapshot map. */
    getSnapshot() {
      return { ...state.snapshot };
    },

    /** Merge a single invoice into the snapshot (seeds a baseline when following). */
    setSnapshot(invoice) {
      if (!invoice || !invoice.id) return;
      state = {
        ...state,
        snapshot: { ...state.snapshot, [invoice.id]: invoice },
      };
      write(state);
    },

    /** Replace the whole snapshot with the latest poll (called by the monitor). */
    replaceSnapshot(invoices = []) {
      const snap = {};
      for (const inv of invoices) if (inv && inv.id) snap[inv.id] = inv;
      state = { ...state, snapshot: snap };
      write(state);
    },

    /** Return a copy of all events (newest first). */
    getEvents() {
      return [...state.events];
    },

    /** Append a new event (unread), keeping only the most recent `maxEvents`. */
    addEvent(event) {
      const nextEvent = { ...event, read: false, receivedAt: event.at || new Date().toISOString() };
      const events = [nextEvent, ...state.events].slice(0, maxEvents);
      state = { ...state, events };
      write(state);
    },

    /** Mark every event as read. */
    markAllRead() {
      const events = state.events.map((e) => ({ ...e, read: true }));
      state = { ...state, events };
      write(state);
    },

    /** Number of unread events. */
    unreadCount() {
      return state.events.filter((e) => !e.read).length;
    },

    /** Set of currently followed invoice ids. */
    getFollowed() {
      return new Set(state.followedIds);
    },

    isFollowing(id) {
      return state.followedIds.includes(id);
    },

    /** Start following an invoice (idempotent). */
    follow(id) {
      if (!id || state.followedIds.includes(id)) return;
      state = { ...state, followedIds: [...state.followedIds, id] };
      write(state);
    },

    /** Stop following an invoice. */
    unfollow(id) {
      state = { ...state, followedIds: state.followedIds.filter((x) => x !== id) };
      write(state);
    },

    /** Reset to a clean state (primarily for tests). */
    clear() {
      state = defaultState();
      try {
        if (storage) storage.removeItem(key);
      } catch {
        /* ignore */
      }
    },

    /** Return a copy of all persisted chain cursors keyed by contract id. */
    getChainCursors() {
      return { ...(state.chainCursors ?? {}) };
    },

    /** Persist the latest RPC cursor for a contract. */
    setChainCursor(contractId, cursor) {
      if (!contractId || !cursor) return;
      state = {
        ...state,
        chainCursors: { ...(state.chainCursors ?? {}), [contractId]: cursor },
      };
      write(state);
    },
  };
}