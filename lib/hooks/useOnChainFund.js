"use client";

import { useRef, useState } from "react";
import { toStroops, remainingStroops } from "../stellar/amount.js";
import { submitFund } from "../stellar/fund.js";
import { connectFreighter, signWithFreighter, SignatureCancelled } from "../stellar/freighter.js";

export function useOnChainFund() {
  const [address, setAddress] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [state, setState] = useState({ phase: "", message: "", hash: "", kind: "neutral" });
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const uncertain = useRef(false);

  async function connect() {
    if (lock.current) return;
    lock.current = true;
    setConnecting(true);
    try {
      setAddress(await connectFreighter());
      setState({ phase: "", message: "Wallet connected.", hash: "", kind: "neutral" });
    } catch (error) {
      setAddress("");
      setState({ phase: "", message: error.message, hash: "", kind: error instanceof SignatureCancelled ? "neutral" : "err" });
    } finally { lock.current = false; setConnecting(false); }
  }

  async function fund(invoice, amount, refresh) {
    if (lock.current || uncertain.current) return;
    if (!address) {
      setState({ phase: "", message: "Connect Freighter before funding.", hash: "", kind: "neutral" });
      return;
    }
    lock.current = true;
    setBusy(true);
    setState({ phase: "", message: "", hash: "", kind: "neutral" });
    try {
      const amountStroops = toStroops(amount);
      if (amountStroops <= 0n) throw new Error("Enter a positive amount.");
      if (amountStroops > remainingStroops(invoice)) throw new Error("Amount exceeds this invoice's remaining capacity.");
      const result = await submitFund({ investor: address, amountStroops, sign: signWithFreighter,
        onStatus: (phase) => setState({ phase, message: "", hash: "", kind: "neutral" }) });
      if (result.status === "SUCCESS") {
        setState({ phase: "Confirmed", message: "Funding confirmed.", hash: result.hash, kind: "ok" });
        try { await refresh(); } catch {
          setState({ phase: "Confirmed", message: "Funding confirmed. Invoice refresh failed; reload to update its balance.", hash: result.hash, kind: "ok" });
        }
      } else if (result.status === "TIMEOUT") {
        uncertain.current = true;
        setState({ phase: "Pending confirmation", message: "Confirmation timed out. Check this transaction in the explorer before making another contribution.", hash: result.hash, kind: "neutral" });
      } else {
        setState({ phase: "Failed", message: "The transaction failed on-chain.", hash: result.hash, kind: "err" });
      }
      return result;
    } catch (error) {
      const cancelled = error instanceof SignatureCancelled;
      setState({ phase: cancelled ? "" : "Failed", message: cancelled ? "Signature cancelled" : error.message || "Funding failed.", hash: "", kind: cancelled ? "neutral" : "err" });
    } finally { lock.current = false; setBusy(false); }
  }

  return { address, connecting, connect, fund, busy, state, pending: uncertain.current };
}
