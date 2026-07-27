"use client";

/**
 * @file app/invest/[id]/InvoiceDetailExport.jsx
 *
 * Client-side CSV/JSON export for the invoice detail view.
 *
 * Renders two buttons (Export CSV, Export JSON) that trigger a browser
 * download of the current invoice's metadata. No server round-trip.
 *
 * Safe escaping is delegated to `utils/export.js` which handles commas,
 * quotes, and newlines in CSV values.
 */

import { useCallback } from "react";
import { exportAsCSV, exportAsJSON } from "@/utils/export";
import { copy } from "@/app/copy/en";

const detail = copy.invest.detail;

/**
 * Strip the invoice object down to a safe, flat export record.
 *
 * @param {object} invoice
 * @returns {object}
 */
function toExportRecord(invoice) {
  return {
    id: invoice.id,
    issuer: invoice.issuer,
    amount: invoice.amount,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    yield: invoice.yield,
    status: invoice.status,
  };
}

/**
 * InvoiceDetailExport — CSV/JSON download buttons for a single invoice.
 *
 * @param {object} props
 * @param {object|null} props.invoice - The invoice object to export
 */
export default function InvoiceDetailExport({ invoice }) {
  const disabled = !invoice;

  const handleExportCSV = useCallback(() => {
    if (!invoice) return;
    const record = toExportRecord(invoice);
    exportAsCSV([record], `invoice-${invoice.id}.csv`);
  }, [invoice]);

  const handleExportJSON = useCallback(() => {
    if (!invoice) return;
    const record = toExportRecord(invoice);
    exportAsJSON([record], `invoice-${invoice.id}.json`);
  }, [invoice]);

  return (
    <div
      className="no-print flex gap-3"
      role="group"
      aria-label={detail.exportGroupLabel}
    >
      <button
        type="button"
        onClick={handleExportCSV}
        disabled={disabled}
        aria-label={detail.exportCSVLabel}
        className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {detail.exportCSVButton}
      </button>
      <button
        type="button"
        onClick={handleExportJSON}
        disabled={disabled}
        aria-label={detail.exportJSONLabel}
        className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {detail.exportJSONButton}
      </button>
    </div>
  );
}
