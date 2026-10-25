"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTRACT_ID, NETWORK } from "@/lib/config";
import { RPC_URL as SOROBAN_RPC_URL } from "@/lib/stellar/rpc";
import { eventMatchesInvoice, fetchEscrowActivity } from "@/lib/escrow-activity";

async function latestLedger() {
  const response = await fetch(SOROBAN_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestLedger", params: {} }),
  });
  if (!response.ok) throw new Error(`RPC request failed (${response.status})`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || "Could not read the latest ledger");
  return Number(body.result?.sequence);
}

function displayValue(value) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item); }
  catch { return String(value); }
}

export default function ActivityFeed({ invoiceId }) {
  const [events, setEvents] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (older = false) => {
    if (busy) return;
    setBusy(true);
    setStatus("loading");
    try {
      const startLedger = older ? undefined : Math.max(1, (await latestLedger()) - 1000);
      const page = await fetchEscrowActivity({
        rpcUrl: SOROBAN_RPC_URL,
        contractId: CONTRACT_ID,
        cursor: older ? cursor : null,
        startLedger,
      });
      const matching = page.events.filter((event) => eventMatchesInvoice(event, invoiceId));
      setEvents((current) => older ? [...current, ...matching] : matching);
      setCursor(page.cursor);
      setStatus("ready");
    } catch (error) {
      setStatus(error.message || "Could not load on-chain activity");
    } finally {
      setBusy(false);
    }
  }, [busy, cursor, invoiceId]);

  useEffect(() => { load(false); /* initial RPC read */ // eslint-disable-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  return (
    <section className="card" aria-labelledby="invoice-activity-title">
      <h2 id="invoice-activity-title">On-chain activity</h2>
      <p className="muted">Verified events for this invoice on Stellar {NETWORK}.</p>
      {status === "loading" && events.length === 0 ? <p role="status">Loading on-chain activity…</p> : null}
      {status !== "ready" && status !== "loading" ? (
        <div role="alert" className="notice notice-warn">
          {status}. <button className="btn btn-ghost" onClick={() => load(false)} disabled={busy}>Retry</button>
        </div>
      ) : null}
      {status === "ready" && events.length === 0 ? <p className="muted">No on-chain activity found for this invoice yet.</p> : null}
      {events.length > 0 ? (
        <ol aria-live="polite" style={{ paddingLeft: 22 }}>
          {events.map((event) => (
            <li key={event.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <strong>{event.name}</strong>
              <div className="muted">Ledger {event.ledger} · {new Date(event.timestamp).toLocaleString()}</div>
              <dl className="kv" style={{ marginTop: 8 }}>
                {Object.entries(event.fields).map(([name, value]) => (
                  <div key={name}><dt className="k">{name}</dt><dd className="mono">{displayValue(value)}</dd></div>
                ))}
              </dl>
              <a href={`https://stellar.expert/explorer/${NETWORK}/tx/${event.txHash}`} target="_blank" rel="noreferrer">View transaction</a>
            </li>
          ))}
        </ol>
      ) : null}
      {cursor && <button className="btn btn-ghost" onClick={() => load(true)} disabled={busy}>{busy ? "Loading…" : "Load older activity"}</button>}
    </section>
  );
}
