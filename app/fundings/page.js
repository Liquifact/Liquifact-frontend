"use client";

import { useEffect, useState } from "react";
import NavMenu from "../../components/NavMenu";
import { listFundings } from "../../lib/fundingsStore";

export default function FundingsPage() {
  const [fundings, setFundings] = useState([]);
  const [sortField, setSortField] = useState("date"); // "date" | "amount"
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" | "desc"
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFundings(listFundings());
  }, []);

  const sortedFundings = [...fundings].sort((a, b) => {
    let comparison = 0;
    if (sortField === "date") {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortField === "amount") {
      comparison = Number(a.amount) - Number(b.amount);
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <NavMenu />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            My Fundings
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            A history of invoices you have funded.
          </p>
        </div>

        {isMounted && fundings.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <h3 className="mt-2 text-sm font-semibold text-slate-200">No fundings found</h3>
            <p className="mt-1 text-sm text-slate-400">You haven&apos;t funded any invoices yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-4 bg-slate-800/50 p-4 border-b border-slate-800">
              <span className="text-sm font-medium text-slate-400">Sort by:</span>
              <button
                onClick={() => handleSortChange("date")}
                className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                  sortField === "date"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                Date {sortField === "date" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => handleSortChange("amount")}
                className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                  sortField === "amount"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                Amount {sortField === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </div>
            
            <ul className="divide-y divide-slate-800">
              {isMounted &&
                sortedFundings.map((funding) => (
                  <li key={funding.id} className="p-6 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {funding.issuer || funding.invoiceId}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Funded on {new Date(funding.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-emerald-400">
                          {Number(funding.amount).toLocaleString()} USDC
                        </p>
                        {funding.yield && (
                          <p className="text-xs text-slate-500 mt-1">Est. yield: {funding.yield}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
