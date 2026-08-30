"use client";

/**
 * @file components/NetworkMismatchBanner.jsx
 *
 * Blocking banner displayed on the invoice detail page when the connected
 * wallet is on the wrong Stellar network (or disconnected / unreadable).
 *
 * ## Blocking contract
 * This component is rendered ABOVE the funding controls in FundActions.jsx.
 * When `status !== "ok"` and `status !== "checking"` the banner is shown
 * and callers are responsible for disabling (or hiding) the funding controls.
 * The component itself does NOT hide the controls — it is purely informational
 * so users can still copy/print the invoice.
 *
 * ## Accessibility
 * - Uses `role="alert"` with `aria-live="assertive"` so the mismatch is
 *   announced immediately to screen readers when the banner appears.
 * - `aria-label` is provided from copy to describe the alert region.
 * - Network names in the message are wrapped in `<strong>` for visual
 *   emphasis; they are NOT coloured alone (colour-blind safe).
 * - The banner uses a warning (amber) colour scheme that meets WCAG AA
 *   contrast against the page's dark background.
 *
 * ## Security
 * - `walletNetwork` and `invoiceNetwork` come from the hook (not the invoice
 *   payload or user input) and are only used in text content — never injected
 *   as HTML attributes — so there is no XSS risk.
 * - Network labels are lowercase identifiers ("testnet", "public"); they are
 *   capitalised at render time for display only.
 *
 * ## Edge cases handled
 * | status          | Message shown                                          |
 * |-----------------|--------------------------------------------------------|
 * | "disconnected"  | Prompt to connect wallet to the required network.      |
 * | "unknown"       | Wallet connected but network unreadable — prompt reconnect. |
 * | "mismatch"      | Shows both wallet and invoice network names.           |
 * | "checking"      | Nothing rendered — avoids flash on initial load.       |
 * | "ok"            | Nothing rendered — no mismatch.                        |
 *
 * @param {object}  props
 * @param {import('../lib/hooks/useWalletNetworkGuard').NetworkGuardStatus} props.status
 * @param {string | null} props.walletNetwork  - Current wallet network (null if unknown).
 * @param {string}        props.invoiceNetwork - Required network from env config.
 */

import { useEffect, useRef } from "react";
import { copy } from "@/app/copy/en";
import { announce } from "@/lib/a11y/liveRegion";

const mismatchCopy = copy.invest.detail.networkMismatch;

/**
 * Capitalise the first letter of a network identifier for display.
 * "testnet" → "Testnet", "public" → "Public", null → "Unknown".
 * @param {string | null} network
 * @returns {string}
 */
function formatNetwork(network) {
  if (!network) return "Unknown";
  return network.charAt(0).toUpperCase() + network.slice(1);
}

/**
 * @param {object} props
 * @param {import('../lib/hooks/useWalletNetworkGuard').NetworkGuardStatus} props.status
 * @param {string | null} props.walletNetwork
 * @param {string} props.invoiceNetwork
 */
export default function NetworkMismatchBanner({ status, walletNetwork, invoiceNetwork }) {
  // Track whether we've already announced this status so we don't spam the
  // live region on re-renders that don't change the guard state.
  const announcedStatusRef = useRef(null);

  useEffect(() => {
    if (
      (status === "mismatch" || status === "unknown" || status === "disconnected") &&
      announcedStatusRef.current !== status
    ) {
      announcedStatusRef.current = status;
      const msg = mismatchCopy.announceMessage.replace(
        "{invoiceNetwork}",
        formatNetwork(invoiceNetwork)
      );
      announce(msg);
    }

    if (status === "ok" || status === "checking") {
      announcedStatusRef.current = null;
    }
  }, [status, invoiceNetwork]);

  // "checking" — wait silently; avoids a flash on initial page load.
  // "ok"       — no mismatch; render nothing.
  if (status === "ok" || status === "checking") {
    return null;
  }

  const invoiceLabel = formatNetwork(invoiceNetwork);
  const walletLabel = formatNetwork(walletNetwork);

  let bodyText;
  if (status === "disconnected") {
    bodyText = mismatchCopy.bannerBodyDisconnected.replace("{invoiceNetwork}", invoiceLabel);
  } else if (status === "unknown") {
    bodyText = mismatchCopy.bannerBodyUnknown.replace("{invoiceNetwork}", invoiceLabel);
  } else {
    // status === "mismatch"
    bodyText = mismatchCopy.bannerBody
      .replace("{walletNetwork}", walletLabel)
      .replace("{invoiceNetwork}", invoiceLabel);
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-label={mismatchCopy.alertLabel}
      data-testid="network-mismatch-banner"
      className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200"
    >
      {/* Warning icon — aria-hidden so the text carries the full message */}
      <svg
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>

      <div>
        <p className="font-semibold text-amber-100" data-testid="network-mismatch-title">
          {mismatchCopy.bannerTitle}
        </p>
        <p className="mt-0.5" data-testid="network-mismatch-body">
          {status === "mismatch" ? (
            <>
              Your wallet is on{" "}
              <strong className="font-semibold">{walletLabel}</strong> but this invoice
              requires{" "}
              <strong className="font-semibold">{invoiceLabel}</strong>. Switch your wallet
              network to continue.
            </>
          ) : (
            bodyText
          )}
        </p>
      </div>
    </div>
  );
}
