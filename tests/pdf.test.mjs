import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePdf, MAX_PDF_BYTES } from "../lib/validation/pdf.js";

const enc = (s) => new TextEncoder().encode(s);
const VALID = "%PDF-1.4\n1 0 obj<< /Type /Catalog >>endobj\ntrailer<< /Root 1 0 R >>\n%%EOF\n";
const file = (over = {}) => ({ name: "inv.pdf", type: "application/pdf", size: VALID.length, ...over });
const codes = (r) => r.errors.map((e) => e.code);

test("accepts a minimal valid PDF", () => {
  const r = validatePdf(file(), enc(VALID));
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, []);
});

test("rejects wrong magic header and wrong type/extension", () => {
  const r = validatePdf(file({ name: "x.pdf" }), enc("\x89PNG\r\n" + VALID.slice(5)));
  assert.ok(codes(r).includes("BAD_MAGIC"));
  assert.ok(codes(validatePdf(file({ type: "image/png" }), enc(VALID))).includes("INVALID_TYPE"));
  assert.ok(codes(validatePdf(file({ name: "x.png" }), enc(VALID))).includes("INVALID_TYPE"));
});

test("rejects files over 10 MB using the reported size", () => {
  const r = validatePdf(file({ size: MAX_PDF_BYTES + 1 }), enc(VALID));
  assert.deepEqual(codes(r), ["FILE_TOO_LARGE"]);
});

test("rejects encrypted PDFs, JavaScript actions and launch actions", () => {
  const withKey = (k) => enc(VALID.replace("trailer<<", `trailer<< ${k} `));
  assert.deepEqual(codes(validatePdf(file(), withKey("/Encrypt 5 0 R"))), ["ENCRYPTED"]);
  assert.deepEqual(codes(validatePdf(file(), withKey("/S /JavaScript"))), ["JAVASCRIPT"]);
  assert.deepEqual(codes(validatePdf(file(), withKey("/JS (app.alert(1))"))), ["JAVASCRIPT"]);
  assert.deepEqual(codes(validatePdf(file(), withKey("/S /Launch"))), ["LAUNCH"]);
});

test("rejects a missing %%EOF trailer", () => {
  const r = validatePdf(file(), enc(VALID.replace("%%EOF", "")));
  assert.deepEqual(codes(r), ["MISSING_EOF"]);
});

test("rejects empty files", () => {
  assert.ok(codes(validatePdf(file({ size: 0 }), new ArrayBuffer(0))).includes("EMPTY_FILE"));
});
