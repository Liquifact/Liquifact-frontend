"use client";

import { useState } from "react";
import { useTxTracker } from "@/components/TxTrackerProvider";
import { explorerTxUrl } from "@/lib/stellar";
import { filterTxs, txsToCsv } from "@/lib/txHistory";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "SUCCESS", label: "Confirmed" },
  { value: "FAILED", label: "Failed" },
  { value: "UNKNOWN", label: "Unknown" },
];

const STATUS_LABELS = {
  PENDING: "Pending",
  SUCCESS: "Confirmed",
  FAILED: "Failed",
  UNKNOWN: "Unknown",
};

function displayDate(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

export default function ActivityHistory() {
  const { transactions, track } = useTxTracker();
  const [status, setStatus] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [query, setQuery] = useState("");
  const [rechecking, setRechecking] = useState(() => new Set());
  const [exportMessage, setExportMessage] = useState("");
  const filteredTransactions = filterTxs(transactions, { status, invoiceId, query });

  async function recheck(tx) {
    setRechecking((current) => new Set(current).add(tx.hash));
    try {
      await track(tx.hash, { label: tx.label, invoiceId: tx.invoiceId });
    } finally {
      setRechecking((current) => {
        const next = new Set(current);
        next.delete(tx.hash);
        return next;
      });
    }
  }

  function exportCsv() {
    if (!filteredTransactions.length) return;
    try {
      const date = new Date().toISOString().slice(0, 10);
      const blob = new Blob([txsToCsv(filteredTransactions, { bom: true })], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `liquifact-transactions-${date}.csv`;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
      setExportMessage(`Exported ${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? "" : "s"}.`);
    } catch {
      setExportMessage("Export failed. Please try again.");
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="activity-heading">
          <div>
            <div className="eyebrow">Account activity</div>
            <h1>Transaction history</h1>
          </div>
          <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={!filteredTransactions.length}>
            Export CSV
          </button>
        </div>

        <div className="activity-filters">
          <div className="activity-tabs" role="group" aria-label="Filter transactions by status">
            {STATUS_TABS.map((tab) => {
              const count = tab.value
                ? transactions.filter((tx) => tx.status === tab.value).length
                : transactions.length;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  className="activity-tab"
                  aria-pressed={status === tab.value}
                  onClick={() => setStatus(tab.value)}
                >
                  {tab.label}<span className="activity-count">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="activity-inputs">
            <label>
              <span>Invoice ID</span>
              <input value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} placeholder="Filter by invoice" />
            </label>
            <label>
              <span>Search</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Description or transaction hash" />
            </label>
          </div>
        </div>

        <p className="activity-result-count" aria-live="polite">
          Showing {filteredTransactions.length} of {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
        </p>
        {exportMessage && <p className="visually-hidden" role="status">{exportMessage}</p>}

        {filteredTransactions.length ? (
          <div className="activity-table-wrap">
            <table className="activity-table">
              <thead>
                <tr>
                  <th scope="col">Transaction</th>
                  <th scope="col">Invoice</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.hash}>
                    <td>
                      <strong className="activity-label">{tx.label}</strong>
                      <a className="activity-hash mono" href={explorerTxUrl(tx.hash)} target="_blank" rel="noopener noreferrer">
                        {tx.hash}
                      </a>
                    </td>
                    <td>{tx.invoiceId || <span className="muted">—</span>}</td>
                    <td><span className={`activity-status activity-status-${tx.status.toLowerCase()}`}>{STATUS_LABELS[tx.status] || tx.status}</span></td>
                    <td><time dateTime={new Date(tx.createdAt).toISOString()}>{displayDate(tx.createdAt)}</time></td>
                    <td className="activity-actions">
                      <a href={explorerTxUrl(tx.hash)} target="_blank" rel="noopener noreferrer">Explorer</a>
                      {tx.status === "PENDING" && (
                        <button
                          type="button"
                          className="btn btn-ghost activity-recheck"
                          onClick={() => recheck(tx)}
                          disabled={rechecking.has(tx.hash)}
                        >
                          {rechecking.has(tx.hash) ? "Checking…" : "Re-check"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="activity-empty" role="status">
            {transactions.length ? "No transactions match these filters." : "No transactions yet."}
          </div>
        )}
      </div>

      <style jsx>{`
        .activity-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
        .activity-heading h1 { font-size: 2rem; margin: 4px 0 0; }
        .activity-filters { border-bottom: 1px solid var(--border); }
        .activity-tabs { display: flex; gap: 4px; overflow-x: auto; }
        .activity-tab { display: inline-flex; align-items: center; gap: 8px; padding: 10px 12px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--muted); font: inherit; white-space: nowrap; cursor: pointer; }
        .activity-tab[aria-pressed="true"] { color: var(--fg); border-bottom-color: var(--brand); font-weight: 700; }
        .activity-count { min-width: 20px; padding: 0 5px; border-radius: 999px; background: var(--surface-2); color: var(--muted); font-size: 0.75rem; text-align: center; }
        .activity-inputs { display: flex; gap: 12px; padding: 18px 0; }
        .activity-inputs label { display: grid; gap: 5px; min-width: 180px; color: var(--muted); font-size: 0.85rem; }
        .activity-inputs input { width: min(100%, 340px); min-height: 42px; padding: 8px 11px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--fg); font: inherit; }
        .activity-result-count { margin: 0 0 12px; color: var(--muted); font-size: 0.9rem; }
        .activity-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); }
        .activity-table { width: 100%; min-width: 760px; border-collapse: collapse; text-align: left; }
        .activity-table th { padding: 12px 14px; background: var(--surface-2); color: var(--muted); font-size: 0.78rem; font-weight: 700; }
        .activity-table td { padding: 14px; border-top: 1px solid var(--border); vertical-align: middle; }
        .activity-label, .activity-hash { display: block; max-width: 370px; overflow-wrap: anywhere; }
        .activity-hash { margin-top: 4px; font-size: 0.75rem; }
        .activity-status { display: inline-block; padding: 3px 8px; border-radius: 999px; background: var(--surface-2); font-size: 0.82rem; white-space: nowrap; }
        .activity-status-pending { color: var(--warn); }
        .activity-status-success { color: var(--ok); }
        .activity-status-failed { color: var(--danger); }
        .activity-status-unknown { color: var(--muted); }
        .activity-actions { white-space: nowrap; }
        .activity-recheck { margin-left: 10px; padding: 5px 9px; font-size: 0.82rem; }
        .activity-empty { padding: 42px 16px; border: 1px dashed var(--border); color: var(--muted); text-align: center; }
        @media (max-width: 640px) {
          .activity-heading { align-items: start; flex-direction: column; }
          .activity-heading .btn { align-self: stretch; }
          .activity-inputs { flex-direction: column; }
          .activity-inputs label, .activity-inputs input { width: 100%; }
        }
      `}</style>
    </section>
  );
}