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
import ActivityFeed from "./ActivityFeed";
import EscrowRules from "@/components/escrow/EscrowRules";
import { useNotifications } from "@/components/NotificationsProvider";
import { useOptionalToast } from "@/components/toast/ToastProvider";
import FundersTable from "@/components/escrow/FundersTable";
import TokenCheck, { useFundingTokenCheck } from "@/components/escrow/TokenCheck";
import { fundInvoice, getEscrowLive, getInvoice, listInvoices } from "@/lib/api";
import BalanceHint from "@/components/wallet/BalanceHint";
import { validateContribution as checkApiContribution, creditedAmount } from "@/lib/contribution";
import { getWalletAddress } from "@/lib/stellar/freighter";
import SmeActionsCard from "@/components/sme/SmeActionsCard";
import LifecycleTimeline from "@/components/invoice/LifecycleTimeline";
import DueStatusBadge from "@/components/invoice/DueStatusBadge";
import YieldCalculator from "@/components/invest/YieldCalculator";
import { escrowFor } from "@/lib/escrow/registry";
import { bpsToPercent, formatAmount, formatDate, fundedPercent, shortAddress } from "@/lib/format";
import * as money from "@/lib/money";
import { computeListMedians, scoreInvoice } from "@/lib/risk";
import { loadConstraints, validateContribution, maxFillAmount, CODES } from "@/lib/escrow/constraints";
import { parseToStroops, remainingStroops, stroopsToDisplay } from "@/lib/stellar/amount";
import { getDefaultStore } from "@/lib/stellar/txStore";
import { useOnChainFund } from "@/lib/hooks/useOnChainFund";
import { CONTRACT_ID, NETWORK } from "@/lib/config";
import { useT } from "@/lib/i18n/I18nProvider";
import { rich, translateKnown } from "@/lib/i18n/rich";

const ESCROW_STATUSES = ["open", "funded", "settled", "withdrawn", "cancelled"];

function onChainRemaining(inv) {
  try {
    return stroopsToDisplay(remainingStroops(inv));
  } catch {
    return Math.max(0, Number(inv.amount) - Number(inv.fundedAmount));
  }
}

function contributionErrorText(t, error, remaining, currency) {
  switch (error) {
    case "REQUIRED":
      return t("invoice.error.required");
    case "NOT_A_NUMBER":
      return t("invoice.error.notANumber");
    case "NON_POSITIVE":
      return t("invoice.error.nonPositive");
    case "TOO_MANY_DECIMALS":
      return t("invoice.error.tooManyDecimals");
    case "EXCEEDS_REMAINING":
      return t("invoice.error.exceedsRemaining", { amount: formatAmount(remaining, currency) });
    case "NOT_OPEN":
      return t("invoice.error.notOpen");
    default:
      return t("invoice.error.invalid");
  }
}

// Constraint codes with a dictionary entry (invoice.constraint.<CODE>).
const CONSTRAINT_KEYS = new Set(["PAUSED", "LEGAL_HOLD", "DEADLINE_PASSED", "NOT_OPEN", "BELOW_FLOOR", "ABOVE_INVESTOR_CAP", "ABOVE_CAPACITY"]);

