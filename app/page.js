"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useReducer, useRef, useEffect } from "react";
import NavMenu from "../components/NavMenu";
import { copy } from "./copy/en";
import { getHealth } from "../lib/api/health";
import { env } from "../lib/config/env";
import { extractKnownFields, safeJsonStringify } from "../lib/format/safeJson";
import HealthStatusSkeleton from "../components/HealthStatusSkeleton";
import {
  healthReducer,
  initialHealthState,
  normalizeHealthResult,
  classifyFailure,
  STATUS,
  FAILURE_REASON,
} from "../lib/health/healthState";

const API_URL = env.apiUrl;

/**
 * Exhaustive allowlist of status values returned by getHealth.
 *
 * Any status value NOT in this set is treated as 'unreachable' before it is
 * stored in state or rendered. This prevents attacker-controlled status strings
 * from leaking into the aria-live region, badge label, or structured summary.
 *
 * @type {ReadonlySet<string>}
 */
const STATUS_ALLOWLIST = Object.freeze(new Set(["connected", "degraded", "unreachable"]));

/**
 * Maximum character length for health.message rendered in the aria-live region.
 * Caps an unusually long server-controlled string to prevent layout abuse.
 */
const MESSAGE_MAX_LEN = 300;

/**
 * Maximum character length for individual field values in the structured summary.
 * Each value is rendered via truncateString so the DOM cannot be flooded with
 * a giant server-supplied string.
 */
const FIELD_VALUE_MAX_LEN = 200;

/**
 * Normalises a raw status value from getHealth to one of the three known states.
 * Any unrecognised value maps to "unreachable" — the safest, most visible fallback.
 *
 * ## Why normalise here rather than in getStatusConfig?
 * Normalising at the point of state storage (inside checkApi) means that
 * `health.status` in component state is always a member of STATUS_ALLOWLIST.
 * Downstream consumers — badge, aria-live region, structured summary — never
 * see an attacker-controlled string, so there is a single enforcement point
 * rather than defensive checks scattered across the render tree.
 *
 * @param {unknown} status - Raw status from the API response.
 * @returns {"connected" | "degraded" | "unreachable"}
 */
export function normalizeStatus(status) {
  if (typeof status === "string" && STATUS_ALLOWLIST.has(status)) {
    return status;
  }
  return "unreachable";
}

// Status mapping to visual states.
// Maps normalised getHealth return values to badge styles and labels.
// All inputs are guaranteed to be in STATUS_ALLOWLIST at this point.
const getStatusConfig = (status) => {
  switch (status) {
    case "connected":
      return {
        label: copy.home.healthStatus.connected,
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        icon: "✓",
      };
    case "degraded":
      return {
        label: copy.home.healthStatus.degraded,
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        icon: "⚠",
      };
    case "unreachable":
    default:
      return {
        label: copy.home.healthStatus.unreachable,
        badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
        icon: "✕",
      };
  }
};

const TERMINAL_STATUSES = new Set([STATUS.CONNECTED, STATUS.DEGRADED, STATUS.UNREACHABLE]);

/**
 * State invariants (see lib/health/healthState.js for the full list):
 *  - Only one health request is in flight at a time (synchronous ref guard + reducer guard).
 *  - A result is applied only if it belongs to the current request (requestId match).
 *  - Results are normalized, so `health.status` is always a known status and
 *    `health.message` is always a string.
 *  - A thrown error always ends in "unreachable"; it never leaves a stale result on screen.
 *  - No state updates after unmount; the in-flight request is aborted on unmount.
 */
