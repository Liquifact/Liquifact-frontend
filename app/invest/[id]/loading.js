"use client";

/**
 * @file app/invest/[id]/loading.js
 *
 * Loading skeleton for the invoice detail page with hardened state invariants.
 *
 * STATE INVARIANTS (enforced at runtime):
 * =======================================
 * INVARIANT 1 — PURE RENDER: The component is a deterministic function of
 *   props + internal state. No network I/O, no localStorage, no side effects
 *   during render. Two renders with identical input produce identical output.
 *
 * INVARIANT 2 — BOUNDED SKELETONS: Every array length / row count used for
 *   skeleton rendering is clamped to [MIN_SAFE_COUNT, MAX_SAFE_COUNT].
 *   Out-of-range or non-numeric inputs fall back to DEFAULT_* values.
 *
 * INVARIANT 3 — RENDER FAILURE SAFETY: Any throw from a child skeleton
 *   component (NavMenuSkeleton, InvoiceListSkeleton) is caught by the
 *   inline error boundary and replaced with a deterministic fallback so
 *   the loading boundary itself never crashes.
 *
 * INVARIANT 4 — MONOTONIC STATE TRANSITIONS: The state machine is:
 *     LOADING → TIMED_OUT
 *   Once TIMED_OUT, the state never reverts unless the user explicitly
 *   triggers a retry. Concurrent retry calls are idempotent (guarded by
 *   isRetryingRef).
 *
 * INVARIANT 5 — ARIA-BUSY COHERENCE: aria-busy="true" iff the state is
 *   LOADING or RETRYING. In TIMED_OUT or ERROR states it is "false".
 *
 * INVARIANT 6 — STABLE OBSERVABILITY HOOKS: data-testid="invest-detail-loading"
 *   is always present on the root element. data-status reflects the current
 *   loading lifecycle state.
 *
 * INVARIANT 7 — BOUNDED TIMEOUT: Timeout delay is clamped to
 *   [MIN_TIMEOUT_MS, MAX_TIMEOUT_MS]. 0 / NaN / Infinity are rejected in
 *   favor of DEFAULT_TIMEOUT_MS to avoid immediate or unbounded waits.
 *
 * INVARIANT 8 — NO DATA LEAKAGE: No invoice content, user identifiers,
 *   or sensitive data is ever rendered. All placeholders are static
 *   shape-only shimmer elements.
 *
 * INVARIANT 9 — CLEANUP ON UNMOUNT: All timers are cleared and refs are
 *   torn down in the useEffect cleanup to prevent memory leaks after
 *   navigation.
 *
 * INVARIANT 10 — IDEMPOTENT RETRIES: The retry action guards against
 *   concurrent invocation via isRetryingRef. A retry either transitions
 *   cleanly back to LOADING or fails atomically; no partial or torn states.
 *
 * Compatibility contract:
 * - data-testid="invest-detail-loading" is stable and must never be removed.
 * - aria-busy toggles between "true" and "false" per lifecycle state.
 * - Default (no-timeout) rendering is identical to the historical output.
 */

import React, { useState, useEffect, useRef, useCallback, Component } from "react";
import { useRouter } from "next/navigation";
import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";
import NavMenuSkeleton from "@/components/NavMenuSkeleton";
import ErrorBanner from "@/components/ErrorBanner";
import { reportError } from "@/lib/observability/reportError";
import { copy } from "@/app/copy/en";

// ── Frozen safety bounds ────────────────────────────────────────────────────
// Object.freeze prevents accidental mutation of these constants at runtime.

/** @readonly Minimum allowed skeleton items (prevent empty arrays). */
const MIN_SAFE_COUNT = 1;
/** @readonly Maximum allowed skeleton items (prevent excessive DOM work). */
const MAX_SAFE_COUNT = 10;
/** @readonly Default number of action-button skeleton chips. */
const DEFAULT_ACTION_COUNT = 4;
/** @readonly Default number of invoice list skeleton rows. */
const DEFAULT_ROW_COUNT = 3;

/** @readonly Minimum timeout in ms (reject sub-second "immediate" timeouts). */
const MIN_TIMEOUT_MS = 1000;
/** @readonly Maximum timeout in ms (reject multi-minute hangs). */
const MAX_TIMEOUT_MS = 60_000;
/** @readonly Default timeout before showing the recovery UI. */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Monotonic lifecycle states. Once you leave LOADING you can only return
 * via an explicit, user-initiated retry action.
 * @readonly
 * @enum {string}
 */
