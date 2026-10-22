import { test } from "node:test";
import assert from "node:assert/strict";
import { reducer, initialState, canAdvance, toPayload, percentToBps, payoutPer1000, tomorrowISO } from "../lib/submitWizard.js";

const valid = { sme: "A", debtor: "B", amount: "100", currency: "USDC", yieldPercent: "8", dueDate: "2030-01-01", smeAddress: "" };
const fill = (s, f) => Object.entries(f).reduce((st, [field, value]) => reducer(st, { type: "set", field, value }), s);

test("cannot advance with errors and errors are exposed", () => {
  const s = initialState();
  assert.equal(canAdvance(s), false);
  const n = reducer(s, { type: "next" });
  assert.equal(n.step, 0);
  assert.deepEqual(Object.keys(n.errors).sort(), ["amount", "debtor", "sme"]);
});

test("advancing marks step fields touched", () => {
  let s = fill(initialState(), valid);
  assert.equal(canAdvance(s), true);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 1);
  for (const f of ["sme", "debtor", "amount", "currency"]) assert.equal(s.touched[f], true);
});

test("editing from review returns to review after Next", () => {
  let s = fill(initialState(), valid);
  s = reducer(reducer(s, { type: "next" }), { type: "next" });
  assert.equal(s.step, 2);
  s = reducer(s, { type: "edit", step: 0 });
  assert.equal(s.step, 0);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 2);
});

test("reset after success", () => {
  let s = fill(initialState(), valid);
  s = reducer(s, { type: "submitSuccess", invoice: { id: "inv_1" } });
  assert.equal(s.status.state, "success");
  s = reducer(s, { type: "reset" });
  assert.deepEqual(s, initialState());
});

test("setStep cannot skip past invalid steps", () => {
  const s = reducer(initialState(), { type: "setStep", step: 2 });
  assert.equal(s.step, 0);
});

test("percent converts to bps; >2dp is rejected", () => {
  assert.equal(percentToBps("8"), 800);
  assert.equal(percentToBps("6.5"), 650);
  assert.equal(percentToBps("8.29"), 829);
  assert.ok(Number.isNaN(percentToBps("8.125")));
  assert.ok(Number.isNaN(percentToBps("")));
  assert.equal(payoutPer1000("8"), 1080);
});

test("8.125 is a validation error on the terms step", () => {
  let s = fill(initialState(), { ...valid, yieldPercent: "8.125" });
  s = reducer(reducer(s, { type: "next" }), { type: "next" });
  assert.equal(s.step, 1);
  assert.ok(s.errors.yieldPercent);
});

test("toPayload converts and omits blank wallet", () => {
  const p = toPayload({ ...valid, yieldPercent: "6.5", smeAddress: "  " });
  assert.equal(p.yieldBps, 650);
  assert.equal(p.amount, 100);
  assert.equal("smeAddress" in p, false);
  assert.equal(toPayload({ ...valid, smeAddress: " GABC " }).smeAddress, "GABC");
});

test("tomorrowISO", () => {
  assert.equal(tomorrowISO(new Date(2026, 11, 31)), "2027-01-01");
});
