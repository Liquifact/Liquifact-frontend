/**
 * @file components/InvoiceCard.jsx
 * Renders a single invoice row for the Invest marketplace.
 * This is the canonical card markup; InvoiceListSkeleton mirrors its layout.
 *
 * Status is rendered via the shared `StatusPill` component so that label,
 * tone, and a11y metadata stay in one place.  See `lib/types/invoice.js`
 * and `components/StatusPill.jsx`.
 */

import Link from "next/link";
import StatusPill from "@/components/StatusPill";
import { formatAmount, formatCurrency, INVALID_VALUE_FALLBACK } from "@/lib/format/currency";
import { resolveStatusPill } from "@/lib/types/invoice";

/** @typedef {import("@/lib/types/invoice").Invoice} Invoice */

/**
 * Formats a date string into a human-readable short date.
 * Falls back gracefully when the value is missing or unparseable.
 * @param {string|undefined} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * @param {object}  props
 * @param {Invoice} props.invoice
 */
export default function InvoiceCard({ invoice }) {
  const { id, issuer, amount, currency, dueDate, yield: yieldPct, status } = invoice ?? {}; // Resolve the canonical pill label once so the link aria-label and the
  // pill aria-label stay in lock-step (both read from the same source).
  const { label: statusLabel } = resolveStatusPill(status);
  const formattedYield = formatAmount(yieldPct);
  const yieldText =
    formattedYield === INVALID_VALUE_FALLBACK ? INVALID_VALUE_FALLBACK : `${formattedYield}%`;

  // Compose the link aria-label.  When the canonical status resolves to
  // "Unknown" (nullish / unrecognised input), drop the trailing " \u2014
  // <label>" segment so the aria-label does not advertise a misleading
  // status.  Computed as a small constant so the template literal below
  // stays readable and avoids any encoding pitfalls around em-dash.
  const statusSuffix = statusLabel && statusLabel !== "Unknown" ? ` \u2014 ${statusLabel}` : "";

  return (
    <Link
      href={`/invest/${id}`}
      className="group block rounded-lg border border-slate-800 bg-slate-900/60 px-5 py-4 transition-colors hover:border-cyan-700/60 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      aria-label={`Invoice ${id ?? ""} from ${issuer ?? "unknown issuer"}${statusSuffix}`}
    >
      {/* Row layout: mirrors InvoiceListSkeleton column widths */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {/* Issuer — w-1/4 min */}
        <div className="min-w-0 flex-1 basis-1/4">
          <p className="truncate font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
            {issuer ?? <span className="text-slate-500 italic">Unknown issuer</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{id ?? "—"}</p>
        </div>

        {/* Amount — w-1/5 */}
        <div className="basis-1/5 text-right">
          <p className="font-mono text-slate-200">{formatCurrency(amount, { currency })}</p>
          <p className="text-xs text-slate-500 mt-0.5">Amount</p>
        </div>

        {/* Yield — w-1/6 */}
        <div className="basis-1/6 text-right">
          <p className="font-mono text-cyan-400">{yieldText}</p>
          <p className="text-xs text-slate-500 mt-0.5">Yield</p>
        </div>

        {/* Maturity — w-1/5 */}
        <div className="basis-1/5 text-right">
          <p className="text-slate-300">{formatDate(dueDate)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Maturity</p>
        </div>

        {/* Status pill — w-auto (rendered via shared <StatusPill>) */}
        <div className="basis-auto">
          <StatusPill status={status ?? ""} />
        </div>
      </div>
    </Link>
  );
}
