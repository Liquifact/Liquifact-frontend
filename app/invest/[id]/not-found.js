"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Invoice-not-found boundary.
 *
 * Server Component — no `"use client"` directive is needed because this
 * component has no browser-only APIs or React hooks.
 */
export default function InvoiceNotFound() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      data-testid="invoice-not-found-page"
    >
      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 px-6 py-4">
        <NavMenu />
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main
        id="main-content"
        className="max-w-4xl mx-auto px-6 py-12 text-center"
        aria-labelledby="invoice-not-found-heading"
      >
        {/* Decorative status code — hidden from assistive technologies */}
        <p
          aria-hidden="true"
          className="mb-4 text-8xl font-extrabold tracking-tight text-cyan-500/30 select-none"
          data-testid="invoice-not-found-status-badge"
        >
          {detail.notFoundStatusLabel}
        </p>

        <h1
          id="invoice-not-found-heading"
          className="text-3xl font-bold mb-4"
        >
          {detail.notFoundHeading}
        </h1>

        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          {detail.notFoundDescription}
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mr-3 rounded-full border border-slate-700 px-6 py-3 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          Try again
        </button>
        <Link
          href="/invest"
          className="focus-ring inline-block rounded-full bg-cyan-500/20 text-cyan-400 px-6 py-3 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
          data-testid="invoice-not-found-marketplace-link"
        >
          {detail.notFoundMarketplaceLabel}
        </Link>
      </main>
    </div>
  );
}

/**
 * Reads the live URL query string and maps it to a sanitized marketplace href.
 *
 * `useSearchParams()` may resolve to `null` (e.g. during a static render); the
 * mapping handles that by falling back to the unfiltered marketplace (I4).
 * Query values are only ever fed through {@link getMarketplaceHref}, which
 * allow-lists and normalizes them before they can reach the DOM (I2).
 *
 * @returns {JSX.Element}
 */
function RouteAwareInvoiceNotFound() {
  const searchParams = useSearchParams();
  return <InvoiceNotFoundView marketplaceHref={getMarketplaceHref(searchParams)} />;
}

/**
 * Public boundary component.
 *
 * The `<Suspense>` wrapper keeps `useSearchParams` compatible with static
 * generation (Next.js CSR bail-out). The fallback shows the safe, unfiltered
 * marketplace destination, so the page is useful even before hydration.
 */
export default function InvoiceNotFound() {
  return (
    <Suspense fallback={<InvoiceNotFoundView marketplaceHref={MARKETPLACE_FALLBACK_HREF} />}>
      <RouteAwareInvoiceNotFound />
    </Suspense>
  );
}
