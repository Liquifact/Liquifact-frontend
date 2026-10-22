"use client";

import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/toast/ToastProvider";

export default function CopyButton({ value, label = "Copy" }) {
  const { push } = useToast();
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
      push({
        kind: "success",
        title: "Copied to clipboard",
        duration: 1500,
      });
    } catch {
      if (!mountedRef.current) return;
      push({
        kind: "error",
        title: "Couldn't copy — select and copy manually",
        duration: 8000,
      });
    }
  }, [push, value]);

  return (
    <button type="button" className="copy" onClick={handleCopy}>
      {label}
    </button>
  );
}
