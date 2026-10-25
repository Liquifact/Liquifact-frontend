"use client";

import { useEffect, useMemo, useState } from "react";
import BarChart from "./charts/BarChart.js";
import {
  yieldHistogram,
  maturityLadder,
  fundingByCurrency,
  listCurrencies,
  largestCurrencyByFaceValue,
} from "../lib/analytics.js";

const FORMATTERS = {
  amountFormatter: new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
  bpsFormatter: new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
  percentFormatter: new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }),
};

function formatAmount(value, currency) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${currency} —`;
  return `${currency} ${FORMATTERS.amountFormatter.format(numeric)}`;
}

function formatBps(bps) {
  const numeric = Number(bps);
  if (!Number.isFinite(numeric)) return "—";
  return `${FORMATTERS.bpsFormatter.format(numeric)} bps`;
}

function formatPercent(ratio) {
  const numeric = Number(ratio);
  if (!Number.isFinite(numeric)) return "—";
  return FORMATTERS.percentFormatter.format(numeric);
}

function normalizeInvoices(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.invoices)) return data.invoices;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

function Skeleton() {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      <p className="muted">Loading market analytics …</p>
      <div className="skeleton-row" />
      <div className="skeleton-row" />
      <div className="skeleton-row" />
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [state, setState] = useState({ status: "loading", invoices: [], offline: false, error: null });
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/invoices", { cache: "no-store" });
        if (!cancelled && !res.ok) throw new Error(`Failed to load invoices (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        const invoices = normalizeInvoices(data);
        setState({
          status: "ready",
          invoices,
          offline: Boolean(data && (data.offline || data.demo)),
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          invoices: [],
          offline: true,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currencies = useMemo(() => listCurrencies(state.invoices), [state.invoices]);

  useEffect(() => {
    if (currencies.length === 0) {
      if (selectedCurrency !== null) setSelectedCurrency(null);
      return;
    }
    if (!selectedCurrency || !currencies.includes(selectedCurrency)) {
      const defaultCurrency = largestCurrencyByFaceValue(state.invoices);
      setSelectedCurrency(defaultCurrency || currencies[0]);
    }
  }, [currencies, selectedCurrency, state.invoices]);

  const yieldData = useMemo(() => {
    if (!selectedCurrency) return [];
    const histogram = yieldHistogram(state.invoices, 100);
    const buckets = histogram[selectedCurrency] || histogram.all || [];
    return buckets.map((bucket) => ({
      label: formatBps(bucket.bpsFrom),
      value: bucket.count,
      description: `${bucket.count} invoice(s) between ${formatBps(bucket.bpsFrom)} and ${formatBps(bucket.bpsTo)}`,
    }));
  }, [state.invoices, selectedCurrency]);

  const maturityData = useMemo(() => {
    if (!selectedCurrency) return [];
    const ladder = maturityLadder(state.invoices, nowMs);
    const buckets = ladder[selectedCurrency] || ladder.all || [];
    return buckets.map((bucket) => ({
      label: bucket.label,
      value: Number(bucket.amount) || 0,
      description: `${formatAmount(bucket.amount, selectedCurrency)} maturing ${bucket.label}`,
    }));
  }, [state.invoices, selectedCurrency, nowMs]);

  const fundingData = useMemo(() => {
    if (!selectedCurrency) return [];
    const map = fundingByCurrency(state.invoices);
    const entry = map[selectedCurrency];
    if (!entry) return [];
    return [
      { label: "Open", value: Number(entry.open) || 0, description: `${formatAmount(entry.open, selectedCurrency)} open` },
      { label: "Funded", value: Number(entry.funded) || 0, description: `${formatAmount(entry.funded, selectedCurrency)} funded` },
      { label: "Settled", value: Number(entry.settled) || 0, description: `${formatAmount(entry.settled, selectedCurrency)} settled` },
    ];
  }, [state.invoices, selectedCurrency]);

  if (state.status === "loading") {
    return <Skeleton />;
  }

  if (currencies.length === 0) {
    return (
      <div className="card" role="status" aria-live="polite">
        <p>No invoices are available to chart yet.</p>
        {state.offline ? (
          <p className="muted">
            Showing demo data — the API is offline.
          </p>
        ) : null}
      </div>
    );
  }

  const hasData = yieldData.some((d) => d.value > 0) || maturityData.some((d) => d.value > 0) || fundingData.some((d) => d.value > 0);

  return (
    <div className="analytics-dashboard">
      {state.offline ? (
        <p className="notice" role="status" aria-live="polite">
          Offline or demo mode: charts may show sample data.
        </p>
      ) : null}
      {state.error ? (
        <p className="notice" role="alert">
          Could not load invoices: {state.error}
        </p>
      ) : null}

      <div className="analytics-controls">
        <label htmlFor="currency-select">Currency</label>
        <select
          id="currency-select"
          value={selectedCurrency ?? ""}
          onChange={(event) => setSelectedCurrency(event.target.value)}
        >
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={showTable}
          onClick={() => setShowTable((value) => !value)}
        >
          {showTable ? "Show as charts" : "Show as table"}
        </button>
      </div>

      {!hasData ? (
        <p className="notice" role="status" aria-live="polite">
          No data for {selectedCurrency} yet.
        </p>
      ) : null}

      <div className="grid">
        <BarChart
          id="yield-distribution"
          title={`Yield distribution (${selectedCurrency})`}
          description="Count of invoices by yield basis-points bucket."
          data={yieldData}
          showTable={showTable}
        />
        <BarChart
          id="maturity-ladder"
          title={`Maturity ladder (${selectedCurrency})`}
          description="Face value maturing in each time bucket."
          data={maturityData}
          showTable={showTable}
        />
        <BarChart
          id="funding-status"
          title={`Funding status (${selectedCurrency})`}
          description="Total face value by funding status."
          data={fundingData}
          showTable={showTable}
        />
      </div>
    </div>
  );
}
