import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIRM_ERROR,
  DRAFT_KEY,
  EMPTY_FORM,
  SME_ADDRESS_ERROR,
  STEPS,
  VALIDATION_ERROR_CODES,
  YIELD_ERROR,
  bpsLabel,
  errorMessageKey,
  initialState,
  normalizeDocument,
  percentToBps,
  payoutPer1000,
  reducer,
  canAdvance,
  stepErrors,
  stepFromSearch,
  toPayload,
  tomorrowISO,
  validateAll,
} from "../lib/submitWizard.js";
import { isValidPublicKey } from "../lib/stellar/address.js";
import { validateInvoiceForm } from "../lib/format.js";
import en from "../lib/i18n/dictionaries/en.js";
import es from "../lib/i18n/dictionaries/es.js";
import { t } from "../lib/i18n/index.js";

const VALID_KEY = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";
const SECRET_KEY = "SA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";
const SHA256 = "a".repeat(64);
const DOCUMENT = { name: "invoice.pdf", size: 2048, sha256: SHA256 };

const valid = { sme: "A", debtor: "B", amount: "100", currency: "USDC", yieldPercent: "8", dueDate: "2030-01-01", smeAddress: "" };
const fill = (s, f) => Object.entries(f).reduce((st, [field, value]) => reducer(st, { type: "set", field, value }), s);

test("cannot advance with errors and errors are exposed as stable codes", () => {
  const s = initialState();
  assert.equal(canAdvance(s), false);
  const n = reducer(s, { type: "next" });
  assert.equal(n.step, 0);
  assert.deepEqual(n.errors, {
    sme: "sme.required",
    debtor: "debtor.required",
    amount: "amount.positive",
  });
});

test("validators return codes, never English prose", () => {
  const errs = validateInvoiceForm({ sme: "", debtor: "", amount: "-1", yieldBps: "x", dueDate: "" });
  assert.deepEqual(errs, {
    sme: "sme.required",
    debtor: "debtor.required",
    amount: "amount.positive",
    yieldBps: "yield.range",
    dueDate: "dueDate.required",
  });
  for (const code of Object.values(errs)) assert.match(code, /^[a-zA-Z]+\.[a-zA-Z]+$/);
});

test("every validation code resolves to an English and Spanish message", () => {
  for (const code of VALIDATION_ERROR_CODES) {
    const key = errorMessageKey(code);
    assert.equal(key, `submit.error.${code}`);
    assert.equal(typeof en[key], "string", `missing en ${key}`);
    assert.equal(typeof es[key], "string", `missing es ${key}`);
    assert.notEqual(t(en, key), key);
    assert.notEqual(t(es, key), key);
  }
  assert.equal(errorMessageKey("not.a.code"), null);
  assert.equal(errorMessageKey(undefined), null);
});

test("translated validation messages differ by locale", () => {
  const key = errorMessageKey("sme.required");
  assert.equal(t(en, key), "Company name is required");
  assert.equal(t(es, key), "El nombre de la empresa es obligatorio");
  assert.equal(t(en, errorMessageKey("amount.positive")), "Enter a positive amount");
  assert.equal(t(es, errorMessageKey("amount.positive")), "Introduce un importe positivo");
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
  assert.equal(bpsLabel("8"), "800 bps");
});

test("8.125 is a code-based validation error on the terms step", () => {
  let s = fill(initialState(), { ...valid, yieldPercent: "8.125" });
  s = reducer(reducer(s, { type: "next" }), { type: "next" });
  assert.equal(s.step, 1);
  assert.equal(s.errors.yieldPercent, YIELD_ERROR);
  assert.equal(YIELD_ERROR, "yield.format");
});