const LOADING_LIFECYCLE = Object.freeze({
  LOADING: "loading",
  TIMED_OUT: "timed_out",
  RETRYING: "retrying",
});

/** @readonly Stable test hook for monitoring / assertions. */
export const INVEST_DETAIL_LOADING_TESTID = "invest-detail-loading";

// ── Validation helpers (INVARIANT 2) ─────────────────────────────────────────

/**
 * Clamp an arbitrary count value to [MIN_SAFE_COUNT, MAX_SAFE_COUNT].
 * Non-numeric / NaN / out-of-range inputs return the supplied default.
 *
 * Invariant: output is always a finite integer within the safe range.
 *
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function clampSkeletonCount(value, fallback = DEFAULT_ACTION_COUNT) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const floored = Math.floor(numeric);
  if (floored < MIN_SAFE_COUNT) return fallback;
  if (floored > MAX_SAFE_COUNT) return fallback;
  return floored;
}

/**
 * Produce a safe, length-guarded array for skeleton rendering.
 * The returned array is guaranteed to have a length within safe bounds.
 *
 * @param {unknown} length  Desired length (validated + clamped).
 * @param {number} [fallback=DEFAULT_ACTION_COUNT]
 * @returns {undefined[]}
 */
export function safeSkeletonArray(length, fallback = DEFAULT_ACTION_COUNT) {
  const safeLength = clampSkeletonCount(length, fallback);
  // Array.from with a plain {length: N} object — no prototype tricks.
  return Array.from({ length: safeLength });
}

/**
 * Build a props-safe InvoiceListSkeleton element.
 * Row count is always validated before being passed downstream.
 *
 * @param {unknown} rows  Desired row count.
 * @returns {JSX.Element}
 */
export function SafeInvoiceListSkeleton({ rows }) {
  const safeRows = clampSkeletonCount(rows, DEFAULT_ROW_COUNT);
  return <InvoiceListSkeleton rows={safeRows} />;
}

// ── Inline Error Boundary (INVARIANT 3) ──────────────────────────────────────

/**
 * Minimal error boundary that catches render-time throws from children
 * and falls back to a static, side-effect-free skeleton shape.
 *
 * INVARIANT: If the fallback renders, it contains NO dynamic data — only
 * static shimmer blocks matching the expected layout shape.
 */
export class InvestDetailLoadingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorName: null };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorName: error && typeof error.name === "string" ? error.name : "UnknownError",
    };
  }

  componentDidCatch(error, errorInfo) {
    try {
      reportError(error, {
        boundary: "InvestDetailLoading",
        phase: "render",
        componentStack: errorInfo && errorInfo.componentStack ? errorInfo.componentStack : null,
      });
    } catch {
      /* Swallow: if the reporter itself fails we still must not throw. */
    }
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultLoadingFallback;
      return <Fallback errorName={this.state.errorName} />;
    }
    return this.props.children;
  }
}

/**
 * Static fallback shape — matches the loading layout exactly but uses
 * only inline divs, no external component imports that could re-throw.
 *
 * @param {{ errorName?: string }}
 */
