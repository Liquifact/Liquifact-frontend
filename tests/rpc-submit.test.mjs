import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Account,
  BASE_FEE,
  Keypair,
  Networks,
  SorobanDataBuilder,
  TransactionBuilder,
  rpc as StellarRpc,
  xdr,
} from "@stellar/stellar-sdk";
import { buildRefundArgs, buildSignSubmit } from "../lib/stellar/rpc.js";

const key = Keypair.random();
const signerAddress = key.publicKey();
const SIMULATED_RESOURCE_FEE = "50000";

function makeSimResponse() {
  return {
    id: "sim-1",
    latestLedger: 1000,
    minResourceFee: SIMULATED_RESOURCE_FEE,
    transactionData: new SorobanDataBuilder().setResourceFee(SIMULATED_RESOURCE_FEE).build().toXDR("base64"),
    results: [
      {
        auth: [],
        xdr: xdr.ScVal.scvVoid().toXDR("base64"),
      },
    ],
    events: [],
  };
}

function makeFixture(overrides = {}) {
  const calls = {
    simulatedTx: null,
    signedTx: null,
    sentTx: null,
    polls: 0,
    statuses: [],
  };

  const server = {
    getAccount: async (address) => {
      assert.equal(address, signerAddress);
      return new Account(address, "10");
    },
    simulateTransaction: async (tx) => {
      calls.simulatedTx = tx;
      return makeSimResponse();
    },
    sendTransaction: async (tx) => {
      calls.sentTx = tx;
      return { status: "PENDING", hash: tx.hash().toString("hex") };
    },
    getTransaction: async () => {
      calls.polls++;
      return { status: StellarRpc.Api.GetTransactionStatus.SUCCESS };
    },
    ...overrides,
  };

  const sign = async (txXdr, passphrase) => {
    assert.equal(passphrase, Networks.TESTNET);
    const tx = TransactionBuilder.fromXDR(txXdr, passphrase);
    calls.signedTx = tx;
    tx.sign(key);
    return tx.toXDR();
  };

  const onStatus = (status) => calls.statuses.push(status);

  return { calls, server, sign, onStatus };
}

test("buildSignSubmit uses BASE_FEE + simulated resource fee and resolves on SUCCESS", async () => {
  let pollCount = 0;
  const { calls, server, sign, onStatus } = makeFixture({
    getTransaction: async () => {
      pollCount++;
      calls.polls++;
      if (pollCount === 1) {
        return { status: StellarRpc.Api.GetTransactionStatus.NOT_FOUND };
      }
      return { status: StellarRpc.Api.GetTransactionStatus.SUCCESS };
    },
  });

  await buildSignSubmit("refund", buildRefundArgs(signerAddress), signerAddress, onStatus, {
    network: "testnet",
    server,
    sign,
    getNetwork: async () => "testnet",
    pollIntervalMs: 5,
    pollTimeoutMs: 500,
  });

  // Built with BASE_FEE, not hardcoded 1000000 stroops
  assert.equal(calls.simulatedTx.fee, BASE_FEE);
  // Assembled fee reflects base fee + simulated minResourceFee (no 0.1 XLM overpayment)
  assert.equal(Number(calls.signedTx.fee), Number(BASE_FEE) + Number(SIMULATED_RESOURCE_FEE));
  assert.notEqual(calls.signedTx.fee, "1000000");
  assert.equal(calls.polls, 2);
  assert.deepEqual(calls.statuses, [
    "Building transaction…",
    "Simulating…",
    "Waiting for signature…",
    "Submitting…",
    "Confirming on-chain…",
  ]);
});

test("buildSignSubmit throws on FAILED transaction status", async () => {
  const { calls, server, sign, onStatus } = makeFixture({
    getTransaction: async () => {
      calls.polls++;
      return { status: StellarRpc.Api.GetTransactionStatus.FAILED };
    },
  });

  await assert.rejects(
    buildSignSubmit("refund", buildRefundArgs(signerAddress), signerAddress, onStatus, {
      network: "testnet",
      server,
      sign,
      getNetwork: async () => "testnet",
      pollIntervalMs: 5,
      pollTimeoutMs: 500,
    }),
    /Transaction failed on-chain/,
  );
  assert.equal(calls.polls, 1);
});

test("buildSignSubmit throws timeout error when polling expires", async () => {
  const { calls, server, sign, onStatus } = makeFixture({
    getTransaction: async () => {
      calls.polls++;
      return { status: StellarRpc.Api.GetTransactionStatus.NOT_FOUND };
    },
  });

  await assert.rejects(
    buildSignSubmit("refund", buildRefundArgs(signerAddress), signerAddress, onStatus, {
      network: "testnet",
      server,
      sign,
      getNetwork: async () => "testnet",
      pollIntervalMs: 5,
      pollTimeoutMs: 25,
    }),
    /Transaction not confirmed within 60 s/,
  );
  assert.ok(calls.polls >= 1);
});

test("buildSignSubmit preserves userCancelled error contract when user rejects signing", async () => {
  const { calls, server, onStatus } = makeFixture();
  const sign = async () => {
    throw new Error("User declined access");
  };

  await assert.rejects(
    buildSignSubmit("refund", buildRefundArgs(signerAddress), signerAddress, onStatus, {
      network: "testnet",
      server,
      sign,
      getNetwork: async () => "testnet",
    }),
    (err) => {
      assert.equal(err.userCancelled, true);
      assert.match(err.message, /Transaction cancelled by user/);
      return true;
    },
  );
  assert.equal(calls.sentTx, null);
  assert.equal(calls.polls, 0);
});

test("buildSignSubmit aborts polling when AbortSignal fires", async () => {
  const controller = new AbortController();
  const { server, sign, onStatus } = makeFixture({
    getTransaction: async () => {
      controller.abort();
      return { status: StellarRpc.Api.GetTransactionStatus.NOT_FOUND };
    },
  });

  await assert.rejects(
    buildSignSubmit("refund", buildRefundArgs(signerAddress), signerAddress, onStatus, {
      network: "testnet",
      server,
      sign,
      getNetwork: async () => "testnet",
      signal: controller.signal,
      pollIntervalMs: 500,
      pollTimeoutMs: 5000,
    }),
    (err) => {
      assert.equal(err.name, "AbortError");
      return true;
    },
  );
});
