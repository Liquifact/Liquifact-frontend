import { API_URL } from "../config.js";

function abortError() {
  const err = new Error("Upload cancelled");
  err.name = "AbortError";
  return err;
}

function mockUpload(sha256, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    let pct = 0;
    const done = () => {
      clearInterval(timer);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      done();
      reject(abortError());
    };
    const timer = setInterval(() => {
      pct = Math.min(100, pct + 25);
      onProgress?.(pct);
      if (pct >= 100) {
        done();
        resolve({ documentId: `mock-${sha256.slice(0, 8)}`, sha256, mock: true });
      }
    }, 80);
    signal?.addEventListener("abort", onAbort);
  });
}

function realUpload(file, sha256, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener("abort", onAbort);

    xhr.open("POST", `${API_URL}/api/invoices/documents`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status === 404 || xhr.status === 501) return resolve(null); // endpoint not shipped yet
      let body = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        /* non-JSON body */
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const err = new Error(body.error || `Upload failed (${xhr.status})`);
        err.status = xhr.status;
        return reject(err);
      }
      const doc = body.data || body;
      onProgress?.(100);
      resolve({ documentId: doc.documentId, sha256: doc.sha256 || sha256, mock: false });
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Network error while uploading the document"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort);

    const form = new FormData();
    form.append("file", file);
    form.append("sha256", sha256);
    xhr.send(form);
  });
}

/**
 * Upload an invoice PDF. Uses a mock when NEXT_PUBLIC_UPLOADS_MODE=mock or the
 * backend endpoint answers 404/501.
 * @returns {Promise<{documentId: string, sha256: string, mock: boolean}>}
 */
export async function uploadInvoiceDocument(file, { sha256, signal, onProgress } = {}) {
  const opts = { signal, onProgress };
  if (process.env.NEXT_PUBLIC_UPLOADS_MODE === "mock") return mockUpload(sha256, opts);
  const real = await realUpload(file, sha256, opts);
  return real || mockUpload(sha256, opts);
}
