import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reducer,
  initialState,
  canAdvance,
  stepErrors,
  toPayload,
  percentToBps,
  payoutPer1000,
  tomorrowISO,
  SME_ADDRESS_ERROR,
} from "../lib/submitWizard.js";
import { isValidPublicKey } from "../lib/stellar/address.js";

const VALID_KEY = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";
const SECRET_KEY = "SA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";

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

test("toPayload converts and omits blank or invalid wallet", () => {
  const p = toPayload({ ...valid, yieldPercent: "6.5", smeAddress: "  " });
  assert.equal(p.yieldBps, 650);
  assert.equal(p.amount, 100);
  assert.equal("smeAddress" in p, false);
  assert.equal(toPayload({ ...valid, smeAddress: `  ${VALID_KEY}  ` }).smeAddress, VALID_KEY);
  assert.equal("smeAddress" in toPayload({ ...valid, smeAddress: " GABC " }), false);
  assert.equal("smeAddress" in toPayload({ ...valid, smeAddress: SECRET_KEY }), false);
});

test("tomorrowISO", () => {
  assert.equal(tomorrowISO(new Date(2026, 11, 31)), "2027-01-01");
});

test("isValidPublicKey accepts valid G-address and rejects invalid", () => {
  assert.equal(isValidPublicKey(VALID_KEY), true);
  assert.equal(isValidPublicKey(`  ${VALID_KEY}  `), true);
  assert.equal(isValidPublicKey(""), false);
  assert.equal(isValidPublicKey("   "), false);
  assert.equal(isValidPublicKey("GABC"), false);
  assert.equal(isValidPublicKey(VALID_KEY.toLowerCase()), false);
  assert.equal(isValidPublicKey(SECRET_KEY), false);
  assert.equal(isValidPublicKey("CA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5"), false);
  assert.equal(isValidPublicKey(null), false);
  assert.equal(isValidPublicKey(undefined), false);
  assert.equal(isValidPublicKey(12345), false);
});

test("terms step: empty smeAddress is allowed", () => {
  const formWithEmpty = { ...valid, smeAddress: "" };
  assert.equal(stepErrors(formWithEmpty, 1).smeAddress, undefined);
  let s = fill(initialState(), formWithEmpty);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 1);
  assert.equal(canAdvance(s), true);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 2);
});

test("terms step: valid G-address is accepted and allows advancing", () => {
  const formWithValid = { ...valid, smeAddress: `  ${VALID_KEY}  ` };
  assert.equal(stepErrors(formWithValid, 1).smeAddress, undefined);
  let s = fill(initialState(), formWithValid);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 1);
  assert.equal(canAdvance(s), true);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 2);
});

test("terms step: invalid G-address blocks advancing", () => {
  const formWithInvalid = { ...valid, smeAddress: "GABC" };
  const errs = stepErrors(formWithInvalid, 1);
  assert.equal(errs.smeAddress, SME_ADDRESS_ERROR);
  let s = fill(initialState(), formWithInvalid);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 1);
  assert.equal(canAdvance(s), false);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 1);
  assert.equal(s.errors.smeAddress, SME_ADDRESS_ERROR);
});

test("terms step: secret key is rejected and never echoed", () => {
  const formWithSecret = { ...valid, smeAddress: SECRET_KEY };
  const errs = stepErrors(formWithSecret, 1);
  assert.equal(errs.smeAddress, SME_ADDRESS_ERROR);
  assert.equal(errs.smeAddress.includes(SECRET_KEY), false);
  assert.equal(errs.smeAddress.includes("SA7TX"), false);
  let s = fill(initialState(), formWithSecret);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 1);
  assert.equal(canAdvance(s), false);
  s = reducer(s, { type: "next" });
  assert.equal(s.step, 1);
  assert.equal(s.errors.smeAddress, SME_ADDRESS_ERROR);
  assert.equal(s.errors.smeAddress.includes(SECRET_KEY), false);
});

test("setStep cannot skip to review when terms step has invalid smeAddress", () => {
  const s = fill(initialState(), { ...valid, smeAddress: "GABC" });
  const next = reducer(s, { type: "setStep", step: 2 });
  assert.equal(next.step, 1);
});
