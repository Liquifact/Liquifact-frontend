import test from "node:test";
import assert from "node:assert/strict";

import {
  Account,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";

import {
  checkIntent,
  reviewTransactionXdr,
  summarizeTransactionXdr,
} from "../lib/stellar/txReview.js";

const CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 1));
const OTHER_CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 9));
const SOURCE = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 2));

function buildXdr(operations, passphrase = Networks.TESTNET) {
  let builder = new TransactionBuilder(new Account(SOURCE, "1"), {
    fee: "100",
    networkPassphrase: passphrase,
  });
  for (const operation of operations) {
    builder = builder.addOperation(
      Operation.invokeContractFunction({
        contract: operation.contract ?? CONTRACT,
        function: operation.function ?? "fund",
        args: [nativeToScVal(operation.amount ?? 12_500_000n, { type: "i128" })],
      })
    );
  }
  return builder.setTimeout(30).build().toXDR();
}

test("summarizes a contract call without exposing raw XDR", () => {
  const summary = summarizeTransactionXdr(buildXdr([{ function: "fund" }]), "testnet");

  assert.equal(summary.network, "testnet");
  assert.equal(summary.operations.length, 1);
  assert.deepEqual(summary.operations[0], {
    kind: "contract_call",
    contractId: CONTRACT,
    functionName: "fund",
    args: [12_500_000n],
  });
});

test("accepts a matching intent, including a string amount", () => {
  const summary = summarizeTransactionXdr(buildXdr([{ function: "fund" }]), "testnet");

  const verification = checkIntent(summary, {
    contractId: CONTRACT,
    functionName: "fund",
    amount: "12500000",
  });

  assert.deepEqual(verification, { ok: true, problems: [] });
});

test("rejects a different amount", () => {
  const summary = summarizeTransactionXdr(buildXdr([{ function: "fund" }]), "testnet");

  const verification = checkIntent(summary, {
    contractId: CONTRACT,
    functionName: "fund",
    amount: 1n,
  });

  assert.equal(verification.ok, false);
  assert.match(verification.problems.join(" "), /amount/i);
});

test("rejects a different contract or function", () => {
  const summary = summarizeTransactionXdr(buildXdr([{ function: "fund" }]), "testnet");

  assert.equal(
    checkIntent(summary, { contractId: OTHER_CONTRACT, functionName: "fund" }).ok,
    false
  );
  assert.equal(checkIntent(summary, { contractId: CONTRACT, functionName: "claim" }).ok, false);
});

test("rejects multi-operation transactions", () => {
  const summary = summarizeTransactionXdr(
    buildXdr([{ function: "fund" }, { function: "fund" }]),
    "testnet"
  );

  const verification = checkIntent(summary, { contractId: CONTRACT, functionName: "fund" });

  assert.equal(verification.ok, false);
  assert.match(verification.problems.join(" "), /2 operations/i);
});

test("reviewTransactionXdr returns both the summary and the verification", () => {
  const review = reviewTransactionXdr(buildXdr([{ function: "fund" }]), {
    network: "testnet",
    intent: { contractId: CONTRACT, functionName: "fund", amount: 12_500_000n },
  });

  assert.equal(review.summary.operations[0].functionName, "fund");
  assert.equal(review.verification.ok, true);
});

test("rejects malformed XDR with a friendly error", () => {
  assert.throws(() => summarizeTransactionXdr("not-xdr", "testnet"), /not valid on testnet/);
});