test("confirmation checkbox uses a stable code", () => {
  const errors = validateAll({ ...valid, document: null });
  assert.equal(errors.confirmed, CONFIRM_ERROR);
  assert.equal(CONFIRM_ERROR, "confirmed.required");
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

test("toPayload includes documentSha256 only for a validated fingerprint", () => {
  const withDoc = toPayload({ ...valid, document: DOCUMENT });
  assert.equal(withDoc.documentSha256, SHA256);
  assert.deepEqual(Object.keys(withDoc).sort(), ["amount", "currency", "debtor", "documentSha256", "dueDate", "sme", "yieldBps"]);

  for (const document of [null, undefined, {}, { name: "x.pdf", size: 10 }, { name: "x.pdf", size: 10, sha256: "not-a-hash" }, { name: "", size: 10, sha256: SHA256 }, { name: "x.pdf", size: -1, sha256: SHA256 }, { name: "x.pdf", size: 10, sha256: SHA256.toUpperCase() }]) {
    assert.equal("documentSha256" in toPayload({ ...valid, document }), false);
  }
});

test("normalizeDocument keeps only validated metadata", () => {
  assert.deepEqual(normalizeDocument({ ...DOCUMENT, bytes: "ignored" }), DOCUMENT);
  assert.equal(normalizeDocument({ ...DOCUMENT, name: "  " }), null);
  assert.equal(normalizeDocument({ ...DOCUMENT, name: "invoice.txt" }), null);
  assert.equal(normalizeDocument({ ...DOCUMENT, size: Number.NaN }), null);
  assert.equal(normalizeDocument({ ...DOCUMENT, size: 0 }), null);
  assert.equal(normalizeDocument({ ...DOCUMENT, sha256: "abc" }), null);
  assert.equal(normalizeDocument(null), null);
});

test("reducer clears the fingerprint when the document is removed or replaced", () => {
  let s = fill(initialState(), { ...valid, document: DOCUMENT });
  assert.deepEqual(s.form.document, DOCUMENT);
  s = reducer(s, { type: "set", field: "document", value: null });
  assert.equal(s.form.document, null);
  assert.equal("documentSha256" in toPayload(s.form), false);
  s = reducer(s, { type: "set", field: "document", value: { ...DOCUMENT, sha256: "b".repeat(64) } });
  assert.equal(toPayload(s.form).documentSha256, "b".repeat(64));
});

test("draft restoration restores metadata, ignores confirmation and drops invalid fingerprints", () => {
  const restored = reducer(initialState(), {
    type: "restore",
    form: { ...valid, confirmed: true, document: DOCUMENT },
  });
  assert.equal(restored.step, 0);
  assert.equal(restored.form.confirmed, false);
  assert.deepEqual(restored.form.document, DOCUMENT);

  const tampered = reducer(initialState(), {
    type: "restore",
    form: { ...valid, document: { name: "invoice.pdf", size: 2048, sha256: "oops" } },
  });
  assert.equal(tampered.form.document, null);
  assert.equal("documentSha256" in toPayload(tampered.form), false);
});

test("initialState keeps a draft fingerprint but sanitizes it", () => {
  assert.deepEqual(initialState({ ...valid, document: DOCUMENT }).form.document, DOCUMENT);
  assert.equal(initialState({ ...valid, document: { name: "x.pdf", size: 1, sha256: "bad" } }).form.document, null);
  assert.equal(EMPTY_FORM.document, null);
});

test("draft key and step titles remain stable", () => {
  assert.equal(DRAFT_KEY, "liquifact-submit-draft");
  assert.deepEqual(STEPS.map((s) => s.id), ["details", "terms", "review"]);
  assert.deepEqual(STEPS.map((s) => s.titleKey), ["submit.step.details", "submit.step.terms", "submit.step.review"]);
  for (const step of STEPS) {
    assert.equal(typeof en[step.titleKey], "string");
    assert.equal(typeof es[step.titleKey], "string");
  }
});

test("stepFromSearch parses URL step synchronization", () => {
  assert.equal(stepFromSearch(""), 0);
  assert.equal(stepFromSearch("?step=1"), 0);
  assert.equal(stepFromSearch("?step=2"), 1);
  assert.equal(stepFromSearch("?step=3"), 2);
  assert.equal(stepFromSearch("?step=4"), 0);
  assert.equal(stepFromSearch("?step=0"), 0);
  assert.equal(stepFromSearch("?step=abc"), 0);
  assert.equal(stepFromSearch("?step=2", 2), 1);
  assert.equal(stepFromSearch("?step=3", 2), 0);
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
  assert.equal(SME_ADDRESS_ERROR, "smeAddress.invalid");
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
