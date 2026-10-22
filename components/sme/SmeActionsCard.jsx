"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { calculateNetWithdrawal, deriveSmeActions } from "@/lib/smeActions";
import { getPublicKey } from "@/lib/stellar/freighter";
import { readSmeEscrow, submitSmeAction } from "@/lib/stellar/soroban";

const STROOPS_PER_TOKEN = 10_000_000n;

function formatStroops(amount, currency) {
  const value = BigInt(amount);
  const whole = value / STROOPS_PER_TOKEN;
  const fraction = (value % STROOPS_PER_TOKEN)
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "");
  const formattedWhole = whole.toLocaleString("en-US");
  return `${formattedWhole}${fraction ? `.${fraction}` : ""} ${currency}`;
}

export default function SmeActionsCard({
  contractId,
  currency,
  onRefresh,
}) {
  const [wallet, setWallet] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(null);
  const dialogRef = useRef(null);

  const refresh = useCallback(async (source) => {
    const currentWallet = source || await getPublicKey();
    if (!currentWallet) {
      setWallet(null);
      setSnapshot(null);
      return;
    }
    setWallet(currentWallet);
    const result = await readSmeEscrow({ contractId, source: currentWallet });
    const fundedAmount = result.escrow.funded_amount ?? result.escrow.fundedAmount ?? 0;
    result.netWithdrawal = calculateNetWithdrawal(fundedAmount, result.protocolFeeBps);
    setSnapshot(result);
    setLoadError(null);
  }, [contractId]);

  useEffect(() => {
    let active = true;
    getPublicKey().then(async (key) => {
      if (!active || !key) return;
      try {
        await refresh(key);
      } catch (error) {
        if (active) setLoadError(error.message || "Could not load escrow readiness.");
      }
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !selectedAction || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, [selectedAction]);

  const actions = snapshot
    ? deriveSmeActions({
        escrow: snapshot.escrow,
        readiness: snapshot.readiness,
        connected: wallet,
      })
    : null;

  async function confirmAction() {
    if (!selectedAction || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const { hash } = await submitSmeAction({
        contractId,
        source: wallet,
        method: selectedAction,
      });
      setMessage({ kind: "ok", text: `Transaction confirmed: ${hash}` });
      setSelectedAction(null);
      if (dialogRef.current?.open) dialogRef.current.close();
      try {
        await refresh(wallet);
        await onRefresh?.();
      } catch (error) {
        setMessage({
          kind: "err",
          text: `Transaction confirmed, but escrow refresh failed: ${error.message || "unknown error"}`,
        });
      }
    } catch (error) {
      setMessage({
        kind: "err",
        text: error.message || "The transaction was rejected or failed.",
      });
    } finally {
      setPending(false);
    }
  }

  if (!actions?.isSme) return null;

  return (
    <section className="card sme-actions" aria-labelledby="sme-actions-title">
      <h3 id="sme-actions-title">SME actions</h3>
      {loadError && <p className="notice notice-err">{loadError}</p>}
      {snapshot && (
        <>
          <div className="sme-action">
            <h4>Withdraw liquidity</h4>
            <p>
              Funded amount:{" "}
              <strong>{formatStroops(
                snapshot.escrow.funded_amount ?? snapshot.escrow.fundedAmount ?? 0,
                currency,
              )}</strong>
            </p>
            <p className="muted">
              Protocol fee ({snapshot.protocolFeeBps} bps) is deducted. Estimated net:
              {" "}
              <strong>{formatStroops(snapshot.netWithdrawal, currency)}</strong>.
            </p>
            {!actions.withdraw.enabled && (
              <p className="muted" role="status">{actions.withdraw.reason}</p>
            )}
            <button
              className="btn btn-primary"
              type="button"
              disabled={!actions.withdraw.enabled || pending}
              onClick={() => {
                setSelectedAction("withdraw");
                setMessage(null);
              }}
            >
              Withdraw liquidity
            </button>
          </div>
          <div className="sme-action">
            <h4>Settle invoice</h4>
            {!actions.settle.enabled && (
              <ul className="sme-action-reasons">
                {actions.settle.reason
                  .split(". ")
                  .filter(Boolean)
                  .map((reason) => (
                    <li key={reason}>{reason.endsWith(".") ? reason : `${reason}.`}</li>
                  ))}
              </ul>
            )}
            <button
              className="btn btn-ghost"
              type="button"
              disabled={!actions.settle.enabled || pending}
              onClick={() => {
                setSelectedAction("settle");
                setMessage(null);
              }}
            >
              Settle invoice
            </button>
          </div>
        </>
      )}
      {message && (
        <p className={`notice notice-${message.kind}`} role="status" aria-live="polite">
          {message.text}
        </p>
      )}
      <dialog
        ref={dialogRef}
        className="sme-confirm-dialog"
        aria-labelledby="sme-confirm-title"
        onClose={() => setSelectedAction(null)}
      >
        <h3 id="sme-confirm-title">
          Confirm {selectedAction === "withdraw" ? "withdrawal" : "settlement"}
        </h3>
        {selectedAction === "withdraw" ? (
          <p>
            Withdraw the funded liquidity to the connected SME wallet. The
            protocol fee will be deducted before the net amount is transferred.
          </p>
        ) : (
          <p>
            Settling moves the settlement pool from the SME wallet into the
            escrow to repay investors. Continue only after the debtor has paid.
          </p>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={confirmAction}
          >
            {pending ? "Waiting for wallet…" : "Confirm and sign"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
        </div>
      </dialog>
    </section>
  );
}
