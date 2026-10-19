"use client";

import { useCallback, useEffect, useState } from "react";
import { loadClaimState, deriveClaimUi, submitClaim, formatStroops } from "@/lib/escrow/claim";
import { connectWallet, signWithFreighter, UserRejectedError } from "@/lib/stellar/freighter";
import { EXPLORER_TX_URL } from "@/lib/config";

function countdown(seconds) {
  const s = Math.max(0, seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export default function ClaimPanel({ currency = "USDC" }) {
  const [address, setAddress] = useState(null);
  const [ui, setUi] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | loading | submitting
  const [msg, setMsg] = useState(null);
  const [hash, setHash] = useState(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const refresh = useCallback(async (addr) => {
    setPhase("loading");
    try {
      const state = await loadClaimState(addr);
      setUi(deriveClaimUi(state, Math.floor(Date.now() / 1000)));
      setMsg(null);
    } catch (err) {
      setMsg({ kind: "err", text: err.message || "Could not load your payout." });
    } finally {
      setPhase("idle");
    }
  }, []);

  useEffect(() => {
    if (ui?.kind !== "locked") return undefined;
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, [ui?.kind]);

  async function onConnect() {
    setMsg(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      await refresh(addr);
    } catch (err) {
      setMsg(err instanceof UserRejectedError ? null : { kind: "err", text: err.message || "Could not connect wallet." });
    }
  }

  async function onClaim() {
    if (phase === "submitting" || ui?.kind !== "claimable") return;
    setPhase("submitting");
    setMsg(null);
    try {
      const res = await submitClaim(address, { sign: signWithFreighter });
      setHash(res.hash);
      await refresh(address);
      setMsg({ kind: "ok", text: "Payout claimed." });
    } catch (err) {
      setPhase("idle");
      if (err instanceof UserRejectedError) return; // back to idle silently
      setMsg({ kind: "err", text: err.message || "Claim failed." });
    }
  }

  let body;
  if (!address) {
    body = (
      <>
        <p className="muted">Connect your wallet to see your payout</p>
        <button type="button" className="btn btn-primary" onClick={onConnect}>Connect wallet</button>
      </>
    );
  } else if (!ui) {
    body = <p className="muted">{phase === "loading" ? "Loading your payout…" : "Payout unavailable."}</p>;
  } else {
    const amount = `${formatStroops(ui.amount)} ${currency}`;
    const copy = {
      "not-settled": ui.reason,
      nothing: "Nothing to claim",
      claimed: `Already claimed${ui.amount > 0n ? ` (${amount})` : ""}`,
      locked: `Claimable payout: ${amount}. Unlocks in ${countdown(ui.unlockAt - now)}.`,
      blocked: `Claimable payout: ${amount}. ${ui.reason}`,
      claimable: `Claimable payout: ${amount}`,
    }[ui.kind];
    body = (
      <>
        <p>{copy}</p>
        {ui.kind === "claimable" && (
          <button type="button" className="btn btn-primary" onClick={onClaim} disabled={phase === "submitting"} aria-busy={phase === "submitting"}>
            {phase === "submitting" ? "Confirm in wallet…" : "Claim payout"}
          </button>
        )}
      </>
    );
  }

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 12, overflowWrap: "anywhere" }}>
      {body}
      <div role="status" aria-live="polite">
        {msg && <div className={`notice notice-${msg.kind}`}>{msg.text}</div>}
        {hash && (
          <p style={{ marginTop: 8 }}>
            <a href={`${EXPLORER_TX_URL}${hash}`} target="_blank" rel="noopener noreferrer">View transaction</a>{" "}
            <span className="mono">{hash.slice(0, 8)}…</span>
          </p>
        )}
      </div>
    </div>
  );
}
