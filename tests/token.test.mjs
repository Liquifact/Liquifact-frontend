import { test } from "node:test";
import assert from "node:assert/strict";
import { KNOWN_ASSETS, NETWORK_PASSPHRASES, sacContractId } from "../lib/stellar/assets.js";
import { checkCurrency, identifyToken, resolveFundingToken } from "../lib/escrow/token.js";

const TESTNET = NETWORK_PASSPHRASES.testnet;

test("sacContractId: native XLM on testnet is the well-known SAC id", () => {
  assert.equal(sacContractId({ code: "XLM", issuer: "native" }, TESTNET), "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
});

test("identifyToken + checkCurrency: XLM native matches", () => {
  const id = identifyToken("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", "testnet");
  assert.equal(id.code, "XLM");
  assert.equal(id.issuer, "native");
  assert.deepEqual(checkCurrency("XLM", id), { ok: true, reason: "match" });
});

test("identifyToken + checkCurrency: USDC with the registry issuer matches", () => {
  const tokenId = sacContractId(KNOWN_ASSETS.testnet.USDC, TESTNET);
  const id = identifyToken(tokenId, "testnet");
  assert.equal(id.code, "USDC");
  assert.deepEqual(checkCurrency("USDC", id), { ok: true, reason: "match" });
});

test("USDC label with a different issuer is an unknown token", () => {
  const fake = sacContractId({ code: "USDC", issuer: KNOWN_ASSETS.public.USDC.issuer }, TESTNET);
  const id = identifyToken(fake, "testnet");
  assert.equal(id.unknown, true);
  assert.deepEqual(checkCurrency("USDC", id), { ok: false, reason: "unknown-token" });
});

test("checkCurrency: mismatch, unknown and non-7-decimals tokens are blocked", () => {
  assert.equal(checkCurrency("USDC", { code: "XLM", issuer: "native", decimals: 7 }).reason, "mismatch");
  assert.equal(checkCurrency("XLM", { unknown: true, tokenId: "C..." }).reason, "unknown-token");
  assert.equal(checkCurrency("XLM", null).reason, "unknown-token");
  assert.equal(checkCurrency("XLM", { code: "XLM", issuer: "native", decimals: 6 }).reason, "decimals");
});

test("resolveFundingToken reads get_funding_token and fails closed", async () => {
  const calls = [];
  const call = async (opts) => {
    calls.push(opts);
    return "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  };
  assert.equal(await resolveFundingToken("CABC", { call }), "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
  assert.equal(calls[0].method, "get_funding_token");
  assert.equal(calls[0].contractId, "CABC");
  await assert.rejects(resolveFundingToken("CABC", { call: async () => null }));
  await assert.rejects(resolveFundingToken("CABC", { call: async () => { throw new Error("rpc down"); } }));
});
