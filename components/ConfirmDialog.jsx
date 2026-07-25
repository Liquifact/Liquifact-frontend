"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import Button from "./Button";

/**
 * @file components/ConfirmDialog.jsx
 * Reusable focus-trapped confirmation dialog.
 *
 * Used as both:
 *   - The controlled `ConfirmDialog` component (render-prop style — render the
 *     dialog inline inside a parent so its open state is driven by the
 *     parent's React tree).
 *   - The promise-returning `confirmDialog(...)` helper which is easier to
 *     call from event handlers.
 *
 * Accessibility contract (matches ShortcutHelpDialog):
 *   - The dialog has `role="dialog"`, `aria-modal="true"`, and an accessible
 *     name via `aria-labelledby` pointing at the title.
 *   - When opened, focus moves to the primary action button (or the dialog
 *     itself if no primary action is present).
 *   - Focus is trapped while open (Tab / Shift+Tab cycle through focusable
 *     descendants, wrapping at the boundaries).
 *   - Escape closes the dialog. Backdrop click also closes the dialog, but
 *     only when the click target is the backdrop (not a descendant).
 *   - The element that was focused before opening is restored on close when
 *     possible (HTMLElement still connected to the document).
 *
 * Variants:
 *   - "primary" (default): destructive primary colour (red)
 *   - "primary": standard (cyan)
 *
 * The "primary" name is kept compatible with the shared Button component
 * variant vocabulary, where `danger` exists for destructive actions.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  confirmLoading = false,
}) {
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useId();

  // Capture the trigger focus at the moment the dialog opens so we can
  // restore it on close. Excludes `<body>` because restoring focus to body
  // is silent and an opacity-no-op rather than an honest "we lost context"
  // error.
  useEffect(() => {
    if (!open) return undefined;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      previouslyFocusedRef.current = active;
    }
    return undefined;
  }, [open]);

  // When the dialog opens, move focus to the confirm button on the next
  // animation frame so the dialog has been rendered before we focus inside.
  useEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(() => {
      if (confirmButtonRef.current) {
        confirmButtonRef.current.focus();
      } else if (dialogRef.current) {
        dialogRef.current.focus();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // On close, restore focus to the element that triggered the dialog. We use
  // queueMicrotask so React has torn the dialog down before we attempt
  // focus.
  useEffect(() => {
    if (open) return undefined;
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

  // Focus trap — Tab cycles inside the dialog; Escape closes.
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        // Stop propagation so the backdrop's defensive Escape handler cannot
        // re-fire onClose after we've already torn the dialog down.
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
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
    [onClose]
  );

  if (!open) return null;

  // Pre-emptively guard against legacy "primary variant" without `variant`.
  // The variant prop drives Button + ring colour, not just the action intent.
  const confirmVariant = variant === "primary" ? "primary" : "danger";

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      onKeyDown={(event) => {
        // Catches Escape presses that land on the backdrop element itself.
        // When focus is inside the dialog, the dialog's own `onKeyDown`
        // handles Escape (and the trap keeps focus inside).
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose?.();
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
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl focus-ring"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-50">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            aria-label={cancelLabel}
            autoFocus={false}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            loading={confirmLoading}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns the focusable elements inside `container` in tab order.
 * Excludes elements with tabindex="-1" and disabled form controls.
 *
 * @param {HTMLElement | null} container
 * @returns {HTMLElement[]}
 */
function getFocusableElements(container) {
  if (!container) return [];
  const selector =
    "a[href], button:not([disabled]), input:not([disabled])," +
    " select:not([disabled]), textarea:not([disabled])," +
    ' [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.offsetParent === null && el !== document.activeElement) {
      // Hidden via display: none ancestors — skip.
      return false;
    }
    return true;
  });
}
