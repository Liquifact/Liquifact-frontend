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
import { formatDate } from "@/lib/format";

/** ─── Style helpers (classes live in app/globals.css) ─────────────────────── */

const STATES = new Set(["done", "current", "upcoming", "missed", "terminal"]);
const tone = (state) => (STATES.has(state) ? state : "upcoming");

/** Absolute UTC date for a step, "—" when unknown. */
function formatStepDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : formatDate(d.toISOString());
}

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
      className="timeline-dot"
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
      className={`timeline-icon timeline-icon-${tone(state)}`}
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
      className="card timeline"
      data-testid="lifecycle-timeline"
    >
      <h2
        id="lifecycle-timeline-heading"
        className="timeline-title"
      >
        Invoice lifecycle
      </h2>

      {/* Ordered list — semantically conveys progression */}
      <ol
        aria-label="Invoice lifecycle steps"
        className="timeline-steps"
      >
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isCurrent = idx === currentStepIndex;
          const isOverdueStep = step.id === "due" && step.state === "missed";

          // Format the date for this step
          const dateStr = step.at
            ? formatStepDate(step.at)
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
              className="timeline-step"
              data-state={step.state}
              data-testid={`timeline-step-${step.id}`}
            >
              {/* Connector to the next step (vertical on mobile, horizontal on desktop) */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`timeline-connector timeline-connector-${tone(connectorVariant)}`}
                />
              )}


              {/* Step icon */}
              <div className="timeline-icon-wrap">
                <StepIcon state={step.state} index={idx} />
              </div>

              {/* Step content */}
              <div className="timeline-content">
                <span
                  className={`timeline-label timeline-label-${tone(step.state)}`}
                >
                  {step.label}
                </span>

                {/* Overdue badge */}
                {isOverdueStep && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="badge badge-withdrawn timeline-overdue"
                    data-testid="overdue-badge"
                  >
                    OVERDUE
                  </span>
                )}

                {/* Date: show absolute date always; append relative text after hydration */}
                {dateStr && (
                  <time
                    dateTime={step.at ? step.at.toISOString() : undefined}
                    className="timeline-date"
                  >
                    {dateStr}
                    {relStr && (
                      <span className="timeline-rel">{relStr}</span>
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
