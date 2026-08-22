"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "./ToastProvider";

/**
 * Copy a string to the clipboard.
 *
 * Tries the modern Clipboard API first; falls back to the legacy
 * `document.execCommand("copy")` approach for environments where the
 * Clipboard API is unavailable (e.g. non-secure contexts, older browsers).
 *
 * @param {string} text - The text to copy.
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Legacy execCommand fallback — works in non-secure contexts and older browsers.
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  // Move off-screen so it is invisible but still selectable.
  el.style.cssText = "position:fixed;left:-9999px;top:-9999px";
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(el);
  if (!ok) {
    throw new Error("execCommand copy failed");
  }
}

/**
 * CopyButton — an accessible inline button that copies `text` to the clipboard.
 *
 * Features:
 * - Clipboard API with documented `execCommand` fallback.
 * - 2-second "Copied!" visual + aria-label feedback.
 * - Polite `aria-live` live-region announcement.
 * - Toast notification on success (and on failure, gracefully).
 * - Keyboard-operable (`type="button"`, visible focus ring).
 *
 * @param {Object}  props
 * @param {string}  props.text              - The value to copy.
 * @param {string}  [props.label]           - Accessible label prefix, e.g. "Reference ID".
 * @param {string}  [props.successMessage]  - Toast message on success.
 * @param {string}  [props.errorMessage]    - Toast message on failure.
 * @param {string}  [props.className]       - Extra Tailwind classes for the button.
 */
export default function CopyButton({
  text,
  label = "Copy",
  successMessage = "Copied to clipboard.",
  errorMessage = "Unable to copy — please copy manually.",
  className = "",
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);
  const toast = useToast();

  // Clean up timer on unmount to avoid state updates on unmounted component.
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      toast.success(successMessage, "Copied!");
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed — surface an error toast, but do not crash.
      toast.error(errorMessage, "Copy failed");
    }
  }, [text, successMessage, errorMessage, toast]);

  const ariaLabel = copied ? "Copied!" : `Copy ${label}`;

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={ariaLabel}
        title={copied ? "Copied!" : `Copy ${label}`}
        className={
          `inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 ` +
          `hover:text-slate-300 focus-ring transition-colors ${className}`
        }
      >
        {copied ? (
          /* Check-mark icon */
          <svg
            aria-hidden="true"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          /* Copy / clipboard icon */
          <svg
            aria-hidden="true"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
        {/* Screen-reader-only text mirrors the icon state */}
        <span className="sr-only">{copied ? "Copied!" : "Copy"}</span>
      </button>

      {/* Polite live region so assistive technology announces the confirmation */}
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {copied ? "Copied!" : ""}
      </span>
    </span>
  );
}
