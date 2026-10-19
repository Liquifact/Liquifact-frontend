import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Account,
  Address,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { describeTx } from "../lib/stellar/describeTx.js";
import {
  IntentMismatchError,
  assertMatchesIntent,
} from "../lib/stellar/assertMatchesIntent.js";

const CONTRACT = "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P";
const BUYER = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";

function buildXdr(operations) {
  const source = Keypair.random();
  const account = new Account(source.publicKey(), "1");
  const transaction = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  });
  for (const operation of operations) transaction.addOperation(operation);
  return transaction.setTimeout(0).build().toXDR();
}

function fundOperation(amount = 20_000_000n, fn = "fund") {
  return Operation.invokeContractFunction({
    args: [
      new Address(BUYER).toScVal(),
      nativeToScVal(amount, { type: "i128" }),
    ],
    contract: CONTRACT,
    function: fn,
  });
}

function fundXdr(amount = 20_000_000n, fn = "fund") {
  return buildXdr([fundOperation(amount, fn)]);
}

test("describes a Soroban contract call", () => {
  const description = describeTx(fundXdr(), Networks.TESTNET);

  assert.equal(description.network, "testnet");
  assert.equal(description.fee, "0.00001");
  assert.equal(description.sequence, "2");
  assert.equal(description.operations.length, 1);
  assert.deepEqual(description.operations[0], {
    type: "invokeContract",
    contractId: CONTRACT,
    fn: "fund",
    args: [BUYER, 20_000_000n],
  });
});

test("describes a changeTrust operation", () => {
  const issuer = Keypair.random().publicKey();
  const xdr = buildXdr([
    Operation.changeTrust({ asset: new Asset("USDC", issuer), limit: "100" }),
  ]);
  const description = describeTx(xdr, Networks.TESTNET);

  assert.deepEqual(description.operations[0], {
    type: "changeTrust",
    asset: `USDC:${issuer}`,
    limit: "100.0000000",
  });
});

test("describes multiple operations", () => {
  const issuer = Keypair.random().publicKey();
  const xdr = buildXdr([
    Operation.changeTrust({ asset: new Asset("USDC", issuer), limit: "100" }),
    Operation.changeTrust({ asset: new Asset("EURC", issuer), limit: "200" }),
  ]);
  const description = describeTx(xdr, Networks.TESTNET);

  assert.equal(description.operations.length, 2);
});

test("rejects invalid XDR", () => {
  assert.throws(() => describeTx("not-xdr", Networks.TESTNET), /Invalid transaction XDR/);
});

test("accepts a matching intent", () => {
  const description = describeTx(fundXdr(), Networks.TESTNET);
  const intent = { args: [BUYER, 20_000_000n], contractId: CONTRACT, fn: "fund" };

  assert.equal(assertMatchesIntent(description, intent), true);
});

test("rejects a different contract", () => {
  const description = describeTx(fundXdr(), Networks.TESTNET);
  const intent = {
    args: [BUYER, 20_000_000n],
    contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
    fn: "fund",
  };

  assert.throws(
    () => assertMatchesIntent(description, intent),
    (error) =>
      error instanceof IntentMismatchError &&
      error.differences.some((difference) => difference.includes("contractId")),
  );
});

test("rejects a different function", () => {
  const description = describeTx(fundXdr(), Networks.TESTNET);
  const intent = { args: [BUYER, 20_000_000n], contractId: CONTRACT, fn: "withdraw" };

  assert.throws(
    () => assertMatchesIntent(description, intent),
    (error) =>
      error instanceof IntentMismatchError &&
      error.differences.some((difference) => difference.includes("fn")),
  );
});

test("rejects an amount that differs by one stroop", () => {
  const description = describeTx(fundXdr(), Networks.TESTNET);
  const intent = { args: [BUYER, 20_000_001n], contractId: CONTRACT, fn: "fund" };

  assert.throws(
    () => assertMatchesIntent(description, intent),
    (error) =>
      error instanceof IntentMismatchError &&
      error.differences.some((difference) => difference.includes("arg 1")),
  );
});

test("rejects a transaction with an extra operation", () => {
  const issuer = Keypair.random().publicKey();
  const xdr = buildXdr([
    fundOperation(),
    Operation.changeTrust({ asset: new Asset("USDC", issuer), limit: "100" }),
  ]);
  const description = describeTx(xdr, Networks.TESTNET);
  const intent = { args: [BUYER, 20_000_000n], contractId: CONTRACT, fn: "fund" };

  assert.throws(
    () => assertMatchesIntent(description, intent),
    (error) =>
      error instanceof IntentMismatchError &&
      error.differences.some((difference) => difference.includes("exactly 1 operation")),
  );
});
