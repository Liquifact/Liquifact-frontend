import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { uploadInvoiceDocument } from "../lib/api/uploads.js";

const SHA = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
let fake;

class FakeXHR {
  constructor() {
    this.upload = {};
    fake = this;
  }
  open(method, url) {
    this.method = method;
    this.url = url;
  }
  send(body) {
    this.body = body;
    setTimeout(() => {
      if (this.aborted) return;
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
      this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
      this.status = FakeXHR.status;
      this.responseText = FakeXHR.body;
      this.onload();
    }, 5);
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

const file = new Blob(["%PDF-"], { type: "application/pdf" });

beforeEach(() => {
  globalThis.XMLHttpRequest = FakeXHR;
  delete process.env.NEXT_PUBLIC_UPLOADS_MODE;
});
afterEach(() => {
  delete globalThis.XMLHttpRequest;
  delete process.env.NEXT_PUBLIC_UPLOADS_MODE;
});

test("real path posts multipart and reports progress", async () => {
  FakeXHR.status = 201;
  FakeXHR.body = JSON.stringify({ data: { documentId: "doc-1", sha256: SHA } });
  const seen = [];
  const res = await uploadInvoiceDocument(file, { sha256: SHA, onProgress: (p) => seen.push(p) });
  assert.deepEqual(res, { documentId: "doc-1", sha256: SHA, mock: false });
  assert.ok(fake.url.endsWith("/api/invoices/documents"));
  assert.ok(fake.body instanceof FormData);
  assert.deepEqual(seen.slice(0, 2), [50, 100]);
});

test("404 falls back to the mock", async () => {
  FakeXHR.status = 404;
  FakeXHR.body = "{}";
  const seen = [];
  const res = await uploadInvoiceDocument(file, { sha256: SHA, onProgress: (p) => seen.push(p) });
  assert.deepEqual(res, { documentId: "mock-ba7816bf", sha256: SHA, mock: true });
  assert.equal(seen.at(-1), 100);
});

test("NEXT_PUBLIC_UPLOADS_MODE=mock skips the network", async () => {
  process.env.NEXT_PUBLIC_UPLOADS_MODE = "mock";
  fake = null;
  const res = await uploadInvoiceDocument(file, { sha256: SHA });
  assert.equal(res.documentId, "mock-ba7816bf");
  assert.equal(fake, null);
});

test("abort rejects with AbortError", async () => {
  FakeXHR.status = 201;
  FakeXHR.body = "{}";
  const ctrl = new AbortController();
  const p = uploadInvoiceDocument(file, { sha256: SHA, signal: ctrl.signal });
  ctrl.abort();
  await assert.rejects(p, { name: "AbortError" });
});
