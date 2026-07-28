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
 *
 * Optimistic updates
 * ──────────────────
 * `handleFundAmount` applies the funding action optimistically via
 * `useMarketplaceActions`: the UI reflects the pending state immediately
 * while the async action runs.  On failure the state is rolled back and
 * an error toast is shown, keeping the UI consistent.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useWallet, WALLET_STATES } from "@/components/WalletContext";
import FundAmountInput from "@/components/FundAmountInput";
import { useMarketplace } from "@/app/invest/MarketplaceContext";
import { copy } from "@/app/copy/en";

const detail = copy.invest.detail;

// Delay before an async-action result reaches the live region. Debouncing
// coalesces bursts of rapid results (e.g. mashing "Copy link") into a single
// announcement of the latest outcome instead of flooding screen readers.
const ANNOUNCE_DEBOUNCE_MS = 250;

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
 * @param {object}   props
 * @param {string}   props.id             - Invoice id (used to build the share URL)
 * @param {string}   props.status         - Invoice status; disables fund button when not "Open"
 * @param {number}   [props.maxAmount]    - Maximum fundable amount
 * @param {string}   [props.currency]     - Invoice currency code
 * @param {number}   [props.yieldValue]   - Yield rate as a percentage
 * @param {Function} [props.performFund]  - Async action that executes the funding request.
 *   Receives `(invoiceId, amount)` and should throw on failure.
 *   Defaults to a mock that resolves immediately (placeholder until Stellar lands).
 */
export default function FundActions({
  id,
  status,
  maxAmount,
  currency,
  yieldValue,
  performFund,
}) {
  const { state: walletState, connect } = useWallet();
  const toast = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const debounceTimeoutRef = useRef(null);
  const submissionGuardRef = useRef(false);
  const idempotencyKeyRef = useRef(null);
  const currentIntentKeyRef = useRef(null);
  const { pendingIds, fundInvoice } = useMarketplace();

  const isFundingPending = pendingIds.has(id);

  // Debounced polite announcement so rapid-fire results settle into one update.
  const announce = useCallback((message) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      setAnnouncement(message);
    }, ANNOUNCE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      submissionGuardRef.current = false;
      idempotencyKeyRef.current = null;
      currentIntentKeyRef.current = null;
    };
  }, []);

  // Fund button is disabled while wallet is connecting or unavailable,
  // while an optimistic action is in-flight, or if the invoice is not Open.
  const isFundingDisabled =
    walletState === WALLET_STATES.CONNECTING ||
    walletState === WALLET_STATES.NO_WALLET ||
    status !== "Open" ||
    isFundingPending;

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
      announce(detail.copySuccessMsg);
    } catch {
      toast.error(detail.copyErrorMsg, detail.copyErrorTitle);
      announce(detail.copyErrorMsg);
    } finally {
      setIsCopying(false);
    }
  }, [id, isCopying, toast, announce]);

  const handlePrint = () => {
    window.print();
  };

  /**
   * Partial-funding submit with optimistic update + rollback.
   *
   * - If the wallet is disconnected, prompt connection and return early.
   * - Otherwise apply the funding optimistically via `useMarketplaceActions`:
   *     • UI reflects the pending state immediately.
   *     • On success a confirmation toast is shown.
   *     • On failure the optimistic state is rolled back and an error toast
   *       is shown — the invoice reverts to its pre-action appearance.
   *
   * @param {number} amount - Validated funding amount from FundAmountInput
   */
  const handleFundAmount = useCallback(
    async (amount) => {
      if (walletState === WALLET_STATES.DISCONNECTED) {
        connect();
        return;
      }

      // Generate intent key from invoice id + amount (unique per unique funding attempt)
      const intentKey = `${id}_${amount}`;

      // SUBMISSION GUARD: block repeat activation of the SAME intent while in-flight
      if (currentIntentKeyRef.current === intentKey && submissionGuardRef.current) {
        return;
      }

      // New intent (or first activation) — allow through
      currentIntentKeyRef.current = intentKey;
      submissionGuardRef.current = true;

      // Generate idempotency key per unique intent; reuse on retry
      if (!idempotencyKeyRef.current || currentIntentKeyRef.current !== intentKey) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }

      // Default performFund: simulates a successful submission until the
      // real Stellar sign+submit flow lands.
      const action =
        performFund ??
        (async (_invoiceId, _amount, _idempotencyKey) => {
          // No-op placeholder — replace with real API call.
        });

      try {
        await fundInvoice(id, amount, (invId, amt) => action(invId, amt, idempotencyKeyRef.current));
        const successMsg =
          `Funding request for ${amount} ${currency ?? ""} submitted. Awaiting wallet approval.`.trim();
        toast.success(successMsg, "Funding submitted");
        announce(successMsg);
      } catch {
        const errorMsg =
          `Funding request for ${amount} ${currency ?? ""} failed. Please try again.`.trim();
        toast.error(errorMsg, "Funding failed");
        announce(errorMsg);
      } finally {
        submissionGuardRef.current = false;
      }
    },
    [walletState, connect, fundInvoice, id, currency, performFund, toast, announce]
  );

  return (
    <>
      {/* Hidden polite status region announcing invoice-detail async action
          results (copy link, funding submission) to screen readers. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="invoice-detail-announce"
      >
        {announcement}
      </div>

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
      <div
        role="group"
        aria-label={detail.actionGroupLabel}
        className="no-print flex flex-wrap gap-3"
      >
        <button
          type="button"
          onClick={handleFund}
          disabled={isFundingDisabled}
          className="invoice-detail-action-btn focus-ring rounded-full bg-cyan-500/20 text-cyan-400 px-6 py-3 text-sm font-medium hover:bg-cyan-500/30 transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={detail.fundButtonLabel}
        >
          {isFundingPending ? "Funding…" : detail.fundButton}
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          disabled={isCopying}
          className="invoice-detail-action-btn focus-ring rounded-full border border-slate-700 text-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-800/50 transition-colors motion-reduce:transition-none disabled:opacity-50"
          aria-label={detail.copyLinkButtonLabel}
        >
          {detail.copyLinkButton}
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="invoice-detail-action-btn focus-ring rounded-full border border-slate-700 text-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-800 transition-colors motion-reduce:transition-none"
          aria-label={detail.printButtonLabel}
        >
          {detail.printButton}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="invoice-detail-disclaimer no-print mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
        {detail.disclaimerNote}
      </div>
    </>
  );
}
