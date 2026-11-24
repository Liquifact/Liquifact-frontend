import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Account,
  Keypair,
  Networks,
  SorobanDataBuilder,
  TransactionBuilder,
  rpc as StellarRpc,
  xdr,
} from "@stellar/stellar-sdk";
import { toStroops } from "../lib/stellar/amount.js";
import { isBadSequence } from "../lib/stellar/badSequence.js";
import { submitFund } from "../lib/stellar/fund.js";
import { buildRefundArgs, buildSignSubmit } from "../lib/stellar/rpc.js";

const RETRY_STATUS = "Retrying with updated account…";

function errorResult(code) {
  return xdr.TransactionResult.fromXdrObject({ feeCharged: 100n, result: { code }, ext: { v: 0 } });
}

function badSequenceResponse() {
  return { status: "ERROR", errorResult: errorResult(-5) };
}

function otherErrorResponse() {
  return { status: "ERROR", errorResult: errorResult(-6) };
}

test("isBadSequence decodes the tx_bad_seq result code", () => {
  assert.equal(isBadSequence(badSequenceResponse()), true);
  assert.equal(isBadSequence({ status: "ERROR", errorResult: { result: { code: -5 } } }), true);
  assert.equal(isBadSequence({ status: "ERROR", errorResult: badSequenceResponse().errorResult.toXDR("base64") }), true);
  assert.equal(isBadSequence(otherErrorResponse()), false);
  assert.equal(isBadSequence({ status: "PENDING", errorResult: errorResult(-5) }), false);
  assert.equal(isBadSequence({ status: "ERROR" }), false);
  assert.equal(isBadSequence(null), false);
});

function rpcFixture(responses = [badSequenceResponse()]) {
  const key = Keypair.random();
  const signerAddress = key.publicKey();
  const calls = { accounts: 0, simulations: 0, signatures: 0, sends: 0, statuses: [], sequences: [], accountSequences: [] };
  let sequence = 10;

  const server = {
    getAccount: async (address) => {
      assert.equal(address, signerAddress);
      calls.accounts++;
      calls.accountSequences.push(String(sequence));
      return new Account(address, String(sequence));
    },
    simulateTransaction: async () => {
      calls.simulations++;
      return {
        id: `sim-${calls.simulations}`,
        latestLedger: 1000,
        minResourceFee: "50000",
        transactionData: new SorobanDataBuilder().setResourceFee("50000").build().toXDR("base64"),
        results: [{ auth: [], xdr: xdr.ScVal.scvVoid().toXDR("base64") }],
        events: [],
      };
    },
    sendTransaction: async (tx) => {
      const index = calls.sends++;
      calls.sequences.push(tx.sequence);
      const response = responses[index];
      if (response && isBadSequence(response)) sequence++;
      return response ?? { status: "PENDING", hash: tx.hash().toString("hex") };
    },
    getTransaction: async () => ({ status: StellarRpc.Api.GetTransactionStatus.SUCCESS }),
  };

  const sign = async (txXdr, passphrase) => {
    assert.equal(passphrase, Networks.TESTNET);
    calls.signatures++;
    const tx = TransactionBuilder.fromXDR(txXdr, passphrase);
    tx.sign(key);
    return tx.toXDR();
  };
  const onStatus = (status) => calls.statuses.push(status);
  const options = { network: "testnet", server, sign, getNetwork: async () => "testnet" };

  return { calls, onStatus, options, signerAddress, sign };
}

test("buildSignSubmit rebuilds with a fresh account and re-signs exactly once on tx_bad_seq", async () => {
  const { calls, onStatus, options, signerAddress } = rpcFixture();

  await buildSignSubmit("refund", buildRefundArgs(signerAddress), signerAddress, onStatus, options);

  assert.equal(calls.accounts, 2);
  assert.equal(calls.simulations, 2);
  assert.equal(calls.signatures, 2);
  assert.equal(calls.sends, 2);
  assert.deepEqual(calls.accountSequences, ["10", "11"]);
  assert.notEqual(calls.sequences[0], calls.sequences[1]);
  assert.equal(calls.statuses.filter((status) => status === RETRY_STATUS).length, 1);
  assert.ok(calls.statuses.indexOf(RETRY_STATUS) > calls.statuses.indexOf("Waiting for signature…"));
});

