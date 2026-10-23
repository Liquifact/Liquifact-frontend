"use client";

import { useCallback, useEffect, useState } from "react";
import { TransactionBuilder } from "@stellar/stellar-sdk";
import QuoteStatus from "./QuoteStatus";
import TierSelector from "./TierSelector";
import { useYieldQuote } from "./useYieldQuote";
import { bpsToPercent, formatAmount, shortAddress } from "@/lib/format";
import { tierOptions } from "@/lib/invest/tiers";
import { CONTRACT_ID } from "@/lib/config";
import { connectFreighter, isFreighterAvailable, signTransactionXdr } from "@/lib/stellar/freighter";
import { NETWORK_PASSPHRASE } from "@/lib/stellar/network";
import { getServer } from "@/lib/stellar/rpc";
import { getContribution, getInvestorYieldBps, previewYieldTier } from "@/lib/stellar/simulate";
import { buildFundTransaction, toStroops } from "@/lib/stellar/tx";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fund form for on-chain escrows that have a yield tier table.
 * First-time investors pick a lock, see the contract quote, and fund via
 * fund (no lock) or fund_with_commitment (lock > 0) signed by Freighter.
 * Returning investors get a fixed-yield notice and can only fund with no lock.
 */
export default function OnChainFundForm({ inv, tiers, escrow, nowSec }) {
  const [amount, setAmount] = useState("");
  const [investor, setInvestor] = useState(null);
  const [contribution, setContribution] = useState(null); // bigint | null = unknown
  const [fixedYieldBps, setFixedYieldBps] = useState(null);
  const [lockSecs, setLockSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const isFirstTimer = contribution === 0n;
  const options = tierOptions({ tiers, baseYieldBps: escrow.baseYieldBps, nowSec, maturitySec: escrow.maturitySec });

  const fetchQuote = useCallback(
    ({ amountStroops, lockSecs: lock, signal }) =>
      previewYieldTier({ contractId: CONTRACT_ID, amountStroops, lockSecs: lock, signal }),
    []
  );

  const amountNum = Number(amount);
  const amountStroops = amountNum > 0 ? toStroops(amountNum).toString() : "0";
  const quoteState = useYieldQuote({
    enabled: Boolean(investor) && isFirstTimer && amountNum > 0,
    amountStroops,
    lockSecs,
    fetchQuote,
  });

  // Check whether the connected investor already has a contribution
  // (the tier choice is only allowed on the first deposit).
  useEffect(() => {
    if (!investor) {
      setContribution(null);
      setFixedYieldBps(null);
      return undefined;
    }
    let live = true;
    const controller = new AbortController();
    (async () => {
      try {
        const contributionStroops = await getContribution({
          contractId: CONTRACT_ID,
          investor,
          signal: controller.signal,
        });
        if (!live) return;
        setContribution(contributionStroops);
        if (contributionStroops > 0n) {
          const bps = await getInvestorYieldBps({ contractId: CONTRACT_ID, investor, signal: controller.signal });
          if (live) setFixedYieldBps(bps);
        }
      } catch (err) {
        if (!live || err?.name === "AbortError") return;
        setMsg({ kind: "err", text: "Could not read your on-chain contribution. Try again." });
      }
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [investor]);

  async function onConnect() {
    setBusy(true);
    setMsg(null);
    try {
      const address = await connectFreighter();
      setInvestor(address);
    } catch (err) {
      setMsg({ kind: "err", text: err?.message || "Wallet connection failed." });
    } finally {
      setBusy(false);
    }
  }

  async function onFund(e) {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) {
      setMsg({ kind: "err", text: "Enter a positive amount." });
      return;
    }
    if (!investor) {
      setMsg({ kind: "err", text: "Connect your Stellar wallet first." });
      return;
    }
    // A returning investor must never send fund_with_commitment — it would
    // revert (TieredSecondDeposit = 108) and waste the fee.
    const lock = isFirstTimer ? lockSecs : 0;

    setBusy(true);
    setMsg(null);
    try {
      const server = getServer();
      const account = await server.getAccount(investor);
      const tx = buildFundTransaction({
        contractId: CONTRACT_ID,
        investor,
        amountStroops: toStroops(n),
        lockSecs: lock,
        source: account,
      });
      const prepared = await server.prepareTransaction(tx);
      const signedXdr = await signTransactionXdr(prepared.toXDR(), { address: investor, networkPassphrase: NETWORK_PASSPHRASE });
      const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const sent = await server.sendTransaction(signed);

      let result = null;
      for (let i = 0; i < 15 && !result; i += 1) {
        await sleep(1000);
        result = await server.getTransaction(sent.hash);
        if (result.status === "NOT_FOUND") result = null;
      }
      if (!result || result.status !== "SUCCESS") {
        throw new Error(`Transaction ${sent.hash?.slice(0, 10)}… was not confirmed.`);
      }

      setContribution((prev) => (prev ?? 0n) + toStroops(n));
      setFixedYieldBps(quoteState.quote?.effectiveYieldBps ?? escrow.baseYieldBps);
      setAmount("");
      // The confirmation yield is the contract quote, not a client computation.
      const quoted = quoteState.quote;
      const yieldNote =
        lock > 0 && quoted
          ? ` Contract quote: ${bpsToPercent(quoted.effectiveYieldBps)}.`
          : isFirstTimer && quoted
            ? ` Contract quote: ${bpsToPercent(quoted.effectiveYieldBps)}.`
            : "";
      setMsg({
        kind: "ok",
        text: `Contribution of ${formatAmount(n, inv.currency)} confirmed on-chain (tx ${sent.hash?.slice(0, 10)}…).${yieldNote}`,
      });
    } catch (err) {
      setMsg({ kind: "err", text: err?.message || "On-chain funding failed." });
    } finally {
      setBusy(false);
    }
  }

  const quoteReady = !isFirstTimer || quoteState.status === "quote";
  const remaining = Math.max(0, inv.amount - inv.fundedAmount);

  return (
    <form className="form" onSubmit={onFund} style={{ marginTop: 12 }}>
      {!investor ? (
        <div className="field">
          <p className="hint" style={{ margin: 0 }}>
            This invoice is funded on-chain. Connect your Stellar wallet to see lock-commitment yield tiers and fund via the
            escrow contract.
          </p>
          <button type="button" className="btn btn-ghost" onClick={onConnect} disabled={busy || !isFreighterAvailable()}>
            {busy ? "Connecting…" : "Connect Stellar wallet"}
          </button>
          {!isFreighterAvailable() && (
            <span className="hint">
              No wallet detected. Install{" "}
              <a href="https://freighter.org" target="_blank" rel="noopener noreferrer">
                Freighter
              </a>{" "}
              and reload.
            </span>
          )}
        </div>
      ) : (
        <>
          <div className="field">
            <span className="hint">
              Wallet: <span className="mono">{shortAddress(investor, 4)}</span>
            </span>
            {contribution === null && <span className="hint">Checking your contribution on-chain…</span>}
            {contribution !== null && !isFirstTimer && (
              <span className="hint">
                You already funded this invoice. Your yield is fixed at{" "}
                <strong>{bpsToPercent(fixedYieldBps ?? escrow.baseYieldBps)}</strong> from your first deposit.
              </span>
            )}
          </div>

          {isFirstTimer && <TierSelector options={options} value={lockSecs} onChange={setLockSecs} disabled={busy} />}

          <div className="field">
            <label htmlFor="amount">Amount ({inv.currency})</label>
            <input
              id="amount"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Up to ${remaining}`}
              disabled={busy || contribution === null}
            />
            <span className="hint">
              Funding goes straight to the escrow contract ({CONTRACT_ID.slice(0, 8)}…). Signing happens in your wallet.
            </span>
          </div>

          {isFirstTimer && <QuoteStatus state={quoteState} nowSec={nowSec} lockSecs={lockSecs} />}

          <button className="btn btn-primary" disabled={busy || contribution === null || !quoteReady}>
            {busy ? "Submitting…" : isFirstTimer && lockSecs > 0 ? "Fund with lock" : "Fund invoice"}
          </button>
        </>
      )}

      {msg && <div className={`notice notice-${msg.kind}`} role="status" aria-live="polite">{msg.text}</div>}
    </form>
  );
}
