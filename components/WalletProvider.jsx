"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ToastContext } from "./ToastProvider";
import {
  isFreighterConnected,
  connectFreighter,
  getFreighterNetwork,
  assertExpectedNetwork,
} from "../lib/wallet/freighter";

/**
 * Read the toast API when available. Returns null when WalletProvider is
 * rendered outside a ToastProvider (e.g. in isolated unit tests).
 * @returns {{ success: Function, error: Function, info: Function } | null}
 */
function useOptionalToast() {
  return useContext(ToastContext);
}

export const WALLET_STATES = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
  WRONG_NETWORK: "wrong_network",
  NO_WALLET: "no_wallet",
};

const STORAGE_KEY = "liquifact-wallet-snapshot";
const STORAGE_VERSION = 1;

const MOCK_WALLET_DATA = {
  address: "GABC...XYZ123",
  network: "public",
  balance: "1,234.56 XLM",
};

const VALID_NETWORKS = new Set(["public", "testnet"]);
const PERSISTABLE_STATES = new Set([WALLET_STATES.CONNECTED]);

/**
 * Truncate a Stellar address for display and persistence.
 * @param {string} address
 * @returns {string}
 */
export function truncateAddress(address) {
  if (!address || typeof address !== "string") {
    return "";
  }
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 4)}...${address.slice(-6)}`;
}

/**
 * Validate and sanitize a wallet snapshot read from storage.
 * Rejects corrupt payloads, secrets, and non-persistable states.
 * @param {unknown} raw
 * @returns {{ version: number, state: string, address: string, network: string } | null}
 */
export function sanitizeSnapshot(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const { version, state, address, network } = raw;

  if (version !== STORAGE_VERSION) {
    return null;
  }
  if (!PERSISTABLE_STATES.has(state)) {
    return null;
  }
  if (typeof address !== "string" || address.length === 0 || address.length > 64) {
    return null;
  }
  if (typeof network !== "string" || !VALID_NETWORKS.has(network)) {
    return null;
  }
  // Never rehydrate values that look like secret keys
  if (address.startsWith("S") && address.length >= 56) {
    return null;
  }

  return {
    version: STORAGE_VERSION,
    state,
    address: truncateAddress(address),
    network,
  };
}

/**
 * @returns {boolean}
 */
export function isBrowser() {
  return typeof window !== "undefined";
}

/**
 * Read and sanitize a persisted wallet snapshot. Safe to call only in the browser.
 * @returns {{ version: number, state: string, address: string, network: string } | null}
 */
export function readStoredSnapshot() {
  if (!isBrowser()) {
    return null;
  }

  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    if (!item) {
      return null;
    }
    return sanitizeSnapshot(JSON.parse(item));
  } catch {
    return null;
  }
}

/**
 * Persist a minimal, non-sensitive wallet snapshot (truncated address + network only).
 * @param {string} state
 * @param {{ address: string, network: string }} walletData
 */
export function writeStoredSnapshot(state, walletData) {
  if (!isBrowser()) {
    return;
  }

  if (state === WALLET_STATES.CONNECTED && walletData) {
    const snapshot = {
      version: STORAGE_VERSION,
      state: WALLET_STATES.CONNECTED,
      address: truncateAddress(walletData.address),
      network: walletData.network,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return;
  }

  clearStoredSnapshot();
}

/**
 * Remove any persisted wallet snapshot from storage.
 */
export function clearStoredSnapshot() {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

const WalletContext = createContext(null);

/** @internal Exported for unit tests that override wallet state */
export { WalletContext };

/**
 * Shared wallet connection state with localStorage rehydration after mount.
 * Persists only connection intent, truncated address, and network — never secrets or balances.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children - Application tree to wrap
 */
export function WalletProvider({ children }) {
  const [state, setState] = useState(WALLET_STATES.DISCONNECTED);
  const [walletData, setWalletData] = useState(null);
  const [error, setError] = useState(null);
  const skipPersistRef = useRef(true);
  const toast = useOptionalToast();

  useEffect(() => {
    const snapshot = readStoredSnapshot();
    if (snapshot) {
      /* eslint-disable react-hooks/set-state-in-effect -- rehydrate persisted wallet snapshot once after mount */
      setState(snapshot.state);
      setWalletData({
        address: snapshot.address,
        network: snapshot.network,
      });
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }

    if (state === WALLET_STATES.CONNECTED && walletData) {
      writeStoredSnapshot(state, walletData);
      return;
    }

    if (
      state === WALLET_STATES.DISCONNECTED ||
      state === WALLET_STATES.ERROR ||
      state === WALLET_STATES.WRONG_NETWORK
    ) {
      clearStoredSnapshot();
    }
  }, [state, walletData]);

  const connect = useCallback(async () => {
    setState(WALLET_STATES.CONNECTING);
    setError(null);

    try {
      const isInstalled = await isFreighterConnected();
      if (!isInstalled) {
        setState(WALLET_STATES.NO_WALLET);
        setWalletData(null);
        toast?.error("No Stellar wallet detected. Install one to continue.", "No wallet");
        return {
          outcome: "no_wallet",
          message: "No Stellar wallet detected. Install one to continue.",
        };
      }

      const address = await connectFreighter();

      // Hard gate: block if Freighter is on an unexpected network.
      // assertExpectedNetwork treats an unreadable network as a mismatch so we
      // never silently fall through to a connected state on the wrong ledger.
      try {
        await assertExpectedNetwork();
      } catch (networkErr) {
        setState(WALLET_STATES.WRONG_NETWORK);
        setWalletData(null);
        setError(networkErr.message);
        toast?.error(networkErr.message, "Wrong network");
        return {
          outcome: "wrong_network",
          message: networkErr.message,
        };
      }

      const network = await getFreighterNetwork();
      setState(WALLET_STATES.CONNECTED);
      const data = {
        address,
        network,
        balance: "1,234.56 XLM",
        walletType: "freighter",
      };
      setWalletData(data);
      toast?.success("Wallet connected successfully.", "Wallet connected");
      return { outcome: "success" };
    } catch (err) {
      setState(WALLET_STATES.ERROR);
      setWalletData(null);
      const errMsg = err.message || "Failed to connect to wallet. Please try again.";
      setError(errMsg);
      toast?.error(errMsg, "Connection failed");
      return {
        outcome: "error",
        message: errMsg,
      };
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    setState(WALLET_STATES.DISCONNECTED);
    setWalletData(null);
    setError(null);
    clearStoredSnapshot();
  }, []);

  const value = useMemo(
    () => ({ state, walletData, error, connect, disconnect }),
    [state, walletData, error, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

/**
 * Access shared wallet state and actions. Must be used within {@link WalletProvider}.
 *
 * Canonical hook shape:
 * @returns {{
 *   state: string,
 *   walletData: { address: string, network: string, balance?: string } | null,
 *   connect: () => Promise<{ outcome: string, message?: string }>,
 *   disconnect: () => void
 * }}
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
