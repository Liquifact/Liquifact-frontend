"use client";

import { useState, useRef, useEffect, useContext } from "react";
import Button from "./Button";
import { copy } from "../app/copy/en";
import { WalletContext, WALLET_STATES, truncateAddress } from "./WalletProvider";
import { useToast } from "./ToastProvider";
import { copyToClipboard } from "../lib/clipboard";
import WalletSkeleton from "./WalletSkeleton";

/**
 * Returns a concise, non-sensitive announcement string for a wallet state
 * transition. Returns null when no announcement is warranted (e.g. connecting
 * state, which has its own visible spinner).
 * @param {string} nextState
 * @returns {string|null}
 */
function getTransitionAnnouncement(nextState) {
  switch (nextState) {
    case WALLET_STATES.CONNECTED:
      return copy.wallet.announceConnected;
    case WALLET_STATES.DISCONNECTED:
      return copy.wallet.announceDisconnected;
    case WALLET_STATES.ERROR:
      return copy.wallet.announceError;
    case WALLET_STATES.WRONG_NETWORK:
      return copy.wallet.announceWrongNetwork;
    case WALLET_STATES.NO_WALLET:
      return copy.wallet.announceNoWallet;
    default:
      return null;
  }
}

/**
 * Maps the current wallet state to a configuration object that drives the
 * Button's appearance and the surrounding helper text.
 *
 * Key mapping contract:
 *   - `buttonVariant` → forwarded directly as `variant` to <Button>.
 *     Must be one of the valid Button variants: "primary" | "secondary" |
 *     "warning" | "external" | "danger". The "loading" string is NOT a valid
 *     Button variant — the loading spinner is handled separately via the
 *     `loading` prop (derived from `state === WALLET_STATES.CONNECTING`).
 *   - `buttonText`    → rendered as the Button's child text and aria-label.
 *   - `helperText`    → displayed in the `#wallet-helper-text` span beneath
 *     the status dot, and referenced by the Button's aria-describedby (only
 *     when the address is not shown, i.e., when the span is present in the DOM).
 *   - `disabled`      → forwarded as `disabled` to <Button>; true while
 *     connecting so the user cannot click mid-flight.
 *   - `showAddress`   → when true, display walletData.address/balance instead
 *     of helperText. The `#wallet-helper-text` span is NOT rendered in this
 *     case so aria-describedby must be omitted.
 *
 * @param {string} currentState - One of the WALLET_STATES values.
 * @param {{ network?: string } | null} walletData - Current wallet data.
 * @param {string | null} error - Current wallet error message, if any.
 * @returns {{
 *   buttonText: string,
 *   buttonVariant: 'primary'|'secondary'|'warning'|'external'|'danger',
 *   helperText: string,
 *   disabled: boolean,
 *   showAddress: boolean,
 * }}
 */
function getStateConfig(currentState, walletData, error) {
  switch (currentState) {
    case WALLET_STATES.DISCONNECTED:
      return {
        buttonText: copy.wallet.connectButton,
        // Primary action: use "primary" variant (cyan).
        buttonVariant: "primary",
        helperText: copy.wallet.helperDisconnected,
        disabled: false,
        showAddress: false,
      };

    case WALLET_STATES.CONNECTING:
      return {
        buttonText: copy.wallet.connectingButton,
        // "loading" is NOT a Button variant. Use "primary" here and rely on
        // `loading={state === WALLET_STATES.CONNECTING}` to render the Spinner
        // and set aria-busy on the button element.
        buttonVariant: "primary",
        helperText: copy.wallet.helperConnecting,
        disabled: true,
        showAddress: false,
      };

    case WALLET_STATES.CONNECTED:
      return {
        buttonText: copy.wallet.disconnectButton,
        buttonVariant: "secondary",
        helperText: copy.wallet.helperConnected.replace(
          "{network}",
          walletData?.network || "public"
        ),
        disabled: false,
        // Address/balance row replaces helper text — the #wallet-helper-text
        // span is not rendered in this state, so aria-describedby is omitted.
        showAddress: true,
      };

    case WALLET_STATES.ERROR:
      return {
        buttonText: copy.wallet.retryButton,
        buttonVariant: "primary",
        helperText: error || copy.wallet.helperError,
        disabled: false,
        showAddress: false,
      };

    case WALLET_STATES.WRONG_NETWORK:
      return {
        buttonText: copy.wallet.switchNetworkButton,
        buttonVariant: "warning",
        helperText: error || copy.wallet.helperWrongNetwork,
        disabled: false,
        showAddress: false,
      };

    case WALLET_STATES.NO_WALLET:
      return {
        buttonText: copy.wallet.installWalletButton,
        buttonVariant: "external",
        helperText: copy.wallet.helperNoWallet,
        disabled: false,
        showAddress: false,
      };

    default:
      return getStateConfig(WALLET_STATES.DISCONNECTED, walletData, error);
  }
}

