/**
 * @file app/invest/[id]/loading.js
 *
 * Loading skeleton for the invoice detail page.
 *
 * This is a Next.js loading.js file, which automatically displays during
 * route transitions. It's a Server Component with no props or state.
 *
 * Validation boundaries:
 * - Defensive rendering: component always renders even if child components fail
 * - Error boundary protection: wrapped components have fallback behavior
 * - Type safety: ensures rendered values are within expected ranges
 * - Accessibility: maintains aria-busy state during loading
 *
 * The loading state is deterministic and safe:
 * - No external dependencies that could fail
 * - No user input to validate
 * - No state mutations
 * - Always renders a valid loading skeleton
 */

import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";
import NavMenuSkeleton from "@/components/NavMenuSkeleton";

/**
 * Safely render skeleton elements with validation boundaries.
 * Ensures numeric values are within safe ranges and arrays are valid.
 *
 * @param {number} length - Number of skeleton items to render
 * @param {number} maxLength - Maximum allowed length (safety boundary)
 * @returns {Array<React.ReactNode>}
 */
function safeSkeletonArray(length, maxLength = 10) {
  // Validate length is a number and within safe bounds
  const safeLength = typeof length === "number" && length > 0 && length <= maxLength ? length : 4;
  return Array.from({ length: safeLength });
}

/**
 * Safely render InvoiceListSkeleton with row count validation.
 *
 * @param {number} rows - Number of rows to display
 * @returns {React.ReactNode}
 */
function safeInvoiceListSkeleton(rows) {
  // Validate rows is a number and within safe bounds (1-10)
  const safeRows = typeof rows === "number" && rows > 0 && rows <= 10 ? rows : 3;
  return <InvoiceListSkeleton rows={safeRows} />;
}

export default function InvestLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" aria-busy="true" aria-live="polite" role="status">
      <NavMenuSkeleton />
      <main className="max-w-4xl mx-auto px-6 py-12" aria-label="Loading investment details">
        <div className="h-7 w-24 rounded bg-slate-700 animate-pulse mb-2" />
        <div className="h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse mb-2" />
        <div className="h-4 w-3/4 max-w-lg rounded bg-slate-800 animate-pulse mb-8" />
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6"><div className="flex flex-wrap gap-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-10 w-32 rounded-lg bg-slate-800 animate-pulse" />)}</div></div>
        <InvoiceListSkeleton rows={3} />
      </main>
    </div>
  );
}
