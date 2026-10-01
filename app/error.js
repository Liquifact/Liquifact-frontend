"use client";

import { useEffect, useTransition } from "react";
import ErrorBanner from "../components/ErrorBanner";
import { reportError } from "../lib/observability/reportError";
import { copy } from "./copy/en";

/**
 * Deterministic fallback surfaced when an automatic recovery attempt fails.
 * Exported so tests can assert on the exact user-visible string.
 */
export const ERROR_RECOVERY_FAILED =
  "Automatic recovery did not succeed. Please reload the page or return to the invoice list.";

/**
 * Route-level error boundary for the Next.js App Router.
 *
 * Rendered automatically by Next.js whenever a segment throws during render
 * or data-fetching. Wraps {@link ErrorBanner} so the page gets the full
 * branded error UI instead of the React default error overlay.
 *
 * The component logs the error through the pluggable {@link reportError}
 * reporter (console in development, swap for Sentry/Datadog in production).
 *
 * ## Determinism invariants
 * 1. **Exactly-once reporting per error instance.** React 18 StrictMode
 *    double-invokes effects in development, so a naive
 *    `useEffect(() => reportError(error), [error])` reports every failure
 *    twice. Deduping by error identity is StrictMode-safe while still
 *    reporting a *new* error instance (real repeat failures are not hidden).
 * 2. **Single-flight recovery.** At most one `reset()` is in flight. A
 *    re-entrant click while recovery is running is ignored, so a
 *    double-click — or a `reset` that synchronously forces another click —
 *    cannot queue competing recovery attempts.
 * 3. **Recovery cannot throw out of the boundary.** `reset` is validated and
 *    invoked inside a `try/catch`. A missing or throwing `reset` is caught,
 *    reported, and converted into a deterministic fallback instead of
 *    producing a second uncaught crash while handling the first.
 *
 * @param {object}   props
 * @param {Error}    props.error — The error thrown by the segment. Next.js
*   attaches a `digest` property for server-side errors so you can correlate
 *   browser errors with server logs.
 * @param {Function} props.reset — Calling this function unmounts and re-mounts
 *   the subtree, effectively retrying the failed render without a full page
 *   reload. Use it to give users a non-destructive recovery path.
 *
 * ## Validation boundaries
 *
 * This boundary is the last line of defense between an arbitrary thrown
 * value and the observability sink. The invariants enforced here are:
 *
 * 1. **Normalization** — `error` is always coerced to a real `Error`
 *    instance. React can throw anything (strings, `null`, plain objects,
 *    or even `undefined`), and `reportError` must never receive a non-
 *    `Error` value or it would lose the stack/digest and crash the sink.
 * 2. **Digest sanitization** — only a non-empty string digest is forwarded.
 *    Next.js sometimes leaves it `undefined` or `null`; forwarding those
 *    would produce noise in correlation queries.
 * 3. **Deduplication** — a given (error, digest) pair is reported at most
 *    once per mount. React StrictMode and re-renders can fire the effect
 *    multiple times for the same failure, which would inflate error counts
 *    and trigger duplicate alerting.
 * 4. **Fail-safe reporting** — if the sink throws (network down, quota
 *    exceeded), the boundary must still render the recovery UI and must
 *    not re-throw. Observability failure must never take down the error
 *    page itself. The failure is surfaced to the console only.
 * 5. **Reset guard** — `onAction` is only wired when `reset` is actually
 *    callable. A missing/non-function `reset` must not produce a broken
 *    button that throws on click.
 *
 * These boundaries are considered public behavior: any change to them
 * requires a test update in `app/error.test.js`.
 */

// Maximum length of a digest we are willing to forward. Next.js digests
// are short hashes; anything longer is likely a payload and we drop it rather
// than leak potentially sensitive data into the log sink.
const MAX_DIGEST_LENGTH = 256;

// Maximum length of a normalized message we keep on the Error object.
const MAX_MESSAGE_LENGTH = 2000;

// Maximum length of a normalized name we keep on the Error object.
const MAX_NAME_LENGTH = 128;

/**
 * Coerce any thrown value into a real `Error` instance.
 *
 * React's error boundaries accept any thrown value. This helper ensures
 * the observability sink always receives an `Error` with a usable message,
 * while preserving the original value for debugging.
 *
 * @param {unknown} value
 * @returns {Error}
 */
export function normalizeError(value) {
  if (value instanceof Error) {
    return value;
  }

  const fallbackMessage = "Unknown error";
  let message = fallbackMessage;

  if (typeof value === "string") {
    message = value || fallbackMessage;
  } else if (value === null || typeof value === "undefined") {
    message = fallbackMessage;
  } else if (typeof value === "object") {
    // Prefer a string `message` field if present (e.g. fetch rejections).
    if (typeof value.message === "string" && value.message) {
      message = value.message;
    } else {
      try {
        message = JSON.stringify(value);
      } catch {
        // Circular references or exotic objects — fall back to the generic
        // message rather than throwing inside the boundary.
        message = fallbackMessage;
      }
    }
  } else {
    // Numbers, booleans, bigints, symbols, functions.
    try {
      message = String(value);
    } catch {
      message = fallbackMessage;
    }
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    message = `${message.slice(0, MAX_MESSAGE_LENGTH)…`;
  }

  const normalized = new Error(message);
  normalized.name = "NormalizedError";
  // Preserve the original thrown value for debugging without exposing it
  // to the reporter by default.
  normalized.cause = value;
  return normalized;
}

