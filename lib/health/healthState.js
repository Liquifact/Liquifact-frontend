/**
 * Health-check state machine for app/page.js.
 *
 * Invariants:
 *  1. Status is one of STATUS.*; anything else is treated as IDLE.
 *  2. START is ignored while LOADING (duplicate submissions cannot start a second request).
 *  3. Result actions (SUCCESS / DEGRADED / FAILURE) apply ONLY when status is LOADING
 *     AND action.requestId === state.requestId. Stale or late results are ignored.
 *  4. Unknown actions never change state (deterministic no-op).
 *  5. Failures store only a whitelisted reason code, never a raw error message.
 *  6. Terminal states (CONNECTED/DEGRADED/UNREACHABLE) change only via START.
 *  7. Results from getHealth are normalized before storage: status is always a
 *     known terminal status and message is always a bounded string.
 */

export const STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  CONNECTED: "connected",
  DEGRADED: "degraded",
  UNREACHABLE: "unreachable",
});

export const FAILURE_REASON = Object.freeze({
  TIMEOUT: "timeout",
  NETWORK: "network",
  BAD_JSON: "bad_json",
  HTTP_ERROR: "http_error",
  UNKNOWN: "unknown",
});

export const MAX_MESSAGE_LENGTH = 500;

const VALID_STATUS = new Set(Object.values(STATUS));
const VALID_REASONS = new Set(Object.values(FAILURE_REASON));
const RESULT_STATUS = new Set([STATUS.CONNECTED, STATUS.DEGRADED, STATUS.UNREACHABLE]);

export const initialHealthState = Object.freeze({
  status: STATUS.IDLE,
  requestId: 0,
  payload: null,
  reason: null,
});

/** Map any thrown error to a safe code. Never returns the raw message. */
export function classifyFailure(error) {
  if (error && error.name === "AbortError") return FAILURE_REASON.TIMEOUT;
  if (error instanceof SyntaxError) return FAILURE_REASON.BAD_JSON;
  if (error instanceof TypeError) return FAILURE_REASON.NETWORK;
  return FAILURE_REASON.UNKNOWN;
}

/**
 * Normalize whatever getHealth returned into a render-safe object.
 *  - not an object            -> unreachable
 *  - unknown status value     -> degraded (backend responded, but not in a recognised way)
 *  - non-string message       -> ""  (strings are capped at MAX_MESSAGE_LENGTH)
 * Extra fields (e.g. details, version) are preserved for the existing renderers.
 */
export function normalizeHealthResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return { status: STATUS.UNREACHABLE, message: "" };
  }
  const status = RESULT_STATUS.has(result.status) ? result.status : STATUS.DEGRADED;
  const message =
    typeof result.message === "string" ? result.message.slice(0, MAX_MESSAGE_LENGTH) : "";
  return { ...result, status, message };
}

export function healthReducer(state, action) {
  const current =
    state && VALID_STATUS.has(state.status) ? state : initialHealthState;
  if (!action || typeof action.type !== "string") return current;

  switch (action.type) {
    case "START":
      if (current.status === STATUS.LOADING) return current; // invariant 2
      return {
        status: STATUS.LOADING,
        requestId: current.requestId + 1,
        payload: null,
        reason: null,
      };

    case "SUCCESS":
    case "DEGRADED":
    case "FAILURE": {
      if (current.status !== STATUS.LOADING) return current; // invariant 3
      if (action.requestId !== current.requestId) return current; // invariant 3

      if (action.type === "SUCCESS") {
        return { ...current, status: STATUS.CONNECTED, payload: action.payload ?? null, reason: null };
      }
      if (action.type === "DEGRADED") {
        return {
          ...current,
          status: STATUS.DEGRADED,
          payload: action.payload ?? null,
          reason: FAILURE_REASON.HTTP_ERROR,
        };
      }
      const reason = VALID_REASONS.has(action.reason) ? action.reason : FAILURE_REASON.UNKNOWN; // invariant 5
      return { ...current, status: STATUS.UNREACHABLE, payload: action.payload ?? null, reason };
    }

    default:
      return current; // invariant 4
  }
}