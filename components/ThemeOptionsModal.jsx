"use client";

import { useCallback, useEffect, useRef } from "react";
import { getFocusableElements } from "../lib/dom/getFocusableElements";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * ThemeOptionsModal — accessible dialog listing Light / Dark / System as
 * selectable options.
 *
 * Accessibility contract (mirrors the pattern already used by
 * ShortcutHelpDialog elsewhere in this app):
 *   - role="dialog", aria-modal="true", named via aria-labelledby.
 *   - Focus moves into the dialog (onto the first option) when it opens.
 *   - Tab / Shift+Tab cycle through the dialog's focusable descendants and
 *     wrap at the boundaries — a true focus trap, so focus never escapes
 *     to the page behind it while the dialog is open.
 *   - Escape closes the dialog.
 *   - Backdrop click closes the dialog (only for direct clicks on the
 *     backdrop itself; clicks bubbling from inside the card do not, and
 *     Escape presses bubbling up from the dialog are not double-handled —
 *     both handlers check `event.target === event.currentTarget`).
 *
 * Restoring focus to whatever triggered the dialog is intentionally the
 * caller's responsibility (see ThemeToggle), since this component has no
 * knowledge of which element opened it.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.preference – currently active theme preference
 * @param {(pref: string) => void} props.onSelect
 * @param {string} props.titleId – id applied to the heading for aria-labelledby
 */
export default function ThemeOptionsModal({ open, onClose, preference, onSelect, titleId }) {
  const dialogRef = useRef(null);

  // Move focus into the dialog on open.
  useEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(() => {
      const focusable = getFocusableElements(dialogRef.current);
      (focusable[0] ?? dialogRef.current)?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const handleDialogKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        // Nothing focusable inside — keep focus on the dialog itself.
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

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        // Only handle Escape presses that land directly on the backdrop.
        // Keydowns originating inside the dialog bubble up to this handler
        // too — without this check Escape would call onClose twice (once
        // here, once from the dialog's own onKeyDown below).
        if (event.target !== event.currentTarget) return;
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm theme-modal-backdrop"
      data-testid="theme-options-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="focus-ring relative w-full max-w-xs rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl theme-modal-dialog"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-50 theme-modal-title">
          Theme
        </h2>

        <div role="radiogroup" aria-label="Theme" className="mt-4 flex flex-col gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={preference === opt.value}
              onClick={() => onSelect(opt.value)}
              className={[
                "focus-ring rounded-lg border px-4 py-2 text-left text-sm transition-colors",
                preference === opt.value
                  ? "border-cyan-500 bg-cyan-900/30 text-cyan-300 theme-option-selected"
                  : "border-slate-700 text-slate-200 hover:border-slate-600 hover:bg-slate-800 theme-option-unselected",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}