test("buildSignSubmit never retries other send errors or a rejected signature", async () => {
  const other = rpcFixture([otherErrorResponse()]);
  await assert.rejects(
    buildSignSubmit("refund", buildRefundArgs(other.signerAddress), other.signerAddress, other.onStatus, other.options),
    (error) => error instanceof Error && error.message.length > 0,
  );
  assert.equal(other.calls.accounts, 1);
  assert.equal(other.calls.signatures, 1);
  assert.equal(other.calls.sends, 1);
  assert.equal(other.calls.statuses.includes(RETRY_STATUS), false);

  const cancelled = rpcFixture();
  await assert.rejects(
    buildSignSubmit("refund", buildRefundArgs(cancelled.signerAddress), cancelled.signerAddress, cancelled.onStatus, {
      ...cancelled.options,
      sign: async () => { throw new Error("User declined access"); },
    }),
    (error) => error.userCancelled === true,
  );
  assert.equal(cancelled.calls.accounts, 1);
  assert.equal(cancelled.calls.sends, 0);
  assert.equal(cancelled.calls.statuses.includes(RETRY_STATUS), false);

  const twice = rpcFixture([badSequenceResponse(), badSequenceResponse()]);
  await assert.rejects(
    buildSignSubmit("refund", buildRefundArgs(twice.signerAddress), twice.signerAddress, twice.onStatus, twice.options),
  );
  assert.equal(twice.calls.accounts, 2);
  assert.equal(twice.calls.signatures, 2);
  assert.equal(twice.calls.sends, 2);
  assert.equal(twice.calls.statuses.filter((status) => status === RETRY_STATUS).length, 1);
});

function fundFixture(responses = [badSequenceResponse()]) {
  const key = Keypair.random();
  const investor = key.publicKey();
  const calls = { accounts: 0, signatures: 0, sends: 0, polls: 0, phases: [], sequences: [], accountSequences: [] };
  let sequence = 42;

  const server = {
    getAccount: async (address) => {
      assert.equal(address, investor);
      calls.accounts++;
      calls.accountSequences.push(String(sequence));
      return new Account(address, String(sequence));
    },
    prepareTransaction: async (tx) => tx,
    sendTransaction: async (tx) => {
      const index = calls.sends++;
      calls.sequences.push(tx.sequence);
      const response = responses[index];
      if (response && isBadSequence(response)) sequence++;
      return response ?? { status: "PENDING", hash: tx.hash().toString("hex") };
    },
    getTransaction: async () => { calls.polls++; return { status: "SUCCESS" }; },
  };

  const sign = async (xdrString, opts) => {
    assert.deepEqual(opts, { networkPassphrase: Networks.TESTNET, address: investor });
    calls.signatures++;
    const tx = TransactionBuilder.fromXDR(xdrString, Networks.TESTNET);
    tx.sign(key);
    return { signedTxXdr: tx.toXDR(), signerAddress: investor };
  };

  const options = {
    investor,
    amountStroops: toStroops("12.50"),
    server,
    sign,
    sleep: async () => {},
    now: () => 0,
    onStatus: (phase) => calls.phases.push(phase),
  };
  return { calls, options, signerAddress: investor, sign };
}

test("submitFund rebuilds with a fresh account and re-signs exactly once on tx_bad_seq", async () => {
  const { calls, options } = fundFixture();

  const result = await submitFund(options);

  assert.equal(result.status, "SUCCESS");
  assert.equal(calls.accounts, 2);
  assert.equal(calls.signatures, 2);
  assert.equal(calls.sends, 2);
  assert.equal(calls.polls, 1);
  assert.deepEqual(calls.accountSequences, ["42", "43"]);
  assert.notEqual(calls.sequences[0], calls.sequences[1]);
  assert.equal(calls.phases.filter((phase) => phase === RETRY_STATUS).length, 1);
  assert.deepEqual(calls.phases, [
    "Preparing",
    "Waiting for signature",
    "Submitting",
    RETRY_STATUS,
    "Preparing",
    "Waiting for signature",
    "Submitting",
  ]);
});

test("submitFund never retries other errors, rejected signatures or a second bad sequence", async () => {
  const other = fundFixture([otherErrorResponse()]);
  await assert.rejects(submitFund(other.options), /submission failed/);
  assert.equal(other.calls.accounts, 1);
  assert.equal(other.calls.signatures, 1);
  assert.equal(other.calls.sends, 1);
  assert.equal(other.calls.phases.includes(RETRY_STATUS), false);

  const cancelled = fundFixture();
  await assert.rejects(
    submitFund({ ...cancelled.options, sign: async () => { throw new Error("User declined access"); } }),
    /Signature cancelled|declined/,
  );
  assert.equal(cancelled.calls.sends, 0);
  assert.equal(cancelled.calls.phases.includes(RETRY_STATUS), false);

  const twice = fundFixture([badSequenceResponse(), badSequenceResponse()]);
  await assert.rejects(submitFund(twice.options), /submission failed/);
  assert.equal(twice.calls.accounts, 2);
  assert.equal(twice.calls.signatures, 2);
  assert.equal(twice.calls.sends, 2);
  assert.equal(twice.calls.phases.filter((phase) => phase === RETRY_STATUS).length, 1);
});
