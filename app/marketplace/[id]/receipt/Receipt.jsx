"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getInvoice } from "@/lib/api";
import { NETWORK } from "@/lib/config";
import { formatDate, shortAddress } from "@/lib/format";
import { buildReceipt } from "@/lib/receipt";
import { getWalletAddress } from "@/lib/stellar/freighter";
import { getDefaultStore } from "@/lib/stellar/txStore";

export default function Receipt({ invoiceId, txHash }) {
  const [state, setState] = useState({ loading: true, receipt: null });

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!txHash) {
        if (alive) setState({ loading: false, receipt: null });
        return;
      }

      const store = getDefaultStore();
      const tx = store.get(txHash);
      if (!tx || tx.invoiceId !== invoiceId || tx.status !== "SUCCESS") {
        if (alive) setState({ loading: false, receipt: null });
        return;
      }

      const [invRes, wallet] = await Promise.all([
        getInvoice(invoiceId).catch(() => ({ data: null })),
        getWalletAddress().catch(() => null),
      ]);

      if (!alive) return;

      const receipt = buildReceipt({
        tx,
        invoice: invRes?.data || null,
        investor: wallet,
        network: NETWORK,
      });

      setState({ loading: false, receipt });
    }

    load();
    return () => {
      alive = false;
    };
  }, [invoiceId, txHash]);

  if (state.loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="skeleton" style={{ minHeight: 320 }} />
        </div>
      </section>
    );
  }

  const { receipt } = state;

  if (!receipt) {
    return (
      <section className="section">
        <div className="container center">
          <h1 style={{ fontSize: "2rem" }}>Receipt not found</h1>
          <p className="lead">
            We couldn&apos;t find a confirmed funding receipt for this invoice and transaction hash in your local transaction history.
          </p>
          <div className="receipt-actions no-print" style={{ justifyContent: "center", marginTop: 20 }}>
            <Link href={`/marketplace/${encodeURIComponent(invoiceId)}`} className="btn btn-primary">
              Back to invoice
            </Link>
            <Link href="/marketplace" className="btn btn-ghost">
              Marketplace
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section receipt-page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="receipt-actions no-print" style={{ marginBottom: 18 }}>
          <Link href={`/marketplace/${encodeURIComponent(receipt.invoiceId)}`} className="muted">
            ← Back to invoice {receipt.invoiceId}
          </Link>
          <button type="button" className="btn btn-primary focus-ring" onClick={() => window.print()}>
            Print receipt
          </button>
        </div>

        <article className="card receipt-card" aria-label="Funding receipt">
          <header className="receipt-header">
            <div>
              <div className="invoice-id">LiquiFact · On-Chain Funding Receipt</div>
              <h1 style={{ fontSize: "1.6rem", margin: "4px 0" }}>{receipt.sme || receipt.invoiceId}</h1>
              {receipt.debtor && <div className="muted">Debtor: {receipt.debtor}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="badge">{receipt.network}</span>
              <div className="muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
                Issued {formatDate(receipt.issuedAt)}
              </div>
            </div>
          </header>

          <div className="receipt-section">
            <h2>Contribution</h2>
            <div className="kv" style={{ marginTop: 10 }}>
              <div>
                <span className="k">Amount funded</span>
                <strong>{receipt.amountFormatted || receipt.label || "Confirmed"}</strong>
              </div>
              <div>
                <span className="k">Status</span>
                Confirmed
              </div>
              <div>
                <span className="k">Network</span>
                <span className="mono">{receipt.network}</span>
              </div>
              <div>
                <span className="k">Confirmed at</span>
                {formatDate(receipt.confirmedAt)}
              </div>
              {receipt.investor && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span className="k">Investor wallet</span>
                  <span className="mono" title={receipt.investor}>
                    {shortAddress(receipt.investor, 10)}
                  </span>
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="k">Transaction hash</span>
                <div className="mono" style={{ wordBreak: "break-all", fontSize: "0.88rem" }}>
                  {receipt.hash}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="k">Block explorer</span>
                <a
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring"
                  style={{ wordBreak: "break-all" }}
                >
                  {receipt.explorerUrl}
                </a>
              </div>
            </div>
          </div>

          <div className="receipt-section">
            <h2>Invoice terms</h2>
            <div className="kv" style={{ marginTop: 10 }}>
              <div>
                <span className="k">Invoice ID</span>
                <span className="mono">{receipt.invoiceId}</span>
              </div>
              <div>
                <span className="k">Face value</span>
                {receipt.faceValue}
              </div>
              <div>
                <span className="k">Investor yield</span>
                {receipt.yieldPercent}
              </div>
              <div>
                <span className="k">Due date</span>
                {receipt.dueDateFormatted}
              </div>
            </div>
          </div>

          <footer className="receipt-footer muted">
            <span>Reference: {receipt.filename}</span>
            <span>Verified from local Stellar transaction record</span>
          </footer>
        </article>
      </div>
    </section>
  );
}
