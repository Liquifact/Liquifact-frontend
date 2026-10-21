"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import ContractCard from "@/components/ContractCard";
import { fundInvoice, getInvoice, getEscrowLive } from "@/lib/api";
import { bpsToPercent, formatAmount, formatDate, fundedPercent, shortAddress } from "@/lib/format";

import { useOnChainFund } from "@/lib/hooks/useOnChainFund";
import { formatStroops, remainingStroops } from "@/lib/stellar/amount";
import { CONTRACT_ID, NETWORK } from "@/lib/config";

export default function InvoiceDetail({ id }) {
  const [state, setState] = useState({ loading: true, data: null, offline: false });
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const apiLock = useRef(false);
  const chain = useOnChainFund();

  async function refreshInvoice() {
    const [invoice, live] = await Promise.all([getInvoice(id), getEscrowLive().catch(() => null)]);
    if (invoice.data && live?.contractId === CONTRACT_ID && live.escrow?.invoice_id === id) {
      const escrow = live.escrow;
      invoice.data = { ...invoice.data,
        amount: formatStroops(BigInt(escrow.funding_target ?? escrow.amount)),
        fundedAmount: formatStroops(BigInt(escrow.funded_amount)),
        status: ["open", "funded", "settled", "withdrawn", "cancelled"][escrow.status] ?? invoice.data.status };
    }
    setState({ loading: false, ...invoice });
  }

  useEffect(() => {
    let alive = true;
    getInvoice(id).then((r) => alive && setState({ loading: false, ...r }));
    return () => {
      alive = false;
    };
  }, [id]);

  async function onFund(e) {
    e.preventDefault();
    if (state.data?.onChain) {
      const result = await chain.fund(state.data, amount, refreshInvoice);
      if (result?.status === "SUCCESS") setAmount("");
      return;
    }
    if (apiLock.current) return;
    const n = Number(amount);
    if (!(n > 0)) {
      setMsg({ kind: "err", text: "Enter a positive amount." });
      return;
    }
    apiLock.current = true;
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
      apiLock.current = false;
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
  const remaining = inv.onChain ? formatStroops(remainingStroops(inv)) : Math.max(0, inv.amount - inv.fundedAmount);
  const fundingBusy = inv.onChain ? chain.busy || chain.connecting : busy;

  return (
    <section className="section invoice-detail">
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

          <div className="card funding-card">
            <h3>Fund this invoice</h3>
            {inv.onChain && <div className="wallet-connection">
              <p className="muted">{chain.address ? `Connected: ${shortAddress(chain.address, 8)}` : "Connect Freighter to fund this invoice."} &middot; {NETWORK}</p>
              <button type="button" className="btn btn-ghost focus-ring" onClick={chain.connect} disabled={fundingBusy || chain.pending}>
                {chain.connecting ? "Connecting..." : chain.address ? "Reconnect Freighter" : "Connect Freighter"}
              </button>
            </div>}
            {inv.status === "open" ? (
              <form className="form" onSubmit={onFund} style={{ marginTop: 12 }}>
                <div className="field">
                  <label htmlFor="amount">Amount ({inv.currency})</label>
                  <input id="amount" className="focus-ring" type={inv.onChain ? "text" : "number"} min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Up to ${remaining}`} disabled={fundingBusy || (inv.onChain && chain.pending)} aria-describedby="funding-hint" />
                  <span id="funding-hint" className="hint">{inv.onChain ? `Up to ${remaining} ${inv.currency}. Review the amount and network in Freighter before signing.` : "Demo mode: contributions are recorded by the API."}</span>
                </div>
                <button className="btn btn-primary focus-ring" disabled={fundingBusy || (inv.onChain ? !chain.address || chain.pending : state.offline)}>
                  {inv.onChain ? chain.busy ? `${chain.state.phase}...` : "Sign & fund" : busy ? "Submitting..." : "Fund invoice"}
                </button>
              </form>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>This invoice is <strong>{inv.status}</strong> and no longer accepts contributions.</p>
            )}
            {inv.onChain && <div className="funding-status" role="status" aria-live="polite" aria-atomic="true">
              {(chain.state.phase || chain.state.message) && <div className={`notice notice-${chain.state.kind}`}>
                {chain.state.phase && <strong>{chain.state.phase}</strong>}
                {chain.state.message && <p>{chain.state.message}</p>}
                {chain.state.hash && <a className="focus-ring tx-hash" href={`https://stellar.expert/explorer/${NETWORK}/tx/${chain.state.hash}`} target="_blank" rel="noopener noreferrer">View transaction: {chain.state.hash}</a>}
              </div>}
            </div>}
            {msg && <div className={`notice notice-${msg.kind}`} style={{ marginTop: 14 }}>{msg.text}</div>}
          </div>
        </div>

        {inv.onChain && <div style={{ marginTop: 20 }}><ContractCard /></div>}
      </div>
    </section>
  );
}
