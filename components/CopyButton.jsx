"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOptionalToast } from "@/components/toast/ToastProvider";

function truncateValue(value, maxLen = 16) {
  const str = value == null ? "" : String(value).trim();
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return `${str.slice(0, 6)}…${str.slice(-4)}`;
}

/**
 * Copy a value to the clipboard. Inside a <ToastProvider> the result is
 * announced with a toast (#1399); standalone it falls back to an inline label.
 */
export default function CopyButton({ value, label = "Copy", ariaLabel }) {
  const toast = useOptionalToast();
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);
  const timerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(value);
      if (!mountedRef.current) return;
      if (toast) {
        toast.push({ kind: "success", title: "Copied to clipboard", duration: 1500 });
      } else {
        setCopied(true);
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (mountedRef.current) setCopied(false);
        }, 1500);
      }
    } catch {
      if (!mountedRef.current) return;
      toast?.push({ kind: "error", title: "Couldn't copy — select and copy manually" });
    }
  }, [toast, value]);

  const truncated = truncateValue(value);
  const computedAriaLabel = ariaLabel || (truncated ? `${label} ${truncated}` : label);

  return (
    <button
      type="button"
      className="copy"
      aria-label={computedAriaLabel}
      onClick={handleCopy}
    >
      {!toast && copied ? "Copied ✓" : label}
    </button>
  );
}