"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toStroops, remainingStroops } from "../stellar/amount.js";
import { prepareFund, signAndSubmit } from "../stellar/fund.js";
import { connectFreighter, signWithFreighter, SignatureCancelled } from "../stellar/freighter.js";
import { submitFund } from "../stellar/fund.js";
import { connectFreighter, getNetworkName, signWithFreighter, SignatureCancelled } from "../stellar/freighter.js";
import { assertWalletNetwork, NetworkMismatchError } from "../stellar/networkGuard.js";
import { CONFIGURED_NETWORK } from "../stellar/networks.js";
import { useTxTracker } from "../../components/TxTrackerProvider.jsx";
import { CONTRACT_ID } from "../config.js";
import { parseContractError } from "../escrow/errors.js";
import { extractSimError } from "../stellar/rpc.js";

function getMappedSimError(error) {
  if (!error) return "Simulation failed.";
  const raw = error?.message || String(error);
  const parsed = parseContractError(raw);
  if (parsed?.message) return parsed.message;
  return extractSimError(raw) || raw;
}

export function useOnChainFund(invoiceId, refreshInvoice) {
  const [address, setAddress] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [state, setState] = useState({ phase: "", message: "", hash: "", kind: "neutral" });
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);
  const lock = useRef(false);
  const trackedHash = useRef("");
  const resolvedHashes = useRef(new Set());
  const tracker = useTxTracker();
  const invoiceTransactions = useMemo(
    () => tracker.transactions.filter((tx) => tx.invoiceId === invoiceId),
    [invoiceId, tracker.transactions],
  );
  const pendingTransaction = invoiceTransactions.find((tx) => tx.status === "PENDING");

  useEffect(() => {
    const pending = invoiceTransactions.find((tx) => tx.status === "PENDING");
    if (pending) {
      trackedHash.current = pending.hash;
      return;
    }

    const resolved = invoiceTransactions.find(
      (tx) => tx.hash === trackedHash.current && (tx.status === "SUCCESS" || tx.status === "FAILED"),
    );
    if (!resolved || resolvedHashes.current.has(resolved.hash)) return;
    resolvedHashes.current.add(resolved.hash);
    const resolvedState = {
      phase: resolved.status === "SUCCESS" ? "Confirmed" : "Failed",
      message: resolved.status === "SUCCESS" ? "Funding confirmed." : "The transaction failed on-chain.",
      hash: resolved.hash,
      kind: resolved.status === "SUCCESS" ? "ok" : "err",
    };
    async function refreshResolvedInvoice() {
      try {
        await refreshInvoice();
      } catch (error) {
        console.error("Invoice refresh failed after transaction resolution.", error);
        if (resolved.status === "SUCCESS") {
          resolvedState.message = "Funding confirmed. Invoice refresh failed; reload to update its balance.";
        }
      }
      setState(resolvedState);
    }
    void refreshResolvedInvoice();
  }, [invoiceId, invoiceTransactions, refreshInvoice]);

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
    } finally {
      lock.current = false;
      setConnecting(false);
    }
  }

  /**
   * Prepares and simulates the funding transaction, opening the review dialog on success.
   * On simulation failure, skips the review dialog and surfaces the mapped error.
   */
  async function prepare(invoice, amount, refresh) {
    if (lock.current || uncertain.current) return null;
    if (lock.current || tracker.hasPendingFor(invoiceId)) return;
    if (!address) {
      setState({ phase: "", message: "Connect Freighter before funding.", hash: "", kind: "neutral" });
      return null;
    }
    lock.current = true;
    setBusy(true);
    setState({ phase: "Preparing", message: "", hash: "", kind: "neutral" });
    try {
      await assertWalletNetwork({ getNetwork: getNetworkName, expected: CONFIGURED_NETWORK });
      const amountStroops = toStroops(amount);
      if (amountStroops <= 0n) throw new Error("Enter a positive amount.");
      if (amountStroops > remainingStroops(invoice)) throw new Error("Amount exceeds this invoice's remaining capacity.");
      const contractId = invoice.contractId || CONTRACT_ID;
      const preparedData = await prepareFund({
        contractId,
        investor: address,
        amountStroops,
        onStatus: (phase) => setState({ phase, message: "", hash: "", kind: "neutral" }),
      });
      const reviewData = {
        ...preparedData,
        amount,
        currency: invoice.currency || "USDC",
        escrow: contractId,
        network: CONFIGURED_NETWORK,
        invoice,
        refresh,
      };
      setReview(reviewData);
      setBusy(false);
      return reviewData;
    } catch (error) {
      const mapped = error instanceof NetworkMismatchError
        ? `Network mismatch: expected ${error.expected}, actual ${error.actual ?? "unknown"}. Switch Freighter and retry.`
        : getMappedSimError(error);
      setState({
        phase: "Failed",
        message: mapped,
        hash: "",
        kind: "err",
      });
      setReview(null);
      setBusy(false);
      lock.current = false;
      return null;
    }
  }

  /**
   * Called when user confirms review. Opens the wallet to sign and submits the transaction.
   */
  async function confirm(onSuccess) {
    if (!review) return null;
    const currentReview = review;
    setReview(null);
    setBusy(true);
    try {
      const result = await signAndSubmit({
        prepared: currentReview.prepared,
        investor: address,
        sign: signWithFreighter,
        onStatus: (phase) => setState({ phase, message: "", hash: "", kind: "neutral" }),
      });
      if (result.status === "SUCCESS") {
        setState({ phase: "Confirmed", message: "Funding confirmed.", hash: result.hash, kind: "ok" });
        const refreshFn = onSuccess || currentReview.refresh;
        if (refreshFn) {
          try {
            await refreshFn(result);
          } catch {
            setState({ phase: "Confirmed", message: "Funding confirmed. Invoice refresh failed; reload to update its balance.", hash: result.hash, kind: "ok" });
          }
        }
      } else if (result.status === "TIMEOUT") {
        trackedHash.current = result.hash;
        setState({ phase: "Pending confirmation", message: "Confirmation timed out. Check this transaction in the explorer before making another contribution.", hash: result.hash, kind: "neutral" });
        void tracker.track(result.hash, { label: `Funding ${invoiceId}`, invoiceId });
      } else {
        setState({ phase: "Failed", message: "The transaction failed on-chain.", hash: result.hash, kind: "err" });
      }
      return result;
    } catch (error) {
      const cancelled = error instanceof SignatureCancelled;
      setState({
        phase: cancelled ? "" : "Failed",
        message: error instanceof NetworkMismatchError
          ? `Network mismatch: expected ${error.expected}, actual ${error.actual ?? "unknown"}. Switch Freighter and retry.`
          : cancelled
            ? "Signature cancelled"
            : error.message || "Funding failed.",
        hash: "",
        kind: cancelled ? "neutral" : "err",
      });
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  /**
   * Cancels transaction review without opening the wallet or calling signer.
   */
  function cancel() {
    setReview(null);
    setBusy(false);
    lock.current = false;
    setState({ phase: "", message: "", hash: "", kind: "neutral" });
  }

  /**
   * Backward-compatible direct fund execution (prepares and confirms).
   */
  async function fund(invoice, amount, refresh) {
    const preparedData = await prepare(invoice, amount, refresh);
    if (!preparedData) return null;
    return confirm();
  }

  return { address, connecting, connect, prepare, confirm, cancel, fund, review, busy, state, pending: uncertain.current };
  const pending = tracker.hasPendingFor(invoiceId);
  const displayedState = pendingTransaction ? {
      phase: "Pending confirmation",
      message: "Confirmation timed out. Check this transaction in the explorer before making another contribution.",
      hash: pendingTransaction.hash,
      kind: "neutral",
    } : state;
  return { address, connecting, connect, fund, busy, state: displayedState, pending };
}
