/**
 * Copies text to the clipboard using navigator.clipboard.writeText when available,
 * falling back to document.execCommand('copy') with a temporary textarea element
 * for non-secure contexts (http, iframe without permission, older browsers).
 *
 * @param {string} text - The text string to copy to the clipboard.
 * @returns {Promise<void>} Resolves when text is copied, rejects on failure.
 */
export async function copyToClipboard(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid text provided for copying");
  }

  // Primary method: Async Clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // If navigator.clipboard.writeText fails (e.g. permission denied or unsupported context),
      // fall through to attempt the execCommand fallback.
    }
  }

  // Fallback method: Temporary textarea + document.execCommand('copy')
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    try {
      const successful = document.execCommand("copy");
      if (!successful) {
        throw new Error("document.execCommand('copy') returned false");
      }
    } finally {
      document.body.removeChild(textarea);
    }
    return;
  }

  throw new Error("Clipboard API and fallback execution are unavailable");
}
