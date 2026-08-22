"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { HELP_SHORTCUT_KEY, KEYBOARD_SHORTCUTS, createShortcutMatcher } from "../lib/shortcuts";
import Button from "./Button";

/**
 * ShortcutHelpDialog — discoverable keyboard shortcut help (`?`).
 *
 * Mounted once near the root of the app (see `app/layout.js`), it listens
 * for `?` keypresses at the document level and reveals an accessible modal
 * listing every shortcut registered in `lib/shortcuts.js`.
 *
 * Accessibility contract:
 *   - Markup exposes `role="dialog"`, `aria-modal="true"`, and an accessible
 *     name via `aria-labelledby` pointing at the dialog heading.
 *   - When opened, focus moves to the dialog and is trapped inside while it
 *     is open (Tab / Shift+Tab cycle through its focusable descendants).
 *   - Escape closes the dialog from anywhere while it is open.
 *   - The element that was focused before opening is restored on close.
 *   - Backdrop click closes the dialog so it is operable without the
 *     keyboard, but only when the user actually clicks the backdrop (the
 *     click handler checks `event.target === event.currentTarget` so clicks
 *     bubbling up from inside the card do not dismiss it).
 *
 * Registry contract:
 *   - The dialog renders `KEYBOARD_SHORTCUTS` directly. Adding a new entry
 *     to the registry in `lib/shortcuts.js` will appear in this dialog
 *     automatically — no edits to this file required.
 */
export default function ShortcutHelpDialog() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  // `previouslyFocusedRef` records whatever held focus just before the
  // dialog opened so we can hand focus back on close. We also fall back to
  // the element focused at the moment the user pressed `?` (captured by the
  // global listener below) so the dialog remains robust if a future caller
  // calls `setOpen(true)` programmatically.
  const previouslyFocusedRef = useRef(null);

  const titleId = useId();

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Open via `?`: the matcher is installed on the document so users can
  // press `?` from anywhere outside an editable control. The effect's
  // dependency on `open` removes the listener while the dialog is open so
  // repeated `?` presses inside an already-open dialog do not re-fire the
  // open animation / duplicate state.
  useEffect(() => {
    if (open) return undefined;

    const handler = createShortcutMatcher(HELP_SHORTCUT_KEY, () => {
      // Capture the trigger only if it is a focusable element other than
      // `<body>`. Restoring focus to `<body>` is a silent no-op and we
      // would rather skip the restore than pretend it worked.
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        previouslyFocusedRef.current = active;
      }
      setOpen(true);
    });

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Focus management: move focus into the dialog on open. When the dialog
  // was opened by `?`, `previouslyFocusedRef.current` already holds the
  // trigger. Capturing `document.activeElement` here as a fallback covers
  // programmatic openings and ensures focus can always be restored on
  // close. We deliberately exclude `<body>` because restoring focus to
  // body is a no-op that still passes the "is connected" guard, and we
  // want to leave a missing focus target silently skipped rather than
  // buried under an opaque `<body>` focus.
  useEffect(() => {
    if (!open) return undefined;

    if (!previouslyFocusedRef.current) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        previouslyFocusedRef.current = active;
      }
    }

    // Move focus into the dialog on the next animation frame so the dialog
    // has rendered before we try to focus inside it.
    const raf = requestAnimationFrame(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (dialogRef.current) {
        dialogRef.current.focus();
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Focus management: restore focus to the previously-focused element on
  // close. `queueMicrotask` defers the call until React has torn down the
  // dialog so focus does not visibly drop to `<body>`. The
  // `document.body.contains(target)` check guards against the trigger
  // having been removed while the dialog was open (e.g. a route change).
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

  // Focus trap: Tab / Shift+Tab cycle through the focusable elements inside
  // the dialog and wrap at the boundaries. Escape closes the dialog.
  const handleDialogKeyDown = useCallback((event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
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
  }, []);

  if (!open) return null;

  return (
    <div
      // Backdrop. Direct clicks on this element close the dialog; clicks
      // bubbling up from inside the card do not, because the handler
      // checks `event.target === event.currentTarget`.
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
      onKeyDown={(event) => {
        // Catches Escape presses that land on the backdrop element itself.
        // When focus is inside the dialog, the dialog's own `onKeyDown`
        // handles Escape (and the trap keeps focus inside).
        if (event.key === "Escape") {
          event.preventDefault();
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm"
      data-testid="shortcut-help-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="focus-ring relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-slate-50">
              Keyboard shortcuts
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Press the key combination from anywhere on the page.
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            variant="secondary"
            aria-label="Close keyboard shortcuts dialog"
            onClick={handleClose}
            className="!rounded-full !px-3 !py-1 !text-xs"
          >
            Close
          </Button>
        </div>

        <ul className="mt-6 divide-y divide-slate-800" role="list">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <li key={shortcut.id} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-slate-200">{shortcut.description}</span>
              {/* `aria-hidden` on the kbd keeps the visible glyph ("/" or
                  "Shift + /") from being double-announced by screen
                  readers; the surrounding `<li>` already names the
                  shortcut in plain language. */}
              <kbd
                aria-hidden="true"
                className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-mono text-cyan-300"
              >
                {formatKeyLabel(shortcut.key)}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Returns the focusable elements inside `container` in tab order.
 * Excludes elements with `tabindex="-1"` and disabled form controls.
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
      // Hidden via `display: none` ancestors — skip.
      return false;
    }
    return true;
  });
}

/**
 * Render-friendly display for a shortcut key. `?` is shown as `Shift+/` so
 * users on US-ANSI keyboards understand the gesture required.
 *
 * @param {string} key
 * @returns {string}
 */
function formatKeyLabel(key) {
  if (key === "?") return "Shift + /";
  return key;
}
