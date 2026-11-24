import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  PDF_MAX_BYTES,
  PdfValidationError,
  sha256Hex,
  validatePdfFile,
} from "../lib/validation/pdf.js";

const PDF_BYTES = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");

function makeFile({ name = "invoice.pdf", type = "application/pdf", bytes = PDF_BYTES } = {}) {
  return new File([bytes], name, { type });
}

test("accepts a PDF with matching MIME type, extension and magic bytes", async () => {
  assert.deepEqual(await validatePdfFile(makeFile()), { valid: true });
});

test("rejects a missing file", async () => {
  const result = await validatePdfFile(null);
  assert.equal(result.valid, false);
  assert.equal(result.code, "pdf.required");
});

test("rejects a non-PDF MIME type", async () => {
  const result = await validatePdfFile(makeFile({ type: "text/plain" }));
  assert.equal(result.valid, false);
  assert.equal(result.code, "pdf.type");
  assert.equal(result.details.type, "text/plain");
});

test("rejects a spoofed extension even when the MIME type claims PDF", async () => {
  const result = await validatePdfFile(makeFile({ name: "invoice.txt" }));
  assert.equal(result.valid, false);
  assert.equal(result.code, "pdf.extension");
});

test("accepts a case-insensitive .PDF extension", async () => {
  assert.deepEqual(await validatePdfFile(makeFile({ name: "INVOICE.PDF" })), { valid: true });
});

test("rejects a file over the maximum size", async () => {
  const result = await validatePdfFile(makeFile(), { maxBytes: 4 });
  assert.equal(result.valid, false);
  assert.equal(result.code, "pdf.size");
  assert.equal(result.details.maxBytes, 4);
  assert.equal(result.details.size, PDF_BYTES.length);
});

test("rejects an empty file", async () => {
  const result = await validatePdfFile(makeFile({ bytes: Buffer.alloc(0) }));
  assert.equal(result.valid, false);
  assert.equal(result.code, "pdf.empty");
});

test("rejects a file whose bytes do not start with %PDF-", async () => {
  const result = await validatePdfFile(makeFile({ bytes: Buffer.from("not really a pdf") }));
  assert.equal(result.valid, false);
  assert.equal(result.code, "pdf.signature");
});

test("reports read failures without throwing", async () => {
  const result = await validatePdfFile({ name: "broken.pdf", type: "application/pdf", size: 10 });
  assert.equal(result.valid, false);
  assert.equal(result.code, "pdf.read");
});

test("uses a 10 MB default size cap", () => {
  assert.equal(PDF_MAX_BYTES, 10 * 1024 * 1024);
});

test("sha256Hex returns a lowercase hexadecimal fingerprint", async () => {
  const file = makeFile();
  const hash = await sha256Hex(file);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, createHash("sha256").update(PDF_BYTES).digest("hex"));
});

test("sha256Hex reports file-reading failures as structured errors", async () => {
  await assert.rejects(
    sha256Hex({ name: "broken.pdf", type: "application/pdf", size: 10 }),
    (error) => error instanceof PdfValidationError && error.code === "pdf.read",
  );
});

test("sha256Hex reports unavailable Web Crypto", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  if (!descriptor || !descriptor.configurable) return;
  try {
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    await assert.rejects(
      sha256Hex(makeFile()),
      (error) => error instanceof PdfValidationError && error.code === "pdf.hashUnavailable",
    );
  } finally {
    Object.defineProperty(globalThis, "crypto", descriptor);
  }
});