// Display-only translation of the fixed English phases/messages emitted by
// useOnChainFund; dynamic messages (wallet/RPC errors) pass through unchanged.
const CHAIN_MESSAGES = {
  Preparing: "invoice.phase.preparing",
  "Waiting for signature": "invoice.phase.waitingSignature",
  Submitting: "invoice.phase.submitting",
  Confirmed: "invoice.phase.confirmed",
  "Pending confirmation": "invoice.phase.pending",
  Failed: "invoice.phase.failed",
  "Wallet connected.": "invoice.chain.walletConnected",
  "Connect Freighter before funding.": "invoice.chain.connectFirst",
  "Funding confirmed.": "invoice.chain.confirmed",
  "Funding confirmed. Invoice refresh failed; reload to update its balance.": "invoice.chain.confirmedRefreshFailed",
  "Confirmation timed out. Check this transaction in the explorer before making another contribution.": "invoice.chain.timeout",
  "The transaction failed on-chain.": "invoice.chain.txFailed",
  "Signature cancelled": "invoice.chain.cancelled",
  "Funding failed.": "invoice.fundingFailed",
};

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
  const t = useT();
  const [state, setState] = useState({ loading: true, data: null, offline: false });
  const [medians, setMedians] = useState(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState(null);
  const toast = useOptionalToast();
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
      return { ok: false, code: "INVALID", message: t("invoice.error.invalidPrecision") };
    }
    return validateContribution(stroops, rules.data);
  }, [inv?.onChain, rules.data, blocking, amount, t]);
  // Localized text for a constraint result; falls back to the lib message.
  const constraintText = (v) => (v && CONSTRAINT_KEYS.has(v.code) ? t(`invoice.constraint.${v.code}`) : v?.message);
  const chainText = (text) => translateKnown(t, CHAIN_MESSAGES, text);
  const maxFill = rules.data ? maxFillAmount(rules.data) : null;
  const fundDisabled = busy || state.offline || blocking !== null || (validation !== null && !validation.ok);

  async function onFund(e) {
    e.preventDefault();
    if (inv?.onChain && rules.data) {
      const stroops = parseToStroops(amount);
      if (stroops === null || stroops <= 0n) {
        setMsg({ kind: "err", text: t("invoice.error.nonPositive") });
        return;
      }
      const v = validateContribution(stroops, rules.data);
      if (!v.ok) {
        setMsg({ kind: "err", text: constraintText(v) });
        return;
      }
    }
    if (inv?.onChain) {
      // On-chain invoices: build + simulate fund(investor, amount), sign with Freighter, submit.
      const fundedInput = amount.trim();
      const result = await chain.fund(inv, fundedInput, refreshInvoice);
      if (result?.status === "SUCCESS") {
        if (result.hash) {
          try {
            const store = getDefaultStore();
            store.add({
              hash: result.hash,
              label: t("invoice.txLabel", { id: inv.id, amount: fundedInput, currency: inv.currency || "USDC" }),
              invoiceId: inv.id,
            });
            store.update(result.hash, { status: "SUCCESS" });
          } catch {
            // Non-fatal: localStorage may be unavailable.
          }
        }
        setAmount("");
        follow(id); // auto-follow so future status changes surface in the bell
      }
      return;
    }
    if (apiLock.current) return;
    // API invoices: reject amounts above the remaining capacity or on closed invoices (#1396).
    const check = checkApiContribution(amount, inv);
    if (!check.ok) {
      setMsg({ kind: "err", text: contributionErrorText(t, check.error, remaining, inv.currency) });
      return;
    }
    // Exact decimal validation (no float coercion); unknown currencies fall back to a numeric check.
    let valid;
    try {
      valid = money.parse(amount.trim(), inv?.currency || "USDC") > 0n;
    } catch (err) {
      valid = err instanceof RangeError && /Unsupported currency/.test(err.message) ? Number(amount) > 0 : false;
    }
    const n = Number(amount);
    if (!valid) {
      setMsg({ kind: "err", text: t("invoice.error.nonPositive") });
      return;
    }
    const before = inv;
    apiLock.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await fundInvoice(id, n);
      setState((s) => ({ ...s, data }));
      setAmount("");
      follow(id); // auto-follow so future status changes surface in the bell
      // Report what the API actually credited, not what was typed (#1396).
      const credited = creditedAmount(before, data);
      const partial = credited > 0 && credited < n;
      const text = partial
        ? t("invoice.partialRecorded", { amount: formatAmount(credited, data.currency) })
        : t("invoice.contributionRecorded", { amount: formatAmount(credited > 0 ? credited : n, data.currency) });
      // Fund results are announced as toasts when the app shell provides them (#1399).
      if (toast) toast.push({ kind: partial ? "warning" : "success", title: t("invoice.toast.recorded"), description: text });
      else setMsg({ kind: partial ? "warn" : "ok", text });
    } catch (err) {
      if (err.status === 409) {
        // The invoice closed meanwhile: refresh it and explain instead of a raw API error.
        const refreshed = await getInvoice(id);
        setState((s) => ({ ...s, ...refreshed }));
        setMsg({ kind: "err", text: t("invoice.error.notOpen") });
      } else {
        const text = err.message || t("invoice.fundingFailed");
        if (toast) toast.push({ kind: "error", title: t("invoice.toast.failed"), description: text });
        else setMsg({ kind: "err", text });
      }
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
          <h1 style={{ fontSize: "2rem" }}>{t("invoice.notFound.title")}</h1>
          <p className="lead">{rich(t("invoice.notFound.body"), { id: <code>{id}</code> })}</p>
          <Link href="/marketplace" className="btn btn-primary">{t("invoice.notFound.back")}</Link>
        </div>
      </section>
    );
  }

  const pct = fundedPercent(inv);
  const remaining = inv.onChain ? onChainRemaining(inv) : offChainRemaining(inv);
  const fundingBusy = inv.onChain ? chain.busy || chain.connecting : busy;
  const isCancelled = inv.status === "cancelled";
  const risk = scoreInvoice(inv, undefined, medians);
  // Per-invoice escrow from the registry (#1375); never fall back to another invoice's contract.
  const escrow = escrowFor(inv);
  const contractId = escrow?.contractId ?? null;

  async function refreshOnChainInvoice() {
    const { readSmeEscrow } = await import("@/lib/stellar/soroban");
    const { getPublicKey } = await import("@/lib/stellar/freighter");
    const source = await getPublicKey();
    if (!source) return refreshInvoice();
    const { escrow } = await readSmeEscrow({ contractId, source });
    const statusIndex = Number(escrow.status);
    const status = ESCROW_STATUSES[statusIndex];
    if (!status) throw new Error(t("invoice.error.unknownStatus", { status: statusIndex }));
    const fundedAmount = stroopsToDisplay(BigInt(escrow.funded_amount ?? escrow.fundedAmount ?? 0));
    setState((current) => ({
      ...current,
      data: { ...current.data, status, fundedAmount },
    }));
  }

  return (
    <section className="section invoice-detail">
      <div className="container">
        <Link href="/marketplace" className="muted">{t("invoice.back")}</Link>
        <div className="invoice-head" style={{ marginTop: 14, marginBottom: 24 }}>
          <div>
            <div className="invoice-id">{inv.id}</div>
            <h1 style={{ fontSize: "clamp(1.7rem,4vw,2.4rem)", margin: "4px 0" }}>{inv.sme}</h1>
            <div className="muted">{t("invoice.debtor", { name: inv.debtor })}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge status={inv.status} live />
            {risk.band && <RiskBadge band={risk.band} score={risk.score} factors={risk.factors} />}
            {inv.onChain && <StatusBadge kind="chain" />}
            <button
              className="btn-ghost"
              aria-pressed={isFollowing(id)}
              aria-label={isFollowing(id) ? t("invoice.unfollowAria") : t("invoice.followAria")}
              onClick={() => (isFollowing(id) ? unfollow(id) : follow(id))}
            >
              {isFollowing(id) ? t("invoice.following") : t("invoice.follow")}
            </button>
          </div>
        </div>
        <OfflineNotice {...state} />

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <h3>{t("invoice.terms")}</h3>
            <div className="kv" style={{ marginTop: 12 }}>
              <div><span className="k">{t("invoice.faceValue")}</span>{formatAmount(inv.amount, inv.currency)}</div>
              <div><span className="k">{t("invoice.investorYield")}</span>{bpsToPercent(inv.yieldBps)}</div>
              <div>
                <span className="k">{t("invoice.dueDate")}</span>
                <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  {formatDate(inv.dueDate)} <DueStatusBadge invoice={inv} />
                </span>
              </div>
              <div><span className="k">{t("invoice.remaining")}</span>{formatAmount(remaining, inv.currency)}</div>
              {inv.smeAddress && <div style={{ gridColumn: "1 / -1" }}><span className="k">{t("invoice.smeWallet")}</span><span className="mono">{shortAddress(inv.smeAddress, 8)}</span></div>}
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }} className="muted">
                <span>{t("invoice.funded")}</span><span>{formatAmount(inv.fundedAmount, inv.currency)} · {pct}%</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <FundingProgress funded={inv.fundedAmount} target={inv.amount} currency={inv.currency} size="md" />
              </div>
            </div>
            {inv.onChain && rules.data && <EscrowRules constraints={rules.data} currency={inv.currency} />}
          </div>

          <div className="card funding-card">
            <h3>{t("invoice.fundHeading")}</h3>
            {inv.onChain && (
              <div className="wallet-connection">
                <p className="muted">{chain.address ? t("invoice.wallet.connected", { address: shortAddress(chain.address, 8) }) : t("invoice.wallet.prompt")} &middot; {NETWORK}</p>
                <button type="button" className="btn btn-ghost focus-ring" onClick={chain.connect} disabled={fundingBusy || chain.pending}>
                  {chain.connecting ? t("invoice.wallet.connecting") : chain.address ? t("invoice.wallet.reconnect") : t("invoice.wallet.connect")}
                </button>
              </div>
            )}
            {inv.status === "open" ? (
              <form className="form" onSubmit={onFund} style={{ marginTop: 12 }}>
                <div className="field">
                  <label htmlFor="amount">{t("invoice.amountLabel", { currency: inv.currency })}</label>
                  <div className="amount-row">
                    <input
                      id="amount"
                      className="focus-ring"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t("invoice.amountPlaceholder", { amount: remaining })}
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
                    {!inv.onChain && Number(remaining) > 0 && (
                      <button type="button" className="btn btn-ghost btn-max" onClick={() => setAmount(String(remaining))}>
                        Max
                      </button>
                    )}
                  </div>
                  <span className="hint" id="amount-hint">
                    {inv.onChain && rules.loading
                      ? t("invoice.hint.checkingRules")
                      : inv.onChain
                        ? t("invoice.hint.onChain", { amount: remaining, currency: inv.currency })
                        : t("invoice.hint.demo")}
                  </span>
                  <span className="field-error" id="amount-error" aria-live="polite">
                    {validation && !validation.ok ? constraintText(validation) : ""}
                  </span>
                  <span id="amount-balance">
                    <BalanceHint currency={inv.currency} address={investorAddress} amount={amount} onUseMax={(v) => setAmount(v)} onValidation={setBalanceValidation} />
                  </span>
                </div>
                {inv.onChain && rules.error && (
                  <div className="notice notice-warn" role="status" style={{ marginBottom: 10 }}>
                    {t("invoice.rulesError")}
                  </div>
                )}
                {inv.onChain && <TokenCheck invoice={inv} check={tokenCheck} />}
                <button
                  className="btn btn-primary focus-ring"
                  disabled={
                    fundDisabled ||
                    fundingBusy ||
                    !balanceValidation.ok ||
                    !tokenCheck.ok ||
                    (inv.onChain && (!chain.address || chain.pending)) ||
                    (!inv.onChain && amount.trim() !== "" && !checkApiContribution(amount, inv).ok)
                  }
                >
                  {inv.onChain && chain.busy
                    ? `${chainText(chain.state.phase)}...`
                    : busy
                      ? t("invoice.submitting")
                      : blocking
                        ? constraintText(blocking)
                        : inv.onChain
                          ? t("invoice.signAndFund")
                          : t("invoice.fundInvoice")}
                </button>
                {state.offline && (
                  <div className="muted" style={{ marginTop: 8, fontSize: "0.85rem" }}>
                    {t("invoice.offlineFunding")}
                  </div>
                )}
              </form>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>
                {rich(t(isCancelled ? "invoice.closed.cancelled" : "invoice.closed.other"), {
                  status: <strong>{ESCROW_STATUSES.includes(inv.status) ? t(`invoice.statusWord.${inv.status}`) : inv.status}</strong>,
                })}
              </p>
            )}
            {inv.onChain && (
              <div className="funding-status" role="status" aria-live="polite" aria-atomic="true">
                {(chain.state.phase || chain.state.message) && (
                  <div className={`notice notice-${chain.state.kind}`}>
                    {chain.state.phase && <strong>{chainText(chain.state.phase)}</strong>}
                    {chain.state.message && <p>{chainText(chain.state.message)}</p>}
                    {chain.state.hash && (
                      <a className="focus-ring tx-hash" href={`https://stellar.expert/explorer/${NETWORK}/tx/${chain.state.hash}`} target="_blank" rel="noopener noreferrer">
                        {t("invoice.viewTx", { hash: chain.state.hash })}
                      </a>
                    )}
                    {chain.state.phase === "Confirmed" && chain.state.hash && (
                      <div style={{ marginTop: 10 }}>
                        <Link
                          className="btn btn-ghost focus-ring"
                          href={`/marketplace/${encodeURIComponent(inv.id)}/receipt?tx=${encodeURIComponent(chain.state.hash)}`}
                        >
                          {t("invoice.viewReceipt")}
                        </Link>
                      </div>
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
                {t("invoice.exitWalletPrompt")}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <YieldCalculator
            amount={amount}
            yieldBps={inv.yieldBps}
            dueDate={inv.dueDate}
            currency={inv.currency || "USDC"}
          />
        </div>

        {inv.onChain && (
          <div style={{ marginTop: 20 }}>
            {contractId && <SmeActionsCard contractId={contractId} currency={inv.currency} onRefresh={refreshOnChainInvoice} />}
          </div>
        )}
        <div style={{ marginTop: 24 }}>
          <LifecycleTimeline invoice={inv} />
        </div>

        {risk.band && (
          <div style={{ marginTop: 24 }}>
            <RiskFactorsCard risk={risk} />
          </div>
        )}

        {inv.onChain && (
          <>
            <div style={{ marginTop: 20 }}>
              {escrow ? (
                <ContractCard contractId={escrow.contractId} network={NETWORK} />
              ) : (
                <div className="notice notice-warn" role="alert">
                  {t("invoice.contractNotRegistered")}
                </div>
              )}
            </div>
            <FundersTable currency={inv.currency} />
          </>
        )}
        {inv.onChain && <div style={{ marginTop: 20 }}><ActivityFeed invoiceId={inv.id} /></div>}
      </div>
    </section>
  );
}
