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
import { useFundingSubmit, FUNDING_SUBMIT_STATES } from "@/lib/hooks/useFundingSubmit";

const detail = copy.invest.detail;
const fundingCopy = detail.funding;

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
export default function FundActions({ id, status, maxAmount, currency, yieldValue, performFund }) {
  const { state: walletState, walletData, connect } = useWallet();
  const toast = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const debounceTimeoutRef = useRef(null);
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
    };
  }, []);

  // ── useFundingSubmit: idempotency + double-submit + cross-tab guard ────────

  /**
   * The `performFund` prop is the low-level action (signs + submits the TX).
   * We wrap it so it delegates through `fundInvoice` (optimistic context
   * update) while forwarding the idempotency key.
   */
  const wrappedPerformFund = useCallback(
    async (invoiceId, amount, idempotencyKey) => {
      const action =
        performFund ??
        (async (_id, _amount, _key) => {
          // No-op placeholder — replace with real Stellar sign+submit flow.
        });
      return fundInvoice(invoiceId, amount, (invId, amt) =>
        action(invId, amt, idempotencyKey)
      );
    },
    [performFund, fundInvoice]
  );

  const {
    fundingState,
    isPending: isFundingSubmitPending,
    isBlocked,
    submit: fundingSubmit,
    reset: resetFundingState,
  } = useFundingSubmit({
    invoiceId: id,
    walletAddress: walletData?.address ?? null,
    performFund: wrappedPerformFund,
  });

  // Fund button is disabled while wallet is connecting or unavailable,
  // while an optimistic action is in-flight, or if the invoice is not Open.
  const isFundingDisabled =
    walletState === WALLET_STATES.CONNECTING ||
    walletState === WALLET_STATES.NO_WALLET ||
    status !== "Open" ||
    isFundingPending ||
    isFundingSubmitPending ||
    isBlocked;

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
   * Partial-funding submit with idempotency + double-submit guard + optimistic update.
   *
   * - If the wallet is disconnected, prompt connection and return early.
   * - Delegates to `useFundingSubmit` which manages:
   *     • In-memory double-submit guard (blocks re-entrant calls within same lifecycle)
   *     • Session-persisted idempotency key (survives remounts; same key on retry)
   *     • BroadcastChannel cross-tab lock (blocks a second tab from submitting)
   *     • AbortController lifecycle (cancels pending request on unmount)
   * - Toast and live-region announcements are classified by error type so the
   *   user receives actionable guidance (timeout vs wallet reject vs conflict).
   *
   * @param {number} amount - Validated funding amount from FundAmountInput
   */
  const handleFundAmount = useCallback(
    async (amount) => {
      if (walletState === WALLET_STATES.DISCONNECTED) {
        connect();
        return;
      }

      const cur = currency ?? "";

      try {
        await fundingSubmit(amount);

        // fundingSubmit resolves on success (no throw).
        const successMsg = fundingCopy.successMsg
          .replace("{amount}", String(amount))
          .replace("{currency}", cur)
          .trim();
        toast.success(successMsg, fundingCopy.successTitle);
        announce(successMsg);
      } catch (err) {
        // Classify the error for actionable user messaging.
        if (err?.name === "FundInvoiceTimeoutError" || err?.code === "FUND_TIMEOUT") {
          toast.error(fundingCopy.timeoutMsg, fundingCopy.timeoutTitle);
          announce(fundingCopy.timeoutMsg);
        } else if (err?.status === 409 || err?.code === "FUND_CONFLICT") {
          toast.error(fundingCopy.conflictMsg, fundingCopy.conflictTitle);
          announce(fundingCopy.conflictMsg);
        } else if (err?.code === "WALLET_REJECT" || err?.name === "WalletRejectedError") {
          toast.error(fundingCopy.walletRejectMsg, fundingCopy.walletRejectTitle);
          announce(fundingCopy.walletRejectMsg);
        } else {
          const failureMsg = fundingCopy.failureMsg
            .replace("{amount}", String(amount))
            .replace("{currency}", cur)
            .trim();
          toast.error(failureMsg, fundingCopy.failureTitle);
          announce(failureMsg);
        }
      }
    },
    [walletState, connect, fundingSubmit, currency, toast, announce]
  );

  // ── Combined pending state ─────────────────────────────────────────────────
  const showPending = isFundingPending || isFundingSubmitPending;

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

      {/* Cross-tab blocked warning — shown when another tab is funding. */}
      {isBlocked && (
        <div
          role="alert"
          aria-live="assertive"
          className="no-print mb-4 rounded-xl border border-amber-700 bg-amber-900/20 p-3 text-sm text-amber-300"
          data-testid="fund-blocked-by-tab"
        >
          {fundingCopy.blockedByTabMsg}
        </div>
      )}

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

      {/* Retry button — shown after a failure so the user can re-submit
          without refreshing the page. The idempotency key is preserved in
          sessionStorage so the retry re-uses it (server deduplication). */}
      {fundingState === FUNDING_SUBMIT_STATES.FAILURE && (
        <div className="no-print mb-4">
          <button
            type="button"
            onClick={resetFundingState}
            className="focus-ring rounded-full bg-slate-700/40 text-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-700/60 transition-colors motion-reduce:transition-none"
            data-testid="fund-retry-button"
          >
            {fundingCopy.retryButton}
          </button>
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
          aria-busy={showPending ? "true" : "false"}
        >
          {showPending ? fundingCopy.pendingButton : detail.fundButton}
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
