"use client";

import { useEffect, useRef } from "react";
import { shortAddress } from "@/lib/format";

const STROOPS_PER_UNIT = 10_000_000n;

function formatStroops(value) {
  const whole = value / STROOPS_PER_UNIT;
  const fraction = value % STROOPS_PER_UNIT;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(7, "0").replace(/0+$/, "")}`;
}

function operationAmount(operation, asset) {
  if (!operation?.args) return null;
  const amount = operation.args.find((arg) => typeof arg === "bigint");
  if (amount === undefined) return null;
  return `${formatStroops(amount)} ${asset}`;
}

function formatExpiry(timeBounds) {
  if (!timeBounds || String(timeBounds.maxTime) === "0") return "No expiry";
  return new Date(Number(timeBounds.maxTime) * 1000).toISOString();
}

export default function TxReviewDialog({
  asset = "XLM",
  description,
  error,
  onCancel,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    if (typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    cancelRef.current?.focus();

    return () => {
      if (dialog.open && typeof dialog.close === "function") {
        dialog.close();
      }
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const operation = description?.operations?.find(
    (candidate) => candidate.type === "invokeContract",
  );
  const amount = operationAmount(operation, asset);
  const mismatch = Boolean(error) || !description;
  const explorerNetwork = description?.network === "public" ? "public" : "testnet";
  const contractUrl = operation
    ? `https://stellar.expert/explorer/${explorerNetwork}/contract/${operation.contractId}`
    : null;

  return (
    <dialog
      ref={dialogRef}
      className="tx-review"
      aria-modal="true"
      aria-labelledby="tx-review-title"
      aria-describedby="tx-review-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={handleKeyDown}
    >
      <h2 id="tx-review-title" className="tx-review__title">Review transaction</h2>

      {mismatch ? (
        <div id="tx-review-description" className="tx-review__blocker" role="alert">
          <strong>This transaction does not match your intent.</strong>
          {description ? (
            <ul>
              {error.differences?.map((difference) => (
                <li key={difference}>{difference}</li>
              ))}
              {!error.differences && <li>{error.message}</li>}
            </ul>
          ) : (
            <p>{error?.message || "Unable to decode the transaction."}</p>
          )}
        </div>
      ) : (
        <p id="tx-review-description" className="tx-review__intro">
          Check the contract, function and amount before opening Freighter.
        </p>
      )}

      {description && (
        <dl className="tx-review__rows">
          <div><dt>Network</dt><dd>{description.network}</dd></div>
          <div>
            <dt>Contract</dt>
            <dd>
              {operation ? (
                <a href={contractUrl} target="_blank" rel="noreferrer">
                  <span className="mono">{shortAddress(operation.contractId, 8)}</span>
                </a>
              ) : "—"}
            </dd>
          </div>
          <div><dt>Action</dt><dd>{operation?.fn || "—"}</dd></div>
          <div><dt>Amount</dt><dd>{amount || "—"}</dd></div>
          <div><dt>Max fee</dt><dd>{description.fee} XLM</dd></div>
          <div><dt>Expires</dt><dd>{formatExpiry(description.timeBounds)}</dd></div>
        </dl>
      )}

      <div className="tx-review__actions">
        <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={mismatch}
          onClick={onConfirm}
        >
          Sign in Freighter
        </button>
      </div>
    </dialog>
  );
}
