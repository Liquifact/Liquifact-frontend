// Pure PDF validation: no DOM, works on an ArrayBuffer/Uint8Array. Never executes file content.
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const EOF_WINDOW = 1024;

export const PDF_ERRORS = {
  INVALID_TYPE: "Not a valid PDF: only .pdf files (application/pdf) are accepted.",
  EMPTY_FILE: "Not a valid PDF: the file is empty.",
  FILE_TOO_LARGE: "The PDF is larger than the 10 MB limit.",
  BAD_MAGIC: "Not a valid PDF: the file does not start with %PDF-.",
  MISSING_EOF: "Not a valid PDF: the %%EOF trailer is missing or the file is truncated.",
  ENCRYPTED: "Encrypted PDFs are not accepted. Remove the password and try again.",
  JAVASCRIPT: "PDFs containing JavaScript actions are not accepted.",
  LAUNCH: "PDFs containing launch actions are not accepted.",
};

const latin1 = (u8) => new TextDecoder("latin1").decode(u8);

/**
 * @param {{name?: string, type?: string, size?: number}} file
 * @param {ArrayBuffer|Uint8Array} bytes
 * @returns {{valid: boolean, errors: {code: string, message: string}[]}}
 */
export function validatePdf(file, bytes) {
  const codes = [];
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
  const size = typeof file?.size === "number" ? file.size : u8.length;

  const nameOk = /\.pdf$/i.test(file?.name || "");
  const typeOk = file?.type === "application/pdf";
  if (!nameOk || !typeOk) codes.push("INVALID_TYPE");
  if (size > MAX_PDF_BYTES) codes.push("FILE_TOO_LARGE");

  if (u8.length === 0) {
    codes.push("EMPTY_FILE");
  } else {
    if (latin1(u8.subarray(0, 5)) !== "%PDF-") codes.push("BAD_MAGIC");
    if (!latin1(u8.subarray(Math.max(0, u8.length - EOF_WINDOW))).includes("%%EOF")) codes.push("MISSING_EOF");
    // Names end at a delimiter/whitespace, so /JS must not match /JSON etc.
    const text = latin1(u8);
    if (/\/Encrypt(?![A-Za-z0-9])/.test(text)) codes.push("ENCRYPTED");
    if (/\/(JavaScript|JS)(?![A-Za-z0-9])/.test(text)) codes.push("JAVASCRIPT");
    if (/\/Launch(?![A-Za-z0-9])/.test(text)) codes.push("LAUNCH");
  }

  const errors = codes.map((code) => ({ code, message: PDF_ERRORS[code] }));
  return { valid: errors.length === 0, errors };
}
