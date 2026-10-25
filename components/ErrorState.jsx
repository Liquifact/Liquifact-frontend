"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Reusable error UI component for route-level error boundaries.
 *
 * @param {object} props
 * @param {Error & { digest?: string }} [props.error] - Caught error object
 * @param {() => void} [props.reset] - Callback to recover/retry
 * @param {string} [props.title="Something went wrong"] - Error heading text
 * @param {string} [props.message="An unexpected error occurred while loading this page."] - Friendly message
 * @param {React.ReactNode} [props.extra] - Optional extra notice/reminder
 */
export default function ErrorState({
  error,
  reset,
  title = "Something went wrong",
  message = "An unexpected error occurred while loading this page.",
  extra,
}) {
  const headingRef = useRef(null);

  useEffect(() => {
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, []);

  const isProd = process.env.NODE_ENV === "production";
  const digest = error?.digest;
  const showStack = !isProd && error?.stack;

  return (
    <section className="section" aria-labelledby="error-heading">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card" role="alert">
          <div
            className="icon"
            style={{
              background: "color-mix(in srgb, var(--danger) 15%, transparent)",
              color: "var(--danger)",
            }}
          >
            ⚠
          </div>
          <h2
            id="error-heading"
            ref={headingRef}
            tabIndex={-1}
            style={{ outline: "none", fontSize: "1.5rem" }}
          >
            {title}
          </h2>
          <p className="lead" style={{ fontSize: "1rem", marginTop: 8 }}>
            {message}
          </p>

          {extra && <div style={{ marginTop: 14 }}>{extra}</div>}

          {(digest || showStack) && (
            <details style={{ marginTop: 18, fontSize: "0.88rem" }}>
              <summary
                style={{
                  cursor: "pointer",
                  color: "var(--muted)",
                  fontWeight: 600,
                }}
              >
                Technical details
              </summary>
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 14px",
                  background: "var(--surface-2)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                {digest && (
                  <p className="mono" style={{ margin: 0, wordBreak: "break-all" }}>
                    Digest: <code>{digest}</code>
                  </p>
                )}
                {showStack && (
                  <pre
                    style={{
                      margin: "8px 0 0",
                      maxHeight: 180,
                      overflowY: "auto",
                      fontSize: "0.8rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          <div className="btn-row" style={{ marginTop: 24 }}>
            {reset && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => reset()}
              >
                Try again
              </button>
            )}
            <Link href="/" className="btn btn-ghost">
              Go home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
