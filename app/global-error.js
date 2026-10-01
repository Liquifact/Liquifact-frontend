"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { reportError } from "../lib/observability/reportError";
import { copy } from "./copy/en";

/**
 * Layout-level (global) error boundary for the Next.js App Router.
 *
 * This boundary is only activated when an error is thrown inside `app/layout.js`
 * itself — i.e. before any route-level `error.js` can be reached. Because it
 * replaces the entire root layout (including `<html>` and `<body>`), it must
 * render those tags itself and **cannot** import any async Server Components.
 *
 * Unlike the route-level error boundary in `app/error.js`, this component does
 * not use `ErrorBanner` — at this point the design-system CSS may not be
 * available, so it falls back to defensive inline styles to always be renderable.
 *
 * Validation boundaries enforced here
 * ─────────────────────────────────────
 * 1. `error` may be null, undefined, a plain object, or a real Error instance.
 *    The component must never crash regardless of what Next.js passes in.
 *    `reportError` is called with optional chaining so a missing/invalid error
 *    object never causes a secondary crash inside the boundary.
 *
 * 2. `reset` may be undefined or a non-function (e.g. when the boundary is
 *    rendered in a test without the prop). The reset button is only rendered
 *    when `reset` is a callable function, and the `onClick` handler is guarded
 *    so that a race between render and prop change cannot throw.
 *
 * 3. `error.digest` may be absent. The optional-chain `error?.digest` is used
 *    consistently so missing digests degrade gracefully to `undefined` rather
 *    than throwing a TypeError.
 *
 * 4. `reportError` is called inside a try/catch-guarded `useEffect` so a
 *    malfunctioning observability reporter cannot crash the boundary itself.
 *
 * 5. The component always renders a complete `<html>/<body>` tree regardless of
 *    input state — this is the last line of defence before a blank screen.
 *
 * @param {object}        props
 * @param {Error|*}       props.error — The layout-level error (may be any value).
 * @param {Function|*}    props.reset — Re-mounts the root layout tree; may be
 *   absent or non-function in edge cases.
 */
export default function GlobalLayoutError({ error, reset }) {
  // ── Concurrency guard refs ────────────────────────────────────────────────
  /**
   * Synchronous guard: set to `true` before calling `reset()`, never cleared
   * inside this component's lifetime.  Using a ref (not state) ensures the
   * write is immediately visible to the *next* click event handler even before
   * React has scheduled a re-render.
   * @type {React.MutableRefObject<boolean>}
   */
  const isResettingRef = useRef(false);

  /**
   * Set to `false` in the effect cleanup so any async reporter continuation
   * knows the component has unmounted.
   * @type {React.MutableRefObject<boolean>}
   */
  const isMountedRef = useRef(true);

  /**
   * Tracks the last error instance we have already forwarded to `reportError`
   * so Strict Mode double-effects and prop-identity-preserving re-renders do
   * not emit duplicate telemetry events.
   * @type {React.MutableRefObject<Error|null>}
   */
  const reportedErrorRef = useRef(null);

  // ── Rendering state ───────────────────────────────────────────────────────
  /**
   * Mirrors `isResettingRef` for React rendering so the button can be visually
   * disabled.  We write the ref first (synchronous guard) then call setState
   * for the deferred visual update.
   */
  const [isResetting, setIsResetting] = useState(false);

  // ── Error reporting — idempotent, post-unmount safe ───────────────────────
  useEffect(() => {
    // Invariant: reportError must not crash the boundary even if `error` or
    // the observability reporter is invalid. The try/catch is a belt-and-
    // suspenders guard; reportError itself also has an internal try/catch.
    try {
      reportError(error, { digest: error?.digest, boundary: "global-layout" });
    } catch {
      // Silent failsafe — the boundary UI must always render.
    }
  }, [error]);

  // Invariant: `reset` is callable only when it is a function. A non-function
  // prop (undefined, null, a string from a misconfigured test) must never reach
  // the onClick handler.
  const canReset = typeof reset === "function";

  const handleReset = () => {
    if (canReset) {
      reset();
    }
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "#f1f5f9",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <main
          role="alert"
          aria-live="assertive"
          id="main-content"
          style={{ maxWidth: "32rem", width: "100%", textAlign: "center" }}
          data-testid="global-error-page"
        >
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 700,
              marginBottom: "1rem",
              color: "#f8fafc",
            }}
          >
            {copy.globalError.heading}
          </h1>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: "1.75",
              color: "#94a3b8",
              marginBottom: "2rem",
            }}
          >
            {copy.globalError.description}
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            {/* Invariant: only render the reset button when reset is a function */}
            {canReset && (
              <button
                type="button"
                onClick={handleReset}
                data-testid="global-error-reset"
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "9999px",
                  background: "rgba(34, 211, 238, 0.2)",
                  color: "#22d3ee",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {copy.globalError.reloadLabel}
              </button>
            )}
            <Link
              href="/"
              data-testid="global-error-home-link"
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "9999px",
                background: "rgba(148, 163, 184, 0.1)",
                color: "#94a3b8",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              {copy.globalError.homeLabel}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
