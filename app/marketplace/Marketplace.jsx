"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InvoiceCard from "@/components/InvoiceCard";
import { listInvoices } from "@/lib/api";

const FILTERS = [
  { v: "", l: "All" },
  { v: "open", l: "Open" },
  { v: "funded", l: "Funded" },
  { v: "settled", l: "Settled" },
];

export default function Marketplace() {
  const [status, setStatus] = useState("");
  const [state, setState] = useState({ loading: true, data: [], offline: false, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    listInvoices(status, { signal: ctrl.signal })
      .then((r) => {
        if (!alive) return;
        setState({ loading: false, data: r.data, offline: !!r.offline, error: null });
      })
      .catch((err) => {
        if (!alive) return;
        if (err && err.name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          loading: false,
          data: [],
          offline: false,
          error: { message: (err && err.message) || "Something went wrong" },
        }));
      });
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [status, reloadKey]);

  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow">Marketplace</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Invoices seeking funding</h1>
        <p className="lead">Pick an invoice, review its terms and contribute. Funds are escrowed until the debtor settles.</p>

        <div className="toolbar" style={{ marginTop: 28 }}>
          <div className="tabs" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button key={f.v || "all"} aria-pressed={status === f.v} onClick={() => setStatus(f.v)}>
                {f.l}
              </button>
            ))}
          </div>
          <Link href="/submit" className="btn btn-primary">+ Submit invoice</Link>
        </div>

        {state.offline && (
          <div className="notice notice-warn" style={{ marginBottom: 20 }}>
            The API is unreachable right now — showing demo data.
          </div>
        )}

        {state.error && (
          <div className="notice notice-err" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span>Something went wrong — {state.error.message}</span>
              <button className="btn btn-secondary" onClick={() => setReloadKey((k) => k + 1)}>
                Retry
              </button>
            </div>
          </div>
        )}

        {state.loading ? (
          <div className="grid grid-3">{ [0, 1, 2].map((i) => <div key={i} className="skeleton" />) }</div>
        ) : state.error ? (
          <div className="card center">
            <h3>Something went wrong</h3>
            <p className="muted">We couldn’t load invoices. Please retry.</p>
            <button className="btn btn-primary" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
          </div>
        ) : state.data.length === 0 ? (
          <div className="card center">
            <h3>No invoices here yet</h3>
            <p className="muted">Try another filter or submit the first one.</p>
            <Link href="/submit" className="btn btn-primary">Submit invoice</Link>
          </div>
        ) : (
          <div className="grid grid-3">
            {state.data.map((inv) => <InvoiceCard key={inv.id} invoice={inv} />)}
          </div>
        )}
      </div>
    </section>
  );
}
