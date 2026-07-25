/**
 * @file app/invest/[id]/page.js
 *
 * Server Component shell for the invoice detail page.
 *
 * RSC split rationale
 * ───────────────────
 * This file contains NO browser APIs and NO React hooks — it runs entirely
 * on the server, so headings, the metadata table, and JSON-LD script are
 * streamed as HTML and never appear in the JS bundle.
 *
 * The interactive piece (invoice detail content with loading/error/empty states)
 * is delegated to the `InvoiceDetailContent` client component.
 *
 * Data flow
 * ─────────
 * `params.id` → `getInvoiceById(id)` (sync, mock data for now)
 *             → `notFound()` if the id is unknown
 *             → RSC renders shell + passes {id} to <InvoiceDetailContent>
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import NavMenu from "@/components/NavMenu";
import { copy } from "@/app/copy/en";
import { INVALID_VALUE_FALLBACK, formatCurrency, formatAmount } from "@/lib/format/currency";
import { getInvoiceById } from "../lib";
import InvoiceDetailContent from "./InvoiceDetailContent";

const detail = copy.invest.detail;

// ── Pure server-side helpers (not exported to the client bundle) ──────────────

/**
 * Format a yield value as a percentage string.
 * Falls back to `INVALID_VALUE_FALLBACK` for unresolvable values.
 *
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
function formatYield(value) {
  const formatted = formatAmount(value);
  return formatted === INVALID_VALUE_FALLBACK ? formatted : `${formatted}%`;
}

/**
 * Sanitize a plain-text value for safe use in JSON-LD.
 * Removes leading/trailing whitespace and strips characters that could
 * break out of a JSON string context when embedded in a `<script>`.
 *
 * @param {unknown} value
 * @returns {string}
 */
function sanitizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .trim()
    .replace(/[<>{}"']/g, "");
}

/**
 * Build a JSON-LD `Offer` object for the invoice.
 * Returns `null` when invoice is absent.
 *
 * @param {object|null} invoice
 * @returns {object|null}
 */
function buildInvoiceJsonLd(invoice) {
  if (!invoice) return null;

  const issuer = sanitizeText(invoice.issuer);
  const amount = sanitizeText(invoice.amount);
  const currency = sanitizeText(invoice.currency);
  const dueDate = sanitizeText(invoice.dueDate);
  const yieldValue = sanitizeText(invoice.yield);
  const status = sanitizeText(invoice.status);

  const descriptionParts = [
    issuer ? `Invoice offering from ${issuer}` : "Invoice offering",
    amount ? `Amount ${amount}` : null,
    currency ? `Currency ${currency}` : null,
    dueDate ? `Maturity ${dueDate}` : null,
    yieldValue ? `Estimated yield ${yieldValue}` : null,
    status ? `Status ${status}` : null,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: issuer ? `Invoice offering from ${issuer}` : "Invoice offering",
    description: descriptionParts.join(". "),
    seller: issuer ? { "@type": "Organization", name: issuer } : undefined,
    price: amount || undefined,
    priceCurrency: currency || undefined,
    availability: status === "Open" ? "https://schema.org/InStock" : undefined,
    validFrom: dueDate || undefined,
  };
}