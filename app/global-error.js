"use client";

import { useEffect } from "react";
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
 * Unlike the route-level {@link GlobalError} in `app/error.js`, this component
 * does not use `ErrorBanner` — at this point the design-system CSS may not be
 * available, so it falls back to defensive inline styles to always be renderable.
 *
 * @param {object}   props
 * @param {Error}    props.error — The layout-level error.
 * @param {Function} props.reset — Re-mounts the root layout tree without a full
 *   navigation, giving users a lightweight recovery path before they need to reload.
 */
export default function GlobalLayoutError({ error, reset }) {
  useEffect(() => {
    reportError(error, { digest: error?.digest, boundary: "global-layout" });
  }, [error]);

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
            <button
              type="button"
              onClick={() => reset()}
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
