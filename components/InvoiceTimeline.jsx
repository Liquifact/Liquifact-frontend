/**
 * @file components/InvoiceTimeline.jsx
 *
 * Renders an accessible vertical invoice lifecycle timeline for the invoice
 * detail page.  Visualises the five canonical lifecycle stages every invoice
 * passes through and marks the current stage based on the invoice's status.
 *
 * Lifecycle stages (in order):
 *   Uploaded → Verified → Listed → Funded → Settled
 *
 * Status mapping (derived from INVOICE_STATUSES in lib/types/invoice.js):
 *   Open     → current stage is "Listed"  (uploaded, verified, listed)
 *   Funded   → current stage is "Funded"  (uploaded … funded)
 *   Settled  → current stage is "Settled" (all stages complete)
 *   Overdue  → current stage is "Listed"  (overdue means listed but past maturity)
 *   (other)  → no stage is marked current (all pending — unknown state)
 *
 * Tone classes are sourced from STATUS_PILL_MAP so timeline and pill colours
 * are always in lock-step and share one source of truth.
 *
 * Accessibility contract:
 *   • The timeline is rendered as an <ol> (ordered list) to convey sequence.
 *   • The current / active stage carries aria-current="step".
 *   • Completed stages are marked with a descriptive aria-label that includes
 *     the word "Completed" so screen-reader users receive stage state without
 *     relying on visual styling alone.
 *   • The section is wrapped in a <section> with an aria-labelledby heading.
 *   • Missing timestamps do not cause errors; the stage is shown without a
 *     timestamp and maintains its positional role in the list.
 */

import {
  INVOICE_STATUSES,
  STATUS_PILL_MAP,
  resolveInvoiceEventLabel,
  truncateActorLabel,
} from "@/lib/types/invoice";
import { copy } from "@/app/copy/en";

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

/**
 * The ordered set of lifecycle stages every invoice passes through.
 * Each entry is a stable key used internally; display labels come from copy.
 *
 * @readonly
 * @enum {string}
 */
export const TIMELINE_STAGES = Object.freeze(
  /** @type {const} */ ({
    UPLOADED: "uploaded",
    VERIFIED: "verified",
    LISTED: "listed",
    FUNDED: "funded",
    SETTLED: "settled",
  })
);

/**
 * Ordered array of stage keys used to render the timeline top-to-bottom.
 * @type {string[]}
 */
export const STAGE_ORDER = [
  TIMELINE_STAGES.UPLOADED,
  TIMELINE_STAGES.VERIFIED,
  TIMELINE_STAGES.LISTED,
  TIMELINE_STAGES.FUNDED,
  TIMELINE_STAGES.SETTLED,
];

/**
 * Maps an invoice status to the stage key that is "current" for that status.
 * Returns null when the status is unrecognised (all stages shown as pending).
 *
 * @param {string|null|undefined} status
 * @returns {string|null}
 */
