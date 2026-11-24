import { test } from "node:test";
import assert from "node:assert/strict";
import { Account, Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { addTrustline } from "../lib/stellar/trustline.js";
import { NETWORK_PASSPHRASES } from "../lib/stellar/rpc.js";

const userKey = Keypair.random();
const userAddress = userKey.publicKey();
const issuerAddress = Keypair.random().publicKey();
const getNetwork = async () => "testnet";
const issuedAsset = { code: "USDC", issuer: issuerAddress, type: "credit_alphanum4" };

function createFixture({ network = "testnet", submitResult = { hash: "abc123", successful: true } } = {}) {
  const calls = {
    loadedAddress: null,
    signXdr: null,
    signPassphrase: null,
    submittedTx: null,
  };

  const server = {
    async loadAccount(address) {
      calls.loadedAddress = address;
      return new Account(address, "100");
    },
    async submitTransaction(tx) {
      calls.submittedTx = tx;
      return submitResult;
    },
  };

  const signFn = async (xdr, passphrase) => {
    calls.signXdr = xdr;
    calls.signPassphrase = passphrase;
    const tx = TransactionBuilder.fromXDR(xdr, passphrase);
    tx.sign(userKey);
    return tx.toXDR();
  };

  return { calls, server, signFn, network, submitResult };
}

test("rejects native asset with documented error before touching server or signer", async () => {
  const server = {
    loadAccount: async () => assert.fail("loadAccount should not be called"),
    submitTransaction: async () => assert.fail("submitTransaction should not be called"),
  };
  const signFn = async () => assert.fail("signFn should not be called");

  await assert.rejects(
    addTrustline({
      address: userAddress,
      asset: { code: "XLM", type: "native" },
      network: "testnet",
      server,
      signFn,
      getNetwork,
    }),
    { message: "Trustlines only apply to issued assets" }
  );
});

test("rejects missing or issuer-less asset with documented error", async () => {
  const server = {
    loadAccount: async () => assert.fail("loadAccount should not be called"),
    submitTransaction: async () => assert.fail("submitTransaction should not be called"),
  };
  const signFn = async () => assert.fail("signFn should not be called");

  for (const asset of [null, undefined, { code: "USDC", type: "credit_alphanum4" }, { code: "USDC", issuer: "" }]) {
    await assert.rejects(
      addTrustline({
        address: userAddress,
        asset,
        network: "testnet",
        server,
        signFn,
        getNetwork,
      }),
      { message: "Trustlines only apply to issued assets" }
    );
  }
});

test("builds a single changeTrust op for the issued asset and returns submitTransaction result", async () => {
  const expectedResult = { hash: "deadbeef", ledger: 42, successful: true };
  const { calls, server, signFn } = createFixture({ network: "testnet", submitResult: expectedResult });

  const result = await addTrustline({
    address: userAddress,
    asset: issuedAsset,
    network: "testnet",
    server,
    signFn,
    getNetwork,
  });

  assert.equal(calls.loadedAddress, userAddress);
  assert.equal(calls.signPassphrase, NETWORK_PASSPHRASES.testnet);

  const unsignedTx = TransactionBuilder.fromXDR(calls.signXdr, NETWORK_PASSPHRASES.testnet);
  assert.equal(unsignedTx.operations.length, 1);
  const [op] = unsignedTx.operations;
  assert.equal(op.type, "changeTrust");
  assert.equal(op.line.code, issuedAsset.code);
  assert.equal(op.line.issuer, issuedAsset.issuer);

  assert.ok(calls.submittedTx, "submitTransaction should receive the signed transaction");
  assert.equal(calls.submittedTx.operations.length, 1);
  assert.equal(calls.submittedTx.operations[0].type, "changeTrust");
  assert.equal(calls.submittedTx.signatures.length, 1);
  assert.deepEqual(result, expectedResult);
});

test("selects network passphrase per network (testnet vs public)", async () => {
  for (const network of ["testnet", "public"]) {
    const expectedPassphrase = NETWORK_PASSPHRASES[network];
    const { calls, server, signFn } = createFixture({ network });

    await addTrustline({
      address: userAddress,
      asset: issuedAsset,
      network,
      server,
      signFn,
      getNetwork: async () => network,
    });

    assert.equal(calls.signPassphrase, expectedPassphrase);
    const decoded = TransactionBuilder.fromXDR(calls.signXdr, expectedPassphrase);
    assert.equal(decoded.networkPassphrase, expectedPassphrase);
    assert.equal(decoded.operations.length, 1);
    assert.equal(decoded.operations[0].type, "changeTrust");
    assert.equal(calls.submittedTx.networkPassphrase, expectedPassphrase);
  }
});
