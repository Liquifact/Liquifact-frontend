"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import OfflineNotice from "@/components/pwa/OfflineNotice";
import FundingProgress from "@/components/FundingProgress";
import StatusBadge from "@/components/StatusBadge";
import RiskBadge from "@/components/RiskBadge";
import RiskFactorsCard from "@/components/RiskFactorsCard";
import ContractCard from "@/components/ContractCard";
import EscrowRules from "@/components/escrow/EscrowRules";
import { useNotifications } from "@/components/NotificationsProvider";
import FundersTable from "@/components/escrow/FundersTable";
import TokenCheck, { useFundingTokenCheck } from "@/components/escrow/TokenCheck";
import { fundInvoice, getEscrowLive, getInvoice, listInvoices } from "@/lib/api";
import BalanceHint from "@/components/wallet/BalanceHint";
import { getWalletAddress } from "@/lib/stellar/freighter";
import { bpsToPercent, formatAmount, formatDate, fundedPercent, shortAddress } from "@/lib/format";
import * as money from "@/lib/money";
import { computeListMedians, scoreInvoice } from "@/lib/risk";
import { loadConstraints, validateContribution, maxFillAmount, CODES } from "@/lib/escrow/constraints";
import { parseToStroops, remainingStroops, stroopsToDisplay } from "@/lib/stellar/amount";
import { useOnChainFund } from "@/lib/hooks/useOnChainFund";
import { CONTRACT_ID, NETWORK } from "@/lib/config";

const ESCROW_STATUSES = ["open", "funded", "settled", "withdrawn", "cancelled"];

function onChainRemaining(inv) {
  try {
    return stroopsToDisplay(remainingStroops(inv));
  } catch {
    return Math.max(0, Number(inv.amount) - Number(inv.fundedAmount));
  }
}

// Exact decimal remaining capacity for API-only invoices (BigInt minor units, #1395).
function offChainRemaining(inv) {
  try {
    const currency = inv.currency || "USDC";
    return stroopsToDisplay(money.sub(money.parse(inv.amount, currency), money.parse(inv.fundedAmount ?? 0, currency), { clamp: true }));
  } catch {
    return Math.max(0, inv.amount - inv.fundedAmount);
  }
}

