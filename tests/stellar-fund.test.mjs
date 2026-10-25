import { test } from "node:test";
import assert from "node:assert/strict";
import { Account, Address, Keypair, Networks, scValToNative, TransactionBuilder } from "@stellar/stellar-sdk";
import { CONTRACT_ID } from "../lib/config.js";
import { toStroops, remainingStroops, MAX_I128 } from "../lib/stellar/amount.js";
import { buildFundTx, submitFund } from "../lib/stellar/fund.js";
import { SignatureCancelled, walletError } from "../lib/stellar/freighter.js";

for (const [input, expected] of [["1", 10000000n], ["0.0000001", 1n], ["12.50", 125000000n]]) {
  test(`toStroops converts ${input} exactly`, () => assert.equal(toStroops(input), expected));
}
for (const input of ["0.00000001", "-1", "1e3", "", "NaN", "1.2.3", " 1", 1, "9".repeat(40)]) {
  test(`toStroops rejects ${JSON.stringify(input)}`, () => assert.throws(() => toStroops(input)));
}
test("remaining capacity uses integer subtraction", () => {
  assert.equal(remainingStroops({ amount: "0.3", fundedAmount: "0.2" }), 1000000n);
});

const key = Keypair.random();
const investor = key.publicKey();
function fixture(overrides = {}) {
  let time = 0;
  const calls = { signatures: 0, sends: 0, polls: 0, phases: [] };
  const server = {
    getAccount: async (address) => { assert.equal(address, investor); return new Account(address, "42"); },
    prepareTransaction: async (tx) => tx,
    sendTransaction: async (tx) => { calls.sends++; return { status: "PENDING", hash: tx.hash().toString("hex") }; },
    getTransaction: async () => { calls.polls++; return { status: "SUCCESS" }; },
    ...overrides,
  };
  const sign = async (xdr, opts) => {
    calls.signatures++;
    assert.deepEqual(opts, { networkPassphrase: Networks.TESTNET, address: investor });
    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    tx.sign(key);
    return { signedTxXdr: tx.toXDR(), signerAddress: investor };
  };
  return { calls, options: { investor, amountStroops: toStroops("12.50"), server, sign,
    sleep: async (ms) => { time += ms; }, now: () => time,
    onStatus: (phase) => calls.phases.push(phase) } };
}

test("fund XDR targets configured contract, investor and exact i128 amount", async () => {
  const { options } = fixture();
  const tx = await buildFundTx(options);
  const decoded = TransactionBuilder.fromXDR(tx.toXDR(), Networks.TESTNET);
  // stellar-sdk 17 decodes XDR into plain typed objects (no accessor methods).
  const func = decoded.operations[0].func;
  assert.equal(func.type, "hostFunctionTypeInvokeContract");
  const invoke = func.invokeContract;
  assert.equal(Address.fromScAddress(invoke.contractAddress).toString(), CONTRACT_ID);
  assert.equal(invoke.functionName.toString(), "fund");
  assert.equal(scValToNative(invoke.args[0]), investor);
  assert.equal(invoke.args[1].type, "scvI128");
  assert.equal(scValToNative(invoke.args[1]), 125000000n);
});
test("builder rejects floats, zero, negative and overflow before RPC", async () => {
  for (const amountStroops of [1, 0n, -1n, MAX_I128 + 1n]) {
    await assert.rejects(buildFundTx({ investor, amountStroops, server: { getAccount: () => assert.fail("RPC") } }));
  }
});
test("simulation error is surfaced before signing", async () => {
  const { calls, options } = fixture({ prepareTransaction: async () => { throw new Error("simulation: Error(Contract, #101)"); } });
  await assert.rejects(submitFund(options), /Error\(Contract, #101\)/);
  assert.equal(calls.signatures, 0);
  assert.equal(calls.sends, 0);
});
test("user rejection stays a neutral cancellation and never submits", async () => {
  const { calls, options } = fixture();
  options.sign = async () => { throw walletError({ code: -4, message: "User declined access" }); };
  await assert.rejects(submitFund(options), SignatureCancelled);
  assert.equal(calls.sends, 0);
});
test("sendTransaction ERROR fails without polling", async () => {
  const { calls, options } = fixture({ sendTransaction: async () => ({ status: "ERROR" }) });
  await assert.rejects(submitFund(options), /submission failed/);
  assert.equal(calls.polls, 0);
});
for (const status of ["FAILED", "SUCCESS"]) {
  test(`poll resolves ${status} with transaction hash`, async () => {
    const { calls, options } = fixture({ getTransaction: async () => ({ status }) });
    const result = await submitFund(options);
    assert.equal(result.status, status);
    assert.match(result.hash, /^[0-9a-f]{64}$/);
    assert.deepEqual(calls.phases, ["Preparing", "Waiting for signature", "Submitting"]);
  });
}
test("pending transaction times out after 30 seconds", async () => {
  let polls = 0;
  const { options } = fixture({ getTransaction: async () => { polls++; return { status: "NOT_FOUND" }; } });
  const result = await submitFund(options);
  assert.equal(result.status, "TIMEOUT");
  assert.equal(polls, 20);
});
test("account changes abort before submission", async () => {
  const { calls, options } = fixture();
  const sign = options.sign;
  options.sign = async (...args) => ({ ...await sign(...args), signerAddress: Keypair.random().publicKey() });
  await assert.rejects(submitFund(options), /account changed/);
  assert.equal(calls.sends, 0);
});
test("a different signed transaction cannot be submitted", async () => {
  const { calls, options } = fixture();
  options.sign = async () => ({ signerAddress: investor, signedTxXdr: (await buildFundTx({ ...options, amountStroops: 1n })).toXDR() });
  await assert.rejects(submitFund(options), /differs from/);
  assert.equal(calls.sends, 0);
});

test("lost submission acknowledgement preserves hash without retrying", async () => {
  const { options } = fixture({ sendTransaction: async () => { throw new Error("connection lost"); } });
  const result = await submitFund(options);
  assert.equal(result.status, "TIMEOUT");
  assert.match(result.hash, /^[0-9a-f]{64}$/);
});
test("temporary polling failure can still confirm", async () => {
  let polls = 0;
  const { options } = fixture({ getTransaction: async () => {
    if (++polls === 1) throw new Error("RPC unavailable");
    return { status: "SUCCESS" };
  } });
  assert.equal((await submitFund(options)).status, "SUCCESS");
  assert.equal(polls, 2);
});

test("an RPC poll that never resolves cannot outlive the confirmation deadline", async () => {
  const { options } = fixture({ getTransaction: () => new Promise(() => {}) });
  let time = 0;
  options.now = () => time;
  options.sleep = async () => { time += 30_000; };
  assert.equal((await submitFund(options)).status, "TIMEOUT");
});
