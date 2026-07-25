"use client";

/**
 * @file FundActions.jsx
 *
 * Client-only interactive controls for the invoice detail page.
 *
 * This is the **only** file under `app/invest/[id]/` that carries a
 * `"use client"` directive.  It owns:
 *   - Fund invoice button (wallet-state-aware, with optimistic status update)
 *   - Copy link button (Clipboard API + textarea fallback)
 *   - Print / Save PDF button
 *   - Disclaimer note
 *
 * Optimistic update strategy
 * ──────────────────────────
 * When the user submits the FundAmountInput form, `useOptimisticFund` flips
 * the displayed invoice status to "Funded" immediately.  If the server call
 * succeeds the update is committed; if it fails the status is rolled back and
 * an error toast is shown.  Concurrent submissions are blocked while a request
 * is in-flight.
 *
 * Everything else on the detail page (heading, metadata table, JSON-LD
 * script) is rendered by the Server Component shell in `page.js`.
 */

import { useCallback, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useWallet, WALLET_STATES } from "@/components/WalletContext";
import FundAmountInput from "@/components/FundAmountInput";
import StatusPill from "@/components/StatusPill";
import { copy } from "@/app/copy/en";
import { useOptimisticFund, FUNDING_STATES } from "@/lib/hooks/useOptimisticFund";

const detail = copy.invest.detail;

// ── Clipboard helpers ─────────────────────────────────────────────────────────

/**
 * Textarea-based clipboard fallback for browsers without the async
 * Clipboard API (non-HTTPS contexts, older Safari, etc.).
 *
 * @param {string} text
 */
export function copyToClipboardFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch {
    // execCommand may be unsupported or blocked; degrade gracefully rather
    // than surfacing an error — the textarea is still cleaned up below.
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Copy the canonical detail-page URL to the clipboard.
 *
 * @param {string} id - Invoice id
 * @returns {Promise<string>} The URL that was copied
 */
export async function copyInvoiceUrl(id) {
  const url = `${window.location.origin}/invest/${id}`;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  } else {
    copyToClipboardFallback(url);
  }
  return url;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Interactive fund / copy / print controls for an invoice.
 *
 * @param {object}  props
 * @param {string}  props.id          - Invoice id (used to build the share URL)
 * @param {string}  props.status      - Current server-confirmed invoice status
 * @param {number}  [props.maxAmount] - Maximum fundable amount (invoice amountValue)
 * @param {string}  [props.currency]  - Invoice currency code
 * @param {number}  [props.yieldValue] - Yield rate as a percentage
 */
export default function FundActions({ id, status, maxAmount, currency, yieldValue }) {
  const { state: walletState, connect } = useWallet();
  const toast = useToast();
  const [isCopying, setIsCopying] = useState(false);

  // ── Optimistic funding ──────────────────────────────────────────────────────
  const { optimisticStatus, fundingState, isFunding, submitFund } = useOptimisticFund({
    id,
    status,
    currency,
    onSuccess: (result) => {
      const msg = detail.fundSuccessMsg
        .replace("{amount}", result.amount.toString())
        .replace("{currency}", result.currency ?? "");
      toast.success(msg, detail.fundSuccessTitle);
    },
    onError: () => {
      toast.error(detail.fundErrorMsg, detail.fundErrorTitle);
    },
  });

  // Fund button is disabled while wallet is connecting or unavailable, or
  // if the invoice is not in an Open state (use optimisticStatus to reflect
  // the in-flight view correctly), or if a funding request is in-flight.
  const isFundingDisabled =
    walletState === WALLET_STATES.CONNECTING ||
    walletState === WALLET_STATES.NO_WALLET ||
    optimisticStatus !== "Open" ||
    isFunding;

  const handleFund = () => {
    if (walletState === WALLET_STATES.DISCONNECTED) {
      connect();
    }
    // When already connected, a real funding flow (sign + submit TX) would
    // be triggered here. Placeholder until Stellar integration lands.
  };

  const handleCopyLink = useCallback(async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      await copyInvoiceUrl(id);
      toast.success(detail.copySuccessMsg, detail.copySuccessTitle);
    } catch {
      toast.error(detail.copyErrorMsg, detail.copyErrorTitle);
    } finally {
      setIsCopying(false);
    }
  }, [id, isCopying, toast]);

  const handlePrint = () => {
    window.print();
  };

  // Partial-funding submit: prompt wallet connection when disconnected,
  // otherwise apply the optimistic update and submit to the server.
  // Shows an immediate toast and rolls back on failure.
  const handleFundAmount = useCallback(
    async (amount) => {
      if (walletState === WALLET_STATES.DISCONNECTED) {
        connect();
        return;
      }

      // Show an immediate "in-progress" toast before the server responds.
      toast.info(detail.fundOptimisticMsg, detail.fundOptimisticTitle);

      await submitFund(amount);
    },
    [walletState, connect, toast, submitFund]
  );

  // Show rollback banner inline when the last attempt was rolled back.
  const showRollbackBanner = fundingState === FUNDING_STATES.ROLLED_BACK;

  return (
    <>
      {/* Inline status mirror — shows the optimistic state when it differs from
          the server-confirmed status so the user sees immediate feedback without
          relying solely on the toast system. */}
      {optimisticStatus !== status && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="optimistic-status-banner"
          className="no-print mb-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300"
        >
          {detail.fundOptimisticMsg}
        </div>
      )}

      {/* Rollback banner — shown when the server rejected the funding attempt. */}
      {showRollbackBanner && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="rollback-banner"
          className="no-print mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {detail.fundRolledBackMsg}
        </div>
      )}

      {/* Optimistic status pill — always reflects the current in-UI status. */}
      {optimisticStatus !== status && (
        <div
          className="no-print mb-4 flex items-center gap-2 text-sm text-slate-400"
          aria-label="Optimistic invoice status"
        >
          <span>Status:</span>
          <StatusPill status={optimisticStatus} />
        </div>
      )}

      {/* Partial-funding amount input — only when an amount ceiling is known
          (real detail page) and the invoice is Open (use server-confirmed status
          to decide whether to render; optimistic feedback is in the button). */}
      {status === "Open" && maxAmount != null && (
        <div className="no-print mb-6">
          <FundAmountInput
            maxAmount={maxAmount}
            currency={currency ?? "USD"}
            yieldValue={yieldValue ?? 0}
            onSubmit={handleFundAmount}
            disabled={isFundingDisabled}
          />
        </div>
      )}

      {/* Action row */}
      <div className="no-print flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleFund}
          disabled={isFundingDisabled}
          aria-busy={isFunding}
          className="rounded-full bg-cyan-500/20 text-cyan-400 px-6 py-3 text-sm font-medium hover:bg-cyan-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={detail.fundButtonLabel}
        >
          {isFunding ? detail.fundOptimisticTitle : detail.fundButton}
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          disabled={isCopying}
          className="rounded-full border border-slate-700 text-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50"
          aria-label={detail.copyLinkButtonLabel}
        >
          {detail.copyLinkButton}
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="rounded-full border border-slate-700 text-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500"
          aria-label={detail.printButtonLabel}
        >
          {detail.printButton}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="no-print mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
        {detail.disclaimerNote}
      </div>
    </>
  );
}