// ExitPanel uses @stellar/stellar-sdk and the Freighter browser API — SSR-unsafe.
// Lazy-load so the Soroban SDK never runs on the server.
const ExitPanel = dynamic(() => import("@/components/invest/ExitPanel"), { ssr: false });

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
  const apiLock = useRef(false);
  const chain = useOnChainFund();
  // Prefer the account explicitly connected for signing; fall back to the detected wallet.
  const investorAddress = chain.address || walletAddress;

  // Re-read the invoice and overlay the live escrow totals/status after an on-chain contribution.
  async function refreshInvoice() {
    const [invoice, live] = await Promise.all([getInvoice(id), getEscrowLive().catch(() => null)]);
    if (invoice.data && live?.contractId === CONTRACT_ID && live.escrow?.invoice_id === id) {
      const escrow = live.escrow;
      invoice.data = {
        ...invoice.data,
        amount: stroopsToDisplay(BigInt(escrow.funding_target ?? escrow.amount)),
        fundedAmount: stroopsToDisplay(BigInt(escrow.funded_amount)),
        status: ESCROW_STATUSES[escrow.status] ?? invoice.data.status,
      };
    }
    setState({ loading: false, ...invoice });
  }

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
    }
    if (inv?.onChain) {
      // On-chain invoices: build + simulate fund(investor, amount), sign with Freighter, submit.
      const result = await chain.fund(inv, amount.trim(), refreshInvoice);
      if (result?.status === "SUCCESS") {
        setAmount("");
        follow(id); // auto-follow so future status changes surface in the bell
      }
      return;
    }
    if (apiLock.current) return;
    // Exact decimal validation (no float coercion); unknown currencies fall back to a numeric check.
    let valid;
    try {
      valid = money.parse(amount.trim(), inv?.currency || "USDC") > 0n;
    } catch (err) {
      valid = err instanceof RangeError && /Unsupported currency/.test(err.message) ? Number(amount) > 0 : false;
    }
    const n = Number(amount);
    if (!valid) {
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
      follow(id); // auto-follow so future status changes surface in the bell
      setMsg({ kind: "ok", text: `Contribution of ${formatAmount(Number(amount), data.currency)} recorded.` });
    } catch (err) {
      setMsg({ kind: "err", text: err.message || "Funding failed." });
    } finally {
      apiLock.current = false;
      setBusy(false);
    }
  }

  // Refresh invoice data after a successful exit action
  function onContribRefresh() {
    getInvoice(id).then((r) => setState({ loading: false, ...r }));
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
          <p className="lead">We couldn&apos;t find invoice <code>{id}</code>.</p>
          <Link href="/marketplace" className="btn btn-primary">Back to marketplace</Link>
        </div>
      </section>
    );
  }

  const pct = fundedPercent(inv);
  const remaining = inv.onChain ? onChainRemaining(inv) : offChainRemaining(inv);
  const fundingBusy = inv.onChain ? chain.busy || chain.connecting : busy;
  const isCancelled = inv.status === "cancelled";
  const risk = scoreInvoice(inv, undefined, medians);

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
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge status={inv.status} live />
            {risk.band && <RiskBadge band={risk.band} score={risk.score} factors={risk.factors} />}
            {inv.onChain && <StatusBadge kind="chain" />}
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
        <OfflineNotice {...state} />

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
              <div style={{ marginTop: 6 }}>
                <FundingProgress funded={inv.fundedAmount} target={inv.amount} currency={inv.currency} size="md" />
              </div>
            </div>
            {inv.onChain && rules.data && <EscrowRules constraints={rules.data} currency={inv.currency} />}
          </div>

          <div className="card funding-card">
            <h3>Fund this invoice</h3>
            {inv.onChain && (
              <div className="wallet-connection">
                <p className="muted">{chain.address ? `Connected: ${shortAddress(chain.address, 8)}` : "Connect Freighter to fund this invoice."} &middot; {NETWORK}</p>
                <button type="button" className="btn btn-ghost focus-ring" onClick={chain.connect} disabled={fundingBusy || chain.pending}>
                  {chain.connecting ? "Connecting..." : chain.address ? "Reconnect Freighter" : "Connect Freighter"}
                </button>
              </div>
            )}
            {inv.status === "open" ? (
              <form className="form" onSubmit={onFund} style={{ marginTop: 12 }}>
                <div className="field">
                  <label htmlFor="amount">Amount ({inv.currency})</label>
                  <div className="amount-row">
                    <input
                      id="amount"
                      className="focus-ring"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Up to ${remaining}`}
                      aria-invalid={validation && !validation.ok ? true : undefined}
                      aria-describedby="amount-error amount-hint amount-balance"
                      disabled={fundingBusy || (inv.onChain && chain.pending)}
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
                      : inv.onChain
                        ? `Up to ${remaining} ${inv.currency}. Review the amount and network in Freighter before signing.`
                        : "Demo mode: contributions are recorded by the API."}
                  </span>
                  <span className="field-error" id="amount-error" aria-live="polite">
                    {validation && !validation.ok ? validation.message : ""}
                  </span>
                  <span id="amount-balance">
                    <BalanceHint currency={inv.currency} address={investorAddress} amount={amount} onUseMax={(v) => setAmount(v)} onValidation={setBalanceValidation} />
                  </span>
                </div>
                {inv.onChain && rules.error && (
                  <div className="notice notice-warn" role="status" style={{ marginBottom: 10 }}>
                    Couldn’t read the escrow rules — falling back to basic validation.
                  </div>
                )}
                {inv.onChain && <TokenCheck invoice={inv} check={tokenCheck} />}
                <button
                  className="btn btn-primary focus-ring"
                  disabled={fundDisabled || fundingBusy || !balanceValidation.ok || !tokenCheck.ok || (inv.onChain && (!chain.address || chain.pending))}
                >
                  {inv.onChain && chain.busy
                    ? `${chain.state.phase}...`
                    : busy
                      ? "Submitting…"
                      : blocking
                        ? blocking.message
                        : inv.onChain
                          ? "Sign & fund"
                          : "Fund invoice"}
                </button>
              </form>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>
                This invoice is <strong>{inv.status}</strong>
                {isCancelled
                  ? " — see your exit options below."
                  : " and no longer accepts contributions."}
              </p>
            )}
            {inv.onChain && (
              <div className="funding-status" role="status" aria-live="polite" aria-atomic="true">
                {(chain.state.phase || chain.state.message) && (
                  <div className={`notice notice-${chain.state.kind}`}>
                    {chain.state.phase && <strong>{chain.state.phase}</strong>}
                    {chain.state.message && <p>{chain.state.message}</p>}
                    {chain.state.hash && (
                      <a className="focus-ring tx-hash" href={`https://stellar.expert/explorer/${NETWORK}/tx/${chain.state.hash}`} target="_blank" rel="noopener noreferrer">
                        View transaction: {chain.state.hash}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
            {msg && <div role="status" aria-live="polite" className={`notice notice-${msg.kind}`} style={{ marginTop: 14 }}>{msg.text}</div>}

            {/* ── Investor exit panel (on-chain invoices, connected wallet only) ── */}
            {inv.onChain && investorAddress && (
              <ExitPanel
                investorAddress={investorAddress}
                invoiceStatus={inv.status}
                onContribRefresh={onContribRefresh}
              />
            )}

            {/* Prompt to connect wallet if not connected and invoice is on-chain */}
            {inv.onChain && !investorAddress && (
              <p className="muted exit-wallet-prompt" style={{ marginTop: 16, fontSize: "0.9rem" }}>
                Connect your Freighter wallet to manage your position.
              </p>
            )}
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
