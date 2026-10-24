"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import RiskBadge from "@/components/RiskBadge";
import RiskFactorsCard from "@/components/RiskFactorsCard";
import ContractCard from "@/components/ContractCard";
import EscrowRules from "@/components/escrow/EscrowRules";
import { useNotifications } from "@/components/NotificationsProvider";
import FundersTable from "@/components/escrow/FundersTable";
import TokenCheck, { useFundingTokenCheck } from "@/components/escrow/TokenCheck";
import { fundInvoice, getInvoice, listInvoices } from "@/lib/api";
import BalanceHint from "@/components/wallet/BalanceHint";
import { getWalletAddress } from "@/lib/stellar/freighter";
import { bpsToPercent, formatAmount, formatDate, fundedPercent, shortAddress } from "@/lib/format";
import { computeListMedians, scoreInvoice } from "@/lib/risk";
import { loadConstraints, validateContribution, maxFillAmount, CODES } from "@/lib/escrow/constraints";
import { parseToStroops, stroopsToDisplay } from "@/lib/stellar/amount";

// Codes that disable the Fund button outright (amount edits cannot fix them).
const BLOCKING_CODES = new Set([CODES.PAUSED, CODES.LEGAL_HOLD, CODES.DEADLINE_PASSED, CODES.NOT_OPEN]);

export default function InvoiceDetail({ id, loadConstraintsFn = loadConstraints }) {
  const [state, setState] = useState({ loading: true, data: null, offline: false });
  const [medians, setMedians] = useState(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState({ loading: false, data: null, error: null });
  const { follow, unfollow, isFollowing } = useNotifications();
  const [walletAddress, setWalletAddress] = useState(null);
  const [balanceValidation, setBalanceValidation] = useState({ ok: true, message: null });
  const tokenCheck = useFundingTokenCheck(state.data, { enabled: Boolean(state.data?.onChain) });

  useEffect(() => {
    let alive = true;
    getWalletAddress().then((a) => alive && setWalletAddress(a));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    getInvoice(id).then((r) => alive && setState({ loading: false, ...r }));
    // List medians only refine the risk score; a failed list load never blocks the page.
    Promise.resolve()
      .then(() => listInvoices())
      .then((listRes) => {
        if (alive && listRes?.data) setMedians(computeListMedians(listRes.data));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);

  const inv = state.data;

  // Read the escrow's funding constraints once per page view (on-chain only).
  useEffect(() => {
    if (!inv?.onChain) return undefined;
    let alive = true;
    setRules({ loading: true, data: null, error: null });
    loadConstraintsFn({})
      .then((data) => alive && setRules({ loading: false, data, error: null }))
      .catch((err) => alive && setRules({ loading: false, data: null, error: err?.message || "read failed" }));
    return () => {
      alive = false;
    };
  }, [inv?.onChain, loadConstraintsFn]);

  // Status-level blockers (paused / legal hold / deadline / not open) apply
  // regardless of the typed amount; checked with a zero amount so amount
  // rules never mask them (status codes sort first in validateContribution).
  const blocking = useMemo(() => {
    if (!inv?.onChain || !rules.data) return null;
    const v = validateContribution(0n, rules.data);
    return !v.ok && BLOCKING_CODES.has(v.code) ? v : null;
  }, [inv?.onChain, rules.data]);

  // Validate the typed amount against the on-chain constraints. Runs only
  // when constraints loaded; a failed read falls back to amount > 0.
  const validation = useMemo(() => {
    if (!inv?.onChain || !rules.data || blocking) return null;
    if (!amount.trim()) return null;
    const stroops = parseToStroops(amount);
    if (stroops === null || stroops <= 0n) {
      return { ok: false, code: "INVALID", message: "Enter a positive amount (up to 7 decimals)." };
    }
    return validateContribution(stroops, rules.data);
  }, [inv?.onChain, rules.data, blocking, amount]);
  const maxFill = rules.data ? maxFillAmount(rules.data) : null;
  const fundDisabled = busy || state.offline || blocking !== null || (validation !== null && !validation.ok);

  async function onFund(e) {
    e.preventDefault();
    if (inv?.onChain && rules.data) {
      const stroops = parseToStroops(amount);
      if (stroops === null || stroops <= 0n) {
        setMsg({ kind: "err", text: "Enter a positive amount." });
        return;
      }
      const v = validateContribution(stroops, rules.data);
      if (!v.ok) {
        setMsg({ kind: "err", text: v.message });
        return;
      }
    } else {
      const n = Number(amount);
      if (!(n > 0)) {
        setMsg({ kind: "err", text: "Enter a positive amount." });
        return;
      }
    }
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await fundInvoice(id, Number(amount));
      setState((s) => ({ ...s, data }));
      setAmount("");
      follow(id); // auto-follow so future status changes surface in the bell
      setMsg({ kind: "ok", text: `Contribution of ${formatAmount(Number(amount), data.currency)} recorded.` });
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
            <button
              className="btn-ghost"
              aria-pressed={isFollowing(id)}
              aria-label={isFollowing(id) ? "Unfollow invoice" : "Follow invoice"}
              onClick={() => (isFollowing(id) ? unfollow(id) : follow(id))}
            >
              {isFollowing(id) ? "Following ✓" : "Follow"}
            </button>
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
            {inv.onChain && rules.data && <EscrowRules constraints={rules.data} currency={inv.currency} />}
          </div>

          <div className="card">
            <h3>Fund this invoice</h3>
            {inv.status === "open" ? (
              <form className="form" onSubmit={onFund} style={{ marginTop: 12 }}>
                <div className="field">
                  <label htmlFor="amount">Amount ({inv.currency})</label>
                  <div className="amount-row">
                    <input
                      id="amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Up to ${remaining}`}
                      aria-invalid={validation && !validation.ok ? true : undefined}
                      aria-describedby="amount-error amount-hint amount-balance"
                    />
                    {inv.onChain && maxFill !== null && maxFill > 0n && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-max"
                        onClick={() => setAmount(stroopsToDisplay(maxFill))}
                      >
                        Max
                      </button>
                    )}
                  </div>
                  <span className="hint" id="amount-hint">
                    {inv.onChain && rules.loading
                      ? "Checking escrow rules…"
                      : "Demo mode: contributions are recorded by the API; on-chain funding uses the escrow’s fund entrypoint."}
                  </span>
                  <span className="field-error" id="amount-error" aria-live="polite">
                    {validation && !validation.ok ? validation.message : ""}
                  </span>
                  <span id="amount-balance">
                    <BalanceHint currency={inv.currency} address={walletAddress} amount={amount} onUseMax={(v) => setAmount(v)} onValidation={setBalanceValidation} />
                  </span>
                </div>
                {inv.onChain && rules.error && (
                  <div className="notice notice-warn" role="status" style={{ marginBottom: 10 }}>
                    Couldn’t read the escrow rules — falling back to basic validation.
                  </div>
                )}
                {inv.onChain && <TokenCheck invoice={inv} check={tokenCheck} />}
                <button className="btn btn-primary" disabled={fundDisabled || !balanceValidation.ok || !tokenCheck.ok}>
                  {busy ? "Submitting…" : blocking ? blocking.message : "Fund invoice"}
                </button>
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

        {inv.onChain && (
          <>
            <div style={{ marginTop: 20 }}><ContractCard /></div>
            <FundersTable currency={inv.currency} />
          </>
        )}
      </div>
    </section>
  );
}
