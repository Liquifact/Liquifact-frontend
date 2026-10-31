import Link from "next/link";
import FundingProgress from "@/components/FundingProgress";
import { API_URL } from "@/lib/config";
import { DEMO_INVOICES } from "@/lib/demo";
import { pickFeatured } from "@/lib/featured";
import { bpsToPercent, formatAmount, formatDate } from "@/lib/format";

const FETCH_TIMEOUT_MS = 3000;

function invoicesFrom(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.invoices)) return payload.invoices;
  return [];
}

/** Open invoices from the API (revalidated every 2 minutes), or null when unreachable. */
async function fetchOpenInvoices() {
  try {
    const res = await fetch(`${API_URL}/api/invoices?status=open`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return invoicesFrom(await res.json());
  } catch {
    return null;
  }
}

export function FeaturedInvoiceSkeleton() {
  return (
    <div className="glass" aria-hidden="true">
      <div className="skeleton" style={{ minHeight: 210, background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

/** Server component: live featured listing in the hero, demo data as fallback. */
export default async function FeaturedInvoice({ now = Date.now(), loadInvoices = fetchOpenInvoices } = {}) {
  const live = await loadInvoices();
  const livePick = live ? pickFeatured(live, now) : null;
  const invoice = livePick || pickFeatured(DEMO_INVOICES, now);
  if (!invoice) return null;

  const label = livePick ? "Featured listing" : "Example listing";
  return (
    <Link href={`/marketplace/${encodeURIComponent(invoice.id)}`} className="glass featured-invoice" aria-label={`${label}: ${invoice.id} · ${invoice.sme}`}>
      <div className="eyebrow" style={{ color: "var(--on-hero-eyebrow)" }}>{label}</div>
      <h3 style={{ margin: "6px 0 14px" }}>{invoice.id} · {invoice.sme}</h3>
      <div className="row"><span className="k">Face value</span><span>{formatAmount(invoice.amount, invoice.currency)}</span></div>
      <div className="row"><span className="k">Investor yield</span><span>{bpsToPercent(invoice.yieldBps)}</span></div>
      <div className="row"><span className="k">Due</span><span>{formatDate(invoice.dueDate)}</span></div>
      <FundingProgress funded={invoice.fundedAmount} target={invoice.amount} currency={invoice.currency} size="md" showLabel />
    </Link>
  );
}
