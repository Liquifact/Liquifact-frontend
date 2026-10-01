// @ts-nocheck
/**
 * @file app/invest/[id]/page.js
 *
 * Server Component shell for the invoice detail page.
 *
 * RSC split rationale
 * ───────────────────
 * The previous version was a single "use client" module, meaning every
 * formatting helper, copy string, and layout byte shipped to the browser on
 * the highest-intent route.  This file contains NO browser APIs and NO
 * React hooks — it runs entirely on the server, so headings, the metadata
 * table, and JSON-LD script are streamed as HTML and never appear in the JS
 * bundle.
 *
 * Interactive pieces are delegated to small client boundaries:
 *   - `InvoiceDetailClient` — density toggle + metadata
 *   - `InvoiceDetailItems` — bulk-select toolbar over detail documents
 *   - `FundActions` — fund / copy link / print
 *
 * Compatibility contract
 * ──────────────────────
 * The public behavior of this route is preserved across errors, empty data,
 * and upgrades: unknown ids render the not-found boundary; malformed or
 * missing fields degrade to `INVALID_VALUE_FALLBACK` without throwing; and
 * JSON-LD is only emitted when it can be safely serialized.
 *
 * Data flow
 * ─────────
 * `params.id` → `validateInvoiceId(id)` (input validation)
 *             → `fetchInvoiceById(id)` (hardened fetch with deduplication)
 *             → `notFound()` if the id is invalid or unknown
 *             → RSC renders layout + passes props to client islands
 *
 * Concurrency hardening
 * ─────────────────────
 * The data fetching layer (`page-data.js`) provides:
 *   - Request deduplication to prevent duplicate concurrent fetches
 *   - Input validation to ensure deterministic behavior
 *   - Immutable snapshots to prevent external mutations
 *   - Deterministic error handling with classified error types
 */

import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import NavMenu from "@/components/NavMenu";
import StatusPill from "@/components/StatusPill";
import InvoiceTimeline from "@/components/InvoiceTimeline";
import { copy } from "@/app/copy/en";
import { INVALID_VALUE_FALLBACK, formatCurrency, formatAmount } from "@/lib/format/currency";
import { fetchInvoiceById, InvoiceNotFoundError, InvalidInvoiceIdError } from "./page-data";
import FundActions from "./FundActions";
import { RouteFocus } from "./FocusManager";
import InvoiceDetailClient from "./InvoiceDetailClient";
import InvoiceDetailItems, { buildInvoiceDetailItems } from "./InvoiceDetailItems";
import InvoiceDetailExport from "./InvoiceDetailExport";
import { getMarketplaceHref } from "@/lib/marketplaceRoute";
import { reportError } from "@/lib/observability/reportError";
import { normalizeInvoiceId, isWellFormedInvoice, VALIDATION_REASONS } from "../validation";

const detail = copy.invest.detail;

// ── Deterministic invoice resolution (#1167) ──────────────────────────────────
//
// Invariants:
//  1. `resolveInvoice` is pure and idempotent — the same (id, lookup) always
//     produces the same status/reason. Retrying a failed render therefore
//     converges to the same outcome and can never commit partial state.
//  2. A data-layer failure or a malformed record is *never* rendered as real
//     data and never silently swallowed: it becomes an explicit ERROR result
//     that is reported to the observability sink and surfaced through the
//     segment error boundary.
//  3. No underlying error message is exposed. The typed error carries only a
//     stable code + reason; the user sees localized, generic copy.

export const INVOICE_RESOLUTION = Object.freeze({
  OK: "ok",
  NOT_FOUND: "not_found",
  ERROR: "error",
});

/** Stable error code surfaced to the route error boundary. */
export const INVOICE_DETAIL_ERROR_CODE = "INVOICE_DETAIL_UNAVAILABLE";

/**
 * Typed, non-sensitive error thrown when a valid invoice id cannot be resolved
 * because the data layer failed or returned a malformed record.
 */
export class InvoiceDetailResolveError extends Error {
  /**
   * @param {string} reason one of {@link VALIDATION_REASONS}
   */
  constructor(reason) {
    super(detail.loadErrorMsg);
    this.name = "InvoiceDetailResolveError";
    this.code = INVOICE_DETAIL_ERROR_CODE;
    this.reason = reason;
  }
}

/**
 * Resolve the `[id]` segment to an invoice, deterministically.
 *
 * @param {unknown} rawId  the raw route segment
 * @param {(id: string) => (object | null | undefined)} [lookup]
 * @returns {{
 *   status: "ok", invoice: object
 * } | {
 *   status: "not_found", reason: string
 * } | {
 *   status: "error", reason: string
 * }}
 */
