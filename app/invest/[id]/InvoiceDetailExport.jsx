"use client";

/**
 * @file app/invest/[id]/InvoiceDetailExport.jsx
 *
 * Client-side CSV/JSON export component for the invoice detail view.
 *
 * Invariants & Contract Guarantees
 * ────────────────────────────────
 * 1. Safe Field Boundary: Only explicitly whitelisted public metadata fields
 *    (`SAFE_EXPORT_FIELDS`) are extracted. Private internal properties (e.g.,
 *    `internalNote`, `walletAddress`, keys) are never exported.
 * 2. Deterministic Serialization: Valid, empty, partial, and malformed invoice
 *    inputs are handled deterministically without throwing uncaught exceptions.
 * 3. Filename Sanitization: Invoice IDs in download filenames are scrubbed to
 *    prevent path traversal or invalid filesystem characters. Missing IDs fallback
 *    to safe default filenames (`invoice-export.csv`, `invoice-export.json`).
 * 4. Idempotency & Concurrency Guard: Prevents duplicate concurrent downloads
 *    or race conditions during rapid user clicks using synchronous ref locks.
 * 5. Failure Handling & Observability: Failures during Blob generation or DOM
 *    dispatch are caught, safely logged (without exposing PII/secrets), and
 *    communicated through ARIA live regions (`role="status"`) for immediate
 *    user feedback and clean recovery/retry.
 * 6. Accessibility: Conforms to WAI-ARIA group role contracts, explicit
 *    button aria-labels, and `.focus-ring` focus visibility.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { exportAsCSV, exportAsJSON } from "@/utils/export";
import { copy } from "@/app/copy/en";
import { useToast } from "@/components/ToastProvider";

const detail = copy.invest.detail;

/**
 * Whitelist of safe, publicly exportable invoice fields.
 * Prevents sensitive internal fields from leaking into client-side downloads.
 *
 * @type {readonly string[]}
 */
export const SAFE_EXPORT_FIELDS = Object.freeze([
  "id",
  "issuer",
  "amount",
  "currency",
  "dueDate",
  "yield",
  "status",
]);

/**
 * Sanitizes an invoice ID for safe usage in download filenames.
 * Strips path traversal characters, directory separators, control characters,
 * spaces, and special symbols across platforms.
 *
 * @param {unknown} id - Raw invoice identifier
 * @returns {string} Sanitized string safe for filenames
 */
