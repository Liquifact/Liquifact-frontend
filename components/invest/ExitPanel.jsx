/**
 * ExitPanel — renders the investor exit actions for on-chain invoices.
 *
 * Mount it inside the right-hand card in InvoiceDetail.jsx, below the fund form,
 * when inv.onChain is true and a wallet is connected.
 *
 * Props:
 *   investorAddress  string   - Connected wallet's full G-address
 *   invoiceStatus    string   - Escrow status from the API record ("open"|"cancelled"|…)
 *   onContribRefresh function - Called after a successful action so the parent
 *                               can re-fetch the invoice
 */
"use client";

import { useCallback, useEffect, useId, useReducer, useRef } from "react";
import {
  fetchContribution,
  fetchIsRefunded,
  fetchLegalHold,
  fetchIsPaused,
  buildSignSubmit,
  buildRefundArgs,
  buildUnfundArgs,
  extractSimError,
} from "../../lib/stellar/rpc.js";
import {
  deriveExitUi,
  parseStroops,
  formatStroops,
} from "../../lib/invest/deriveExitUi.js";

// ── Status-string → escrow integer (API record uses strings; contract uses ints)
const STATUS_MAP = { open: 0, funded: 1, settled: 2, withdrawn: 3, cancelled: 4 };

function toStatusInt(s) {
  return STATUS_MAP[s] ?? -1;
}

