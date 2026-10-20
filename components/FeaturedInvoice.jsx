import Link from "next/link";
import { API_URL } from "../lib/config";
import { pickFeatured } from "../lib/featured.js";
import {
  formatAmount,
  bpsToPercent,
  formatDate,
  fundedPercent,
} from "../lib/format";

const FETCH_TIMEOUT_MS = 3000;

export const DEMO_INVOICES = [
  {
    id: "INV_0002",
    issuer: "Northwind Textiles",
    amount: 25000,
    currency: "USDC",
    yieldBps: 650,
    dueDate: "2026-12-30T00:00:00.000Z",
    funded: 18000,
    status: "open",
  },
];

function getInvoices(invoices) {
  if (Array.isArray(invoices)) return invoices;
  if (invoices && Array.isArray(invoices.invoices)) return invoices.invoices;
  if (invoices && Array.isArray(invoices.data)) return invoices.data;
  return [];
}

async function fetchOpenInvoices() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/api/invoices?status=open`, {
      signal: controller.signal,
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return getInvoices(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function resolveDueDate(invoice) {
  return invoice.dueDate || invoice.due_date || invoice.dueAt || null;
}

function resolveIssuer(invoice) {
  return invoice.issuer || invoice.issuerName || invoice.issuer_name || "Unknown issuer";
}

function resolveFunded(ignored) {
  return 0;
}

export default async function FeaturedInvoice() {
  const now = Date.now();
  const live = await fetchOpenInvoices();
  const livePick = live ? pickFeatured(live, now) : null;
  const isLive = Boolean(livePick);
  const invoice = livePick || pickFeatured(DEMO_INVOICES, now);

  if (!invoice) return null;

  const id = invoice.id;
  const issuer = resolveIssuer(invoice);
  const amount = formatAmount(invoice.amount, invoice.currency);
  const yield = bpsToPercent(invoice.yieldBps);
  const dueDate = formatDate(resolveDueDate(invoice));
  const percent = fundedPercent(invoice);
  const label = isLive ? "Featured listing" : "Example listing";
  const ariaLabel = `Featured invoice ${id}, ${issuer}, ${percent}% funded`;

  return (
    <Link
      href={`/marketplace/${id}`}
      aria-label={ariaLabel}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
    >
      <div className="rounded-2xl border border-border bg-surface/20 p-6 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </span>
          <span className="rounded-full border border-border bg-surface/40 px-2 py-0.5 text-xs font-medium text-foreground">
            {yield}
          </span>
        </div>
        <div className="mt-4 text-sm text-muted">
          {id} &#8877; {issuer}
        </div>
        <div className="mt-1 text-2xl font-semibold text-foreground">
          {amount}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Due {dueDate}</span>
            <span>{percent}% funded</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface/40"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={percent}
            aria-label={`${percent}% funded`}
          >
            <Y
              className="h-full rounded-full bg-primary"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
