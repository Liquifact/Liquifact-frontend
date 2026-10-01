// @ts-check
/**
 * @file app/settings/loading.js
 * Next.js route-level loading UI for the /settings page with deterministic
 * failure recovery.
 *
 * Rendered automatically by the Next.js App Router while the page segment is
 * streaming. It renders the reusable header + theme skeletons and, when loading
 * does not settle, transitions deterministically through the failure states
 * below so the user always gets a recoverable, accessible UI.
 *
 * State invariants
 * ----------------
 * The component is a pure function of a normalised descriptor plus one small
 * state machine; the machine owns every transition:
 *
 *   loading -> timed_out -> retrying -> loading            (a retry succeeded)
 *   loading -> error     -> retrying -> loading             (a child render failed)
 *   any failed state -> exhausted                            (retries spent)
 *
 * Guards preserved by every transition:
 *   - Only LOADING is "busy"; every failed/terminal state is not.
 *   - A retry can never start while one is already in flight, and never after
 *     the retry budget is spent (`EXHAUSTED`).
 *   - Timers are cleared on unmount and on every state change, so no callback
 *     fires after teardown or against stale state.
 *   - Invalid props (wrong types, NaN/Infinity/out-of-range delay, unknown
 *     reduced-motion literal) are clamped/defaulted; the component never
 *     throws on malformed input.
 *
 * @see components/ThemeSkeleton.jsx - reusable theme/settings skeleton
 * @see components/NavMenuSkeleton.jsx - reusable header skeleton
 * @see components/ErrorBanner.jsx - reusable accessible error banner
 * @see lib/observability/reportError.js - sanitized error reporter
 */
import { Component, useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import NavMenuSkeleton from "../../components/NavMenuSkeleton";
import ThemeSkeleton from "../../components/ThemeSkeleton";
import ErrorBanner from "../../components/ErrorBanner";
import { reportError } from "../../lib/observability/reportError";
import { copy } from "../copy/en";

/**
 * Deterministic loading lifecycle states.
 * @readonly
 * @enum {string}
 */
export const LOADING_STATES = Object.freeze({
  LOADING: "loading",
  TIMED_OUT: "timed_out",
  ERROR: "error",
  RETRYING: "retrying",
  EXHAUSTED: "exhausted",
});

/** Default timeout threshold (10 seconds) before showing timeout recovery UI. */
export const DEFAULT_TIMEOUT_MS = 10000;

/** Default maximum number of retry attempts before halting. */
export const DEFAULT_MAX_RETRIES = 3;

/** Maximum accepted skeleton delay in milliseconds. */
export const MAX_SKELETON_DELAY_MS = 60_000;

/** Default skeleton delay in milliseconds. */
export const DEFAULT_SKELETON_DELAY_MS = 0;

/** Default accessible label used when no valid label is supplied. */
export const DEFAULT_SKELETON_LABEL = "Theme settings loading, please wait";

/** Allowed literal values for the `reducedMotion` flag. */
const ACCEPTED_REDUCED_MOTION_VALUES = ["system", "reduce", "no-preference"];

/**
 * Class-based Error Boundary to catch render failures within the loading
 * subtree and route them back to the parent's recovery state machine.
 */
export class SettingsLoadingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onError === "function") {
      this.props.onError(error, errorInfo);
    }
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === "function"
          ? this.props.fallback({ error: this.state.error, reset: () => this.reset() })
          : this.props.fallback;
      }
      return null;
    }
    return this.props.children;
  }
}

SettingsLoadingErrorBoundary.propTypes = {
  children: PropTypes.node,
  onError: PropTypes.func,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Clamp an arbitrary input into a finite delay in [0, MAX_SKELETON_DELAY_MS].
 *
 * Non-finite or non-numeric inputs fall back to DEFAULT_SKELETON_DELAY_MS.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function clampSkeletonDelay(value) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SKELETON_DELAY_MS;
  if (numeric < 0) return 0;
  if (numeric > MAX_SKELETON_DELAY_MS) return MAX_SKELETON_DELAY_MS;
  return Math.floor(numeric);
}

/**
 * Normalise the `reducedMotion` flag. Only the documented literals are
 * accepted; anything else falls back to "system".
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normaliseReducedMotion(value) {
  if (typeof value !== "string") return "system";
  const normalised = value.trim().toLowerCase();
  return ACCEPTED_REDUCED_MOTION_VALUES.includes(normalised) ? normalised : "system";
}

/**
 * Build the canonical descriptor for the /settings loading segment.
 *
 * This function is the single validation boundary for the loading UI: every
 * field is either accepted as-is (when valid) or coerced to a safe default. It
 * never throws and never returns `undefined` fields.
 *
 * @param {object} [props]
 * @param {unknown} [props.delayMs]
 * @param {unknown} [props.reducedMotion]
 * @param {unknown} [props.label]
 * @returns {{ delayMs: number, reducedMotion: string, label: string }}
 */
