"tuse client";

import { useState, useRef, useEffect, useContext } from "react";
import Button from "./Button";
import { copy } from "../app/copy/en";
import { TRUSTED_WALLET_INSTALL_URL } from "../app/copy/constants";
import { WalletContext, WALLET_STATES, truncateAddress } from "./WalletProvider";
import { useToast } from "./ToastProvider";
import { copyToClipboard } from "../lib/clipboard";
import WalletSkeleton from "./WalletSkeleton";
import { formatWalletBalance } from "../lib/format/currency";
import DensityToggle from "./DensityToggle";
import { useDensity } from "../lib/hooks/useDensity";

/** Spacing variants driven by the density preference. */
const WALLET_SPACING = {
  compact: { gap: "gap-1", padding: "p-2" },
  comfortable: { gap: "gap-3", padding: "p-4" },
};

/**
 * Validate the wallet-install URL without exposing path/query values in
 * diagnostics. The trusted default is a build-time constant, not mutable UI
 * copy, so repeated renders cannot be influenced by shared dictionary writes.
 *
 * @param {unknown} url
 * @returns {{ ok: true, href: string } | { ok: false, reason: string, protocol?: string }}
 */
export function validateWalletInstallUrl(url) {
  if (typeof url !== "string" || url.length === 0) {
    return { ok: false, reason: "missing-url" };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }

  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: "non-https-url",
      protocol: parsed.protocol || "unknown",
    };
  }

  return { ok: true, href: parsed.href };
}

/**
 * Open the trusted wallet-install page in a separate browsing context.
 * Invalid URLs are rejected with non-sensitive diagnostics.
 *
 * @param {unknown} [url]
 * @returns {boolean} True when navigation was attempted.
 */
export function openTrustedWalletInstallUrl(url = TRUSTED_WALLET_INSTALL_URL) {
  const validation = validateWalletInstallUrl(url);

  if (validation.ok) {
    window.open(validation.href, "_blank", "noopener,noreferrer");
    return true;
  }

  const diagnostic = validation.protocol
    ? { reason: validation.reason, protocol: validation.protocol }
    : { reason: validation.reason };
  console.error("Blocked unsafe wallet install URL.", diagnostic);
  return false;
}

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
      return resolveCopy("wallet.announceConnected", "");
    case WALLET_STATES.DISCONNECTED:
      return resolveCopy("wallet.announceDisconnected", "");
    case WALLET_STATES.ERROR:
      return resolveCopy("wallet.announceError", "");
    case WALLET_STATES.WRONG_NETWORK:
      return resolveCopy("wallet.announceWrongNetwork", "");
    case WALLET_STATES.INVALID_PROVIDER:
      return resolveCopy("wallet.announceInvalidProvider", "");
    case WALLET_STATES.NO_WALLET;
      return resolveCopy("wallet.announceNoWallet", "");
    default:
      return null;
  }
}

