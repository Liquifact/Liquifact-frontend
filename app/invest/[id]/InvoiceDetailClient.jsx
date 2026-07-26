"use client";

/**
 * @file app/invest/[id]/InvoiceDetailClient.jsx
 *
 * Client boundary for the density-aware invoice metadata section.
 *
 * Why a separate client component?
 * ─────────────────────────────────
 * The page shell (`page.js`) is a Server Component — it cannot use hooks.
 * Density preference is stored in `localStorage` and read via `useDensity`,
 * which requires a React hook.  Rather than converting the entire detail
 * page to a client component (losing all RSC benefits), this thin wrapper:
 *
 *   1. Accepts pre-formatted invoice values as props (all formatting stays
 *      server-side in `page.js`).
 *   2. Owns the density preference state via `useDensity` and passes it down
 *      to `DensityToggle` as controlled props so both components react to the
 *      same state without prop-drilling through multiple layers.
 *   3. Applies spacing variants to the metadata `<dl>` based on density.
 *
 * Spacing variants
 * ─────────────────
 * • compact     → `gap-2 p-4`   (tighter grid, smaller section padding)
 * • comfortable → `gap-4 p-6`   (default spacing, matches original design)
 *
 * @param {object} props
 * @param {string} props.labelIssuer
 * @param {string} props.labelAmount
 * @param {string} props.labelYield
 * @param {string} props.labelMaturity
 * @param {string} props.labelStatus
 * @param {string} props.issuer
 * @param {string} props.formattedAmount
 * @param {string} props.formattedYield
 * @param {string} props.dueDate
 * @param {React.ReactNode} props.statusPill   Pre-rendered <StatusPill> node
 * @param {string}          props.summaryHeading  Section <h2> text
 */

import DensityToggle from "@/components/DensityToggle";
import { useDensity } from "@/lib/hooks/useDensity";

/** @type {Record<string, {gap: string, padding: string}>} */
const SPACING = {
  compact: { gap: "gap-2", padding: "p-4" },
  comfortable: { gap: "gap-4", padding: "p-6" },
};

export default function InvoiceDetailClient({
  labelIssuer,
  labelAmount,
  labelYield,
  labelMaturity,
  labelStatus,
  issuer,
  formattedAmount,
  formattedYield,
  dueDate,
  statusPill,
  summaryHeading,
}) {
  // Density state is owned here and passed to DensityToggle as controlled props
  // so that both this component and the toggle always reflect the same value.
  const [density, setDensity] = useDensity();
  const spacing = SPACING[density] ?? SPACING.comfortable;

  return (
    <section
      aria-labelledby="invoice-summary-heading"
      className={[
        // invoice-detail-section: CSS hook for @media (forced-colors) and
        // @media (prefers-contrast: more) rules in globals.css (issue #31).
        // The bg-slate-900/50 semi-transparent fill is illegible under both
        // forced-colors and high-contrast — globals.css replaces it with
        // fully-opaque system colours when those media queries are active.
        "invoice-detail-section",
        "print-invoice-section rounded-xl border border-slate-800 bg-slate-900/50",
        spacing.padding,
        "mb-6",
      ].join(" ")}
      data-density={density}
    >
      {/* Density toggle — top-right corner of the section */}
      <div className="no-print flex items-center justify-between mb-4">
        <h2 id="invoice-summary-heading" className="text-xl font-semibold">
          {summaryHeading}
        </h2>
        <DensityToggle density={density} onDensityChange={setDensity} />
      </div>

      <dl
        className={[
          "grid grid-cols-1 sm:grid-cols-2 text-sm",
          spacing.gap,
        ].join(" ")}
      >
        <div>
          {/* invoice-detail-dt/dd: CSS hooks for high-contrast colour overrides */}
          <dt className="invoice-detail-dt text-slate-500">{labelIssuer}</dt>
          <dd className="invoice-detail-dd text-slate-100">{issuer}</dd>
        </div>
        <div>
          <dt className="invoice-detail-dt text-slate-500">{labelAmount}</dt>
          <dd className="invoice-detail-dd text-slate-100">{formattedAmount}</dd>
        </div>
        <div>
          <dt className="invoice-detail-dt text-slate-500">{labelYield}</dt>
          <dd className="invoice-detail-dd text-slate-100">{formattedYield}</dd>
        </div>
        <div>
          <dt className="invoice-detail-dt text-slate-500">{labelMaturity}</dt>
          <dd className="invoice-detail-dd text-slate-100">{dueDate}</dd>
        </div>
        <div>
          <dt className="invoice-detail-dt text-slate-500">{labelStatus}</dt>
          <dd className="invoice-detail-dd text-slate-100">{statusPill}</dd>
        </div>
      </dl>
    </section>
  );
}
