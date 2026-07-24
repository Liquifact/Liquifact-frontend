"use client";

/**
 * @file FundActions.jsx
 *
 * Client-only interactive controls for the invoice detail page.
 *
 * This is the **only** file under `app/invest/[id]/` that carries a
 * `"use client"` directive.  It owns:
 *   - Fund invoice button (wallet-state-aware)
 *   - Copy link button (Clipboard API + textarea fallback)
 *   - Print / Save PDF button
 *   - Disclaimer note
 *
 * Everything else on the detail page (heading, metadata table, JSON-LD
 * script) is rendered by the Server Component shell in `page.js`.
 */

import { useCallback, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useWallet, WALLET_STATES } from "@/components/WalletContext";
import FundAmountInput from "@/components/FundAmountInput";
import { copy } from "@/app/copy/en";

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
 * @param {object} props
 * @param {string} props.id          - Invoice id (used to build the share URL)
 * @param {string} props.status      - Invoice status; disables fund button when not "Open"
 */
export default function FundActions({ id, status, maxAmount, currency, yieldValue }) {
  const { state: walletState, connect } = useWallet();
  const toast = useToast();
  const [isCopying, setIsCopying] = useState(false);

  // Fund button is disabled while wallet is connecting or unavailable, or
  // if the invoice is not in an Open state.
  const isFundingDisabled =
    walletState === WALLET_STATES.CONNECTING ||
    walletState === WALLET_STATES.NO_WALLET ||
    status !== "Open";

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
  // otherwise acknowledge the funding request. A real sign+submit flow
  // replaces the toast once the Stellar integration lands.
  const handleFundAmount = (amount) => {
    if (walletState === WALLET_STATES.DISCONNECTED) {
      connect();
      return;
    }
    toast.success(
      `Funding request for ${amount} ${currency ?? ""} submitted. Awaiting wallet approval.`.trim(),
      "Funding submitted"
    );
  };

  return (
    <>
      {/* Partial-funding amount input — only when an amount ceiling is known
          (real detail page) and the invoice is Open. */}
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
          className="rounded-full bg-cyan-500/20 text-cyan-400 px-6 py-3 text-sm font-medium hover:bg-cyan-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={detail.fundButtonLabel}
        >
          {detail.fundButton}
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
