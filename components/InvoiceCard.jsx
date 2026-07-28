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
import { useCallback, useState } from "react";
import StatusPill from "@/components/StatusPill";
import WatchlistStar from "@/components/WatchlistStar";
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
 * Copies text to clipboard with a documented fallback.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API rejected — fall through to fallback
    }
  }

  // Fallback: use a temporary textarea element
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copy button rendered alongside marketplace identifiers.
 * Keyboard-operable with a clear accessible label.
 */
function CopyIdButton({ id, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      copyToClipboard(id).then((success) => {
        if (success) {
          setCopied(true);
          onCopy?.(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          onCopy?.(false);
        }
      });
    },
    [id, onCopy],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? `Copied ${id}` : `Copy invoice ID ${id}`}
      className={`ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 ${
        copied
          ? "bg-emerald-900/50 text-emerald-300"
          : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
      }`}
    >
      {copied ? (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

/**
 * @param {object}  props
 * @param {Invoice} props.invoice
 */
export default function InvoiceCard({ invoice }) {
  const toast = useToast();
  const { id, issuer, amount, currency, dueDate, yield: yieldPct, status } = invoice ?? {};
  // Resolve the canonical pill label once so the link aria-label and the
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

  const handleCopyResult = useCallback(
    (success) => {
      if (success) {
        toast?.createToast?.({
          variant: "success",
          title: "Copied",
          message: `Invoice ID ${id} copied to clipboard`,
        });
      } else {
        toast?.createToast?.({
          variant: "error",
          title: "Copy failed",
          message: "Unable to copy. Please select the ID manually.",
        });
      }
    },
    [id, toast],
  );

  return (
    <Link
      href={`/invest/${id}`}
      className="group block rounded-lg border border-slate-800 bg-slate-900/60 transition-colors hover:border-cyan-700/60 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      style={{ padding: "var(--market-card-padding)" }}
      aria-label={`Invoice ${id ?? ""} from ${issuer ?? "unknown issuer"}${statusSuffix}`}
    >
      {/* Row layout: mirrors InvoiceListSkeleton column widths */}
      <div className="flex flex-wrap items-center" style={{ gap: "var(--market-card-gap)" }}>
        {/* Issuer — w-1/4 min */}
        <div className="min-w-0 flex-1 basis-1/4">
          <p
            className="truncate font-semibold text-slate-100 transition-colors group-hover:text-cyan-300"
            style={{
              fontSize: "var(--market-card-title-font-size)",
              fontWeight: "var(--market-card-title-font-weight)",
              lineHeight: "var(--market-card-title-line-height)",
            }}
          >
            {issuer ?? <span className="text-slate-500 italic">Unknown issuer</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center">
            <span className="truncate">{id ?? "—"}</span>
            {id && <CopyIdButton id={id} onCopy={handleCopyResult} />}
          </p>
        </div>

        {/* Amount — w-1/5 */}
        <div
          className="basis-1/5 text-right"
          style={{
            fontSize: "var(--market-card-meta-font-size)",
            lineHeight: "var(--market-card-meta-line-height)",
            letterSpacing: "var(--market-card-meta-letter-spacing)",
          }}
        >
          <p className="font-mono text-slate-200">{formatCurrency(amount, { currency })}</p>
          <p className="mt-0.5 text-xs text-slate-500">Amount</p>
        </div>

        {/* Yield — w-1/6 */}
        <div
          className="basis-1/6 text-right"
          style={{
            fontSize: "var(--market-card-meta-font-size)",
            lineHeight: "var(--market-card-meta-line-height)",
            letterSpacing: "var(--market-card-meta-letter-spacing)",
          }}
        >
          <p className="font-mono text-cyan-400">{yieldText}</p>
          <p className="mt-0.5 text-xs text-slate-500">Yield</p>
        </div>

        {/* Maturity — w-1/5 */}
        <div
          className="basis-1/5 text-right"
          style={{
            fontSize: "var(--market-card-meta-font-size)",
            lineHeight: "var(--market-card-meta-line-height)",
            letterSpacing: "var(--market-card-meta-letter-spacing)",
          }}
        >
          <p className="text-slate-300">{formatDate(dueDate)}</p>
          <p className="mt-0.5 text-xs text-slate-500">Maturity</p>
        </div>

        {/* Status pill and Watchlist Star — w-auto */}
        <div className="basis-auto flex items-center gap-4">
          <StatusPill status={status ?? ""} />
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <WatchlistStar invoiceId={id} />
          </div>
        </div>
      </div>
    </Link>
  );
}
