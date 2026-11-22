import { test } from "node:test";
import assert from "node:assert/strict";
import { assertWalletNetwork, NetworkMismatchError, normalizeNetworkName } from "../lib/stellar/networkGuard.js";

test("normalizes testnet names consistently", () => {
  assert.equal(normalizeNetworkName("TESTNET"), "testnet");
  assert.equal(normalizeNetworkName("Test Network"), "testnet");
  assert.equal(normalizeNetworkName("mainnet"), "mainnet");
});

test("allows a matching wallet network", async () => {
  assert.equal(await assertWalletNetwork({ expected: "testnet", getNetwork: async () => "TESTNET" }), "TESTNET");
});

test("throws typed error with expected and actual network", async () => {
  await assert.rejects(
    assertWalletNetwork({ expected: "testnet", getNetwork: async () => "mainnet" }),
    (error) => error instanceof NetworkMismatchError && error.expected === "testnet" && error.actual === "mainnet",
  );
});
