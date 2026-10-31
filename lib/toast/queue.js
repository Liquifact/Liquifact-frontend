// Pure toast queue reducer (#1399). Plain ESM so node:test can import it.

export const MAX_VISIBLE = 3;
export const DEFAULT_DURATIONS = Object.freeze({ success: 5000, info: 5000, warning: 5000, error: 0 });
const KINDS = new Set(["success", "error", "info", "warning"]);

let seq = 0;
function nextId() {
  seq += 1;
  return `toast-${Date.now().toString(36)}-${seq}`;
}

/** Normalise a pushed toast: kind, id and default duration (0 = sticky). */
export function normalizeToast(toast = {}) {
  const kind = KINDS.has(toast.kind) ? toast.kind : "info";
  const duration = Number.isFinite(toast.duration) ? Math.max(0, toast.duration) : DEFAULT_DURATIONS[kind];
  return { ...toast, kind, id: toast.id ?? nextId(), title: toast.title ?? "", duration };
}

/**
 * Queue reducer. Actions: { type: "push", toast } | { type: "dismiss", id } | { type: "clear" }.
 * Pushing an existing id replaces it in place (de-duplication); only the newest
 * MAX_VISIBLE toasts are kept.
 */
export function reducer(state, action) {
  switch (action?.type) {
    case "push": {
      const toast = normalizeToast(action.toast);
      const exists = state.some((t) => t.id === toast.id);
      const next = exists ? state.map((t) => (t.id === toast.id ? toast : t)) : [...state, toast];
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    }
    case "dismiss":
      return state.filter((t) => t.id !== action.id);
    case "clear":
      return [];
    default:
      return state;
  }
}
