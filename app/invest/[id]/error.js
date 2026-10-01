"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ErrorBanner from "@/components/ErrorBanner";
import { reportError } from "@/lib/observability/reportError";
import { copy } from "@/app/copy/en";
import Link from "next/link";

const MAX_RETRY_ATTEMPTS = 3;

export function recoveryAction(attempts) {
  return attempts >= MAX_RETRY_ATTEMPTS ? "reload" : "retry";
}

const reportedErrors = new WeakSet();

export default function InvoiceDetailError({ error, reset }) {
  const [attempts, setAttempts] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!error) return;

    if (reportedErrors.has(error)) return;
    reportedErrors.add(error);

    let active = true;
    setIsReporting(true);

    const digest = error.digest;
    
    Promise.resolve(reportError(error, {
      scope: "invest.invoice_detail",
      digest: digest,
    })).finally(() => {
      if (active && isMountedRef.current) {
        setIsReporting(false);
      }
    });

    return () => {
      active = false;
    };
  }, [error]);

  const exhausted = recoveryAction(attempts) === "reload";

  const handleRetry = useCallback(() => {
    if (isResetting || isReporting || exhausted) return;
    setIsResetting(true);
    setAttempts((prev) => prev + 1);
    reset();
  }, [attempts, reset, exhausted, isResetting, isReporting]);

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

  const buttonLabel = isReporting
    ? "Reporting…"
    : isResetting
      ? "Retrying…"
      : action.label;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-16"
      data-testid="invest-id-error-boundary"
    >
      <main
        id="main-content"
        className="w-full max-w-lg"
        aria-labelledby="invest-error-heading"
      >
        <h1 id="invest-error-heading" className="sr-only">
          {copy.error?.title || "Something went wrong"}
        </h1>

        <ErrorBanner
          variant="server"
          title={copy.error?.title || "Something went wrong"}
          description={copy.error?.description}
          previewLabel={copy.error?.previewLabel}
        />
        
        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            type="button"
            data-testid="invest-error-reset-btn"
            onClick={action.onAction}
            disabled={isResetting || isReporting}
            aria-disabled={isResetting || isReporting}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {buttonLabel}
          </button>

          <Link
            href="/invest"
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Back to marketplace
          </Link>
        </div>
      </main>
    </div>
  );
}

export { MAX_RETRY_ATTEMPTS };
