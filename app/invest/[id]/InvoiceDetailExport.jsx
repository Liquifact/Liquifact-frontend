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

import { useCallback, useMemo, useState } from "react";
import { exportAsCSV, exportAsJSON } from "@/utils/export";
import { copy } from "@/app/copy/en";

const detail = copy.invest.detail;

/**
 * Validates the invoice object against expected boundaries.
 * Returns { isValid: boolean, safeInvoice: object | null, error: string | null }
 */
export function validateInvoiceExport(invoice) {
  if (!invoice || typeof invoice !== "object") {
    return { isValid: false, safeInvoice: null, error: "Invoice is null or not an object" };
  }

  const { id, issuer, amount, currency, dueDate, yield: yld, status } = invoice;

  if (id === undefined || id === null || id === "") {
    return { isValid: false, safeInvoice: null, error: "Missing or empty invoice ID" };
  }
  const safeId = String(id);
  if (safeId.length > 255) {
     return { isValid: false, safeInvoice: null, error: "Invoice ID exceeds maximum length" };
  }

  if (typeof issuer !== "string" || issuer.trim() === "") {
    return { isValid: false, safeInvoice: null, error: "Invalid or missing issuer" };
  }
  const safeIssuer = issuer.trim();
  if (safeIssuer.length > 1000) {
    return { isValid: false, safeInvoice: null, error: "Issuer exceeds maximum length" };
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return { isValid: false, safeInvoice: null, error: "Invalid or negative amount" };
  }
  if (parsedAmount > Number.MAX_SAFE_INTEGER) {
    return { isValid: false, safeInvoice: null, error: "Amount exceeds safe maximum" };
  }

  if (typeof currency !== "string" || currency.trim() === "") {
    return { isValid: false, safeInvoice: null, error: "Invalid or missing currency" };
  }
  const safeCurrency = currency.trim().toUpperCase();
  if (safeCurrency.length > 10) {
    return { isValid: false, safeInvoice: null, error: "Currency code exceeds maximum length" };
  }

  const dateObj = new Date(dueDate);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, safeInvoice: null, error: "Invalid due date" };
  }
  const safeDueDate = dateObj.toISOString();

  let safeYield;
  if (yld !== undefined && yld !== null && yld !== "") {
    const parsedYield = Number(yld);
    if (!Number.isFinite(parsedYield) || parsedYield < 0 || parsedYield > 1000) {
      return { isValid: false, safeInvoice: null, error: "Invalid yield percentage" };
    }
    safeYield = parsedYield;
  }

  if (typeof status !== "string" || status.trim() === "") {
     return { isValid: false, safeInvoice: null, error: "Invalid or missing status" };
  }
  const safeStatus = status.trim();
  if (safeStatus.length > 100) {
    return { isValid: false, safeInvoice: null, error: "Status exceeds maximum length" };
  }

  return {
    isValid: true,
    safeInvoice: {
      id: safeId,
      issuer: safeIssuer,
      amount: parsedAmount,
      currency: safeCurrency,
      dueDate: safeDueDate,
      yield: safeYield,
      status: safeStatus,
    },
    error: null,
  };
}

/**
 * InvoiceDetailExport — CSV/JSON download buttons for a single invoice.
 *
 * @param {object} props
 * @param {object|null} props.invoice - The invoice object to export
 */
export default function InvoiceDetailExport({ invoice }) {
  const validation = useMemo(() => validateInvoiceExport(invoice), [invoice]);
  const [exportState, setExportState] = useState("idle"); // 'idle' | 'exporting'

  // Log validation errors in development or for observability without crashing
  if (!validation.isValid && invoice) {
    console.debug("InvoiceDetailExport validation failed:", validation.error);
  }

  const disabled = !validation.isValid || exportState === "exporting";

  const handleExportCSV = useCallback(async () => {
    if (!validation.isValid || exportState === "exporting") return;
    setExportState("exporting");
    
    try {
      // Minimal delay to break synchronous flow and prevent duplicate clicks
      await new Promise((resolve) => setTimeout(resolve, 10));
      exportAsCSV([validation.safeInvoice], `invoice-${validation.safeInvoice.id}.csv`);
    } catch (err) {
      console.error("Export CSV failed:", err);
    } finally {
      setExportState("idle");
    }
  }, [validation, exportState]);

  const handleExportJSON = useCallback(async () => {
    if (!validation.isValid || exportState === "exporting") return;
    setExportState("exporting");
    
    try {
      await new Promise((resolve) => setTimeout(resolve, 10));
      exportAsJSON([validation.safeInvoice], `invoice-${validation.safeInvoice.id}.json`);
    } catch (err) {
      console.error("Export JSON failed:", err);
    } finally {
      setExportState("idle");
    }
  }, [validation, exportState]);

  return (
    <div className="no-print flex gap-3" role="group" aria-label={detail.exportGroupLabel}>
      <button
        type="button"
        onClick={handleExportCSV}
        disabled={disabled}
        aria-label={detail.exportCSVLabel}
        className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {detail.exportCSVButton}
      </button>
      <button
        type="button"
        onClick={handleExportJSON}
        disabled={disabled}
        aria-label={detail.exportJSONLabel}
        className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {detail.exportJSONButton}
      </button>
    </div>
  );
}
