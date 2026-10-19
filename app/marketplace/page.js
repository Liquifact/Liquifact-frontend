import { Suspense } from "react";
import Marketplace from "./Marketplace";

export const metadata = {
  title: "Marketplace",
  description: "Browse invoices open for funding on LiquiFact.",
};

// useSearchParams() inside Marketplace.jsx requires a Suspense boundary when
// the page is rendered as a server component (Next.js 13+).
export default function MarketplacePage() {
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
      <Marketplace />
    </Suspense>
  );
}
