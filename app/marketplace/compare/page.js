import { Suspense } from "react";
import CompareTable from "./CompareTable";

export const metadata = {
  title: "Compare Invoices",
  description: "Compare yield, tenor, remaining capacity, funding progress, and risk side by side.",
};

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <section className="section">
          <div className="container">
            <div className="skeleton" style={{ height: 240 }} />
          </div>
        </section>
      }
    >
      <CompareTable />
    </Suspense>
  );
}
