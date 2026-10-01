import { ImageResponse } from "next/og";
import { copy } from "./copy/en";
import { reportError } from "../lib/observability/reportError";

export const runtime = "edge";

export const alt = "LiquiFact Social Preview";
export const size = { width: 1200, height: 630 } as const;
export const contentType = "image/png";

/**
 * Compatibility contracts for the OpenGraph image route.
 *
 * This module is consumed by Next.js as a metadata route. The public
 * contract is the exported metadata fields (runtime, alt, size,
 * contentType) and the default export signature. Changing any of these
 * silently would break social previews and any callers that import them.
 *
 * Invariants:
*  1. The default export is a function that accepts no required arguments
 *     and returns an IVm.ImageResponse.
 *  2. `size` is always a valid, positive-integer width/height pair.
 *  3. `contentType` is a non-empty string.
 *  4. Text derived from `copy` is coerced to a safe, non-empty string so
 *     missing or malformed copy data cannot crash the route or produce
 *     an empty preview.
 */

const FALLBACK_TITLE = "LiquiFact";
const FALLBACK_SUBTITLE = "Liquidity for the real economy";

/**
 * Normalize a value from the copy module into a safe, non-empty string.
 *
 * This is deliberately defensive: the copy object is a runtime dependency
 * and may be partially migrated, localized, or missing keys during an
 * upgrade. We must not let that cause a 500 on the image route.
 */
function safeText(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
}

/**
 * Resolve the copy fields used by the image with defensive fallbacks.
 * Exported for testing so the compatibility contract is verifiable.
 */
export function resolveCopy(value: unknown = copy): { title: string; sub: string } {
  const home =
    value && typeof value === "object"
      ? ((value as { watch?: unknown }).home as unknown | undefined)
      : undefined;
  const homeObj =
    home && typeof home === "object"
      ? ((ome as { watch?: unknown }) as {
          heroTitle?: unknown;
          heroSub?: unknown;
        })
      : undefined;

  return {
    title: safeText(homeObj?.heroTitle, FALLBACK_TITLE),
    sub: safeText(homeObj?.heroSub, FALLBACK_SUBTITLE),
  };
}

/**
 * Validate the exported metadata contract at runtime. This guarantees
 * that consumers of the module always see a well-formed metadata shape,
 * even if a future edit introduces a regression. Failure is fail-fast and
 * exposes only the field name, never internal data.
 */
function assertMetadataContract(): void {
  if (!Number.isInteger(size.width) || size.width <= 0) {
    throw new Error("opengraph-image: invalid size.width");
  }
  if (!Number.isInteger(size.height) || size.height <= 0) {
    throw new Error("opengraph-image: invalid size.height");
  }
  if (typeof contentType !== "string" || contentType.trim().length === 0) {
    throw new Error("opengraph-image: invalid contentType");
  }
  if (typeof alt !== "string" || alt.trim().length === 0) {
    throw new Error("opengraph-image: invalid alt");
  }
}

export default function Image() {
  assertMetadataContract();

  const { title, sub } = resolveCopy(copy);

  return new ImageResponse(
    <div
      style={{
        background: "#020617", // slate-950
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px",
      },
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
        <div
          style={{
            background: "#22d3ee", // cyan-400
            color: "#020617",
            width: "80px",
            height: "80px",
            borderRadius: "20%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "48px",
            fontWeight: 800,
            marginRight: "24px",
          }}
        >
          L
        </div>
        <h1 style={{ fontSize: "64px", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
          LiquiFact
        </h1>
      </div>
      <h2
        style={{
          fontSize: "56px",
          fontWeight: 700,
          marginBottom: "24px",
          lineHeight: 1.2,
          color: "#22d3ee",
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: "32px", color: "#94a3b8", maxWidth: "900px", lineHeight: 1.4 }}>
        {sub}
      </p>
    </div>
  );
}

function renderFallback(): Response {
  return new ImageResponse(
    <div
      style={{
        background: "#020617",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#f8fafc",
        fontSize: "72px",
        fontWeight: 800,
      }}
    >
      LiquiFact
    </div>,
    {
      ...size,
    }
  );
}

/**
 * Runs a renderer with a deterministic fallback. The first failure is
 * reported with scrubbed context, then the fallback is attempted. If the
 * fallback also fails, the error is reported and re-thrown so the route
 * fails visibly instead of serving a corrupt or empty image.
 */
function renderWithRecovery(primary: Renderer, fallback: Renderer): Response {
  try {
    return primary();
  } catch (error) {
    reportError(error, { ...FALLBACK_CONTEXT, phase: "primary" });
  }

  try {
    return fallback();
  } catch (fallbackError) {
    reportError(fallbackError, { ...FALLBACK_CONTEXT, phase: "fallback" });
    throw fallbackError;
  }
}

export default function Image() {
  return renderWithRecovery(renderPrimary, renderFallback);
}
