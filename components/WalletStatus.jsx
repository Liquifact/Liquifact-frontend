"use client";

import { useState } from "react";
import Button from "./Button";
import { useToast } from "./ToastProvider";
import { copy } from "../app/copy/en";
import { useWallet, WALLET_STATES } from "./WalletProvider";

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
          helperText: copy.wallet.helperWrongNetwork,
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

        {/* Connected state */}
        {walletState === WALLET_STATES.CONNECTED && walletData ? (
          config.showAddress ? (
            <div className="flex flex-col">
              <span className="font-mono text-sm text-slate-300">{walletData.address}</span>
              <span className="text-xs text-slate-500">{walletData.balance}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Wallet connected</span>
          )
        ) : walletState === WALLET_STATES.CONNECTING ? (
          /* Loading state */
          <span className="text-xs text-slate-400" role="status" aria-live="polite">
            Connecting wallet...
          </span>
        ) : walletState === WALLET_STATES.ERROR || walletState === WALLET_STATES.WRONG_NETWORK ? (
          /* Error state */
          <div className="flex items-center gap-3" role="alert" aria-live="assertive">
            <span className="max-w-xs text-xs text-red-400">
              {error ||
                (walletState === WALLET_STATES.WRONG_NETWORK
                  ? "Please switch to the correct network."
                  : "Failed to connect to your wallet.")}
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
      {walletState !== WALLET_STATES.ERROR && walletState !== WALLET_STATES.WRONG_NETWORK && (
        <Button
          type="button"
          variant={config.buttonVariant}
          loading={walletState === WALLET_STATES.CONNECTING}
          disabled={config.disabled || walletState === WALLET_STATES.CONNECTING}
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
        {walletState === WALLET_STATES.CONNECTED && walletData ? (
          <div role="status" aria-live="polite">
            Wallet connected.
            {walletData.address ? ` Connected as ${walletData.address}.` : ""}
          </div>
        ) : walletState === WALLET_STATES.CONNECTING ? (
          <div role="status" aria-live="polite">
            Connecting wallet. Please wait.
          </div>
        ) : walletState === WALLET_STATES.ERROR ? (
          <div role="alert">
            Wallet connection failed.
            {error ? ` ${error}` : ""}
          </div>
        ) : walletState === WALLET_STATES.WRONG_NETWORK ? (
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

export { DEPRECATED_WALLET_STATES as WALLET_STATES };
