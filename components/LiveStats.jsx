"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getHealth, listInvoices } from "@/lib/api";
import { computeStats, primaryCurrency } from "@/lib/stats";
import { bpsToPercent, formatAmount } from "@/lib/format";

const YIELD_TIP =
  "Yield weighted by each invoice's face value within its currency: a 42,000 USDC invoice at 7.2% moves this number more than a 100 XLM invoice at 8%. Currencies are never averaged together.";

export default function LiveStats() {
  const [stats, setStats] = useState(null);
  const [offline, setOffline] = useState(null); // null until first fetch settles
  const [health, setHealth] = useState(null); // null = checking, true/false after
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(false);
    setTipOpen(false);
    Promise.allSettled([listInvoices(), getHealth()]).then(([listResult, healthResult]) => {
      if (!alive) return;
      const listOk = listResult.status === "fulfilled";
      const healthOk = healthResult.status === "fulfilled";
      if (listOk) {
        const { data, offline: isOffline } = listResult.value;
        setStats(computeStats(data));
        setOffline(isOffline);
      } else {
        // listInvoices() has an offline fallback and normally never rejects;
        // treat a rejection as total failure.
        setStats(null);
        setOffline(true);
      }
      setHealth(healthOk);
      if (!listOk && !healthOk) setError(true);
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const loading = stats === null && !error;
  const bothFailed = error;

  // Status derived from both calls: online = list+health ok, degraded = exactly
  // one ok, unreachable = both failed.
  const oneFailed = (offline === true) || health === false;
  const status = bothFailed ? "unreachable" : oneFailed ? "degraded" : "online";

  const codes = stats ? Object.keys(stats.byCurrency) : [];
  const primary = stats ? primaryCurrency(stats.byCurrency) : null;

  let tiles;
  if (bothFailed) {
    tiles = (
      <div className="notice notice-err" role="alert">
        <strong>Live stats are unavailable.</strong>{" "}
        The API and the health check both failed.{" "}
        <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} onClick={retry}>
          Retry
        </button>
      </div>
    );
  } else if (loading) {
    tiles = (
      <div className="grid grid-4">
        {["Invoices listed", "Open for funding", "Face value", "Weighted avg yield"].map((label) => (
          <div className="card" key={label}>
            <div className="skeleton" style={{ minHeight: 42, marginBottom: 10 }} aria-hidden="true" />
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
    );
  } else {
    tiles = (
      <div className="grid grid-4">
        <div className="card">
          <div className="stat">{stats.count}</div>
          <div className="stat-label">Invoices listed</div>
        </div>
        <div className="card">
          <div className="stat">{stats.open}</div>
          <div className="stat-label">Open for funding</div>
        </div>
        <div className="card">
          <div className="stat">
            {codes.length === 0
              ? "—"
              : codes.map((code) => (
                  <div key={code}>{formatAmount(stats.byCurrency[code].faceValue, code)}</div>
                ))}
          </div>
          <div className="stat-label">Face value</div>
          {codes.length > 0 && (
            <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.8rem" }}>
              Funded:{" "}
              {codes.map((code) => formatAmount(stats.byCurrency[code].funded, code)).join(" · ")}
            </p>
          )}
        </div>
        <div className="card">
          <div className="stat">
            {primary ? bpsToPercent(stats.byCurrency[primary].weightedYieldBps) : "—"}
          </div>
          <div className="stat-label">
            Weighted avg yield{primary ? ` (${primary})` : ""}
            <button
              type="button"
              className="tip-btn"
              aria-label="How weighted yield is calculated"
              aria-expanded={tipOpen}
              aria-describedby={tipOpen ? "yield-tip" : undefined}
              onClick={() => setTipOpen((o) => !o)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && tipOpen) {
                  e.stopPropagation();
                  setTipOpen(false);
                }
              }}
            >
              ⓘ
            </button>
            {tipOpen && (
              <span className="tip" id="yield-tip" role="tooltip">
                {YIELD_TIP}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Live marketplace statistics" aria-busy={loading}>
      {offline === true && !bothFailed && (
        <div className="notice notice-warn" style={{ marginBottom: 16 }}>
          Showing demo data — API unreachable
        </div>
      )}
      {tiles}
      <p
        className="muted"
        role="status"
        aria-live="polite"
        style={{ marginTop: 14, fontSize: "0.88rem" }}
      >
        API status:{" "}
        {loading && !bothFailed ? (
          "checking…"
        ) : (
          <strong>
            <span className={`status-dot status-dot-${status}`} aria-hidden="true" />
            {status}
          </strong>
        )}
      </p>
      <p style={{ marginTop: 8 }}>
        <Link href="/analytics">See market analytics →</Link>
      </p>
    </div>
  );
}