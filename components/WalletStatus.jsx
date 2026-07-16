"use client";

import { useState, useEffect, useRef } from "react";
import Button from "./Button";
import { useToast } from "./ToastProvider";
import { copy } from "../app/copy/en";
import { useWallet, WALLET_STATES } from "./WalletProvider";

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
      return "Wallet connected.";
    case WALLET_STATES.DISCONNECTED:
      return "Wallet disconnected.";
    case WALLET_STATES.ERROR:
      return "Wallet connection failed.";
    case WALLET_STATES.WRONG_NETWORK:
      return "Wallet connected to wrong network.";
    case WALLET_STATES.NO_WALLET:
      return "No wallet detected.";
    default:
      return null;
  }
}

// Wallet connection states
// This is now imported from WalletProvider, but kept here for export stability
const DEPRECATED_WALLET_STATES = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
  WRONG_NETWORK: "wrong_network",
  NO_WALLET: "no_wallet",
};

// Mock wallet data for UI development
const mockWalletData = {
  address: "GABC...XYZ123",
  network: "public",
  balance: "1,234.56 XLM",
};

export default function WalletStatus() {
  // Always call the hook unconditionally to satisfy the Rules of Hooks.
  // WalletProvider will be present in the app/tests that render this component.
  const { state, connect, walletState, disconnect } = useWallet();

  // 2. Safe useWallet context lookup (no-throw fallback)
  let wallet = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    wallet = useWallet();
  } catch (e) {
    // If not within a provider, we fall back to self-contained local state
  }

  // 3. Self-contained local state (fallback when useWallet is not active)
  const [localState, setLocalState] = useState(WALLET_STATES.DISCONNECTED);
  const [localData, setLocalData] = useState(null);
  const [localError, setLocalError] = useState(null);

  // Connection flow for self-contained local state
  const connectLocal = async () => {
    setLocalState(WALLET_STATES.CONNECTING);
    setLocalError(null);

    setTimeout(() => {
      // Simulate different scenarios for testing
      const scenarios = ["success", "error", "wrong_network", "no_wallet"];
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      const mockWalletData = {
        address: "GABC...XYZ123",
        network: "public",
        balance: "1,234.56 XLM",
      };

      switch (scenario) {
        case "success":
          setLocalState(WALLET_STATES.CONNECTED);
          setLocalData(mockWalletData);
          toast.success(copy.wallet.toastConnectedMsg, copy.wallet.toastConnectedTitle);
          break;
        case "error":
          setLocalState(WALLET_STATES.ERROR);
          setLocalError(copy.wallet.errorConnect);
          toast.error(copy.wallet.toastErrorMsg, copy.wallet.toastErrorTitle);
          break;
        case "wrong_network":
          setLocalState(WALLET_STATES.WRONG_NETWORK);
          setLocalError(copy.wallet.errorWrongNetwork);
          toast.error(copy.wallet.toastWrongNetworkMsg, copy.wallet.toastWrongNetworkTitle);
          break;
        case "no_wallet":
          setWalletState(WALLET_STATES.NO_WALLET);
          setError(null);
          break;
      }
    }, 1500);
  };

  const disconnectLocal = () => {
    setLocalState(WALLET_STATES.DISCONNECTED);
    setLocalData(null);
    setLocalError(null);
  };

  // 4. Unify API properties to support both context-based and local fallback modes
  const isUsingContext = !!wallet;
  const rawState = isUsingContext ? wallet.state || wallet.walletState : localState;
  const walletData = isUsingContext ? wallet.walletData : localData;
  const error = isUsingContext ? wallet.error : localError;

  const derivedError =
    rawState === WALLET_STATES.ERROR
      ? error || copy.wallet.errorConnect
      : rawState === WALLET_STATES.WRONG_NETWORK
        ? error || copy.wallet.errorWrongNetwork
        : null;

  const handleConnect = () => {
    if (isUsingContext) {
      const connectFn = wallet.connect || wallet.connectWallet;
      if (typeof connectFn === "function") {
        connectFn();
      }
    } else {
      connectLocal();
    }
  };

  const handleDisconnect = () => {
    try {
      if (isUsingContext) {
        const disconnectFn = wallet.disconnect || wallet.disconnectWallet;

        if (typeof disconnectFn === "function") {
          disconnectFn();
        }
      }
    } catch (e) {
      console.error("Failed to disconnect wallet:", e);
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
        window.open("https://www.stellar.org/wallets", "_blank");
        break;

      default:
        break;
    }
  };

  const getStateConfig = (state) => {
    switch (state) {
      case WALLET_STATES.DISCONNECTED:
        return {
          buttonText: copy.wallet.connectButton,
          buttonVariant: "primary",
          helperText: copy.wallet.helperDisconnected,
          disabled: false,
          showAddress: false,
        };

      case WALLET_STATES.CONNECTING:
        return {
          buttonText: copy.wallet.connectingButton,
          buttonVariant: "loading",
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
        return getStateConfig(WALLET_STATES.DISCONNECTED);
    }
  };

  const config = getStateConfig(rawState);

  // Track state transitions to announce them once via the polite live region.
  const prevStateRef = useRef(rawState);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  useEffect(() => {
    const prev = prevStateRef.current;
    if (prev !== rawState) {
      prevStateRef.current = rawState;
      const msg = getTransitionAnnouncement(rawState);
      if (msg) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLiveAnnouncement("");
        // Use a microtask-level delay so the DOM registers the empty string
        // before the new message, ensuring screen readers re-read it.
        Promise.resolve().then(() => setLiveAnnouncement(msg));
      }
    }
  }, [rawState]);

  // const buttonText = getButtonText();
  // const helperText = getHelperText();
  const isConnecting = state === WALLET_STATES.CONNECTING;
  const isDisabled = isConnecting;

  return (
    <div className="flex items-center gap-4">
      {/* Wallet state indicator + information */}
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div
          className={`h-2 w-2 rounded-full transition-colors duration-200 ${
            walletState === WALLET_STATES.CONNECTED
              ? "bg-green-500"
              : walletState === WALLET_STATES.CONNECTING
                ? "bg-yellow-500 animate-pulse"
                : walletState === WALLET_STATES.ERROR || walletState === WALLET_STATES.WRONG_NETWORK
                  ? "bg-red-500"
                  : "bg-slate-600"
          }`}
          aria-hidden="true"
        />

        {/* Address or helper text */}
        {config.showAddress && walletData ? (
          <div className="flex flex-col">
            <span className="font-mono text-sm text-slate-300">{walletData.address}</span>
            <span className="text-xs text-slate-500">{walletData.balance}</span>
          </div>
        ) : (
          <span id="wallet-helper-text" className="max-w-xs text-xs text-slate-400">
            {config.helperText}
          </span>
        )}
      </div>

      {/* Wallet action */}
      <Button
        variant={config.buttonVariant}
        loading={walletState === WALLET_STATES.CONNECTING}
        disabled={config.disabled}
        onClick={handleClick}
        aria-label={config.buttonText}
        aria-describedby="wallet-helper-text"
        className="focus-visible:outline-2 cursor-pointer focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
      >
        {config.buttonText}
      </Button>

      {/* Accessible status announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {walletState === WALLET_STATES.CONNECTED
          ? `Wallet connected. ${walletData?.address ? `Connected as ${walletData.address}.` : ""}`
          : `Wallet status: ${walletState}${error ? `. Error: ${error}` : ""}`}
      </div>
    </div>
  );
}

export { DEPRECATED_WALLET_STATES as WALLET_STATES };
