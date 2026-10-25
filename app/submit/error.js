"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";
import { reportError } from "@/lib/observability/reportError";

export default function SubmitError({ error, reset }) {
  useEffect(() => {
    reportError(error, { boundary: "submit" });
  }, [error]);

  const draftReminder = (
    <div className="notice notice-warn" role="status">
      <strong>Note:</strong> Your invoice submission draft may be lost if not saved to your browser session. You may try recovering or start fresh.
    </div>
  );

  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Could not submit invoice"
      message="An unexpected error occurred during the invoice submission wizard."
      extra={draftReminder}
    />
  );
}