export function getSettingsLoadingState(props = {}) {
  const safe = isPlainObject(props) ? props : {};
  const label =
    typeof safe.label === "string" && safe.label.trim().length > 0
      ? safe.label.trim()
      : DEFAULT_SKELETON_LABEL;
  return {
    delayMs: clampSkeletonDelay(safe.delayMs),
    reducedMotion: normaliseReducedMotion(safe.reducedMotion),
    label,
  };
}

/**
 * Route-level loading UI for /settings.
 *
 * @param {object} [props]
 * @param {number|null} [props.timeoutMs=DEFAULT_TIMEOUT_MS] - Timeout before
 *   transitioning to TIMED_OUT. Non-positive/non-finite disables the timeout.
 * @param {number} [props.maxRetries=DEFAULT_MAX_RETRIES]
 * @param {Function} [props.onRetry]
 * @param {Function} [props.onError]
 * @param {Error|null} [props.initialError=null]
 * @param {boolean} [props.isBusy] - Override the busy state (defaults to the
 *   state machine).
 * @param {string} [props.className]
 * @param {unknown} [props.delayMs]
 * @param {unknown} [props.reducedMotion]
 * @param {string} [props.label]
 * @param {React.ReactNode} [props.children]
 */
export function SettingsLoading({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  onRetry,
  onError,
  initialError = null,
  isBusy: isBusyOverride,
  className = "",
  delayMs,
  reducedMotion,
  label,
  children,
  ...rest
}) {
  const { "data-testid": dataTestId, ...forwardedProps } = rest;
  const {
    delayMs: safeDelayMs,
    reducedMotion: safeReducedMotion,
    label: safeLabel,
  } = getSettingsLoadingState({ delayMs, reducedMotion, label });

  // Boundary normalization for the state machine inputs.
  const safeTimeoutMs =
    typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : null;
  const safeMaxRetries =
    typeof maxRetries === "number" && Number.isFinite(maxRetries) && maxRetries >= 0
      ? Math.floor(maxRetries)
      : DEFAULT_MAX_RETRIES;

  const [status, setStatus] = useState(
    initialError
      ? safeMaxRetries === 0
        ? LOADING_STATES.EXHAUSTED
        : LOADING_STATES.ERROR
      : LOADING_STATES.LOADING,
  );
  const [currentError, setCurrentError] = useState(initialError);
  const [retryCount, setRetryCount] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const isMountedRef = useRef(true);
  const timerRef = useRef(null);
  const isRetryingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const emitObservability = useCallback((err, phase, attempt) => {
    try {
      reportError(err, { boundary: "SettingsLoading", phase, retryCount: attempt });
    } catch {
      // A failing observability sink must never break the loading UI.
    }
  }, []);

  // Timeout transition: only while actively loading.
  useEffect(() => {
    if (status !== LOADING_STATES.LOADING) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return undefined;
    }

    if (safeTimeoutMs !== null) {
      timerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        const timeoutErr = new Error(
          `Settings loading timed out after ${safeTimeoutMs}ms`,
        );
        timeoutErr.name = "SettingsLoadingTimeoutError";
        timeoutErr.code = "LOADING_TIMEOUT";

        const nextStatus =
          retryCount >= safeMaxRetries ? LOADING_STATES.EXHAUSTED : LOADING_STATES.TIMED_OUT;
        emitObservability(timeoutErr, "timeout", retryCount);
        setStatus(nextStatus);
        setCurrentError(timeoutErr);

        if (typeof onError === "function") {
          try {
            onError(timeoutErr, { phase: "timeout", retryCount });
          } catch {
            // Ignore callback exceptions.
          }
        }
      }, safeTimeoutMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, safeTimeoutMs, retryCount, safeMaxRetries, resetKey, emitObservability, onError]);

  const handleChildError = useCallback(
    (caughtError, errorInfo) => {
      if (!isMountedRef.current) return;
      const nextStatus =
        retryCount >= safeMaxRetries ? LOADING_STATES.EXHAUSTED : LOADING_STATES.ERROR;
      emitObservability(caughtError, "render_error", retryCount);
      setStatus(nextStatus);
      setCurrentError(caughtError);

      if (typeof onError === "function") {
        try {
          onError(caughtError, { phase: "render_error", retryCount, ...errorInfo });
        } catch {
          // Ignore callback exceptions.
        }
      }
    },
    [emitObservability, retryCount, safeMaxRetries, onError],
  );

  const handleRetry = useCallback(() => {
    // Idempotent: ignore duplicate triggers while retrying or still loading.
    if (isRetryingRef.current || status === LOADING_STATES.LOADING) return;
    if (retryCount >= safeMaxRetries) {
      setStatus(LOADING_STATES.EXHAUSTED);
      return;
    }

    const nextAttempt = retryCount + 1;
    isRetryingRef.current = true;
    setStatus(LOADING_STATES.RETRYING);

    const completeSuccess = () => {
      if (!isMountedRef.current) return;
      isRetryingRef.current = false;
      setRetryCount(nextAttempt);
      setResetKey((prev) => prev + 1);
      setCurrentError(null);
      setStatus(LOADING_STATES.LOADING);
    };

    const completeFailure = (err) => {
      if (!isMountedRef.current) return;
      isRetryingRef.current = false;
      setRetryCount(nextAttempt);
      emitObservability(err, "retry_failure", nextAttempt);
      setCurrentError(err);
      setStatus(
        nextAttempt >= safeMaxRetries ? LOADING_STATES.EXHAUSTED : LOADING_STATES.ERROR,
      );
    };

    if (typeof onRetry === "function") {
      try {
        const result = onRetry({ attempt: nextAttempt, maxRetries: safeMaxRetries });
        if (result && typeof result.then === "function") {
          result.then(completeSuccess, completeFailure);
          return;
        }
      } catch (err) {
        completeFailure(err);
        return;
      }
    }

    completeSuccess();
  }, [status, retryCount, safeMaxRetries, onRetry, emitObservability]);

  const isBusy =
    typeof isBusyOverride === "boolean"
      ? isBusyOverride
      : status === LOADING_STATES.LOADING || status === LOADING_STATES.RETRYING;
  const isFailed =
    status === LOADING_STATES.TIMED_OUT ||
    status === LOADING_STATES.ERROR ||
    status === LOADING_STATES.EXHAUSTED;

  const errorTitle =
    status === LOADING_STATES.TIMED_OUT
      ? copy?.settings?.timeoutTitle || "Loading timed out"
      : status === LOADING_STATES.EXHAUSTED
        ? copy?.settings?.exhaustedTitle || "Loading failed"
        : copy?.settings?.errorTitle || "Unable to load settings";

  const errorDescription =
    status === LOADING_STATES.TIMED_OUT
      ? copy?.settings?.timeoutDescription ||
        "Settings are taking longer than expected to load. You can try again or check your connection."
      : status === LOADING_STATES.EXHAUSTED
        ? copy?.settings?.exhaustedDescription ||
          "Settings could not be loaded after multiple attempts. Please check your connection or reload the page."
        : copy?.settings?.errorDescription || "Unable to load settings right now.";

  const showAction =
    isFailed && status !== LOADING_STATES.EXHAUSTED && retryCount < safeMaxRetries;
  const actionLabel = copy?.settings?.retryAction || "Try again";
  const details = retryCount > 0 ? `Attempt ${retryCount} of ${safeMaxRetries}` : undefined;

  const rootClassName = [
    "min-h-screen",
    "bg-slate-950",
    "text-slate-50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClassName}
      aria-busy={isBusy ? "true" : "false"}
      data-status={status}
      data-delay-ms={safeDelayMs}
      data-reduced-motion={safeReducedMotion}
      data-testid={dataTestId || "settings-loading"}
      {...forwardedProps}
    >
      <NavMenuSkeleton />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {isFailed ? (
          <div data-testid="settings-loading-fallback">
            <ErrorBanner
              variant="server"
              title={errorTitle}
              description={errorDescription}
              details={details}
              actionLabel={showAction ? actionLabel : undefined}
              onAction={handleRetry}
            />
          </div>
        ) : (
          <SettingsLoadingErrorBoundary onError={handleChildError}>
            <ThemeSkeleton isBusy={isBusy} label={safeLabel} />
          </SettingsLoadingErrorBoundary>
        )}

        {children}
      </main>
    </div>
  );
}

SettingsLoading.propTypes = {
  timeoutMs: PropTypes.number,
  maxRetries: PropTypes.number,
  onRetry: PropTypes.func,
  onError: PropTypes.func,
  initialError: PropTypes.instanceOf(Error),
  isBusy: PropTypes.bool,
  className: PropTypes.string,
  delayMs: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  reducedMotion: PropTypes.string,
  label: PropTypes.string,
  children: PropTypes.node,
};

SettingsLoading.defaultProps = {};

export default SettingsLoading;