// ── Reducer ──────────────────────────────────────────────────────────────────
const INITIAL = {
  loading: true,
  contribution: 0n,
  refunded: false,
  legalHold: false,
  paused: false,
  // unfund form
  amountInput: "",
  amountError: null,
  confirming: false,
  // async op
  busy: false,
  busyMsg: "",
  successMsg: null,
  errorMsg: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "LOADED":
      return {
        ...state,
        loading: false,
        busy: false,
        busyMsg: "",
        contribution: action.contribution,
        refunded: action.refunded,
        legalHold: action.legalHold,
        paused: action.paused,
        successMsg: null,
        errorMsg: null,
      };
    case "REFRESH_CONTRIBUTION":
      return { ...state, contribution: action.contribution, refunded: action.refunded };
    case "INPUT":
      return { ...state, amountInput: action.value, amountError: null, errorMsg: null };
    case "INPUT_ERR":
      return { ...state, amountError: action.error };
    case "SHOW_CONFIRM":
      return { ...state, confirming: true, errorMsg: null };
    case "HIDE_CONFIRM":
      return { ...state, confirming: false };
    case "BUSY":
      return { ...state, busy: true, busyMsg: action.msg, errorMsg: null, successMsg: null };
    case "STATUS_MSG":
      return { ...state, busyMsg: action.msg };
    case "SUCCESS":
      return {
        ...state,
        busy: false,
        busyMsg: "",
        confirming: false,
        successMsg: action.msg,
        errorMsg: null,
        amountInput: "",
        amountError: null,
      };
    case "ERROR":
      return {
        ...state,
        busy: false,
        busyMsg: "",
        confirming: false,
        errorMsg: action.msg,
        successMsg: null,
      };
    default:
      return state;
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ExitPanel({ investorAddress, invoiceStatus, onContribRefresh }) {
  const [s, dispatch] = useReducer(reducer, INITIAL);
  const uid = useId();
  const dialogRef = useRef(null);
  const firstFocusRef = useRef(null);
  const amountInputRef = useRef(null);

  // Derive UI mode from on-chain state
  const statusInt = toStatusInt(invoiceStatus);
  const ui = deriveExitUi({
    status: statusInt,
    contribution: s.contribution,
    refunded: s.refunded,
    legalHold: s.legalHold,
    paused: s.paused,
  });

  // ── Load on-chain state ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    dispatch({ type: "BUSY", msg: "Reading your on-chain position…" });
    try {
      const [contribution, refunded, legalHold, paused] = await Promise.all([
        fetchContribution(investorAddress),
        fetchIsRefunded(investorAddress),
        fetchLegalHold(investorAddress),
        fetchIsPaused(investorAddress),
      ]);
      dispatch({ type: "LOADED", contribution, refunded, legalHold, paused });
    } catch (e) {
      dispatch({
        type: "ERROR",
        msg: "Could not read on-chain position: " + (e?.message || "unknown error"),
      });
      dispatch({ type: "LOADED", contribution: 0n, refunded: false, legalHold: false, paused: false });
    }
  }, [investorAddress]);

  useEffect(() => {
    if (investorAddress) load();
  }, [investorAddress, invoiceStatus, load]);

  // ── Dialog open/close with focus trap & Escape ──────────────────────────
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (s.confirming) {
      dialog.showModal?.();
      firstFocusRef.current?.focus();
    } else {
      dialog.close?.();
    }
  }, [s.confirming]);

  // Close on Escape (dialog element handles it natively; also cover non-dialog fallback)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && s.confirming) {
        dispatch({ type: "HIDE_CONFIRM" });
        amountInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.confirming]);

  // ── Refund handler ──────────────────────────────────────────────────────
  async function onRefund() {
    dispatch({ type: "BUSY", msg: "Preparing refund…" });
    try {
      await buildSignSubmit(
        "refund",
        buildRefundArgs(investorAddress),
        investorAddress,
        (msg) => dispatch({ type: "STATUS_MSG", msg })
      );
      const newContrib = await fetchContribution(investorAddress);
      const newRefunded = await fetchIsRefunded(investorAddress);
      dispatch({ type: "REFRESH_CONTRIBUTION", contribution: newContrib, refunded: newRefunded });
      dispatch({ type: "SUCCESS", msg: "Refund successful — your contribution has been returned." });
      onContribRefresh?.();
    } catch (e) {
      if (e?.userCancelled) {
        dispatch({ type: "ERROR", msg: null }); // silent cancel
        dispatch({ type: "LOADED", contribution: s.contribution, refunded: s.refunded, legalHold: s.legalHold, paused: s.paused });
        return;
      }
      dispatch({
        type: "ERROR",
        msg: extractSimError(e?.simulationError) || e?.message || "Refund failed.",
      });
    }
  }

  // ── Unfund validation & confirm ─────────────────────────────────────────
  function onAmountChange(e) {
    dispatch({ type: "INPUT", value: e.target.value });
  }

  function onUnfundSubmit(e) {
    e.preventDefault();
    const result = parseStroops(s.amountInput, s.contribution);
    if (result.error) {
      dispatch({ type: "INPUT_ERR", error: result.error });
      return;
    }
    dispatch({ type: "SHOW_CONFIRM" });
  }

  function onSetMax() {
    dispatch({ type: "INPUT", value: formatStroops(s.contribution) });
    amountInputRef.current?.focus();
  }

  // ── Unfund execution (called from confirmation dialog) ──────────────────
  async function onUnfundConfirm() {
    const result = parseStroops(s.amountInput, s.contribution);
    if (result.error) {
      dispatch({ type: "ERROR", msg: result.error });
      return;
    }
    dispatch({ type: "BUSY", msg: "Preparing withdrawal…" });
    try {
      await buildSignSubmit(
        "unfund",
        buildUnfundArgs(investorAddress, result.stroops),
        investorAddress,
        (msg) => dispatch({ type: "STATUS_MSG", msg })
      );
      const newContrib = await fetchContribution(investorAddress);
      dispatch({ type: "REFRESH_CONTRIBUTION", contribution: newContrib, refunded: false });
      dispatch({
        type: "SUCCESS",
        msg: `Withdrawal successful — ${formatStroops(result.stroops)} XLM returned to your wallet.`,
      });
      onContribRefresh?.();
    } catch (e) {
      if (e?.userCancelled) {
        dispatch({ type: "HIDE_CONFIRM" });
        return;
      }
      dispatch({
        type: "ERROR",
        msg: extractSimError(e?.simulationError) || e?.message || "Withdrawal failed.",
      });
    }
  }

  // ── Render guards ────────────────────────────────────────────────────────
  if (s.loading && s.busy) {
    return (
      <div className="exit-panel" aria-busy="true">
        <p className="muted" style={{ fontSize: "0.88rem" }}>{s.busyMsg}</p>
      </div>
    );
  }

  if (ui.mode === "none" && !ui.reason) return null;

  const titleId = `${uid}-title`;
  const statusId = `${uid}-status`;
  const amountDescId = `${uid}-amount-desc`;
  const amountErrId = `${uid}-amount-err`;
  const dialogTitleId = `${uid}-dialog-title`;

  return (
    <section className="exit-panel" aria-labelledby={titleId}>
      <h3 id={titleId} className="exit-panel-heading">
        {ui.mode === "refund" ? "Request refund" : ui.mode === "unfund" ? "Withdraw contribution" : "Exit position"}
      </h3>

      {/* Blocked / none with reason */}
      {ui.mode === "none" && ui.reason && (
        <p className="muted exit-panel-reason">{ui.reason}</p>
      )}

      {/* Refund mode */}
      {ui.mode === "refund" && (
        <>
          <p className="exit-panel-summary">
            Your contribution of <strong>{formatStroops(ui.maxStroops)} XLM</strong> is
            eligible for a refund — this escrow was cancelled.
          </p>
          <button
            id={`${uid}-refund-btn`}
            className="btn btn-primary"
            onClick={onRefund}
            disabled={s.busy}
            aria-describedby={statusId}
          >
            {s.busy ? s.busyMsg || "Working…" : "Request refund"}
          </button>
        </>
      )}

      {/* Unfund mode */}
      {ui.mode === "unfund" && (
        <>
          <p className="exit-panel-summary">
            Your contribution: <strong>{formatStroops(s.contribution)} XLM</strong>
          </p>
          <form className="form exit-panel-form" onSubmit={onUnfundSubmit} noValidate>
            <div className="field">
              <label htmlFor={`${uid}-amount`}>Amount to withdraw (XLM)</label>
              <div className="exit-amount-row">
                <input
                  ref={amountInputRef}
                  id={`${uid}-amount`}
                  type="text"
                  inputMode="decimal"
                  value={s.amountInput}
                  onChange={onAmountChange}
                  placeholder={`up to ${formatStroops(s.contribution)}`}
                  aria-describedby={`${amountDescId}${s.amountError ? ` ${amountErrId}` : ""}`}
                  aria-invalid={!!s.amountError}
                  disabled={s.busy}
                />
                <button
                  type="button"
                  className="btn btn-ghost exit-max-btn"
                  onClick={onSetMax}
                  disabled={s.busy}
                  aria-label="Set amount to maximum contribution"
                >
                  Max
                </button>
              </div>
              <span id={amountDescId} className="hint">
                Withdrawing removes your place in this deal and is irreversible.
              </span>
              {s.amountError && (
                <span id={amountErrId} className="err" role="alert">
                  {s.amountError}
                </span>
              )}
            </div>
            <button
              id={`${uid}-withdraw-btn`}
              className="btn btn-primary"
              type="submit"
              disabled={s.busy}
              aria-describedby={statusId}
            >
              {s.busy ? s.busyMsg || "Working…" : "Withdraw contribution"}
            </button>
          </form>
        </>
      )}

      {/* Async status / success / error */}
      <div
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="exit-panel-live"
      >
        {s.successMsg && (
          <div className="notice notice-ok" style={{ marginTop: 12 }}>
            {s.successMsg}
          </div>
        )}
        {s.errorMsg && (
          <div className="notice notice-err" role="alert" style={{ marginTop: 12 }}>
            {s.errorMsg}
          </div>
        )}
        {s.busy && !s.successMsg && !s.errorMsg && (
          <p className="muted" style={{ fontSize: "0.88rem", marginTop: 8 }}>
            {s.busyMsg}
          </p>
        )}
      </div>

      {/* Confirmation dialog */}
      {ui.mode === "unfund" && (
        <dialog
          ref={dialogRef}
          className="exit-confirm-dialog"
          aria-labelledby={dialogTitleId}
          onCancel={(e) => { e.preventDefault(); dispatch({ type: "HIDE_CONFIRM" }); amountInputRef.current?.focus(); }}
        >
          <h4 id={dialogTitleId}>Confirm withdrawal</h4>
          <p>
            You will withdraw{" "}
            <strong>
              {parseStroops(s.amountInput, s.contribution).stroops != null
                ? formatStroops(parseStroops(s.amountInput, s.contribution).stroops)
                : s.amountInput}{" "}
              XLM
            </strong>{" "}
            and lose your place in this deal. This action cannot be undone.
          </p>
          <div className="exit-confirm-actions">
            <button
              ref={firstFocusRef}
              id={`${uid}-confirm-yes`}
              className="btn btn-primary"
              onClick={onUnfundConfirm}
              disabled={s.busy}
            >
              {s.busy ? "Working…" : "Yes, withdraw"}
            </button>
            <button
              id={`${uid}-confirm-cancel`}
              className="btn btn-ghost"
              onClick={() => { dispatch({ type: "HIDE_CONFIRM" }); amountInputRef.current?.focus(); }}
              disabled={s.busy}
            >
              Cancel
            </button>
          </div>
        </dialog>
      )}
    </section>
  );
}
