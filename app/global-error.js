"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/observability/reportError";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    reportError(error, { boundary: "global" });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 24,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#0a0e1f",
          color: "#eef1fb",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#111733",
            border: "1px solid #232b52",
            borderRadius: 14,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(248, 113, 113, 0.15)",
              color: "#f87171",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              marginBottom: 16,
            }}
          >
            ⚠
          </div>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 8px" }}>
            Application Error
          </h1>
          <p style={{ color: "#9aa3c4", fontSize: "0.95rem", margin: "0 0 24px" }}>
            A critical system error occurred. You can attempt recovery or return home.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {reset && (
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#818cf8",
                  color: "#0a0e1f",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            )}
            <a
              href="/"
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "1px solid #232b52",
                background: "#161d3f",
                color: "#eef1fb",
                fontWeight: 600,
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
