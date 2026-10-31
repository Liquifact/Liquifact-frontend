import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WALLET_ERROR_CODE,
  WalletError,
  connect,
  getAddress,
  getNetwork,
  isAllowed,
  isAvailable,
  resetFreighterApi,
  setFreighterApi,
  signTransaction,
  watch,
} from "../lib/stellar/freighter.js";

const ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOP";

function fakeApi(overrides = {}) {
  return {
    isConnected: async () => ({ isConnected: true }),
    requestAccess: async () => ({ address: ADDRESS }),
    getAddress: async () => ({ address: ADDRESS }),
    isAllowed: async () => ({ isAllowed: true }),
    getNetworkDetails: async () => ({
      network: "testnet",
      networkUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    }),
    signTransaction: async () => ({ signedTxXdr: "signed-xdr", signerAddress: ADDRESS }),
    WatchWalletChanges: class {
      constructor() {
        this.cb = null;
        this.stopped = false;
      }
      watch(cb) {
        this.cb = cb;
        return {};
      }
      stop() {
        this.stopped = true;
      }
    },
    ...overrides,
  };
}

test("connect resolves with the selected address", async () => {
  setFreighterApi(fakeApi());
  assert.equal(await connect(), ADDRESS);
  resetFreighterApi();
});

test("a rejected request becomes a USER_REJECTED WalletError", async () => {
  setFreighterApi(
    fakeApi({
      requestAccess: async () => ({ error: { code: 4001, message: "User rejected the request." } }),
    }),
  );

  await assert.rejects(connect(), (error) => {
    assert.ok(error instanceof WalletError);
    assert.equal(error.code, WALLET_ERROR_CODE.USER_REJECTED);
    assert.equal(error.message, "User rejected the request.");
    return true;
  });
  resetFreighterApi();
});

test("an unknown error code becomes an UNKNOWN WalletError", async () => {
  setFreighterApi(
    fakeApi({
      requestAccess: async () => ({ error: { code: 5000, message: "Extension exploded." } }),
    }),
  );

  await assert.rejects(connect(), (error) => {
    assert.equal(error.code, WALLET_ERROR_CODE.UNKNOWN);
    assert.equal(error.message, "Extension exploded.");
    return true;
  });
  resetFreighterApi();
});

test("a missing extension becomes a NO_WALLET WalletError", async () => {
  setFreighterApi(
    fakeApi({
      isConnected: async () => ({ isConnected: false }),
    }),
  );

  await assert.rejects(connect(), (error) => {
    assert.equal(error.code, WALLET_ERROR_CODE.NO_WALLET);
    return true;
  });
  resetFreighterApi();
});

test("getAddress and isAllowed read the extension state", async () => {
  setFreighterApi(fakeApi());
  assert.equal(await getAddress(), ADDRESS);
  assert.equal(await isAllowed(), true);
  resetFreighterApi();
});

test("getNetwork maps the network details", async () => {
  setFreighterApi(fakeApi());
  assert.deepEqual(await getNetwork(), {
    network: "testnet",
    networkPassphrase: "Test SDF Network ; September 2015",
  });
  resetFreighterApi();
});

test("signTransaction returns the signed xdr and forwards the options", async () => {
  let seen = null;
  setFreighterApi(
    fakeApi({
      signTransaction: async (xdr, options) => {
        seen = { xdr, options };
        return { signedTxXdr: "signed-xdr", signerAddress: ADDRESS };
      },
    }),
  );

  const signed = await signTransaction("raw-xdr", {
    networkPassphrase: "Test SDF Network ; September 2015",
    address: ADDRESS,
  });

  assert.equal(signed, "signed-xdr");
  assert.equal(seen.xdr, "raw-xdr");
  assert.equal(seen.options.address, ADDRESS);
  resetFreighterApi();
});

test("watch reports account changes and can be unsubscribed", async () => {
  const instances = [];
  class Watcher {
    constructor() {
      this.cb = null;
      this.stopped = false;
      instances.push(this);
    }
    watch(cb) {
      this.cb = cb;
      return {};
    }
    stop() {
      this.stopped = true;
    }
  }

  setFreighterApi(fakeApi({ WatchWalletChanges: Watcher }));

  const changes = [];
  const stop = await watch((change) => changes.push(change));

  assert.equal(instances.length, 1);

  instances[0].cb({
    address: "GNEW",
    network: "testnet",
    networkPassphrase: "Test SDF Network ; September 2015",
  });

  assert.equal(changes.length, 1);
  assert.equal(changes[0].address, "GNEW");
  assert.equal(changes[0].network, "testnet");
  assert.equal(changes[0].error, undefined);

  stop();
  assert.equal(instances[0].stopped, true);
  resetFreighterApi();
});

test("watch turns an extension error into a WalletError", async () => {
  let watcher = null;
  class Watcher {
    watch(cb) {
      watcher = cb;
      return {};
    }
    stop() {}
  }

  setFreighterApi(fakeApi({ WatchWalletChanges: Watcher }));

  const changes = [];
  await watch((change) => changes.push(change));

  watcher({ error: { code: 4001, message: "User rejected the request." } });

  assert.equal(changes.length, 1);
  assert.ok(changes[0].error instanceof WalletError);
  assert.equal(changes[0].error.code, WALLET_ERROR_CODE.USER_REJECTED);
  resetFreighterApi();
});

test("availability uses isConnected even without an injected window global", async () => {
  setFreighterApi(fakeApi());
  assert.equal(await isAvailable(), true);
  resetFreighterApi();
});
test("the Freighter SEP-43 rejection code is normalized", async () => {
  setFreighterApi(fakeApi({ requestAccess: async () => ({ error: { code: -4, message: "Declined" } }) }));
  await assert.rejects(connect(), error => error.code === WALLET_ERROR_CODE.USER_REJECTED);
  resetFreighterApi();
});

test("legacy network-passphrase signing uses the current address", async () => {
  let seen;
  setFreighterApi(fakeApi({ signTransaction: async (xdr, options) => {
    seen = { xdr, options };
    return { signedXdr: "legacy-signed" };
  } }));
  try {
    assert.equal(await signTransaction("raw", "test-passphrase"), "legacy-signed");
    assert.deepEqual(seen, { xdr: "raw", options: { networkPassphrase: "test-passphrase", address: ADDRESS } });
  } finally { resetFreighterApi(); }
});
