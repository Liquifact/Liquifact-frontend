"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  connect as requestAccess,
  getAddress as readAddress,
  getNetwork as readNetwork,
  isAllowed as readIsAllowed,
  watch as watchWallet,
  WALLET_ERROR_CODE,
  WalletError,
} from "@/lib/stellar/freighter";
import {
  INITIAL_WALLET_STATE,
  WALLET_ACTIONS,
  WALLET_STATUS,
  walletReducer,
} from "@/lib/stellar/walletState";

/**
 * localStorage flag that remembers that this browser was allowed to talk to
 * the extension. It holds **no** address, no key and no other personal data —
 * only the fact that a session may be restored.
 */
export const WALLET_STORAGE_KEY = "liquifact-wallet";

const WalletContext = createContext(null);

function readSessionFlag() {
  try {
    return window.localStorage.getItem(WALLET_STORAGE_KEY) === "1";
  } catch {
    // Storage can be blocked (private mode, disabled cookies). The session
    // simply is not restored in that case.
    return false;
  }
}

function writeSessionFlag() {
  try {
    window.localStorage.setItem(WALLET_STORAGE_KEY, "1");
  } catch {
    /* see readSessionFlag */
  }
}

function clearSessionFlag() {
  try {
    window.localStorage.removeItem(WALLET_STORAGE_KEY);
  } catch {
    /* see readSessionFlag */
  }
}

/**
 * Single source of truth for the wallet state.
 *
 * Mounted once, around the whole app, so that the header button and any
 * future wallet consumer read exactly the same state.
 */
export function WalletProvider({ children }) {
  const [state, dispatch] = useReducer(walletReducer, INITIAL_WALLET_STATE);
  const unsubscribeRef = useRef(null);
  const generationRef = useRef(0);
  useEffect(() => () => { generationRef.current += 1; }, []);

  const stopWatching = useCallback(() => {
    if (!unsubscribeRef.current) return;
    try {
      unsubscribeRef.current();
    } catch {
      /* the extension may already be gone */
    }
    unsubscribeRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    const attempt = ++generationRef.current;
    dispatch({ type: WALLET_ACTIONS.CONNECT });

    try {
      const address = await requestAccess();
      if (attempt !== generationRef.current) return { status: WALLET_STATUS.DISCONNECTED };
      const network = await readNetwork();
      if (attempt !== generationRef.current) return { status: WALLET_STATUS.DISCONNECTED };
      dispatch({
        type: WALLET_ACTIONS.CONNECTED,
        address,
        network: network.network,
        networkPassphrase: network.networkPassphrase,
      });
      writeSessionFlag();
      return { status: WALLET_STATUS.CONNECTED, address };
    } catch (error) {
      if (attempt !== generationRef.current) return { status: WALLET_STATUS.DISCONNECTED };
      const code = error instanceof WalletError ? error.code : WALLET_ERROR_CODE.UNKNOWN;
      const message =
        (error && error.message) || "The wallet connection failed.";

      if (code === WALLET_ERROR_CODE.NO_WALLET) {
        dispatch({ type: WALLET_ACTIONS.NO_WALLET, error: message, errorCode: code });
        return { status: WALLET_STATUS.NO_WALLET, message };
      }

      dispatch({ type: WALLET_ACTIONS.FAILED, error: message, errorCode: code });
      return { status: WALLET_STATUS.ERROR, message, code };
    }
  }, []);

  const disconnect = useCallback(() => {
    generationRef.current += 1;
    stopWatching();
    clearSessionFlag();
    dispatch({ type: WALLET_ACTIONS.DISCONNECT });
  }, [stopWatching]);

  // Silent session restore: only when the extension already trusts this site
  // and the browser remembers a session. requestAccess() is never called here,
  // so no prompt is shown on reload.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!readSessionFlag()) return undefined;

    let cancelled = false;
    const attempt = generationRef.current;
    const stale = () => cancelled || attempt !== generationRef.current;
    void (async () => {
      try {
        const allowed = await readIsAllowed();
        if (stale() || !allowed) return;
        const address = await readAddress();
        if (stale() || !address) return;
        const network = await readNetwork();
        if (stale()) return;
        dispatch({
          type: WALLET_ACTIONS.CONNECTED,
          address,
          network: network.network,
          networkPassphrase: network.networkPassphrase,
        });
      } catch {
        // The extension is gone or no longer trusts the site: stay disconnected.
        if (!stale()) clearSessionFlag();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Follow the account inside the extension while connected.
  useEffect(() => {
    if (state.status !== WALLET_STATUS.CONNECTED) return undefined;

    let cancelled = false;
    let stop = null;

    void (async () => {
      try {
        const unsubscribe = await watchWallet((change) => {
          if (cancelled) return;
          if (change.error) {
            dispatch({
              type: WALLET_ACTIONS.FAILED,
              error: change.error.message,
              errorCode: change.error.code,
            });
            return;
          }
          if (change.networkPassphrase && change.networkPassphrase !== state.networkPassphrase) {
            dispatch({ type: WALLET_ACTIONS.NETWORK_CHANGED, network: change.network,
              networkPassphrase: change.networkPassphrase });
          }
          if (change.address && change.address !== state.address) {
            dispatch({
              type: WALLET_ACTIONS.ACCOUNT_CHANGED,
              address: change.address,
              network: change.network,
              networkPassphrase: change.networkPassphrase,
            });
          }
        });
        if (cancelled) {
          unsubscribe();
          return;
        }
        stop = unsubscribe;
        unsubscribeRef.current = unsubscribe;
      } catch {
        // Watching is best effort: the session still works without it.
      }
    })();

    return () => {
      cancelled = true;
      if (stop) {
        try {
          stop();
        } catch {
          /* the extension may already be gone */
        }
      }
    };
  }, [state.status, state.address, state.networkPassphrase]);

  const value = useMemo(
    () => ({
      ...state,
      connect,
      disconnect,
    }),
    [state, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

/**
 * Reads the wallet state and actions.
 *
 * @returns {{
 *   status: string,
 *   address: string | null,
 *   network: string | null,
 *   networkPassphrase: string | null,
 *   error: string | null,
 *   errorCode: string | null,
 *   wrongNetwork: boolean,
 *   connect: () => Promise<{ status: string, [key: string]: unknown }>,
 *   disconnect: () => void,
 * }}
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside a <WalletProvider>");
  }
  return context;
}
