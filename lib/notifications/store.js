// Persisted notification state in localStorage.
// Versioned and corruption-safe. Inject `storage` for tests.

const VERSION = 1;
const MAX_EVENTS = 50;
const DEFAULT_KEY = "liquifact.notifications.v1";

const defaultState = () => ({
  version: VERSION,
  snapshot: {},
  events: [],
  followedIds: [],
});

/**
 * Create a notification store backed by a storage-like object (default localStorage).
 *
 * @param {Object} options
 * @param {Storage} [options.storage] - defaults to localStorage
 * @param {string} [options.key] - storage key
 * @param {number} [options.version] - schema version
 * @param {number} [options.maxEvents] - max events to retain
 */
export function createNotificationStore({
  storage = typeof localStorage !== "undefined" ? localStorage : null,
  key = DEFAULT_KEY,
  version = VERSION,
  maxEvents = MAX_EVENTS,
} = {}) {
  let state = defaultState();

  function read() {
    try {
      if (!storage) return defaultState();
      const raw = storage.getItem(key);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== version) return defaultState();
      return {
        version,
        snapshot: parsed.snapshot && typeof parsed.snapshot === "object" ? parsed.snapshot : {},
        events: Array.isArray(parsed.events) ? parsed.events : [],
        followedIds: Array.isArray(parsed.followedIds) ? parsed.followedIds : [],
      };
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

  state = read();

  return {
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
  };
}
