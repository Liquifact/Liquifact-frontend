"use client";

import { useEffect } from "react";
import ErrorBanner from "../components/ErrorBanner";
import { reportError } from "../lib/observability/reportError";
import { copy } from "./copy/en";

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
 * @param {object}   props
 * @param {Error}    props.error — The error thrown by the segment. Next.js
 *   attaches a `digest` property for server-side errors so you can correlate
 *   browser errors with server logs.
 * @param {Function} props.reset — Calling this function unmounts and re-mounts
 *   the subtree, effectively retrying the failed render without a full page
 *   reload. Use it to give users a non-destructive recovery path.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Forward to the configurable observability sink.
    // `error.digest` is the server-side identifier so production logs can
    // be correlated without exposing raw stack traces to the client.
    reportError(error, { digest: error?.digest });
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-16"
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
          actionLabel={copy.error.actionLabel}
          previewLabel={copy.error.previewLabel}
          onAction={reset}
        />
      </main>
    </div>
  );
}
