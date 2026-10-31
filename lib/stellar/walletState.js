/**
 * Pure wallet state machine for the LiquiFact frontend.
 *
 * This module deliberately has **no React and no Freighter imports**: the
 * reducer is the single source of truth for the wallet state, so it can be
 * unit tested with the plain `node:test` runner (`npm test`).
 *
 * States:
 *
 *   disconnected ──connect()──► connecting ──accepted──► connected
 *        ▲                           │  └──rejected───► error
 *        │                           │  └──no extension► no_wallet
 *        │                           └──wrong network─► wrong_network
 *        └────────── disconnect() ────┴──account change─► connected
 *
 * The network guard is not wired up yet (network mismatch blocking is a
 * separate issue), but `wrongNetwork` is already a first-class flag so the
 * guard only has to set it when it lands.
 */

export const WALLET_STATUS = Object.freeze({
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
  WRONG_NETWORK: "wrong_network",
  NO_WALLET: "no_wallet",
});

export const WALLET_ACTIONS = Object.freeze({
  /** A connection attempt started. */
  CONNECT: "connect",
  /** The wallet accepted the connection. */
  CONNECTED: "connected",
  /** The connection attempt failed. */
  FAILED: "failed",
  /** No wallet extension is installed in the browser. */
  NO_WALLET: "no_wallet",
  /** The user switched accounts inside the extension. */
  ACCOUNT_CHANGED: "account_changed",
  /** The extension reported a network change. */
  NETWORK_CHANGED: "network_changed",
  /** The session was terminated. */
  DISCONNECT: "disconnect",
});

export const INITIAL_WALLET_STATE = Object.freeze({
  status: WALLET_STATUS.DISCONNECTED,
  /** Stellar address (G…) of the connected account, or null. */
  address: null,
  /** Network name reported by the extension, e.g. "testnet". */
  network: null,
  /** Network passphrase reported by the extension. */
  networkPassphrase: null,
  /** Human readable reason for the last failure. */
  error: null,
  /** Machine readable reason for the last failure. */
  errorCode: null,
  /** True when the wallet is connected to the wrong Stellar network. */
  wrongNetwork: false,
});

/**
 * Reducer for the wallet state.
 *
 * Every transition is a pure function of `(state, action)`, so the whole
 * machine can be exercised without a browser, a wallet extension or React.
 *
 * @param {typeof INITIAL_WALLET_STATE} state
 * @param {{ type: string, [key: string]: unknown }} action
 * @returns {typeof INITIAL_WALLET_STATE}
 */
export function walletReducer(state = INITIAL_WALLET_STATE, action = {}) {
  switch (action.type) {
    case WALLET_ACTIONS.CONNECT:
      return {
        ...state,
        status: WALLET_STATUS.CONNECTING,
        error: null,
        errorCode: null,
      };

    case WALLET_ACTIONS.CONNECTED:
      return {
        ...state,
        status: WALLET_STATUS.CONNECTED,
        address: action.address ?? null,
        network: action.network ?? null,
        networkPassphrase: action.networkPassphrase ?? null,
        error: null,
        errorCode: null,
        wrongNetwork: false,
      };

    case WALLET_ACTIONS.FAILED:
      return {
        ...state,
        status: WALLET_STATUS.ERROR,
        address: null,
        network: null,
        networkPassphrase: null,
        error: action.error ?? "The wallet connection failed.",
        errorCode: action.errorCode ?? null,
        wrongNetwork: false,
      };

    case WALLET_ACTIONS.NO_WALLET:
      return {
        ...state,
        status: WALLET_STATUS.NO_WALLET,
        address: null,
        network: null,
        networkPassphrase: null,
        error: action.error ?? "No Stellar wallet extension was detected.",
        errorCode: action.errorCode ?? null,
        wrongNetwork: false,
      };

    case WALLET_ACTIONS.ACCOUNT_CHANGED:
      return {
        ...state,
        status: WALLET_STATUS.CONNECTED,
        address: action.address ?? null,
        network: action.network ?? state.network,
        networkPassphrase: action.networkPassphrase ?? state.networkPassphrase,
        error: null,
        errorCode: null,
      };

    case WALLET_ACTIONS.NETWORK_CHANGED: {
      const wrongNetwork = Boolean(action.wrongNetwork);
      return {
        ...state,
        status: wrongNetwork ? WALLET_STATUS.WRONG_NETWORK : WALLET_STATUS.CONNECTED,
        network: action.network ?? state.network,
        networkPassphrase: action.networkPassphrase ?? state.networkPassphrase,
        wrongNetwork,
        error: wrongNetwork
          ? action.error ?? "The wallet is on the wrong Stellar network."
          : null,
        errorCode: wrongNetwork ? action.errorCode ?? null : null,
      };
    }

    case WALLET_ACTIONS.DISCONNECT:
      return { ...INITIAL_WALLET_STATE };

    default:
      return state;
  }
}

/**
 * True when the wallet is usable: connected and on the expected network.
 *
 * @param {typeof INITIAL_WALLET_STATE} state
 * @returns {boolean}
 */
export function isWalletReady(state) {
  return state.status === WALLET_STATUS.CONNECTED && !state.wrongNetwork;
}
