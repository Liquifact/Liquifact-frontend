"use client";

/**
 * @file components/invoice/LifecycleTimeline.jsx
 *
 * Visual lifecycle timeline for an invoice detail page.
 *
 * Features:
 * - Ordered list with aria-current="step" on the active milestone
 * - Relative countdown that ticks every 60 s, pauses on visibilitychange
 * - Hydration-safe: SSR renders UTC absolute dates; client enriches with relative text
 * - Horizontal layout on desktop (≥601px), vertical on mobile (≤600px)
 * - Overdue badge for past-due invoices
 * - prefers-reduced-motion: countdown still updates but no CSS transitions
 */

import { useEffect, useRef, useState } from "react";
import { buildTimeline, formatRelative } from "@/lib/timeline";
import { formatInvoiceDate } from "@/lib/format/date";

/** ─── Style maps ──────────────────────────────────────────────────────────── */

const STEP_ICON_CLASS = {
  done: "bg-emerald-500 text-slate-950",
  current: "bg-cyan-400 text-slate-950 ring-2 ring-cyan-400/50",
  upcoming: "bg-slate-700 text-slate-400",
  missed: "bg-amber-500 text-slate-950",
  terminal: "bg-red-500 text-slate-950",
};

const STEP_LABEL_CLASS = {
  done: "text-emerald-300",
  current: "text-cyan-300 font-semibold",
  upcoming: "text-slate-400",
  missed: "text-amber-300",
  terminal: "text-red-300 font-semibold",
};

const STEP_DATE_CLASS = {
  done: "text-slate-400",
  current: "text-cyan-200",
  upcoming: "text-slate-500",
  missed: "text-amber-200",
  terminal: "text-slate-500",
};

const CONNECTOR_CLASS = {
  done: "bg-emerald-600",
  current: "bg-cyan-600",
  upcoming: "bg-slate-700",
  missed: "bg-amber-600",
  terminal: "bg-slate-700",
};

/** ─── Helper components ──────────────────────────────────────────────────── */

function StepIcon({ state, index }) {
  const check = (
    <svg
      aria-hidden="true"
      width="10"
      height="8"
      viewBox="0 0 10 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 4L3.5 6.5L9 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const cross = (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 1L9 9M9 1L1 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const dot = (
    <span
      aria-hidden="true"
      className="block w-2 h-2 rounded-full bg-current"
    />
  );

  const content =
    state === "done"
      ? check
      : state === "missed" || state === "terminal"
        ? cross
        : dot;

  return (
    <span
      className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${STEP_ICON_CLASS[state] ?? STEP_ICON_CLASS.upcoming}`}
      aria-hidden="true"
    >
      {content}
    </span>
  );
}

/** ─── Main component ─────────────────────────────────────────────────────── */

/**
 * @param {Object}  props
 * @param {import("@/lib/timeline").InvoiceInput}         props.invoice
 * @param {import("@/lib/timeline").EscrowInput|null}     [props.escrow]
 * @param {number}  [props._nowMs]  - Override "now" for deterministic tests
 */
export default function LifecycleTimeline({ invoice, escrow = null, _nowMs }) {
  // Hydration guard: render static UTC dates on first pass, then hydrate with
  // relative text on the client after mount.
  const [hydrated, setHydrated] = useState(false);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    setHydrated(true);

    function startInterval() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        setTick((n) => n + 1);
      }, 60_000);
    }

    function stopInterval() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopInterval();
      } else {
        // Re-tick immediately on return then restart
        setTick((n) => n + 1);
        startInterval();
      }
    }

    startInterval();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const nowMs = _nowMs ?? Date.now();
  const steps = buildTimeline({ invoice, escrow, nowMs });
  const currentStepIndex = steps.findIndex(
    (s) => s.state === "current" || s.state === "missed" || s.state === "terminal",
  );

  // Use tick to force re-evaluation of relative times
  // (tick is read so React knows to re-render when it changes)
  void tick;

  // Compute live nowMs on each render (after hydration)
  const liveNowMs = _nowMs ?? (hydrated ? Date.now() : nowMs);

  return (
    <section
      aria-labelledby="lifecycle-timeline-heading"
      className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mt-6"
      data-testid="lifecycle-timeline"
    >
      <h2
        id="lifecycle-timeline-heading"
        className="text-base font-semibold text-slate-200 mb-5"
      >
        Invoice lifecycle
      </h2>

      {/* Ordered list — semantically conveys progression */}
      <ol
        aria-label="Invoice lifecycle steps"
        className="timeline-steps flex flex-col gap-0 sm:flex-row sm:gap-0"
      >
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isCurrent = idx === currentStepIndex;
          const isOverdueStep = step.id === "due" && step.state === "missed";

          // Format the date for this step
          const dateStr = step.at
            ? formatInvoiceDate(step.at, {
                format: {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                },
              })
            : null;

          // Relative countdown — only rendered client-side after hydration
          const relStr =
            hydrated && step.at
              ? formatRelative(step.at.getTime(), liveNowMs)
              : null;

          // Connector colour is derived from the next step's state (or current step)
          const nextStep = steps[idx + 1];
          const connectorVariant = nextStep
            ? nextStep.state === "done"
              ? "done"
              : step.state
            : step.state;

          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className="timeline-step relative flex sm:flex-col items-start sm:items-center flex-1 min-w-0"
              data-state={step.state}
              data-testid={`timeline-step-${step.id}`}
            >
              {/* Vertical connector line (mobile) / hidden on desktop */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`timeline-connector-v absolute left-3.5 top-7 w-0.5 h-full sm:hidden ${CONNECTOR_CLASS[connectorVariant] ?? CONNECTOR_CLASS.upcoming}`}
                />
              )}

              {/* Horizontal connector line (desktop) / hidden on mobile */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`timeline-connector-h hidden sm:block absolute top-3.5 left-1/2 w-full h-0.5 ${CONNECTOR_CLASS[connectorVariant] ?? CONNECTOR_CLASS.upcoming}`}
                />
              )}

              {/* Step icon */}
              <div className="relative z-10 sm:mb-3">
                <StepIcon state={step.state} index={idx} />
              </div>

              {/* Step content */}
              <div className="sm:text-center pl-4 sm:pl-0 pb-6 sm:pb-0">
                <span
                  className={`block text-xs font-medium ${STEP_LABEL_CLASS[step.state] ?? STEP_LABEL_CLASS.upcoming}`}
                >
                  {step.label}
                </span>

                {/* Overdue badge */}
                {isOverdueStep && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    data-testid="overdue-badge"
                  >
                    OVERDUE
                  </span>
                )}

                {/* Date: show absolute date always; append relative text after hydration */}
                {dateStr && (
                  <time
                    dateTime={step.at ? step.at.toISOString() : undefined}
                    className={`block text-[10px] mt-0.5 ${STEP_DATE_CLASS[step.state] ?? STEP_DATE_CLASS.upcoming}`}
                  >
                    {dateStr}
                    {relStr && (
                      <span className="block opacity-80">{relStr}</span>
                    )}
                  </time>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
