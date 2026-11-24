"use client";

/**
 * components/observability/GlobalErrorListener.jsx
 *
 * Client component that installs the global error and unhandledrejection
 * handlers once on mount and removes them on unmount.
 *
 * Mount it once inside the root layout (inside the client-side provider tree)
 * so it covers every async failure that never reaches a React error boundary.
 */

import { useEffect } from "react";
import { installGlobalHandlers } from "@/lib/observability/globalHandlers";
import { reportError } from "@/lib/observability/reportError";

export default function GlobalErrorListener() {
  useEffect(() => {
    const uninstall = installGlobalHandlers(window, reportError);
    return uninstall;
  }, []);

  // Renders nothing — side-effects only.
  return null;
}