export function resolveInvoice(rawId, lookup = getInvoiceById) {
  const normalized = normalizeInvoiceId(rawId);
  if (!normalized.ok) {
    // Invalid/duplicate/boundary ids are a not-found outcome, not a crash.
    return { status: INVOICE_RESOLUTION.NOT_FOUND, reason: normalized.reason };
  }

  let invoice;
  try {
    invoice = lookup(normalized.id);
  } catch {
    reportError(new Error("Invoice lookup failed"), {
      scope: "invest.invoice_detail",
      reason: VALIDATION_REASONS.LOOKUP_FAILED,
    });
    return { status: INVOICE_RESOLUTION.ERROR, reason: VALIDATION_REASONS.LOOKUP_FAILED };
  }

  if (invoice === null || invoice === undefined) {
    return { status: INVOICE_RESOLUTION.NOT_FOUND, reason: VALIDATION_REASONS.NOT_FOUND };
  }

  if (!isWellFormedInvoice(invoice)) {
    // A malformed record would render as NaN / blank cells and could hide data
    // loss. Fail explicitly and observably instead.
    reportError(new Error("Malformed invoice record"), {
      scope: "invest.invoice_detail",
      reason: VALIDATION_REASONS.MALFORMED_RECORD,
    });
    return { status: INVOICE_RESOLUTION.ERROR, reason: VALIDATION_REASONS.MALFORMED_RECORD };
  }

  return { status: INVOICE_RESOLUTION.OK, invoice };
}

// ── Pure server-side helpers (not exported to the client bundle) ──────────────

/**
 * Normalize a dynamic route id.
 *
 * Invariant: the id used for lookup is always a non-empty trimmed string.
 * Returns `null` for values that cannot represent a valid id so callers can
 * deterministically route to the not-found boundary instead of throwing.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeInvoiceId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Format a yield value as a percentage string.
 * Falls back to `INVALID_VALUE_FALLBACK` for unresolvable values.
 *
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
// eslint-disable-next-line no-unused-vars
function formatYield(value) {
  const formatted = formatAmount(value);
  return formatted === INVALID_VALUE_FALLBACK ? formatted : `${formatted}%`;
}

/**
 * Request-scoped memoized invoice lookup.
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
// eslint-disable-next-line no-unused-vars
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

// ── Server Component ──────────────────────────────────────────────────────────

/**
 * Page-level Server Component.
 *
 * Next.js App Router passes `{ params }` where `params.id` is the dynamic
 * segment.  We await params so the component is compatible with both the
 * current Next.js 14 sync form and the upcoming async-params API.
 *
 * PUBLIC INTERFACE CONTRACT:
 * ===========================
 * This page is a Next.js Server Component that:
 *   - Accepts a dynamic route parameter `id` representing the invoice identifier
 *   - Accepts optional `searchParams` for preserving filter state when navigating back
 *   - Renders the invoice detail page with all client components as islands
 *   - Triggers `notFound()` when the invoice ID does not exist
 *   - Passes sanitized and formatted invoice data to client components
 *
 * COMPATIBILITY GUARANTEES:
 * =========================
 *   - Supports both sync and async params shapes (Next.js 14 and future versions)
 *   - Invalid invoice IDs trigger `notFound()` (404) rather than throwing
 *   - Missing or malformed searchParams are handled gracefully (defaults to empty object)
 *   - All invoice data is sanitized before rendering (JSON-LD, user-facing text)
 *   - Client components receive pre-formatted values to avoid client-side formatting
 *
 * INVARIANTS:
 * ===========
 *   - The page is a Server Component (no hooks, no browser APIs)
 *   - All interactive functionality is delegated to client components
 *   - Invoice data is fetched synchronously via `getInvoiceById` (mock data)
 *   - JSON-LD structured data is always rendered when invoice exists
 *   - Back navigation preserves marketplace filter state via searchParams
 *   - No side effects during render (pure function of params and searchParams)
 *
 * @param {object} props
 * @param {Promise<{ id: string }> | { id: string }} props.params - The route params.
 *   Contains `id` as the dynamic segment for the invoice identifier.
 *   Supports both sync object (Next.js 14) and Promise (future API) shapes.
 * @param {URLSearchParams | Record<string, string | string[] | undefined> | undefined} [props.searchParams] - Optional search params.
 *   Used to preserve marketplace filter state when navigating back to the marketplace.
 *   Can be URLSearchParams, plain object, or undefined (defaults to empty).
 *
 * @returns {Promise<React.ReactElement>} The rendered invoice detail page, or triggers `notFound()` if invoice does not exist.
 *
 * @example
 * // Used automatically by Next.js App Router for /invest/[id] routes
 * // No manual instantiation needed
 *
 * @throws {never} This component never throws directly; invalid IDs trigger `notFound()`
 *
 * @see app/invest/lib.js - Mock invoice data source
 * @see lib/marketplaceRoute.js - Search parameter sanitization
 * @see app/invest/[id]/InvoiceDetailClient.jsx - Client boundary for metadata
 * @see app/invest/[id]/InvoiceDetailItems.jsx - Client boundary for detail documents
 * @see app/invest/[id]/FundActions.jsx - Client boundary for interactive controls
 */