function DefaultLoadingFallback({ errorName = null }) {
  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      aria-busy="true"
      aria-live="polite"
      role="status"
      data-testid={INVEST_DETAIL_LOADING_TESTID}
      data-status="fallback"
      data-fallback-cause={errorName || "render_error"}
    >
      {/* Nav fallback — same approximate height as NavMenuSkeleton */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="h-6 w-28 rounded bg-slate-700 animate-pulse" />
        <div className="h-11 w-36 rounded-full bg-slate-800 animate-pulse" />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12" aria-label="Loading investment details">
        <div className="h-7 w-24 rounded bg-slate-700 animate-pulse mb-2" />
        <div className="h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse mb-2" />
        <div className="h-4 w-3/4 max-w-lg rounded bg-slate-800 animate-pulse mb-8" />
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: DEFAULT_ACTION_COUNT }).map((_, i) => (
              <div
                key={`fallback-action-${i}`}
                className="h-10 w-32 rounded-lg bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        </div>
        {/* Invoice list fallback skeleton — same ul/li shape as InvoiceListSkeleton */}
        <ul aria-label="Loading investable invoices" aria-busy="true" className="space-y-4">
          {Array.from({ length: DEFAULT_ROW_COUNT }).map((_, i) => (
            <li
              key={`fallback-row-${i}`}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse"
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="min-w-0 flex-1 basis-1/4 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-slate-700" />
                  <div className="h-2.5 w-1/3 rounded bg-slate-800" />
                </div>
                <div className="basis-1/5 space-y-1.5 flex flex-col items-end">
                  <div className="h-3.5 w-28 rounded bg-slate-700" />
                  <div className="h-2.5 w-12 rounded bg-slate-800" />
                </div>
                <div className="basis-1/6 space-y-1.5 flex flex-col items-end">
                  <div className="h-3.5 w-12 rounded bg-slate-700" />
                  <div className="h-2.5 w-10 rounded bg-slate-800" />
                </div>
                <div className="basis-1/5 space-y-1.5 flex flex-col items-end">
                  <div className="h-3.5 w-24 rounded bg-slate-700" />
                  <div className="h-2.5 w-14 rounded bg-slate-800" />
                </div>
                <div className="basis-auto">
                  <div className="h-5 w-16 rounded-full bg-slate-700" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

// ── Timeout validation (INVARIANT 7) ─────────────────────────────────────────

/**
 * Clamp a timeout value to the safe range.
 * Non-finite / out-of-range values fall back to DEFAULT_TIMEOUT_MS.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function clampTimeoutMs(value) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_TIMEOUT_MS;
  if (numeric < MIN_TIMEOUT_MS) return DEFAULT_TIMEOUT_MS;
  if (numeric > MAX_TIMEOUT_MS) return DEFAULT_TIMEOUT_MS;
  return Math.floor(numeric);
}

// ── Loading Shell Component ──────────────────────────────────────────────────

/**
 * Inner skeleton layout — extracted so the error boundary can wrap it.
 * Uses ONLY validated skeleton helpers (INVARIANT 2).
 *
 * @param {{ actionCount?: unknown, rowCount?: unknown }}
 */
function InvestLoadingSkeleton({
  actionCount = DEFAULT_ACTION_COUNT,
  rowCount = DEFAULT_ROW_COUNT,
}) {
  const actionItems = safeSkeletonArray(actionCount, DEFAULT_ACTION_COUNT);
  const safeRows = clampSkeletonCount(rowCount, DEFAULT_ROW_COUNT);

  return (
    <>
      <InvestDetailLoadingErrorBoundary>
        <NavMenuSkeleton />
      </InvestDetailLoadingErrorBoundary>

      <main className="max-w-4xl mx-auto px-6 py-12" aria-label="Loading investment details">
        {/* Title + subtitle shimmer */}
        <div className="h-7 w-24 rounded bg-slate-700 animate-pulse mb-2" />
        <div className="h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse mb-2" />
        <div className="h-4 w-3/4 max-w-lg rounded bg-slate-800 animate-pulse mb-8" />

        {/* Action button chips */}
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <div className="flex flex-wrap gap-4">
            {actionItems.map((_, index) => (
              <div
                key={`action-skeleton-${index}`}
                className="h-10 w-32 rounded-lg bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Invoice list — wrapped in its own boundary to isolate failures */}
        <InvestDetailLoadingErrorBoundary
          fallback={() => (
            <ul aria-label="Loading investable invoices" aria-busy="true" className="space-y-4">
              {Array.from({ length: DEFAULT_ROW_COUNT }).map((_, i) => (
                <li
                  key={`inline-row-fallback-${i}`}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse"
                >
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="min-w-0 flex-1 basis-1/4 space-y-1.5">
                      <div className="h-3.5 w-3/4 rounded bg-slate-700" />
                      <div className="h-2.5 w-1/3 rounded bg-slate-800" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        >
          <SafeInvoiceListSkeleton rows={safeRows} />
        </InvestDetailLoadingErrorBoundary>
      </main>
    </>
  );
}

/**
 * Route-level loading component for /invest/[id].
 *
 * Implements the full lifecycle state machine:
 *   LOADING → [after timeout] → TIMED_OUT → [user clicks retry] → RETRYING → LOADING
 *
 * @param {object} [props]
 * @param {unknown} [props.timeoutMs]  Timeout in ms (clamped to safe range).
 */
export default function InvestLoading({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const router = useRouter();
  const safeTimeoutMs = clampTimeoutMs(timeoutMs);

  // ── State (INVARIANT 4): monotonic lifecycle ──────────────────────────────
  const [lifecycle, setLifecycle] = useState(LOADING_LIFECYCLE.LOADING);

  // ── Refs: guards against concurrency / memory leaks (INVARIANTS 8, 10) ────
  const isMountedRef = useRef(true);
  const timerRef = useRef(null);
  const isRetryingRef = useRef(false);

  // ── Mount / unmount cleanup (INVARIANT 8) ─────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // ── Timeout arming (INVARIANTS 4, 7) ──────────────────────────────────────
  useEffect(() => {
    // Only arm the timer when actively loading.
    if (lifecycle !== LOADING_LIFECYCLE.LOADING) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      const timeoutErr = new Error(
        `Invest detail loading timed out after ${safeTimeoutMs}ms`
      );
      timeoutErr.name = "InvestDetailLoadingTimeoutError";
      timeoutErr.code = "INVEST_DETAIL_LOADING_TIMEOUT";

      try {
        reportError(timeoutErr, {
          boundary: "InvestDetailLoading",
          phase: "timeout",
          timeoutMs: safeTimeoutMs,
        });
      } catch {
        /* Never let the reporter cause a throw from the loading boundary. */
      }

      setLifecycle(LOADING_LIFECYCLE.TIMED_OUT);
    }, safeTimeoutMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [lifecycle, safeTimeoutMs]);

  // ── Idempotent retry handler (INVARIANT 10) ───────────────────────────────
  const handleRetry = useCallback(() => {
    // Guard against duplicate / concurrent triggers.
    if (isRetryingRef.current) return;
    if (lifecycle === LOADING_LIFECYCLE.LOADING) return;

    isRetryingRef.current = true;
    setLifecycle(LOADING_LIFECYCLE.RETRYING);

    // Defer the actual state reset to the next tick so React commits the
    // RETRYING state visibly first; then the user sees the toggle back.
    Promise.resolve()
      .then(() => {
        if (!isMountedRef.current) return;
        // router.refresh() re-runs the parent data segment without a full
        // page reload; we simultaneously reset our internal lifecycle so
        // the skeleton + timeout re-arm cleanly.
        isRetryingRef.current = false;
        setLifecycle(LOADING_LIFECYCLE.LOADING);
        try {
          router.refresh();
        } catch (err) {
          try {
            reportError(err, {
              boundary: "InvestDetailLoading",
              phase: "retry_refresh",
            });
          } catch {
            /* swallow */
          }
          // Even if router.refresh() rejects, the lifecycle is already
          // LOADING — the user can still navigate manually.
        }
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        isRetryingRef.current = false;
        setLifecycle(LOADING_LIFECYCLE.TIMED_OUT);
      });
  }, [lifecycle, router]);

  // ── Derived flags for aria-busy coherence (INVARIANT 5) ───────────────────
  const isBusy =
    lifecycle === LOADING_LIFECYCLE.LOADING ||
    lifecycle === LOADING_LIFECYCLE.RETRYING;

  const detailCopy = copy?.invest?.detail || {};
  const timeoutTitle = detailCopy.loadingTimeoutTitle || "Still loading…";
  const timeoutDescription =
    detailCopy.loadingTimeoutDescription ||
    "This is taking longer than expected. You can try again or navigate back.";
  const retryLabel = detailCopy.retryAction || "Try again";

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      aria-busy={isBusy ? "true" : "false"}
      aria-live="polite"
      role="status"
      data-testid={INVEST_DETAIL_LOADING_TESTID}
      data-status={lifecycle}
      data-timeout-ms={safeTimeoutMs}
    >
      {lifecycle === LOADING_LIFECYCLE.TIMED_OUT ? (
        <main className="mx-auto max-w-4xl px-6 py-12">
          <ErrorBanner
            variant="warning"
            title={timeoutTitle}
            description={timeoutDescription}
            actionLabel={retryLabel}
            onAction={handleRetry}
            aria-label="Loading recovery options"
          />
        </main>
      ) : (
        <InvestDetailLoadingErrorBoundary>
          <InvestLoadingSkeleton
            actionCount={DEFAULT_ACTION_COUNT}
            rowCount={DEFAULT_ROW_COUNT}
          />
        </InvestDetailLoadingErrorBoundary>
      )}
    </div>
  );
}
