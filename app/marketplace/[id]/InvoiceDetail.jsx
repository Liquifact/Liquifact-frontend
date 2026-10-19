"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import RiskBadge from "@/components/RiskBadge";
import RiskFactorsCard from "@/components/RiskFactorsCard";
import ContractCard from "@/components/ContractCard";
import { fundInvoice, getInvoice, listInvoices } from "@/lib/api";
import { bpsToPercent, formatAmount, formatDate, fundedPercent, shortAddress } from "@/lib/format";
import { computeListMedians, scoreInvoice } from "@/lib/risk";

export default function InvoiceDetail({ id }) {
  const [state, setState] = useState({ loading: true, data: null, offline: false });
  const [medians, setMedians] = useState(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getInvoice(id), listInvoices()]).then(([invRes, listRes]) => {
      if (!alive) return;
      setState({ loading: false, ...invRes });
      if (listRes?.data) {
        setMedians(computeListMedians(listRes.data));
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);

  async function onFund(e) {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) {
      setMsg({ kind: "err", text: "Enter a positive amount." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await fundInvoice(id, n);
      setState((s) => ({ ...s, data }));
      setAmount("");
      setMsg({ kind: "ok", text: `Contribution of ${formatAmount(n, data.currency)} recorded.` });
    } catch (err) {
      setMsg({ kind: "err", text: err.message || "Funding failed." });
    } finally {
      setBusy(false);
    }
  }

  if (state.loading) {
    return (
      <section className="section"><div className="container"><div className="skeleton" style={{ minHeight: 320 }} /></div></section>
    );
  }

  const inv = state.data;
  if (!inv) {
    return (
      <section className="section">
        <div className="container center">
          <h1 style={{ fontSize: "2rem" }}>Invoice not found</h1>
          <p className="lead">We couldn’t find invoice <code>{id}</code>.</p>
          <Link href="/marketplace" className="btn btn-primary">Back to marketplace</Link>
        </div>
      </section>
    );
  }

  const pct = fundedPercent(inv);
  const remaining = Math.max(0, inv.amount - inv.fundedAmount);
  const risk = scoreInvoice(inv, undefined, medians);

  return (
    <section className="section">
      <div className="container">
        <Link href="/marketplace" className="muted">← Marketplace</Link>
        <div className="invoice-head" style={{ marginTop: 14, marginBottom: 24 }}>
          <div>
            <div className="invoice-id">{inv.id}</div>
            <h1 style={{ fontSize: "clamp(1.7rem,4vw,2.4rem)", margin: "4px 0" }}>{inv.sme}</h1>
            <div className="muted">Debtor: {inv.debtor}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge status={inv.status} />
            {risk.band && <RiskBadge band={risk.band} score={risk.score} factors={risk.factors} />}
            {inv.onChain && <span className="badge badge-chain">on-chain</span>}
          </div>
        </div>
        {state.offline && <div className="notice notice-warn" style={{ marginBottom: 20 }}>API unreachable — showing demo data.</div>}

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <h3>Terms</h3>
            <div className="kv" style={{ marginTop: 12 }}>
              <div><span className="k">Face value</span>{formatAmount(inv.amount, inv.currency)}</div>
              <div><span className="k">Investor yield</span>{bpsToPercent(inv.yieldBps)}</div>
              <div><span className="k">Due date</span>{formatDate(inv.dueDate)}</div>
              <div><span className="k">Remaining</span>{formatAmount(remaining, inv.currency)}</div>
              {inv.smeAddress && <div style={{ gridColumn: "1 / -1" }}><span className="k">SME wallet</span><span className="mono">{shortAddress(inv.smeAddress, 8)}</span></div>}
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }} className="muted">
                <span>Funded</span><span>{formatAmount(inv.fundedAmount, inv.currency)} · {pct}%</span>
              </div>
              <div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${pct}%` }} /></div>
            </div>
          </div>

          <div className="card">
            <h3>Fund this invoice</h3>
            {inv.status === "open" ? (
              <form className="form" onSubmit={onFund} style={{ marginTop: 12 }}>
                <div className="field">
                  <label htmlFor="amount">Amount ({inv.currency})</label>
                  <input id="amount" type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Up to ${remaining}`} />
                  <span className="hint">Demo mode: contributions are recorded by the API; on-chain funding uses the escrow&apos;s <code>fund</code> entrypoint.</span>
                </div>
                <button className="btn btn-primary" disabled={busy || state.offline}>{busy ? "Submitting…" : "Fund invoice"}</button>
              </form>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>This invoice is <strong>{inv.status}</strong> and no longer accepts contributions.</p>
            )}
            {msg && <div role="status" aria-live="polite" className={`notice notice-${msg.kind}`} style={{ marginTop: 14 }}>{msg.text}</div>}
          </div>
        </div>

        {risk.band && (
          <div style={{ marginTop: 24 }}>
            <RiskFactorsCard risk={risk} />
          </div>
        )}

        {inv.onChain && <div style={{ marginTop: 20 }}><ContractCard /></div>}
      </div>
    </section>
  );
}
