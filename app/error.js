'use client';

import ErrorBanner from '../components/ErrorBanner';
import { copy } from './copy/en';

export default function Error({ error, reset }) {
  const errorMessage = error instanceof Error ? error.message : error?.message;

  /**
   * Next.js provides reset to re-render the current route segment after an error.
   */
  function handleReset() {
    reset();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <ErrorBanner
          title={copy.errors.boundaryTitle}
          description={copy.errors.boundaryDescription}
          details={errorMessage || copy.errors.boundaryDetails}
          actionLabel={copy.errors.resetAction}
          onAction={handleReset}
          previewLabel="App boundary"
        />
      </div>
    </main>
  );
}
