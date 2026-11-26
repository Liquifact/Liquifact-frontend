"use client";

import { useEffect, useRef } from "react";
import { formatStroops } from "@/lib/stellar/amount";
import { shortAddress } from "@/lib/format";

/**
 * Dialog displaying simulation results (amount, escrow contract short id,
 * estimated fee in XLM, and network) before the user opens the wallet to sign.
 */
export default function TxReview({
  open = true,
  amount,
  currency = "USDC",
  escrow,
  fee,
  network = "testnet",
  onConfirm,
  onCancel,
  busy = false,
}) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelBtnRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onCancel?.();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const displayAmount = currency && !String(amount).includes(currency)
    ? `${amount} ${currency}`
    : String(amount);

  const displayEscrow = shortAddress(escrow, 8);
  const displayFee = typeof fee === "string" && fee.includes("XLM")
    ? fee
    : formatStroops(fee ?? "100", "XLM");

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-review-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="card tx-review-dialog"
        style={{
          maxWidth: "440px",
          width: "100%",
          padding: "24px",
          background: "var(--surface, #1e2230)",
          border: "1px solid var(--border, #333a50)",
          borderRadius: "var(--radius, 12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <h3 id="tx-review-title" style={{ marginTop: 0, marginBottom: "8px" }}>
          Review Transaction
        </h3>
        <p className="muted" style={{ marginBottom: "20px", fontSize: "0.9rem" }}>
          Review the transaction parameters before opening Freighter to sign.
        </p>

        <dl
          className="tx-review-details"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            rowGap: "12px",
            marginBottom: "24px",
            fontSize: "0.95rem",
          }}
        >
          <dt className="muted">Amount</dt>
          <dd style={{ margin: 0, fontWeight: 600, textAlign: "right" }} data-testid="review-amount">
            {displayAmount}
          </dd>

          <dt className="muted">Destination Escrow</dt>
          <dd style={{ margin: 0, fontFamily: "monospace", textAlign: "right" }} data-testid="review-escrow" title={escrow}>
            {displayEscrow}
          </dd>

          <dt className="muted">Estimated Fee</dt>
          <dd style={{ margin: 0, fontWeight: 600, textAlign: "right" }} data-testid="review-fee">
            {displayFee}
          </dd>

          <dt className="muted">Network</dt>
          <dd style={{ margin: 0, textAlign: "right", textTransform: "capitalize" }} data-testid="review-network">
            {network}
          </dd>
        </dl>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Signing…" : "Confirm & Sign"}
          </button>
        </div>
      </div>
    </div>
  );
}
