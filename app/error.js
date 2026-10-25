"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";
import { reportError } from "@/lib/observability/reportError";

export default function RootError({ error, reset }) {
  useEffect(() => {
    reportError(error, { boundary: "root" });
  }, [error]);

  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Application error"
      message="An unhandled error occurred while rendering the page."
    />
  );
}
