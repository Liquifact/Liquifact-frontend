"use client";

/**
 * @file app/invest/[id]/InvoiceDetailActionShortcuts.jsx
 *
 * Keyboard shortcuts for the invoice detail page.
 *
 * Registers discoverable keyboard shortcuts for the page's primary actions:
 *   - e → Focus the export (CSV / JSON) buttons
 *   - f → Focus the fund invoice action
 *   - c → Focus the copy link button
 *
 * Renders a discoverable hint listing the available shortcuts.
 * The shortcuts are also registered in `lib/shortcuts.js` so they appear
 * in the global `?` help dialog automatically.
 */

import { useEffect, useRef, useState } from "react";
import {
  INVOICE_DETAIL_EXPORT_SHORTCUT_KEY,
  INVOICE_DETAIL_FUND_SHORTCUT_KEY,
  INVOICE_DETAIL_COPY_SHORTCUT_KEY,
  createShortcutMatcher,
} from "@/lib/shortcuts";

export default function InvoiceDetailActionShortcuts() {
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    /**
     * Focus the first button in the export group.
     */
    const focusExport = () => {
      const exportGroup = document.querySelector(
        '[role="group"][aria-label*="export" i]'
      );
      const firstBtn = exportGroup?.querySelector("button");
      firstBtn?.focus();
    };

    /**
     * Focus the fund button.
     */
    const focusFund = () => {
      const fundBtn = document.querySelector(
        'button[aria-label*="fund" i]'
      );
      fundBtn?.focus();
    };

    /**
     * Focus the copy link button.
     */
    const focusCopyLink = () => {
      const copyBtn = document.querySelector(
        'button[aria-label*="copy link" i]'
      );
      copyBtn?.focus();
    };

    const handlers = [
      createShortcutMatcher(INVOICE_DETAIL_EXPORT_SHORTCUT_KEY, (e) => {
        e.preventDefault();
        focusExport();
      }),
      createShortcutMatcher(INVOICE_DETAIL_FUND_SHORTCUT_KEY, (e) => {
        e.preventDefault();
        focusFund();
      }),
      createShortcutMatcher(INVOICE_DETAIL_COPY_SHORTCUT_KEY, (e) => {
        e.preventDefault();
        focusCopyLink();
      }),
    ];

    handlers.forEach((h) => document.addEventListener("keydown", h));
    return () => handlers.forEach((h) => document.removeEventListener("keydown", h));
  }, []);

  return (
    hintVisible && (
      <div
        className="no-print mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500"
        data-testid="invoice-detail-shortcut-hint"
      >
        <span className="font-medium text-slate-400">Keyboard shortcuts:</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-400">
          {INVOICE_DETAIL_EXPORT_SHORTCUT_KEY}
        </kbd>
        <span>Focus export</span>
        <span className="text-slate-600">·</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-400">
          {INVOICE_DETAIL_FUND_SHORTCUT_KEY}
        </kbd>
        <span>Focus fund</span>
        <span className="text-slate-600">·</span>
        <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-400">
          {INVOICE_DETAIL_COPY_SHORTCUT_KEY}
        </kbd>
        <span>Copy link</span>
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