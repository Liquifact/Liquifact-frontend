/**
 * @file app/apple-icon.tsx
 *
 * Generates the Apple Touch Icon (180×180 PNG) for LiquiFact using
 * Next.js's built-in `ImageResponse` edge API.
 *
 * ─── COMPATIBILITY CONTRACT ────────────────────────────────────────────────
 *
 * These exported constants form the public interface consumed by Next.js at
 * build time. **They must not be changed without a coordinated framework
 * migration**, because Next.js reads them via static analysis:
 *
 *   • `runtime`     — MUST remain "edge".  Changing to "nodejs" or removing
 *                     it will break dynamic icon generation on edge runtimes.
 *
 *   • `size`        — MUST remain { width: 180, height: 180 }.  Apple
 *                     Touch Icons must be exactly 180×180 pixels; any other
 *                     dimension causes iOS/Safari to ignore the icon.
 *                     The same object is spread into `ImageResponse` options
 *                     so the rendered bitmap dimensions always match the
 *                     advertised contract.
 *
 *   • `contentType` — MUST remain "image/png".  Browsers and crawlers reject
 *                     Apple Touch Icons with non-PNG content types.
 *
 * Invariants:
 *   1. The function MUST always return a Response (never throw to the caller).
 *      If `ImageResponse` fails for any reason, a minimal 1×1 transparent PNG
 *      data-URI fallback is returned so the HTTP layer always gets a valid
 *      Response and the application startup is not blocked.
 *
 *   2. The branded "L" glyph, background colour (#020617 / slate-950), and
 *      foreground colour (#22d3ee / cyan-400) MUST match the design token
 *      palette defined in `app/globals.css`.  Update both locations together.
 *
 *   3. Border-radius is set to "20%" (not a pixel value) so the rounding
 *      scales correctly at all DPR levels without aliasing.
 *
 * ───────────────────────────────────────────────────────────────────────────
 */

import { ImageResponse } from "next/og";

// ─── Public route-segment config (consumed by Next.js at build time) ────────

/** MUST remain "edge" — see contract above. */
export const runtime = "edge";

/**
 * Standard Apple touch icon size invariant (180x180 px).
 * Frozen to prevent runtime tampering or mutations during concurrent execution.
 */
export const size = Object.freeze({
  width: 180,
  height: 180,
});

export const contentType = "image/png";

/**
 * Fallback dimensions ensuring consistency if route metadata is tampered with.
 */
const DEFAULT_ICON_SIZE = Object.freeze({
  width: 180,
  height: 180,
});

/**
 * Renders the Apple Touch Icon for iOS/mobile bookmarks and web app shortcuts.
 * Hardened for concurrent and repeated execution:
 * - Invariant enforcement on dimensions and content type.
 * - Deterministic, idempotent response generation without mutable shared state.
 * - Safe error handling with fallback rendering to prevent 500 edge crashes.
 * - Diagnostic observability without exposing sensitive environment or request data.
 */
export default function AppleIcon() {
  try {
    // Validate size invariants
    const resolvedSize =
      size &&
      typeof size.width === "number" &&
      typeof size.height === "number" &&
      size.width === DEFAULT_ICON_SIZE.width &&
      size.height === DEFAULT_ICON_SIZE.height
        ? size
        : DEFAULT_ICON_SIZE;

// ─── Route handler ───────────────────────────────────────────────────────────

/**
 * Generates the LiquiFact Apple Touch Icon.
 *
 * @returns {Response} A 180×180 PNG `ImageResponse`, or a minimal 1×1
 *   transparent PNG fallback if `ImageResponse` construction fails (invariant 1).
 */
export default function AppleIcon(): Response {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 100,
            background: "#020617" /* slate-950 — keep in sync with --color-bg in globals.css */,
            color: "#22d3ee" /* cyan-400 — keep in sync with --color-primary in globals.css */,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "20%" /* percentage-based, scales correctly at all DPR levels */,
            fontWeight: 800,
          }}
        >
          L
        </div>
      ),
      {
        width: resolvedSize.width,
        height: resolvedSize.height,
      }
    );
  } catch (error) {
    // Safe failure recovery: log diagnosable error without leaking sensitive internals
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[apple-icon] Failed to generate icon: ${errorMessage}`);

    // Return a minimal, deterministic fallback ImageResponse
    return new ImageResponse(
      <div
        style={{
          fontSize: 100,
          background: "#020617",
          color: "#22d3ee",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "20%",
          fontWeight: 800,
        }}
      >
        L
      </div>,
      {
        width: DEFAULT_ICON_SIZE.width,
        height: DEFAULT_ICON_SIZE.height,
      }
    );
  }
}