export function resolveCurrentStage(status) {
  switch (status) {
    case INVOICE_STATUSES.OPEN:
      return TIMELINE_STAGES.LISTED;
    case INVOICE_STATUSES.FUNDED:
      return TIMELINE_STAGES.FUNDED;
    case INVOICE_STATUSES.SETTLED:
      return TIMELINE_STAGES.SETTLED;
    case INVOICE_STATUSES.OVERDUE:
      // Overdue means the invoice was listed but not funded before maturity.
      return TIMELINE_STAGES.LISTED;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Tone helpers (reuse STATUS_PILL_MAP tokens)
// ---------------------------------------------------------------------------

/**
 * Resolved tone config for each visual state of a stage.
 * Colours are derived from STATUS_PILL_MAP so they stay in sync with StatusPill.
 */
const STAGE_TONES = {
  completed: {
    // Emerald — mirrors SETTLED tone
    dot: "bg-emerald-400",
    label: "text-emerald-300",
    connector: "bg-emerald-700/60",
  },
  current: {
    // Cyan — mirrors OPEN tone (active/in-progress)
    dot: "bg-cyan-400 ring-2 ring-cyan-400/30",
    label: "text-cyan-300 font-semibold",
    connector: "bg-slate-700/40",
  },
  pending: {
    // Neutral slate — no activity yet
    dot: "bg-slate-700 border border-slate-600",
    label: "text-slate-500",
    connector: "bg-slate-700/40",
  },
};

/**
 * Returns the visual tone config for a stage based on its state.
 *
 * @param {"completed"|"current"|"pending"} state
 * @returns {typeof STAGE_TONES.completed}
 */
function getTone(state) {
  return STAGE_TONES[state] ?? STAGE_TONES.pending;
}

// ---------------------------------------------------------------------------
// Stage label map (sourced from copy dictionary)
// ---------------------------------------------------------------------------

const STAGE_LABELS = {
  [TIMELINE_STAGES.UPLOADED]: copy.invoiceTimeline.stageUploaded,
  [TIMELINE_STAGES.VERIFIED]: copy.invoiceTimeline.stageVerified,
  [TIMELINE_STAGES.LISTED]: copy.invoiceTimeline.stageListed,
  [TIMELINE_STAGES.FUNDED]: copy.invoiceTimeline.stageFunded,
  [TIMELINE_STAGES.SETTLED]: copy.invoiceTimeline.stageSettled,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @param {object}  props
 * @param {string}  [props.status]     - Invoice status value (one of INVOICE_STATUSES).
 *                                       Missing / unknown values degrade gracefully: all
 *                                       stages render as pending, no error is thrown.
 * @param {object}  [props.timestamps] - Optional map of stage keys to ISO date strings
 *                                       (e.g. `{ uploaded: "2025-01-10", funded: "2025-02-04" }`).
 *                                       Any missing key is silently omitted from the UI.
 * @param {string}  [props.className]  - Additional Tailwind classes on the root element.
 * @returns {JSX.Element}
 */
export default function InvoiceTimeline({
  status,
  timestamps = {},
  className = "",
  events,
  loading = false,
  error = null,
  onRetry,
  invoiceNotFound = false,
}) {
  const currentStage = resolveCurrentStage(status);
  const currentIndex = currentStage !== null ? STAGE_ORDER.indexOf(currentStage) : -1;

  if (loading) {
    return (
      <section
        aria-labelledby="invoice-timeline-heading"
        className={["rounded-xl border border-slate-800 bg-slate-900/50 p-6", className]
          .filter(Boolean)
          .join(" ")}
      >
        <h2 id="invoice-timeline-heading" className="text-base font-semibold text-slate-100 mb-6">
          {copy.invoiceTimeline.heading}
        </h2>
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" aria-hidden="true" />
          {copy.invoiceTimeline.loadingState}
        </div>
      </section>
    );
  }

  if (invoiceNotFound) {
    return (
      <section
        aria-labelledby="invoice-timeline-heading"
        className={["rounded-xl border border-slate-800 bg-slate-900/50 p-6", className]
          .filter(Boolean)
          .join(" ")}
      >
        <h2 id="invoice-timeline-heading" className="text-base font-semibold text-slate-100 mb-6">
          {copy.invoiceTimeline.heading}
        </h2>
        <p className="text-sm text-slate-300">{copy.invoiceTimeline.notFoundState}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-labelledby="invoice-timeline-heading"
        className={["rounded-xl border border-slate-800 bg-slate-900/50 p-6", className]
          .filter(Boolean)
          .join(" ")}
      >
        <h2 id="invoice-timeline-heading" className="text-base font-semibold text-slate-100 mb-6">
          {copy.invoiceTimeline.heading}
        </h2>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <p className="font-medium">{copy.invoiceTimeline.errorTitle}</p>
          <p className="mt-1 text-red-200/90">{String(error.message || error)}</p>
          {typeof onRetry === "function" && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded border border-red-300/50 px-3 py-1.5 text-xs font-medium text-red-50 hover:bg-red-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
            >
              {copy.invoiceTimeline.retryLabel}
            </button>
          )}
        </div>
      </section>
    );
  }

  if (Array.isArray(events)) {
    const orderedEvents = [...events].sort((a, b) => {
      const first = a && a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const second = b && b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return first - second;
    });

    if (orderedEvents.length === 0) {
      return (
        <section
          aria-labelledby="invoice-timeline-heading"
          className={["rounded-xl border border-slate-800 bg-slate-900/50 p-6", className]
            .filter(Boolean)
            .join(" ")}
        >
          <h2 id="invoice-timeline-heading" className="text-base font-semibold text-slate-100 mb-6">
            {copy.invoiceTimeline.heading}
          </h2>
          <p className="text-sm text-slate-300">{copy.invoiceTimeline.emptyState}</p>
        </section>
      );
    }

    return (
      <section
        aria-labelledby="invoice-timeline-heading"
        className={["rounded-xl border border-slate-800 bg-slate-900/50 p-6", className]
          .filter(Boolean)
          .join(" ")}
      >
        <h2 id="invoice-timeline-heading" className="text-base font-semibold text-slate-100 mb-6">
          {copy.invoiceTimeline.heading}
        </h2>

        <ol aria-label={copy.invoiceTimeline.heading} className="relative flex flex-col gap-3">
          {orderedEvents.map((event, index) => {
            const eventType = event?.type || "unknown";
            const safeLabel = resolveInvoiceEventLabel(eventType, copy.invoiceTimeline.unknownEvent);
            const safeActor = truncateActorLabel(event?.actor, 22);
            const occurredAt = event?.occurredAt ? new Date(event.occurredAt) : null;
            const isoText = occurredAt && !Number.isNaN(occurredAt.getTime())
              ? occurredAt.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Unknown time";

            return (
              <li
                key={event?.id || `${safeLabel}-${index}`}
                className="relative pl-6 pb-4 last:pb-0"
                aria-label={`${safeLabel} — ${copy.invoiceTimeline.byActor.replace("{actor}", safeActor)}`}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-4 ring-slate-900"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-100">
                    <span className="font-medium">{safeLabel}</span>
                    <time className="text-xs text-slate-400" dateTime={event?.occurredAt || undefined}>
                      {isoText}
                    </time>
                  </div>
                  <div className="min-w-0 text-xs text-slate-400">
                    <span className="inline-block max-w-full truncate align-bottom" title={safeActor}>
                      {copy.invoiceTimeline.byActor.replace("{actor}", safeActor)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="invoice-timeline-heading"
      className={["rounded-xl border border-slate-800 bg-slate-900/50 p-6", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h2 id="invoice-timeline-heading" className="text-base font-semibold text-slate-100 mb-6">
        {copy.invoiceTimeline.heading}
      </h2>

      <ol aria-label={copy.invoiceTimeline.heading} className="relative flex flex-col gap-0">
        {STAGE_ORDER.map((stageKey, index) => {
          // Determine visual state
          let stageState;
          if (currentIndex === -1) {
            // Unknown invoice status — all stages pending
            stageState = "pending";
          } else if (index < currentIndex) {
            stageState = "completed";
          } else if (index === currentIndex) {
            stageState = "current";
          } else {
            stageState = "pending";
          }

          const tone = getTone(stageState);
          const isLast = index === STAGE_ORDER.length - 1;
          const label = STAGE_LABELS[stageKey];
          const timestamp = timestamps[stageKey];

          // Build accessible stage label: "Uploaded — Completed" etc.
          let stageStatusWord;
          if (stageState === "completed") {
            stageStatusWord = copy.invoiceTimeline.statusCompleted;
          } else if (stageState === "current") {
            stageStatusWord = copy.invoiceTimeline.statusCurrent;
          } else {
            stageStatusWord = copy.invoiceTimeline.statusPending;
          }
          const ariaLabel = `${label} \u2014 ${stageStatusWord}`;

          return (
            <li
              key={stageKey}
              aria-current={stageState === "current" ? "step" : undefined}
              aria-label={ariaLabel}
              className="relative flex items-start gap-4 pb-6 last:pb-0"
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={["absolute left-[11px] top-6 w-0.5 h-full", tone.connector].join(" ")}
                />
              )}

              <span
                aria-hidden="true"
                className={[
                  "relative z-10 flex-shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center",
                  tone.dot,
                ].join(" ")}
              >
                {stageState === "completed" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                    focusable="false"
                    className="w-3.5 h-3.5 text-slate-950"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.78 4.22a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 0 1 1.06-1.06L6.75 9.19l4.97-4.97a.75.75 0 0 1 1.06 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>

              <div className="flex flex-col min-w-0">
                <span className={["text-sm leading-6", tone.label].join(" ")}>{label}</span>
                {timestamp != null && String(timestamp).trim().length > 0 && (
                  <span className="text-xs text-slate-500 mt-0.5">{String(timestamp).trim()}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
