import { bpsToPercent, formatAmount, fundedPercent } from "./format.js";

const SITE_NAME = "LiquiFact";

function cleanText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function numericAmount(invoice) {
  return invoice?.amountValue ?? invoice?.faceValue ?? invoice?.amount;
}

function yieldPercent(invoice) {
  if (invoice?.yieldBps !== null && invoice?.yieldBps !== undefined) {
    return bpsToPercent(invoice.yieldBps);
  }

  const value = invoice?.yieldValue ?? invoice?.yield ?? invoice?.interestRate;
  if (typeof value === "string") {
    const numericValue = Number(value.replace(/[%\s,]/g, ""));
    return Number.isFinite(numericValue) ? numericValue : null;
  }
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function amountText(invoice) {
  const value = numericAmount(invoice);
  return formatAmount(value);
}

function percentText(value) {
  return value === null ? "N/A" : `${value.toFixed(2)}%`;
}

/**
 * Create invoice metadata with bounded, plain-text descriptions.
 *
 * @param {object|null|undefined} invoice
 * @param {string} siteUrl
 * @returns {object}
 */
export function invoiceMeta(invoice, siteUrl, requestedId) {
  const id = cleanText(invoice?.id ?? requestedId, "Invoice");
  const canonicalPath = `/marketplace/${encodeURIComponent(id)}`;
  const canonical = new URL(canonicalPath, siteUrl || "http://localhost:3000").pathname;

  if (!invoice) {
    const title = `${id} — Invoice not found | ${SITE_NAME}`;
    const description = "This invoice could not be found.";
    return {
      title,
      description,
      alternates: { canonical },
      robots: { index: false },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: SITE_NAME,
        type: "article",
        images: [{ url: `${canonical}/opengraph-image`, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`${canonical}/opengraph-image`],
      },
    };
  }

  const issuer = cleanText(invoice.issuer ?? invoice.sme ?? invoice.smeName, "SME");
  const currency = cleanText(invoice.currency, "");
  const amount = amountText(invoice);
  const yieldValue = yieldPercent(invoice);
  const funded = fundedPercent(invoice);
  const title = `${id} · ${issuer} — ${amount}${currency ? ` ${currency}` : ""} at ${percentText(yieldValue)}, ${Math.round(funded)}% funded`;
  const description = cleanText(
    `${id}: ${issuer} invoice for ${amount}${currency ? ` ${currency}` : ""}, offering ${percentText(yieldValue)} yield. ${Math.round(funded)}% funded.`,
    "Invoice investment opportunity on LiquiFact."
  ).slice(0, 160);
  const imageUrl = `${canonical}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "article",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export { cleanText, numericAmount, percentText, yieldPercent };
