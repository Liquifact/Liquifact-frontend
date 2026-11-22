import { test } from "node:test";
import assert from "node:assert/strict";
import { NETWORKS, getNetwork, NETWORK_PASSPHRASES as netPassphrases } from "../lib/stellar/networks.js";
import { NETWORK_PASSPHRASES as rpcPassphrases } from "../lib/stellar/rpc.js";
import { NETWORK_PASSPHRASES as assetPassphrases } from "../lib/stellar/assets.js";

test("NETWORK_PASSPHRASES exports across networks, rpc, and assets are strictly equal", () => {
  assert.strictEqual(rpcPassphrases, netPassphrases);
  assert.strictEqual(assetPassphrases, netPassphrases);
  assert.strictEqual(rpcPassphrases, assetPassphrases);
});

test("NETWORK_PASSPHRASES contains expected keys and passphrases", () => {
  assert.equal(netPassphrases.testnet, "Test SDF Network ; September 2015");
  assert.equal(netPassphrases.mainnet, "Public Global Stellar Network ; September 2015");
  assert.equal(netPassphrases.pubnet, "Public Global Stellar Network ; September 2015");
  assert.equal(netPassphrases.public, "Public Global Stellar Network ; September 2015");
});

test("NETWORKS passphrases match NETWORK_PASSPHRASES", () => {
  assert.equal(NETWORKS.testnet.passphrase, netPassphrases.testnet);
  assert.equal(NETWORKS.mainnet.passphrase, netPassphrases.mainnet);
  assert.equal(NETWORKS.pubnet.passphrase, netPassphrases.pubnet);
});

test("getNetwork returns network config or falls back to testnet", () => {
  assert.equal(getNetwork("testnet").name, "testnet");
  assert.equal(getNetwork("mainnet").name, "mainnet");
  assert.equal(getNetwork("pubnet").name, "pubnet");
  assert.equal(getNetwork("nonexistent").name, "testnet");
  assert.equal(getNetwork().name, "testnet");
});