export default function WalletStatus() {
  const context = useContext(WalletContext);
  const { state, walletData, error, hydrating, connect, disconnect } = context || {
    state: WALLET_STATES.DISCONNECTED,
    walletData: null,
    error: null,
    connect: async () => ({ outcome: "error" }),
    disconnect: () => {},
  };
  const toast = useToast();

  /**
   * Derive the Button props from the current wallet state.
   *
   * `buttonVariant` maps directly to <Button variant={...}>.
   * The `loading` prop is derived separately: it is true only while connecting
   * so Button renders its own Spinner and sets aria-busy automatically.
   * No inline spinner SVG is needed here.
   */
  const config = getStateConfig(state, walletData, error);

  // Track state transitions to announce them once via the polite live region.
  const prevStateRef = useRef(state);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  useEffect(() => {
    const prev = prevStateRef.current;
    if (prev !== state) {
      prevStateRef.current = state;
      const msg = getTransitionAnnouncement(state);
      if (msg) {
        // Defer all setState to avoid triggering react-hooks/set-state-in-effect.
        // Briefly clear then set so the same message re-announces if the
        // user toggles connect/disconnect repeatedly.
        const id = setTimeout(() => {
          setLiveAnnouncement("");
          queueMicrotask(() => setLiveAnnouncement(msg));
        }, 0);
        return () => clearTimeout(id);
      }
    }
  }, [state]);

  // Show skeleton while WalletProvider is rehydrating from localStorage.
  // This prevents the layout from shifting from the placeholder (shown by
  // WalletStatusLazy while the JS chunk loads) to a transient DISCONNECTED
  // state before the persisted snapshot is applied.
  if (hydrating) {
    return <WalletSkeleton />;
  }

  const handleCopyAddress = async () => {
    if (!walletData?.address) return;
    try {
      await copyToClipboard(walletData.address);
      toast.success(copy.wallet.toastCopySuccessMsg, copy.wallet.toastCopySuccessTitle);
    } catch {
      toast.error(copy.wallet.toastCopyErrorMsg, copy.wallet.toastCopyErrorTitle);
    }
  };

  const handleClick = () => {
    switch (state) {
      case WALLET_STATES.DISCONNECTED:
      case WALLET_STATES.ERROR:
      case WALLET_STATES.WRONG_NETWORK:
        void connect();
        break;

      case WALLET_STATES.CONNECTED:
        disconnect();
        break;

      case WALLET_STATES.NO_WALLET:
        {
          const url = copy.wallet.installWalletUrl;
          // Only allow https URLs for security
          if (typeof url === "string" && url.startsWith("https://")) {
            window.open(url, "_blank", "noopener,noreferrer");
          } else {
            console.error(
              "Blocked attempt to open a non-HTTPS wallet URL for security reasons:",
              url
            );
          }
        }
        break;

      default:
        break;
    }
  };

  // The #wallet-helper-text span is only present when showAddress is false.
  // aria-describedby must only reference an element that exists in the DOM —
  // omit it when the connected address row is shown instead.
  const helperTextId = config.showAddress ? undefined : "wallet-helper-text";

  return (
    <div className="flex flex-row-reverse items-center justify-end gap-4">
      {/*
       * Wallet action button.
       * Placed first in the DOM for sensible focus order, but visually on the right
       * via flex-row-reverse.
       *
       * variant={config.buttonVariant}
       *   Drives visual style. Always a valid Button variant string:
       *   "primary" | "secondary" | "warning" | "external" | "danger".
       *
       * loading={state === WALLET_STATES.CONNECTING}
       *   Renders Button's built-in Spinner, sets aria-busy="true" on the
       *   <button> element, and disables interaction — no inline SVG needed.
       *
       * aria-describedby={helperTextId}
       *   Only set when the #wallet-helper-text span is present in the DOM
       *   (i.e. when showAddress is false). Omitted when the connected address
       *   row is displayed to avoid dangling IDREF references.
       */}
      <Button
        variant={config.buttonVariant}
        loading={state === WALLET_STATES.CONNECTING}
        disabled={config.disabled}
        onClick={handleClick}
        aria-label={config.buttonText}
        aria-describedby={helperTextId}
        className="focus-visible:outline-2 cursor-pointer focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
      >
        {config.buttonText}
      </Button>

      {/* Wallet state indicator + information */}
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div
          className={`h-2 w-2 rounded-full transition-colors duration-200 ${
            state === WALLET_STATES.CONNECTED
              ? "bg-green-500"
              : state === WALLET_STATES.CONNECTING
                ? "bg-yellow-500 animate-pulse"
                : state === WALLET_STATES.ERROR || state === WALLET_STATES.WRONG_NETWORK
                  ? "bg-red-500"
                  : "bg-slate-600"
          }`}
          aria-hidden="true"
        />

        {/* Connected state */}
        {state === WALLET_STATES.CONNECTED && walletData ? (
          config.showAddress ? (
            <div className="flex flex-col">
              <span className="font-mono text-sm text-slate-300">{walletData.address}</span>
              <span className="text-xs text-slate-500">{walletData.balance}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Wallet connected</span>
          )
        ) : state === WALLET_STATES.CONNECTING ? (
          /* Loading state */
          <span className="text-xs text-slate-400" role="status" aria-live="polite">
            Connecting wallet...
          </span>
        ) : state === WALLET_STATES.ERROR || state === WALLET_STATES.WRONG_NETWORK ? (
          /* Error state */
          <div className="flex items-center gap-3" role="alert" aria-live="assertive">
            <span id="wallet-helper-text" className="max-w-xs text-xs text-red-400">
              {config.helperText}


            </span>

            <Button
              type="button"
              variant={config.buttonVariant}
              onClick={handleClick}
              disabled={config.disabled}
              aria-label="Try connecting your wallet again"
              className="cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
            >
              Try again
            </Button>
          </div>
        ) : (
          /* Empty / disconnected state */
          <span
            id="wallet-helper-text"
            className="max-w-xs text-xs text-slate-400"
            role="status"
            aria-live="polite"
          >
            {config.helperText || "No wallet connected. Connect your wallet to continue."}
          </span>
        )}
      </div>

      {/* Wallet action for non-error states */}
      {state !== WALLET_STATES.ERROR && state !== WALLET_STATES.WRONG_NETWORK && (
        <Button
          type="button"
          variant={config.buttonVariant}
          loading={state === WALLET_STATES.CONNECTING}
          disabled={config.disabled || state === WALLET_STATES.CONNECTING}
          onClick={handleClick}
          aria-label={config.buttonText}
          aria-describedby="wallet-helper-text"
          className="cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
        >
          {config.buttonText}
        </Button>
      )}

      {/* Accessible wallet state announcements */}
      <div className="sr-only">
        {state === WALLET_STATES.CONNECTED && walletData ? (
          <div role="status" aria-live="polite">
            Wallet connected.
            {walletData.address ? ` Connected as ${walletData.address}.` : ""}
          </div>
        ) : state === WALLET_STATES.CONNECTING ? (
          <div role="status" aria-live="polite">
            Connecting wallet. Please wait.
          </div>
        ) : state === WALLET_STATES.ERROR ? (
          <div role="alert">
            Wallet connection failed.
            {error ? ` ${error}` : ""}
          </div>
        ) : state === WALLET_STATES.WRONG_NETWORK ? (
          <div role="alert">Wallet is connected to the wrong network.</div>
        ) : (
          <div role="status" aria-live="polite">
            No wallet connected.
          </div>
        )}
      </div>
    </div>
  );
}

export { WALLET_STATES };


