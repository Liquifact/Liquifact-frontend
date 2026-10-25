import { test } from "node:test";
import assert from "node:assert/strict";
import * as money from "../lib/money.js";
import { fundedPercent, fundedPercentPrecise } from "../lib/format.js";

test("decimal amounts use exact minor-unit arithmetic", () => {
  const sum = money.add(money.parse("0.1", "XLM"), money.parse("0.2", "XLM"));
  assert.equal(sum, money.parse("0.3", "XLM"));
  assert.equal(money.format(sum, "XLM", { maxFractionDigits: 7 }), "0.3 XLM");
});

test("stroop strings preserve values above Number precision", () => {
  assert.equal(money.parse("9007199254740993", "XLM", { minor: true }), 9007199254740993n);
});

test("non-zero minor units never format as zero", () => {
  assert.equal(money.format(1n, "XLM"), "< 0.01 XLM");
  assert.equal(money.format(1n, "XLM", { maxFractionDigits: 7 }), "0.0000001 XLM");
});

test("invalid amount inputs are rejected", () => {
  for (const value of [-1, "-1", NaN, "NaN", "1e3", "1.00000001"]) {
    assert.throws(() => money.parse(value, "USDC"));
  }
});

test("money helpers support exact addition, subtraction, comparison, and minimum", () => {
  const one = money.parse("1", "EURC");
  const two = money.parse("2", "EURC");
  assert.equal(money.sub(one, two, { clamp: true }), 0n);
  assert.equal(money.cmp(one, two), -1);
  assert.equal(money.min(one, two), one);
});

test("funding percentages floor until fully funded", () => {
  assert.equal(fundedPercent({ amount: 1000, fundedAmount: 996 }), 99);
  assert.equal(fundedPercent({ amount: 1000, fundedAmount: 4 }), 0);
  assert.equal(fundedPercent({ amount: 100, fundedAmount: 500 }), 100);
  assert.equal(fundedPercent({ amount: "1000", fundedAmount: "996", currency: "USDC" }), 99);
  assert.equal(fundedPercentPrecise({ amount: 1000, fundedAmount: 996 }), 99.6);
  assert.equal(fundedPercentPrecise({ amount: 1000, fundedAmount: 999.9 }), 99.9);
});