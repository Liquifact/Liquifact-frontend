"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import ContractCard from "@/components/ContractCard";
import { fundInvoice, getInvoice } from "@/lib/api";
import { validateContribution, creditedAmount } from "@/lib/contribution";
import { bpsToPercent, formatAmount, formatDate, fundedPercent, shortAddress } from "@/lib/format";

export default function InvoiceDetail({ id }) {
  const [state, setState] = useState({ loading: true, data: null, offline: false });
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getInvoice(id).then((r) => alive && setState({ loading: false, ...r }));
    return () => {
      alive = false;
    };
  }, [id]);

  async function onFund(e) {
    e.preventDefault();
    const validation = validateContribution(amount, inv);
    if (!validation.ok) {
      let text = "Enter a valid positive amount.";
      if (validation.error === "REQUIRED") text = "Amount is required.";
      else if (validation.error === "NOT_A_NUMBER") text = "Amount must be a number.";
      else if (validation.error === "NON_POSITIVE") text = "Enter a positive amount.";
      else if (validation.error === "TOO_MANY_DECIMALS") text = "Maximum 7 decimal places allowed.";
      else if (validation.error === "EXCEEDS_REMAINING") text = `Exceeds remaining capacity of ${formatAmount(remaining, inv.currency)}.` ;
      else if (validation.error === "NOT_OPEN") text = "Invoice is no longer open for funding.";
      setMsg({ kind: "err", text });
      return;
    }
    const n = validation.amount;
    const beforeInv = inv;
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await fundInvoice(id, n);
      const credited = creditedAmount(beforeInv, data);
      setState((s) => ({ ...s, data }));
      setAmount("");
      if (credited < n) {
        setMsg({ kind: "warn", text: `Only ${formatAmount(credited, data.currency)} was needed to complete funding; ${formatAmount(credited, data.currency)} recorded.` });
      } else {
        setMsg({ kind: "ok", text: `Contribution of ${formatAmount(credited, data.currency)} recorded.` });
      }
    } catch (err) {
      if (err.status === 409) {
        const refreshed = await getInvoice(id);
        setState((s) => ({ ...s, ...refreshed }));
        setMsg({ kind: "err", text: "Invoice is funded; only open invoices can be funded." });
      } else {
        setMsg({ kind: "err", text: err.message || "Funding failed." });
      }
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
          <div style={{ display: "flex", gap: 8 }}>
            <StatusBadge status={inv.status} />
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
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      id="amount"
                      type="number"
                      min="0"
                      max={remaining}
                      step="any"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Up to ${remaining}`}
                      aria-describedby="amount-error amount-hint"
                      aria-invalid={msg && msg.kind === "err" ? "true" : "false"}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                      onClick={() => setAmount(String(remaining))}
                    >
                      Max
                    </button>
                  </div>
                  <span id="amount-hint" className="hint">Demo mode: contributions are recorded by the API; on-chain funding uses the escrow&apos;s <code>fund</code> entrypoint.</span>
                </div>
                <button className="btn btn-primary" disabled={busy || !validateContribution(amount, inv).ok}>
                  {busy ? "Submitting…" : "Fund invoice"}
                </button>
                {state.offline && (
                  <div className="muted" style={{ marginTop: 8, fontSize: "0.85rem" }}>
                    Funding is unavailable while the API is unreachable
                  </div>
                )}
              </form>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>This invoice is <strong>{inv.status}</strong> and no longer accepts contributions.</p>
            )}
            {msg && (
              <div
                id="amount-error"
                className={`notice notice-${msg.kind}`}
                style={{ marginTop: 14 }}
                role={msg.kind === "err" || msg.kind === "warn" ? "alert" : "status"}
              >
                {msg.text}
              </div>
            )}
          </div>
        </div>

        {inv.onChain && <div style={{ marginTop: 20 }}><ContractCard /></div>}
      </div>
    </section>
  );
}
