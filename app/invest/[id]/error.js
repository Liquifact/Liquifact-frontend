"use client";

import { useEffect } from "react";
import ErrorBanner from "@/components/ErrorBanner";
import { copy } from "@/app/copy/en";

export default function InvoiceDetailError({ error, reset }) {
  useEffect(() => {
    // Error reporting could be placed here.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <main className="max-w-4xl mx-auto py-12" id="main-content">
        <ErrorBanner 
          variant="server"
          title={copy.error?.title || "Something went wrong"}
          description={error?.message || copy.error?.description}
          actionLabel={copy.error?.actionLabel}
          onAction={reset}
        />
      </main>
    </div>
  );
}
