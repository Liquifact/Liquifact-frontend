"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";
import { reportError } from "@/lib/observability/reportError";

export default function MarketplaceError({ error, reset }) {
  useEffect(() => {
    reportError(error, { boundary: "marketplace" });
  }, [error]);

  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Could not load marketplace"
      message="We encountered an issue loading invoice listings. Please try again."
    />
  );
}
