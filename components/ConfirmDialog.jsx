"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import Button from "./Button";

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  isLoading = false,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    if (!previouslyFocusedRef.current) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        previouslyFocusedRef.current = active;
      }
    }

    const raf = requestAnimationFrame(() => {
      if (cancelButtonRef.current) {
        cancelButtonRef.current.focus();
      } else if (dialogRef.current) {
        dialogRef.current.focus();
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (open) return;

    const target = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    if (
      target &&
      target instanceof HTMLElement &&
      document.body.contains(target) &&
      typeof target.focus === "function"
    ) {
      queueMicrotask(() => target.focus());
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onCancel]
  );

  if (!open) return null;

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm"
      data-testid="confirm-dialog-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="focus-ring relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-50">
          {title}
        </h2>
        {message && <p className="mt-2 text-sm text-slate-400">{message}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelButtonRef} variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getFocusableElements(container) {
  if (!container) return [];
  const selector =
    "a[href], button:not([disabled]), input:not([disabled])," +
    " select:not([disabled]), textarea:not([disabled])," +
    ' [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.offsetParent === null && el !== document.activeElement) {
      return false;
    }
    return true;
  });
}