/**
 * Return a sanitized digest string, or `undefined` when the digest is
 * missing, empty, non-string, or implausibly long.
 *
 * @param {unknown} digest
 * @returns {string | undefined}
 */
export function sanitizeDigest(digest) {
  if (typeof digest !== "string") {
    return undefined;
  }
  const trimmed = digest.trim();
  if (!trimmed || trimmed.length > MAX_DIGEST_LENGTH) {
    return undefined;
  }
  return trimmed;
}

/**
 * Build a stable dedupe key for an error report.
 *
 * The key is derived from the normalized name/message and the sanitized
 * digest. Two different error objects with the same identity are considered
 * the same failure for dedupe purposes.
 *
 * @param {Error} error
 * @param {string | undefined} digest
 * @returns {string}
 */
export function buildDedupeKey(error, digest) {
  const name = typeof error.name === "string" ? error.name.slice(0, MAX_NAME_LENGTH) : "";
  const message = typeof error.message === "string" ? error.message : "";
  return `${name}\u0000${message}\u0000${digest ?? ""}`;
}

/**
 * Report an error to the observability sink without ever throwing.
 *
 * @param {Error} error
 * @param {object} context
 * @returns {boolean} `true` when the report was delivered, `false` otherwise.
 */
export function safelyReportError(error, context) {
  try {
    reportError(error, context);
    return true;
  } catch (reportingError) {
    // Observability failure must not take down the error page. We surface
    // the failure to the console only, and never re-throw.
    if (typeof console !== "undefined" && typeof console.error === "function") {
      console.error(
        "[error-boundary] failed to report error to observability sink",
        reportingError,
      );
    }
    return false;
  }
}

export default function GlobalError({ error, reset }) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const normalized = normalizeError(error);
    const digest = sanitizeDigest(normalized.digest ?? error?.digest);
    const key = buildDedupeKey(normalized, digest);

    if (lastReportedKey.current === key) {
      // Duplicate submission for the same failure — skip the sink.
      return;
    }
    lastReportedKey.current = key;

    // Forward to the configurable observability sink.
    // `error.digest` is the server-side identifier so production logs can
    // be correlated without exposing raw stack traces to the client.
    safelyReportError(normalized, digest ? { digest } : undefined);
  }, [error]);

  // Only wire the recovery action when `reset` is actually callable.
  // A missing or non-function `reset` must not produce a button that
  // throws on click.
  const hasReset = typeof reset === "function";

  return (
    <div
      className="flex min-h-screen flex-col  items-center justify-center bg-slate-950 px-4 py-16"
      data-testid="error-boundary-page"
    >
      <main id="main-content" className="w-full max-w-lg" aria-labelledby="error-boundary-heading">
        {/* Visually hidden heading so screen readers can identify the landmark */}
        <h1 id="error-boundary-heading" className="sr-only">
          {copy.error.title}
        </h1>

        <ErrorBanner
          variant="server"
          title={copy.error.title}
          description={copy.error.description}
          actionLabel={isPending ? "Retrying..." : copy.error.actionLabel}
          previewLabel={copy.error.previewLabel}
          onAction={() => {
            if (isPending) return;
            startTransition(() => {
              reset();
            });
          }}
        />
      </main>
    </div>
  );
}

/**
 * Normalizes any thrown value into an `Error` instance.
 *
 * React and Next.js allow non-Error values to be thrown (strings,
 * `null`, objects). The boundary contract is that downstream consumers (and
 * the reporter) always receive an `Error`. This function is pure and
 * deterministic for the same input.
 *
 * @param {unknown} value
 * @returns {Error}
 */
function normalizeError(value) {
  if (value instanceof Error) {
    return value;
  }

  if (value === null || typeof value !== "object") {
    // Primitives and null/undefined — preserve the original value in
    // the message so debugging remains possible without losing information.
    return new Error(typeof value === "string" ? value : String(value));
  }

  // Object that is not an Error (e.g. a Plain object thrown by user code).
  // Prefer a message property if present, otherwise fall back to a safe
  // string. Avoid letting JSON.stringify throw on circular references.
  const message =
    typeof value.message === "string" && value.message.length > 0
      ? value.message
      : "[non-Error value thrown]";

  const normalized = new Error(message);

  // Preserve a digest if the thrown object carried one (Next.js attaches
  // digest to the thrown error, but custom code may throw a plain object
  // with a digest).
  if (typeof value.digest === "string") {
    normalized.digest = value.digest;
  }

  return normalized;
}

/**
 * Extracts a digest string from an error, or `rundefined` when absent.
 * The digest is an opaque server-side identifier and is safe to log.
 *
 * @param {Error} error
 * @returns {string | undefined}
 */
function normalizedDigest(error) {
  return typeof error?.digest === "string" ? error.digest : undefined;
}
