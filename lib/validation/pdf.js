// lib/validation/pdf.js
/**
 * Checks whether a File object contains the PDF magic number "%PDF-".
 * Uses FileReader for better browser and test environment compatibility.
 * @param {File} file - The file to validate.
 * @returns {Promise<boolean>} Resolves to true if the file starts with "%PDF-".
 */
export async function isPdfMagicValid(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result;
      const decoder = new TextDecoder("utf-8");
      const header = decoder.decode(arrayBuffer.slice(0, 5));
      resolve(header === "%PDF-");
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file.slice(0, 5));
  });
}

/**
 * Validates a PDF file comprehensively including magic bytes, size, and extension.
 * @param {File} file - The file to validate.
 * @returns {Promise<{valid: boolean, reason?: string}>} Validation result with optional reason for failure.
 */
export async function validatePdfFile(file) {
  // Check for zero-byte files
  if (file.size === 0) {
    return { valid: false, reason: "File is empty (0 bytes)" };
  }

  // Check file extension matches PDF
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "pdf") {
    return { valid: false, reason: "File extension does not match .pdf" };
  }

  // Check PDF magic bytes
  const hasValidMagic = await isPdfMagicValid(file);
  if (!hasValidMagic) {
    return { valid: false, reason: "File content does not match PDF format" };
  }

  return { valid: true };
}

/**
 * Sanitizes a filename for safe display in the DOM.
 * - Escapes HTML characters to prevent XSS
 * - Truncates to maximum length to prevent layout abuse
 * @param {string} filename - The original filename.
 * @param {number} maxLength - Maximum length for display (default: 50).
 * @returns {string} Sanitized and truncated filename.
 */
export function sanitizeFilename(filename, maxLength = 50) {
  if (!filename) return "";

  // Escape HTML special characters
  const escaped = filename
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  // Truncate if too long
  if (escaped.length > maxLength) {
    return escaped.substring(0, maxLength - 3) + "...";
  }

  return escaped;
}