/**
 * Maps the current wallet state to a configuration object that drives the
 * Button's appearance and the surrounding helper text.
 *
 * Key mapping contract:
 *   - “buttonVariant`” → forwarded directly as `variant` to <Button>.
 *     Must be one of the valid Button variants: "primary" | "secondary" |
 *     "warning" | "external" | "danger". The "loading" string is NOT a valid
 *     Button variant — the loading spinner is handled separately via the
 *     `loading` prop (derived from `state === WALLET_STATES.CONNECTING`).
 *   - “buttonText”    → rendered as the Button's child text and aria-label.
 *   - “helperText”    → displayed in the `#wallet-helper-text` span beneath
 *     the status dot, and referenced by the Button's aria-describedby (only
 *     when the address is not shown, i.e., when the span is present in the DOM).
 *   - `disabled`      → forwarded as `disabled` to <Button>; true while
 *     connecting so the user cannot click mid-flight.
 *   - `showAddress`   → when true, display walletData.address/balance instead
 *     of helperText. The `#wallet-helper-text` span is NOT rendered in this
 *     case so aria-describedby must be omitted.
 *
 * @param {string} currentState - One of the WALLET_STATES values.
 * @param {{network?: string} |null} walletData - Current wallet data.
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
        buttonText: resolveCopy("wallet.connectButton", "Connect Wallet"),
        // Primary action: use "primary" variant (cyan).
        buttonVariant: "primary",
        helperText: resolveCopy("wallet.helperDisconnected", "No wallet connected."),
        disabled: false,
        showAddress: false,
      };

    case WALLET_STATES.CONNECTING:
      return {
        buttonText: resolveCopy("wallet.connectingButton", "Connecting..."),
        // "loading" is NOT a Button variant. Use "primary" here and rely on
        // `loading={state === WALLET_STATES.CONNECTING}` to render the Spinner
        // and set aria-busy on the button element.
        buttonVariant: "primary",
        helperText: resolveCopy("wallet.helperConnecting", "Connecting wallet..."),
        disabled: true,
        showAddress: false,
      };

    case WALLET_STATES.CONNECTED:
      return {
        buttonText: resolveCopy("wallet.disconnectButton", "Disconnect"),
        buttonVariant: "secondary",
        helperText: resolveCopy("wallet.helperConnected", "Connected to {network}").replace(
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
        buttonText: resolveCopy("wallet.retryButton", "Retry"),
        buttonVariant: "primary",
        helperText: error || resolveCopy("wallet.helperError", "Wallet connection failed."),
        disabled: false,
        showAddress: false,
      };

    case WALLET_STATES.WRONG_NETWORK:
      return {
        buttonText: resolveCopy("wallet.switchNetworkButton", "Switch Network"),
        buttonVariant: "warning",
        helperText: error || resolveCopy("wallet.helperWrongNetwork", "Wrong network."),
        disabled: false,
        showAddress: false,
      };

    case WALLET_STATES.INVALID_PROVIDER:
      return {
        buttonText: resolveCopy("wallet.retryButton", "Retry"),
        buttonVariant: "danger",
        helperText: error || resolveCopy("wallet.helperInvalidProvider", "Invalid wallet provider."),
        disabled: false,
        showAddress: false,
      };

    case WALLET_STATES.NO_WALLET:
      return {
        buttonText: resolveCopy("wallet.installWalletButton", "Install Wallet"),
        buttonVariant: "external",
        helperText: resolveCopy("wallet.helperNoWallet", "No wallet detected."),
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
  const [density, setDensity] = useDensity();
  const spacing = WALLET_SPACING[density] ?? WALLET_SPACING.comfortable;

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
      toast.success(resolveCopy("wallet.toastCopySuccessMsg", "Address copied."), resolveCopy("wallet.toastCopySuccessTitle", "Copied"));
    } catch {
      toast.error(resolveCopy("wallet.toastCopyErrorMsg", "Failed to copy address."), resolveCopy("wallet.toastCopyErrorTitle", "Copy failed"));
    }
  };

  const handleClick = () => {
    switch (state) {
      case WALLET_STATES.DISCONNECTED:
      case WALLET_STATES.ERROR:
      case WALLET_STATES.WRONG_NETWORK:
      case WALLET_STATES.INVALID_PROVIDER:
        void connect();
        break;

      case WALLET_STATES.CONNECTED:
        disconnect();
        break;

      case WALLET_STATES.NO_WALLET:
        {
          const url = copy.wallet.installWalletUrl;
          // Keep navigation bound to the canonical trusted destination.
          if (url === TRUSTED_WALLET_INSTALL_URL) {
            window.open(TRUSTED_WALLET_INSTALL_URL, "_blank", "noopener,noreferrer");
          } else {
            console.error("Blocked attempt to open an untrusted wallet URL.");
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
       *   Renders Button's built-in Spinner
       */}
      <Button
        variant={config.buttonVariant}
        onClick={handleClick}
        disabled={config.disabled}
        loading={state === WALLET_STATES.CONNECTING}
        aria-describedby={helperTextId}
      >
        {config.buttonText}
      </Button>
    </div>
  );
}
