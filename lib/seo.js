// Invoice SEO helpers (#1383): metadata, JSON-LD and plain-text cleaning.
// Invoice fields come from the API and are treated as untrusted text.
import { formatAmount, fundedPercent } from "./format.js";

export const SITE_NAME = "LiquiFact";

/** Strip markup delimiters and collapse whitespace from untrusted text. */
export function cleanText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

/** Investor yield as percentage points (number) or null. */
export function yieldPercent(invoice) {
  const bps = invoice?.yieldBps;
  if (bps === null || bps === undefined || String(bps).trim() === "") return null;
  const n = Number(bps);
  return Number.isFinite(n) ? n / 100 : null;
}

export function percentText(value) {
  return value === null ? "N/A" : `${value.toFixed(2)}%`;
}

function issuerOf(invoice) {
  return cleanText(invoice?.sme ?? invoice?.issuer, "SME");
}

/**
 * Next.js metadata for an invoice page, with canonical URL and share cards.
 * @param {object|null|undefined} invoice
 * @param {string} [requestedId] - route id, used when the invoice is missing
 */
export function invoiceMeta(invoice, requestedId) {
  const id = cleanText(invoice?.id ?? requestedId, "Invoice");
  const canonical = `/marketplace/${encodeURIComponent(id)}`;
  const imageUrl = `${canonical}/opengraph-image`;

  let title;
  let description;
  if (!invoice) {
    title = `${id} — Invoice not found`;
    description = "This invoice could not be found.";
  } else {
    const issuer = issuerOf(invoice);
    const amount = formatAmount(invoice.amount, cleanText(invoice.currency, "USDC"));
    const rate = percentText(yieldPercent(invoice));
    const funded = fundedPercent(invoice);
    title = `${id} · ${issuer} — ${amount} at ${rate}, ${funded}% funded`;
    description = cleanText(`${id}: ${issuer} invoice for ${amount}, offering ${rate} yield. ${funded}% funded.`).slice(0, 160);
  }

  return {
    title,
    description,
    alternates: { canonical },
    ...(invoice ? {} : { robots: { index: false } }),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "article",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

/** schema.org Offer describing an invoice listing. */
export function invoiceJsonLd(invoice) {
  const issuer = issuerOf(invoice);
  const currency = cleanText(invoice?.currency, "USDC");
  const status = cleanText(invoice?.status, "unknown");
  const rate = yieldPercent(invoice);
  const price = Number(invoice?.amount);
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: `Invoice offering from ${issuer}`,
    description: `${issuer} invoice for ${formatAmount(invoice?.amount, currency)}${rate === null ? "" : ` at ${rate.toFixed(2)}% yield`}. Status: ${status}.`,
    seller: { "@type": "Organization", name: issuer },
    ...(Number.isFinite(price) ? { price } : {}),
    priceCurrency: currency,
    availability: status.toLowerCase() === "open" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
  };
}

/** JSON for a <script type="application/ld+json"> body, safe against script breakouts. */
export function stringifyJsonLd(value) {
  const escaped = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026", " ": "\\u2028", " ": "\\u2029" };
  return JSON.stringify(value).replace(/[<>&  ]/g, (c) => escaped[c]);
}
