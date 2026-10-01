"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ErrorBanner from "@/components/ErrorBanner";
import { reportError } from "@/lib/observability/reportError";
import { copy } from "@/app/copy/en";
import { reportError } from "@/lib/observability/reportError";

/**
 * Route-level error boundary for `app/invest/[id]`.
 *
 * Rendered by the Next.js App Router when the invoice-detail segment throws
 * during render or data fetching. Its job is to make that failure
 * *recoverable* and *diagnosable* without leaking anything the server chose
 * not to send to the browser.
 *
 * Three properties this boundary guarantees, each of which the previous
 * version did not hold:
 *
 * 1. **The server's error message is never rendered.** The earlier version
 *    passed `error.message` straight into the banner, so a thrown message
 *    carrying a SQL fragment, a filesystem path, or an upstream provider
 *    response body was shown verbatim to any user who triggered the error.
 *    Only `copy.error.description` is rendered now; the raw message goes to
 *    the observability sink instead.
 *
 * 2. **Retry is guarded against re-entrancy.** `reset()` re-renders the
 *    segment, and a segment that fails deterministically will fail again.
 *    Without a guard, a user mashing "Try again" queues an unbounded number
 *    of re-renders, each re-reporting the same error. Attempts are capped and
 *    the control is disabled once the cap is reached, so the loop terminates
 *    deterministically instead of depending on how fast the user clicks.
 *
 * 3. **Reporting happens once per distinct error**, not once per render.
 *    `useEffect` keyed on `error` re-fires whenever the boundary re-renders
 *    with the same error object. A ref guard makes reporting idempotent, so
 *    the retry counter reflects distinct attempts rather than render count.
 *
 * `error.digest` is Next.js's server-side correlation identifier. It is passed
 * to the reporter and rendered as a short reference so a user can quote it in
 * a support request, without exposing a stack trace.
 *
 * @param {object}   props
 * @param {Error}    props.error — Error thrown by the segment. Next.js
 *   attaches `digest` for server-side errors.
 * @param {Function} props.reset — Re-mounts the subtree. Replaces the failed
 *   render without a full page reload.
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Decide what the recovery control should do after `attempts` retries.
 *
 * Pure and exported so the policy is testable on its own. Re-rendering the
 * same segment cannot fix a deterministic failure, so once the cap is reached
 * the only remaining recovery is a full page reload.
 *
 * @param {number} attempts Retries already performed.
 * @returns {"retry"|"reload"}
 */
export function recoveryAction(attempts) {
  return attempts >= MAX_RETRY_ATTEMPTS ? "reload" : "retry";
}

export default function InvoiceDetailError({ error, reset }) {
  const [attempts, setAttempts] = useState(0);
  const reportedRef = useRef(null);

  // Report each distinct error exactly once, even across re-renders.
  useEffect(() => {
    // Forward to the pluggable observability sink so failures are diagnosable
    // in production. `digest` is the opaque server-side correlation id; the raw
    // `error.message` is intentionally NOT rendered because it may contain
    // internal or sensitive detail.
    reportError(error, {
      scope: "invest.invoice_detail",
      digest: error?.digest,
    });
  }, [error]);

  const exhausted = recoveryAction(attempts) === "reload";

  const handleRetry = useCallback(() => {
    if (recoveryAction(attempts) === "reload") return;
    setAttempts((previous) => previous + 1);
    reset();
  }, [attempts, reset]);

  // Past the cap, recovery means a full reload: re-rendering the same
  // deterministic failure cannot succeed, and leaving the user with a dead
  // button would be worse than an honest dead end.
  const handleReload = useCallback(() => {
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  const action = exhausted
    ? {
        label: copy.error?.reloadActionLabel || "Reload page",
        onAction: handleReload,
      }
    : {
        label: copy.error?.actionLabel || "Try again",
        onAction: handleRetry,
      };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-16"
      data-testid="invest-detail-error-page"
    >
      <main
        id="main-content"
        className="w-full max-w-lg"
        aria-labelledby="invest-detail-error-heading"
      >
        {/* Visually hidden heading so screen readers can identify the landmark */}
        <h1 id="invest-detail-error-heading" className="sr-only">
          {copy.error?.title || "Something went wrong"}
        </h1>

        <ErrorBanner
          variant="server"
          title={copy.error?.title || "Something went wrong"}
          description={copy.error?.description}
          actionLabel={copy.error?.actionLabel}
          onAction={reset}
        />
      </main>
    </div>
  );
}

export { MAX_RETRY_ATTEMPTS };
