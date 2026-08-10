"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import NavMenu from "../components/NavMenu";
import { copy } from "./copy/en";
import { getHealth } from "../lib/api/health";
import { env } from "../lib/config/env";
import { extractKnownFields, safeJsonStringify } from "../lib/format/safeJson";
import HealthStatusSkeleton from "../components/HealthStatusSkeleton";
import {
  DASHBOARD_INVOICE_SHORTCUT_KEY,
  DASHBOARD_INVEST_SHORTCUT_KEY,
  DASHBOARD_HEALTH_SHORTCUT_KEY,
  createShortcutMatcher,
} from "../lib/shortcuts";

const API_URL = env.apiUrl;

// Status mapping to visual states
// Maps getHealth return values to badge styles and labels
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
      return {
        label: copy.home.healthStatus.unreachable,
        badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
        icon: "✕",
      };
    default:
      return {
        label: status,
        badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        icon: "?",
      };
  }
};

export default function Home() {
  const router = useRouter();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const invoicesLinkRef = useRef(null);
  const investLinkRef = useRef(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const checkApi = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const result = await getHealth(API_URL, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setHealth(result);
    } catch (err) {
      if (err?.name === "AbortError") return;
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const handlers = [
      createShortcutMatcher(DASHBOARD_INVOICE_SHORTCUT_KEY, (event) => {
        event.preventDefault();
        invoicesLinkRef.current?.focus();
        router.push("/invoices");
      }),
      createShortcutMatcher(DASHBOARD_INVEST_SHORTCUT_KEY, (event) => {
        event.preventDefault();
        investLinkRef.current?.focus();
        router.push("/invest");
      }),
      createShortcutMatcher(DASHBOARD_HEALTH_SHORTCUT_KEY, (event) => {
        event.preventDefault();
        checkApi();
      }),
    ];
    handlers.forEach((handler) => document.addEventListener("keydown", handler));
    return () =>
      handlers.forEach((handler) => document.removeEventListener("keydown", handler));
  }, [router, checkApi]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Shared site header for the home page and the rest of the app. */}
      <NavMenu />

      <main id="main-content" className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">{copy.home.heroTitle}</h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">{copy.home.heroSub}</p>

        <p
          data-testid="dashboard-shortcut-hint"
          className="mb-6 text-xs text-slate-500"
        >
          <span className="sr-only">Keyboard shortcuts: </span>
          <kbd className="px-1.5 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300">{DASHBOARD_INVOICE_SHORTCUT_KEY}</kbd>{" "}
          invoices ·{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300">{DASHBOARD_INVEST_SHORTCUT_KEY}</kbd>{" "}
          invest ·{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300">{DASHBOARD_HEALTH_SHORTCUT_KEY}</kbd>{" "}
          health ·{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300">?</kbd>{" "}
          help
        </p>

        <div className="grid gap-6 sm:grid-cols-2 mb-12">
          <Link
            ref={invoicesLinkRef}
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
            ref={investLinkRef}
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
                  {/* Color-coded badge with icon and text - not color-only for accessibility */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusConfig(health.status).badgeClass}`}
                  >
                    <span aria-hidden="true">{getStatusConfig(health.status).icon}</span>
                    <span>{getStatusConfig(health.status).label}</span>
                  </span>
                </div>

                {/* Structured summary for recognized fields */}
                <div className="text-xs text-slate-300 space-y-1 mb-3">
                  {Object.entries(extractKnownFields(health.details || health)).map(
                    ([key, value]) => (
                      <div key={key}>
                        <span className="text-slate-500 font-semibold">{key}:</span>{" "}
                        <span className="text-slate-300">{String(value)}</span>
                      </div>
                    )
                  )}
                </div>

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
