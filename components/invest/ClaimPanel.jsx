/**
 * ClaimPanel — lets an investor claim principal plus yield on a settled
 * on-chain escrow via `claim_investor_payout` (#1367).
 *
 * Rendered by InvoiceDetail.jsx in place of the "no longer accepts
 * contributions" text for on-chain invoices whose status is `settled`.
 * The amount shown is the contract's own `get_claimable_payout`; it is never
 * recomputed here.
 *
 * Props:
 *   investorAddress string  - connected Freighter address (G...); the only
 *                             value ever passed as `investor`
 *   currency        string  - display currency code
 *   loadState / submitClaim / now - injectable for tests
 */
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { buildClaimArgs, deriveClaimUi, formatCountdown, loadClaimState } from "../../lib/escrow/claim.js";
import { buildSignSubmit, extractSimError } from "../../lib/stellar/rpc.js";
import { formatStroops } from "../../lib/stellar/amount.js";
import { NETWORK } from "../../lib/config.js";

const nowSeconds = () => Math.floor(Date.now() / 1000);

function defaultSubmitClaim(investor, onStatus) {
  return buildSignSubmit("claim_investor_payout", buildClaimArgs(investor), investor, onStatus);
}

export default function ClaimPanel({
  investorAddress,
  currency = "XLM",
  loadState = loadClaimState,
  submitClaim = defaultSubmitClaim,
  now = nowSeconds,
}) {
  const titleId = useId();
  const statusId = useId();
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busyMsg, setBusyMsg] = useState("");
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [clock, setClock] = useState(now);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      setState(await loadState(investorAddress));
      setLoadError(null);
    } catch (e) {
      setLoadError("Could not read your payout: " + (e?.message || "unknown error"));
    }
  }, [investorAddress, loadState]);

  useEffect(() => {
    if (investorAddress) load();
  }, [investorAddress, load]);

  const ui = state ? deriveClaimUi(state, clock) : null;

  // Tick the countdown while locked, and flip to claimable at the boundary.
  useEffect(() => {
    if (ui?.kind !== "locked") return undefined;
    const timer = setInterval(() => setClock(now()), 1000);
    return () => clearInterval(timer);
  }, [ui?.kind, now]);

  async function onClaim() {
    if (inFlight.current) return; // prevent double submission
    inFlight.current = true;
    setError(null);
    setTxHash(null);
    setBusyMsg("Preparing claim…");
    try {
      const result = await submitClaim(investorAddress, setBusyMsg);
      setTxHash(result?.hash ?? null);
      setBusyMsg("Refreshing your payout…");
      await load();
    } catch (e) {
      // A rejected signature simply returns to idle.
      if (!e?.userCancelled) setError(extractSimError(e?.simulationError) || e?.message || "Claim failed");
    } finally {
      setBusyMsg("");
      inFlight.current = false;
    }
  }

  if (!investorAddress) {
    return <p className="muted exit-wallet-prompt">Connect your wallet to see your payout.</p>;
  }

  if (!state) {
    return (
      <div className="exit-panel" aria-busy={!loadError}>
        <p className={loadError ? "notice notice-err" : "muted"} role={loadError ? "alert" : undefined}>
          {loadError || "Reading your payout…"}
        </p>
      </div>
    );
  }

  const amount = formatStroops(ui.amount, currency);
  const busy = busyMsg !== "";

  return (
    <section className="exit-panel" aria-labelledby={titleId}>
      <h3 id={titleId} className="exit-panel-heading">
        Your payout
      </h3>

      {ui.kind === "claimable" && (
        <>
          <p className="exit-panel-summary">
            Claimable now: <strong>{amount}</strong>
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClaim}
            disabled={busy}
            aria-describedby={statusId}
          >
            {busy ? "Claiming…" : "Claim payout"}
          </button>
        </>
      )}
      {ui.kind === "claimed" && <p className="exit-panel-summary">Already claimed. Your payout has been sent to your wallet.</p>}
      {ui.kind === "nothing" && <p className="muted exit-panel-reason">Nothing to claim for this wallet.</p>}
      {ui.kind === "not-settled" && <p className="muted exit-panel-reason">This escrow has not settled yet.</p>}
      {ui.kind === "blocked" && (
        <>
          <p className="exit-panel-summary">
            Claimable: <strong>{amount}</strong>
          </p>
          <p className="muted exit-panel-reason">{ui.reason}</p>
        </>
      )}
      {ui.kind === "locked" && (
        <>
          <p className="exit-panel-summary">
            Claimable: <strong>{amount}</strong>
          </p>
          <p className="muted exit-panel-reason">
            Your commitment lock ends in <span data-testid="unlock-countdown">{formatCountdown(ui.unlockAt - clock)}</span>{" "}
            ({new Date(ui.unlockAt * 1000).toLocaleString()}).
          </p>
        </>
      )}

      <div id={statusId} role="status" aria-live="polite" aria-atomic="true" className="exit-panel-live">
        {busy && <p className="muted">{busyMsg}</p>}
        {txHash && (
          <div className="notice notice-ok" style={{ marginTop: 12 }}>
            Payout claimed.{" "}
            <a
              className="focus-ring tx-hash"
              href={`https://stellar.expert/explorer/${NETWORK}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View transaction: {txHash}
            </a>
          </div>
        )}
      </div>
      {error && (
        <div className="notice notice-err" role="alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </section>
  );
}
