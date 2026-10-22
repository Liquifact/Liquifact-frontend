"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";
import { reportError } from "@/lib/observability/reportError";

export default function InvoiceDetailError({ error, reset }) {
  useEffect(() => {
    reportError(error, { boundary: "marketplace-detail" });
  }, [error]);

  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Could not load invoice"
      message="We encountered an issue retrieving this invoice's details and escrow state."
    />
  );
}
