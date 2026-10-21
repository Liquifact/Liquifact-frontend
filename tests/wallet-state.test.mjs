import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_WALLET_STATE,
  WALLET_ACTIONS,
  WALLET_STATUS,
  isWalletReady,
  walletReducer,
} from "../lib/stellar/walletState.js";

test("the initial state is disconnected", () => {
  const state = walletReducer(undefined, { type: "unknown" });
  assert.equal(state.status, WALLET_STATUS.DISCONNECTED);
  assert.equal(state.address, null);
  assert.equal(state.network, null);
  assert.equal(state.error, null);
  assert.equal(state.wrongNetwork, false);
});

test("connect moves to connecting and clears the previous error", () => {
  const errored = walletReducer(INITIAL_WALLET_STATE, {
    type: WALLET_ACTIONS.FAILED,
    error: "boom",
    errorCode: "UNKNOWN",
  });

  const state = walletReducer(errored, { type: WALLET_ACTIONS.CONNECT });

  assert.equal(state.status, WALLET_STATUS.CONNECTING);
  assert.equal(state.error, null);
  assert.equal(state.errorCode, null);
});

test("connected stores the address and the network", () => {
  const state = walletReducer(INITIAL_WALLET_STATE, {
    type: WALLET_ACTIONS.CONNECTED,
    address: "GABC",
    network: "testnet",
    networkPassphrase: "Test SDF Network ; September 2015",
  });

  assert.equal(state.status, WALLET_STATUS.CONNECTED);
  assert.equal(state.address, "GABC");
  assert.equal(state.network, "testnet");
  assert.equal(state.networkPassphrase, "Test SDF Network ; September 2015");
  assert.equal(isWalletReady(state), true);
});

test("a rejected connection moves to error and keeps the reason", () => {
  const state = walletReducer(INITIAL_WALLET_STATE, {
    type: WALLET_ACTIONS.FAILED,
    error: "User rejected the request.",
    errorCode: "USER_REJECTED",
  });

  assert.equal(state.status, WALLET_STATUS.ERROR);
  assert.equal(state.error, "User rejected the request.");
  assert.equal(state.errorCode, "USER_REJECTED");
  assert.equal(state.address, null);
  assert.equal(isWalletReady(state), false);
});

test("a missing extension moves to no_wallet", () => {
  const state = walletReducer(INITIAL_WALLET_STATE, {
    type: WALLET_ACTIONS.NO_WALLET,
  });

  assert.equal(state.status, WALLET_STATUS.NO_WALLET);
  assert.equal(state.address, null);
});

test("an account switch keeps the session connected", () => {
  const connected = walletReducer(INITIAL_WALLET_STATE, {
    type: WALLET_ACTIONS.CONNECTED,
    address: "GOLD",
    network: "testnet",
  });

  const switched = walletReducer(connected, {
    type: WALLET_ACTIONS.ACCOUNT_CHANGED,
    address: "GNEW",
  });

  assert.equal(switched.status, WALLET_STATUS.CONNECTED);
  assert.equal(switched.address, "GNEW");
  assert.equal(switched.network, "testnet");
});

test("a network change flags the wrong network and back again", () => {
  const connected = walletReducer(INITIAL_WALLET_STATE, {
    type: WALLET_ACTIONS.CONNECTED,
    address: "GABC",
    network: "testnet",
  });

  const wrong = walletReducer(connected, {
    type: WALLET_ACTIONS.NETWORK_CHANGED,
    network: "public",
    wrongNetwork: true,
  });

  assert.equal(wrong.status, WALLET_STATUS.WRONG_NETWORK);
  assert.equal(wrong.wrongNetwork, true);
  assert.equal(wrong.network, "public");
  assert.equal(isWalletReady(wrong), false);

  const fixed = walletReducer(wrong, {
    type: WALLET_ACTIONS.NETWORK_CHANGED,
    network: "testnet",
    wrongNetwork: false,
  });

  assert.equal(fixed.status, WALLET_STATUS.CONNECTED);
  assert.equal(fixed.wrongNetwork, false);
  assert.equal(isWalletReady(fixed), true);
});

test("disconnect returns the initial state", () => {
  const connected = walletReducer(INITIAL_WALLET_STATE, {
    type: WALLET_ACTIONS.CONNECTED,
    address: "GABC",
    network: "testnet",
  });

  const state = walletReducer(connected, { type: WALLET_ACTIONS.DISCONNECT });

  assert.deepEqual(state, INITIAL_WALLET_STATE);
});

test("an unknown action returns the state unchanged", () => {
  const state = { ...INITIAL_WALLET_STATE, address: "GABC" };
  assert.equal(walletReducer(state, { type: "nope" }), state);
});
