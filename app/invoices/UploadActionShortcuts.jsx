"use client";

/**
 * @file app/invoices/UploadActionShortcuts.jsx
 *
 * Keyboard shortcuts for the invoices / upload page.
 *
 * Registers discoverable keyboard shortcuts for the page's primary actions:
 *   - u → Focus the upload dropzone (select a file)
 *   - s → Submit the upload (trigger the upload button)
 *
 * Renders a discoverable hint listing the available shortcuts.
 * The shortcuts are also registered in `lib/shortcuts.js` so they appear
 * in the global `?` help dialog automatically.
 */

import { useEffect, useState } from "react";
import {
  UPLOAD_BROWSE_SHORTCUT_KEY,
  UPLOAD_SUBMIT_SHORTCUT_KEY,
  createShortcutMatcher,
} from "@/lib/shortcuts";

export default function UploadActionShortcuts() {
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    /**
     * Focus the upload dropzone (role="button" that opens the file picker).
     */
    const focusDropzone = () => {
      const dropzone = document.querySelector(
        '[role="button"][aria-label*="Drop PDF" i]'
      );
      dropzone?.focus();
    };

    /**
     * Focus the submit / upload button.
     */
    const focusSubmit = () => {
      const submitBtn = document.getElementById("invoice-upload-btn");
      submitBtn?.focus();
    };

    const handlers = [
      createShortcutMatcher(UPLOAD_BROWSE_SHORTCUT_KEY, (e) => {
        e.preventDefault();
        focusDropzone();
      }),
      createShortcutMatcher(UPLOAD_SUBMIT_SHORTCUT_KEY, (e) => {
        e.preventDefault();
        focusSubmit();
      }),
    ];

    handlers.forEach((h) => document.addEventListener("keydown", h));
    return () => handlers.forEach((h) => document.removeEventListener("keydown", h));
  }, []);

  return (
    hintVisible && (
      <div
        className="no-print mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500"
        data-testid="upload-shortcut-hint"
      >
        <span className="font-medium text-slate-400">Keyboard shortcuts:</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-400">
          {UPLOAD_BROWSE_SHORTCUT_KEY}
        </kbd>
        <span>Focus dropzone</span>
        <span className="text-slate-600">·</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-400">
          {UPLOAD_SUBMIT_SHORTCUT_KEY}
        </kbd>
        <span>Submit upload</span>
        <button
          type="button"
          onClick={() => setHintVisible(false)}
          aria-label="Dismiss shortcut hint"
          className="ml-auto text-slate-600 hover:text-slate-400 focus-ring rounded px-1"
        >
          ×
        </button>
      </div>
    )
  );
}