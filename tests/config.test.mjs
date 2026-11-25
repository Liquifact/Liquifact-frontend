import { test } from "node:test";
import assert from "node:assert/strict";
import { networkLabel } from "../lib/config.js";

test("networkLabel returns Mainnet for 'public'", () => {
  assert.equal(networkLabel("public"), "Mainnet");
});

test("networkLabel returns Mainnet for 'mainnet'", () => {
  assert.equal(networkLabel("mainnet"), "Mainnet");
});

test("networkLabel returns Mainnet for 'pubnet'", () => {
  assert.equal(networkLabel("pubnet"), "Mainnet");
});

test("networkLabel returns Testnet for 'testnet'", () => {
  assert.equal(networkLabel("testnet"), "Testnet");
});

test("networkLabel returns Testnet for unknown values", () => {
  assert.equal(networkLabel("staging"), "Testnet");
  assert.equal(networkLabel(""), "Testnet");
  assert.equal(networkLabel(undefined), "Testnet");
});
