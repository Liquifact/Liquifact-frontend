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
  { v: "cancelled", l: "Cancelled" },
];

export default function Marketplace() {
  const [status, setStatus] = useState("");
  const [state, setState] = useState({ loading: true, data: [], offline: false });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    listInvoices(status).then((r) => alive && setState({ loading: false, ...r }));
    return () => {
      alive = false;
    };
  }, [status]);

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

        {state.loading ? (
          <div className="grid grid-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>
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
