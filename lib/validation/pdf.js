const PDF_MAGIC = "%PDF-";
const DISPLAY_NAME_LIMIT = 80;

function hasPdfExtension(name = "") {
  return /\.pdf$/i.test(name);
}

async function readFilePrefix(file, byteLength) {
  const blob = file.slice(0, byteLength);
  const buffer = blob.arrayBuffer
    ? await blob.arrayBuffer()
    : await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(blob);
    });
  return Array.from(new Uint8Array(buffer), (byte) => String.fromCharCode(byte)).join("");
}

export function sanitizeFilename(name = "invoice.pdf") {
  const baseName = String(name)
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  const safeName = baseName || "invoice.pdf";

  if (safeName.length <= DISPLAY_NAME_LIMIT) {
    return safeName;
  }

  const extension = hasPdfExtension(safeName) ? ".pdf" : "";
  const marker = "...";
  const limit = DISPLAY_NAME_LIMIT - extension.length - marker.length;
  return `${safeName.slice(0, Math.max(limit, 1))}${marker}${extension}`;
}

/**
 * Validates a browser File as a PDF without trusting only the MIME type.
 * It checks size, extension, reported MIME, and the leading "%PDF-" bytes.
 */
export async function validatePdfFile(file, constraints) {
  if (!file) {
    return "No file selected.";
  }

  if (file.size === 0) {
    return "File is empty. Upload a complete PDF invoice.";
  }

  if (file.size > constraints.maxSizeBytes) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    return `File is ${sizeMb} MB - exceeds the ${constraints.maxSizeMb} MB limit.`;
  }

  if (!hasPdfExtension(file.name)) {
    return "Invalid file extension. Upload a file ending in .pdf.";
  }

  if (file.type !== constraints.mimeType) {
    return `Invalid file type "${file.type || "unknown"}". Only PDF files are accepted.`;
  }

  const prefix = await readFilePrefix(file, PDF_MAGIC.length);
  if (prefix !== PDF_MAGIC) {
    return "File content does not look like a PDF document.";
  }

  return null;
}
