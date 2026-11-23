import { Suspense } from "react";
import { pageMeta } from "@/lib/seo";
import { listInvoices } from "@/lib/api";
import Marketplace from "./Marketplace";

export const revalidate = 30;

export const metadata = pageMeta({
  path: "/marketplace",
  title: "Marketplace",
  description: "Browse invoices open for funding on LiquiFact.",
});

// Fetch the first page of invoices on the server so the initial HTML contains
// invoice cards. Errors propagate to app/marketplace/error.js.
async function loadInitialInvoices(status) {
  const result = await listInvoices({ status, revalidate: 30 });
  const invoices = Array.isArray(result) ? result : result?.invoices ?? result?.data ?? [];
  return { invoices, offline: Boolean(result?.offline) };
}

export default async function MarketplacePage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : undefined;
  const { invoices, offline } = await loadInitialInvoices(status);

  return (
    <Suspense
      fallback={
        <section className="section">
          <div className="container">
            <div className="grid grid-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          </div>
        </section>
      }
    >
      <Marketplace initialInvoices={invoices} initialOffline={offline} initialStatus={status ?? ""} />
    </Suspense>
  );
}
