// Client-side PDF validation for invoice uploads.
// Errors are returned/thrown as stable codes so callers can localize them.

export const PDF_MIME_TYPE = "application/pdf";
export const PDF_EXTENSION = ".pdf";
export const PDF_MAGIC_BYTES = Object.freeze([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
export const PDF_MAX_BYTES = 10 * 1024 * 1024;

export class PdfValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "PdfValidationError";
    this.code = code;
    this.details = details;
  }
}

function hasFileShape(file) {
  return Boolean(file) && typeof file === "object" && typeof file.size === "number" && typeof file.name === "string";
}

async function readBytes(file) {
  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer());
  }
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(new PdfValidationError("pdf.read", "Unable to read file."));
      reader.readAsArrayBuffer(file);
    });
  }
  throw new PdfValidationError("pdf.read", "Unable to read file.");
}

async function readPrefix(file, length) {
  const slice = typeof file.slice === "function" ? file.slice(0, length) : file;
  const bytes = await readBytes(slice);
  return bytes.slice(0, length);
}

function hasPdfMagic(bytes) {
  if (bytes.length < PDF_MAGIC_BYTES.length) return false;
  return PDF_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate an invoice PDF without trusting its MIME type or extension alone.
 * @param {File} file
 * @param {{ maxBytes?: number }} [options]
 * @returns {Promise<{ valid: true } | { valid: false, code: string, details: object }>}
 */
export async function validatePdfFile(file, { maxBytes = PDF_MAX_BYTES } = {}) {
  if (!hasFileShape(file)) {
    return { valid: false, code: "pdf.required", details: {} };
  }
  if (file.type !== PDF_MIME_TYPE) {
    return { valid: false, code: "pdf.type", details: { type: file.type || "unknown" } };
  }
  if (!file.name.toLowerCase().endsWith(PDF_EXTENSION)) {
    return { valid: false, code: "pdf.extension", details: {} };
  }
  if (file.size > maxBytes) {
    return { valid: false, code: "pdf.size", details: { size: file.size, maxBytes } };
  }
  if (file.size === 0) {
    return { valid: false, code: "pdf.empty", details: {} };
  }

  let prefix;
  try {
    prefix = await readPrefix(file, PDF_MAGIC_BYTES.length);
  } catch {
    return { valid: false, code: "pdf.read", details: {} };
  }
  if (!hasPdfMagic(prefix)) {
    return { valid: false, code: "pdf.signature", details: {} };
  }
  return { valid: true };
}

/**
 * Lowercase hexadecimal SHA-256 fingerprint of a file's bytes.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function sha256Hex(file) {
  if (!hasFileShape(file)) {
    throw new PdfValidationError("pdf.required", "No file selected.");
  }
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") {
    throw new PdfValidationError("pdf.hashUnavailable", "Web Crypto is not available.");
  }

  let bytes;
  try {
    bytes = await readBytes(file);
  } catch (cause) {
    throw new PdfValidationError("pdf.read", "Unable to read file.", { cause });
  }

  try {
    return toHex(await subtle.digest("SHA-256", bytes));
  } catch (cause) {
    throw new PdfValidationError("pdf.hashFailed", "Could not compute the file fingerprint.", { cause });
  }
}
