"client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InvoiceCard from "@/components/InvoiceCard";
import { listInvoices } from "@/lib/api";
import { exportInvoicesCsv, defaultFilename } from "@/lib/exportInvoicesCsv.js";
import {
  getNetworkName,
  getPublicKey,
  hasFreighter,
  isConnected,
} from "@/lib/stellar/freighter";
import { getAccountState } from "@/lib/stellar/horizon";
import { CONFIGURED_NETWORK } from "@/lib/stellar/networks";

const FILTERS = [
  { v: "", l: "All" },
  { v: "open", l: "Open" },
  { v: "funded", l: "Funded" },
  { v: "settled", l: "Settled" },
];

/**
 * Detect whether a connected wallet's account is absent from the ledger.
 * Returns true only when: Freighter is present + connected + on the right
 * network + the public key has no Horizon record.
 */
async function detectUnfundedWallet() {
  if (!hasFreighter()) return false;
  const conn = await isConnected();
  if (!conn) return false;
  const netName = await getNetworkName();
  if (!netName) return false;
  const configuredNet = CONFIGURED_NETWORK;
  const netOk =
    netName === configuredNet ||
    (configuredNet === "testnet" && netName.includes("test"));
  if (!netOk) return false;
  const pubkey = await getPublicKey();
  if (!pubkey) return false;
  const { exists } = await getAccountState(pubkey, netName);
  return !exists;
}

export default function Marketplace() {
  const [status, setStatus] = useState("");
  const [state, setState] = useState({ loading: true, data: [], offline: false });
  const [exportStatus, setExportStatus] = useState("");
  const [showOnboardNotice, setShowOnboardNotice] = useState(false);

  // Detect unfunded wallet once on mount
  useEffect(() => {
    detectUnfundedWallet().then((unfunded) => {
      if (unfunded) setShowOnboardNotice(true);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    listInvoices(status).then((r) => alive && setState({ loading: false, ...r }));
    return () => {
      alive = false;
    };
  }, [status]);

  const rows = state.data || [];
  const canExport = !state.loading && rows.length > 0;
  const isDemo = Boolean(state.offline);
  const exportLabel = isDemo ? "Export CSV (demo data)" : "Export CSV";

  function handleExport() {
    if (!canExport) return;
    try {
      exportInvoicesCsv(rows, defaultFilename());
      setExportStatus(`Exported ${rows.length} invoice${rows.length === 1 ? "" : "s"} to CSV.`);
    } catch {
      setExportStatus("Export failed. Please try again.");
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="eybrow">Marketplace</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Invoices seeking funding</h1>
        <p className="lead">Pick an invoice, review its terms and contribute. Funds are escrowed until the debtor settles.</p>

        {showOnboardNotice && (
          <div className="notice notice-warn" style={{ marginBottom: 20 }}>
            Your wallet account doesn&apos;t exist on the ledger yet — any
            funding attempt will fail.{" "}
            <Link href="/get-started" style={{ fontWeight: 600 }}>
              Complete the Get&nbsp;started checklist →
            </Link>
          </div>
        )}

        <div className="toolbar" style={{ marginTop: 28, flexWrap: "wrap", gap: 12 }}>
          <div className="tabs" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button key={f.v || "all"} aria-pressed={status === f.v} onClick={() => setStatus(f.v)}>
                {f.l}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleExport}
              disabled={!canExport}
              aria-disabled={!canExport}
              aria-describedby="csv-export-status"
              title={isDemo ? "Export the demo invoices currently shown" : "Export the invoices currently shown"}
            >
              {exportLabel}
            </button>
            <Link href="/submit" className="btn btn-primary">+Submit invoice</Link>
          </div>
        </div>

        <div id="csv-export-status" role="status" aria-live="polite" className="muted" style={{ marginTop: 12, fontSize: "0.85rem", minHeight: "1.25em" }}>
          {exportStatus}
        </div>

        {state.offline && (
          <div className="notice notice-warn" style={{ marginBottom: 20 }}>
            The API is unreachable right now — showing demo data.
          </div>
        )}

        {state.loading ? (
          <div className="grid grid-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>
        ) : state.data.length === 0 ? (
          <div className="card center">
            <h3>No invoices here yet</h3>
            <p className="muted">Try another filter or submit the first one.</p>
            <Link href="/submit" className="btn btn-primary">Submit invoice</Link>
          </div>
        ) : (
          <div className="grid grid-3">
            {state.data.map((inv) => <InvoiceCard key={inv.id} invoice={inv} />)}
          </div>
        )}
      </div>
    </section>
  );
}