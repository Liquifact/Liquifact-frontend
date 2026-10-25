import { test } from "node:test";
import assert from "node:assert/strict";
import { spendable } from "../lib/stellar/spendable.js";
import { loadBalances } from "../lib/stellar/horizon.js";

test("spendable XLM subtracts reserve and fee buffer", async (t) => {
  await t.test("no subentries: 10000 XLM -> 9998 spendable", () => {
    const s = spendable({ balances: [{ code: "XLM", balance: "10000.0000000" }], subentryCount: 0, code: "XLM" });
    assert.equal(s, "9998");
  });

  await t.test("3 subentries reserve 1.5 XLM more", () => {
    const s = spendable({ balances: [{ code: "XLM", balance: "10000" }], subentryCount: 3, code: "XLM" });
    assert.equal(s, "9996.5");
  });

  await t.test("sponsorship adjustments affect reserve", () => {
    const s = spendable({ balances: [{ code: "XLM", balance: "10000" }], subentryCount: 3, numSponsored: 1, numSponsoring: 2, code: "XLM" });
    // effective subentries = 3 + 1 - 2 = 2 -> reserve (2+2)*0.5 = 2
    assert.equal(s, "9997");
  });

  await t.test("balance below reserve floors at 0", () => {
    const s = spendable({ balances: [{ code: "XLM", balance: "1.5" }], subentryCount: 0, code: "XLM" });
    assert.equal(s, "0");
  });

  await t.test("token balance passes through", () => {
    const s = spendable({ balances: [{ code: "USDC", issuer: "GABC", balance: "152.3" }], code: "USDC" });
    assert.equal(s, "152.3");
  });

  await t.test("missing asset is 0", () => {
    const s = spendable({ balances: [{ code: "XLM", balance: "100" }], code: "USDC" });
    assert.equal(s, "0");
  });
});

test("loadBalances parses Horizon responses", async (t) => {
  await t.test("normal response maps native and credit assets", async () => {
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        subentry_count: 2,
        num_sponsoring: 0,
        num_sponsored: 0,
        balances: [
          { asset_type: "native", balance: "100.5" },
          { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "GABC", balance: "25", limit: "1000" },
        ],
      }),
    });
    const r = await loadBalances("GTEST", { fetchFn });
    assert.equal(r.balances[0].code, "XLM");
    assert.equal(r.balances[0].issuer, null);
    assert.equal(r.balances[1].code, "USDC");
    assert.equal(r.balances[1].issuer, "GABC");
    assert.equal(r.subentryCount, 2);
    assert.equal(r.unfunded, undefined);
  });

  await t.test("404 returns unfunded marker", async () => {
    const fetchFn = async () => ({ ok: false, status: 404, json: async () => ({}) });
    const r = await loadBalances("GTEST", { fetchFn });
    assert.equal(r.unfunded, true);
    assert.deepEqual(r.balances, []);
  });

  await t.test("network error throws", async () => {
    const fetchFn = async () => ({ ok: false, status: 500, json: async () => ({}) });
    await assert.rejects(() => loadBalances("GTEST", { fetchFn }), /500/);
  });
});