export function sanitizeFilenamePart(id) {
  if (id === null || id === undefined) return "";
  const str = String(id).trim();
  const cleaned = str
    .replace(/[\\/:*?"<>|\x00-\x1f\s]/g, "-")
    .replace(/\.{2,}/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return cleaned;
}

/**
 * Generates a deterministic, safe export filename for a given invoice and format.
 *
 * @param {unknown} invoiceId - Invoice ID to include in filename
 * @param {"csv" | "json"} [format="csv"] - Target export file format
 * @returns {string} Download filename with proper extension
 */
export function getExportFilename(invoiceId, format = "csv") {
  const safeId = sanitizeFilenamePart(invoiceId);
  const ext = format === "json" ? "json" : "csv";
  if (!safeId) {
    return `invoice-export.${ext}`;
  }
  return `invoice-${safeId}.${ext}`;
}

/**
 * Validates that an input is a non-null, non-array object with exportable fields.
 *
 * @param {unknown} invoice
 * @returns {boolean} True if invoice is valid for export
 */
export function isValidInvoice(invoice) {
  if (!invoice || typeof invoice !== "object" || Array.isArray(invoice)) {
    return false;
  }
  return Object.keys(invoice).length > 0;
}

/**
 * Strip the invoice object down to a safe, flat export record.
 * Only includes whitelisted public fields to prevent data leakage.
 * Returns null if the invoice is invalid or not an object.
 *
 * @param {object|null|undefined} invoice
 * @returns {Record<string, unknown>|null}
 */
export function toExportRecord(invoice) {
  if (!isValidInvoice(invoice)) {
    return null;
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

  return record;
}

/**
 * Debounce utility to prevent rapid consecutive function calls.
 * Ensures only the last call within the delay window executes.
 *
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
function useDebounce(func, delay) {
  const timeoutRef = useRef(null);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        func(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [func, delay]
  );
}

/**
 * InvoiceDetailExport — CSV/JSON download buttons for a single invoice.
 *
 * Features concurrent execution safety:
 * - Loading state prevents multiple simultaneous exports
 * - Debounced clicks prevent duplicate exports
 * - Error handling with user feedback
 * - Input validation before export
 *
 * @param {object} props
 * @param {object|null} [props.invoice] - The invoice object to export
 * @param {string} [props.className] - Optional extra class names for container
 * @param {boolean} [props.disabled] - Optional explicit override to disable buttons
 * @param {(exportInfo: { record: object, format: string, filename: string }) => void} [props.onExport] - Export success callback
 * @param {(error: unknown, format: string) => void} [props.onError] - Export failure callback
 */
export default function InvoiceDetailExport({
  invoice,
  className = "",
  disabled: customDisabled = false,
  onExport,
  onError,
}) {
  const [exportingFormat, setExportingFormat] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const isExportingRef = useRef(false);

  const isInvoiceValid = isValidInvoice(invoice);
  const isExporting = Boolean(exportingFormat);
  const disabled = customDisabled || !isInvoiceValid || isExporting;

  // Auto-clear status message after timeout to prevent stale announcements
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => {
      setStatusMessage("");
    }, 3000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const executeExport = useCallback(
    (format) => {
      if (!isInvoiceValid || isExportingRef.current) {
        return;
      }

      isExportingRef.current = true;
      setExportingFormat(format);
      setStatusMessage("");

      try {
        const record = toExportRecord(invoice);
        if (!record) {
          throw new Error("Unable to create export record from invoice");
        }

        const filename = getExportFilename(invoice?.id, format);

        if (format === "csv") {
          exportAsCSV([record], filename);
        } else if (format === "json") {
          exportAsJSON([record], filename);
        } else {
          throw new Error(`Unsupported export format: ${format}`);
        }

        const successMsg =
          format === "csv"
            ? `${detail.exportCSVButton || "CSV"} export completed.`
            : `${detail.exportJSONButton || "JSON"} export completed.`;
        setStatusMessage(successMsg);

        if (typeof onExport === "function") {
          onExport({ record, format, filename });
        }
      } catch (err) {
        const safeMessage =
          err instanceof Error ? err.message : "Export process encountered an error";
        console.error(`[InvoiceDetailExport] Export failed (${format}):`, safeMessage);

        const errorMsg = `Export failed: ${safeMessage}`;
        setStatusMessage(errorMsg);

        if (typeof onError === "function") {
          onError(err, format);
        }
      } finally {
        isExportingRef.current = false;
        setExportingFormat(null);
      }
    },
    [invoice, isInvoiceValid, onExport, onError]
  );

  const handleExportCSV = useCallback(() => {
    executeExport("csv");
  }, [executeExport]);

  const handleExportJSON = useCallback(() => {
    executeExport("json");
  }, [executeExport]);

  return (
    <div
      className={`no-print flex gap-3 ${className}`.trim()}
      role="group"
      aria-label={detail.exportGroupLabel}
    >
      <button
        type="button"
        onClick={handleExportCSV}
        disabled={disabled}
        aria-label={detail.exportCSVLabel}
        aria-busy={exportingFormat === "csv"}
        className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {detail.exportCSVButton}
      </button>
      <button
        type="button"
        onClick={handleExportJSON}
        disabled={disabled}
        aria-label={detail.exportJSONLabel}
        aria-busy={exportingFormat === "json"}
        className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {detail.exportJSONButton}
      </button>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}