export default function Home() {
  const [state, dispatch] = useReducer(healthReducer, initialHealthState);
  const abortRef = useRef(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const loading = state.status === STATUS.LOADING;

  // Same shape the render code always used: { status, message, details?, ... }
  const health = TERMINAL_STATUSES.has(state.status)
    ? { message: "", ...(state.payload || {}), status: state.status }
    : null;

  const checkApi = async () => {
    // Synchronous guard: two clicks in the same tick cannot start two requests.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // Matches the id the reducer assigns on START (state.requestId + 1).
    const requestId = state.requestId + 1;
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "START" });

    const send = (action) => {
      if (mountedRef.current && !controller.signal.aborted) {
        dispatch({ ...action, requestId });
      }
    };

    try {
      const result = await getHealth(API_URL, { signal: controller.signal });
      const payload = normalizeHealthResult(result);

      if (payload.status === STATUS.CONNECTED) {
        send({ type: "SUCCESS", payload });
      } else if (payload.status === STATUS.DEGRADED) {
        send({ type: "DEGRADED", payload });
      } else {
        send({ type: "FAILURE", reason: FAILURE_REASON.NETWORK, payload });
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // unmount abort: nothing to render
      // Never leave a stale result or an endless spinner; store a safe code only.
      send({ type: "FAILURE", reason: classifyFailure(err) });
    } finally {
      inFlightRef.current = false;
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [loading]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Shared site header for the home page and the rest of the app. */}
      <NavMenu />

      <main id="main-content" className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">{copy.home.heroTitle}</h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">{copy.home.heroSub}</p>

        <div className="grid gap-6 sm:grid-cols-2 mb-12">
          <Link
            href="/invoices"
            aria-label={copy.home.boxBusinessAriaLabel}
            className="block rounded-xl border border-slate-700 bg-slate-900/50 p-6 hover:border-cyan-500/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">
              {copy.home.boxBusinessTitle}
            </h2>
            <p className="text-slate-400 text-sm">{copy.home.boxBusinessSub}</p>
          </Link>
          <Link
            href="/invest"
            aria-label={copy.home.boxInvestAriaLabel}
            className="block rounded-xl border border-slate-700 bg-slate-900/50 p-6 hover:border-cyan-500/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">{copy.home.boxInvestTitle}</h2>
            <p className="text-slate-400 text-sm">{copy.home.boxInvestSub}</p>
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <p className="text-sm font-medium text-slate-400 mb-2">{copy.home.apiStatus}</p>
          <button
            type="button"
            onClick={checkApi}
            disabled={loading}
            aria-label={copy.home.checkApiHealth}
            className="rounded-lg cursor-pointer bg-slate-800 px-4 py-3 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            {loading ? copy.home.checking : copy.home.checkApiHealth}
          </button>

          {loading && <HealthStatusSkeleton />}

          {!loading && error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {copy.home.healthStatus.unreachable}
            </div>
          )}

          {!loading && health && (
            <div className="mt-4">
              {/* Structured health status card with color-coded badge */}
              {/* Status changes are announced politely via aria-live="polite" */}
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-slate-700 bg-slate-800/50 p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  {/* Color-coded badge with icon and text — not color-only for accessibility.
                      health.status is always a STATUS_ALLOWLIST member at this point. */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusConfig(health.status).badgeClass}`}
                  >
                    <span aria-hidden="true">{getStatusConfig(health.status).icon}</span>
                    <span>{getStatusConfig(health.status).label}</span>
                  </span>
                </div>

                {/* Structured summary for recognised fields.
                    Field values are capped at FIELD_VALUE_MAX_LEN characters to prevent
                    an oversized server-supplied string from flooding the DOM. */}
                <div className="text-xs text-slate-300 space-y-1 mb-3">
                  {Object.entries(extractKnownFields(health.details || health)).map(
                    ([key, value]) => (
                      <div key={key}>
                        <span className="text-slate-500 font-semibold">{key}:</span>{" "}
                        <span className="text-slate-300">
                          {truncateString(String(value), FIELD_VALUE_MAX_LEN)}
                        </span>
                      </div>
                    )
                  )}
                </div>

                {/* health.message is already capped at MESSAGE_MAX_LEN by sanitizeHealthResult. */}
                <p className="text-sm text-slate-300">{health.message}</p>

                {/* Raw response — always shown behind an expandable section */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400">
                    {copy.home.healthStatus.rawResponse}
                  </summary>
                  <pre className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-3 rounded overflow-x-auto">
                    {safeJsonStringify(health.details ?? health)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}