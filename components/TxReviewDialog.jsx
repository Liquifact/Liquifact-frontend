"use client";

import { useEffect, useRef, useState } from "react";

import { reviewTransactionXdr } from "@/lib/stellar/txReview";

/**
 * Explicit transaction review before any Freighter signature.
 *
 * The dialog decodes the prepared XDR, shows the contract/function/arguments
 * and network in the app's own words, and compares them with the caller's
 * intent. "Confirm and sign" stays disabled unless the transaction is a single
 * contract call matching that intent.
 */
export default function TxReviewDialog({
  open,
  xdr,
  intent,
  network = "testnet",
  onConfirm,
  onCancel,
}) {
  const [review, setReview] = useState(null);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setReview(null);
      setError(null);
      return;
    }
    try {
      setReview(reviewTransactionXdr(xdr, { intent, network }));
      setError(null);
    } catch (err) {
      setReview(null);
      setError(err?.message || "The transaction could not be read.");
    }
  }, [open, xdr, intent, network]);

  useEffect(() => {
    if (!open) return undefined;
    dialogRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") onCancel?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const verified = Boolean(review?.verification?.ok);
  const summary = review?.summary;

  return (
    <div
      style={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-review-title"
        tabIndex={-1}
        className="card"
        style={styles.dialog}
      >
        <h2 id="tx-review-title" style={{ marginTop: 0 }}>Review transaction</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Check these details before Freighter opens. The wallet will show raw XDR; this is the
          action you are authorising.
        </p>

        {error && (
          <div className="notice notice-err" role="alert">{error}</div>
        )}

        {summary && (
          <div className="kv" style={{ marginTop: 14 }}>
            <div><span className="k">Network</span>{summary.network}</div>
            <div><span className="k">Fee (stroops)</span>{summary.fee}</div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span className="k">Source account</span>
              <span className="mono">{summary.source}</span>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span className="k">Operations</span>{summary.operations.length}
            </div>
            {summary.operations.map((operation, index) => (
              <div key={index} style={{ gridColumn: "1 / -1" }}>
                <span className="k">Operation {index + 1}</span>
                {operation.kind === "contract_call" ? (
                  <div>
                    <div className="mono" style={{ wordBreak: "break-all" }}>
                      {operation.contractId}
                    </div>
                    <div>
                      <strong>{operation.functionName}</strong>(
                      {operation.args.map(String).join(", ")})
                    </div>
                  </div>
                ) : operation.kind === "payment" ? (
                  <div>
                    Payment of {String(operation.amount)} to{" "}
                    <span className="mono">{operation.destination}</span> ({operation.asset})
                  </div>
                ) : (
                  <div>{operation.kind}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {review && verified && (
          <div className="notice notice-ok" role="status" style={{ marginTop: 14 }}>
            The transaction matches the requested action.
          </div>
        )}
        {review && !verified && (
          <div className="notice notice-err" role="alert" style={{ marginTop: 14 }}>
            <strong>This transaction does not match the action you requested.</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {review.verification.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!verified}
            onClick={() => verified && onConfirm?.(review)}
          >
            Confirm and sign
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: "rgba(0, 0, 0, 0.55)",
  },
  dialog: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "90vh",
    overflowY: "auto",
    padding: 22,
  },
};