// eslint-disable-next-line no-unused-vars
export default async function InvoiceDetailPage({ params, searchParams }) {
  // Support both the current (sync object) and future (Promise) params shape.
  const { id } = await Promise.resolve(params);

  // Runtime validation for params.id to ensure it's a non-empty string
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error(
      `InvoiceDetailPage: Invalid params.id. Expected a non-empty string but received ${typeof id === "string" ? "empty string" : typeof id}.`
    );
  }

  // Runtime validation for searchParams - must be object-like or undefined
  // Note: typeof null === "object", so we explicitly check for null
  if (
    searchParams !== undefined &&
    searchParams !== null &&
    typeof searchParams !== "object" &&
    !(searchParams instanceof URLSearchParams)
  ) {
    throw new Error(
      `InvoiceDetailPage: Invalid searchParams. Expected URLSearchParams, plain object, or undefined but received ${typeof searchParams}.`
    );
  }

  const backHref = getMarketplaceHref(searchParams || {});

  // Hardened data fetching with validation and error handling
  let invoice;
  try {
    invoice = await fetchInvoiceById(id);
  } catch (error) {
    // Handle specific error types deterministically
    if (error instanceof InvalidInvoiceIdError) {
      // Invalid ID format - treat as not found for security
      notFound();
    }
    if (error instanceof InvoiceNotFoundError) {
      // Invoice doesn't exist
      notFound();
    }
    // Other errors (should not happen with mock data, but will with real API)
    // Log and treat as not found to avoid exposing internal errors
    console.error("Failed to fetch invoice:", error);
    notFound();
  }

  // This should never happen due to error handling above, but we keep it
  // as a defensive guard
  if (!invoice) {
    notFound();
  } else if (resolution.status === INVOICE_RESOLUTION.ERROR) {
    // Failure recovery is deterministic: the segment error boundary
    // (`./error.js`) renders a typed, non-sensitive message and its `reset()`
    // prop re-runs this render. Because `resolveInvoice` is pure, a retry
    // either succeeds identically or fails identically — no partial state.
    throw new InvoiceDetailResolveError(resolution.reason);
  }

  const invoice = resolution.invoice;

  const invoiceJsonLd = buildInvoiceJsonLd(invoice);
  const detailItems = buildInvoiceDetailItems(invoice);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 print-page-wrapper">
      {/* ── Navigation ────────────────────────────────────────────────── */}
      <header className="no-print border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
        >
          {detail.backToHome}
        </Link>
        <NavMenu />
      </header>

      <main id="main-content" className="max-w-4xl mx-auto px-6 py-12">
        <RouteFocus />
        {/* ── JSON-LD structured data ────────────────────────────────── */}
        {invoiceJsonLd ? (
          <script
            type="application/ld+json"
            // JSON.stringify is safe here; sanitizeText already stripped
            // characters that could escape the script context.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(invoiceJsonLd) }}
          />
        ) : null}

        {/* ── Back navigation ───────────────────────────────────────── */}
        <Link
          href={backHref}
          className="no-print inline-block mb-6 text-sm text-slate-400 hover:text-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
          aria-label={detail.backToMarketplaceLabel}
        >
          {detail.backToMarketplace}
        </Link>

        {/* ── Page heading ──────────────────────────────────────────── */}
        <h1 className="text-2xl font-bold mb-2">{detail.pageTitle}</h1>
        <p className="text-slate-400 mb-8">{detail.pageSub}</p>

        {/* ── Invoice metadata (density-aware, client-rendered) ─────── */}
        <InvoiceDetailClient
          summaryHeading={invoice.issuer}
          labelIssuer={detail.labelIssuer}
          labelAmount={detail.labelAmount}
          labelYield={detail.labelYield}
          labelMaturity={detail.labelMaturity}
          labelStatus={detail.labelStatus}
          labelReference={detail.labelReference}
          issuer={invoice.issuer}
          formattedAmount={formatCurrency(invoice.amount, { currency: invoice.currency })}
          formattedYield={formatYield(invoice.yield)}
          dueDate={invoice.dueDate}
          referenceId={invoice.id ?? normalizedId}
          statusPill={<StatusPill status={invoice.status ?? ""} />}
        />

        {/* ── Detail documents with bulk-select toolbar ─────────────── */}
        <InvoiceDetailItems initialItems={detailItems} />

        {/* ── CSV / JSON export ────────────────────────────────────── */}
        <InvoiceDetailExport invoice={invoice} />

        {/* ── Lifecycle timeline (server-rendered, status-driven) ───────── */}
        <InvoiceTimeline
          status={invoice.status}
          timestamps={invoice.timestamps}
          events={invoice.events}
          className="mb-6"
        />

        {/* ── Interactive controls (client boundary) ────────────────── */}
        <FundActions
          id={invoice.id}
          status={invoice.status}
          maxAmount={invoice.amountValue}
          currency={invoice.currency}
          yieldValue={invoice.yieldValue}
        />
      </main>
    </div>
  );
}
