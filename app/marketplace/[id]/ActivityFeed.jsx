"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONTRACT_ID, NETWORK } from "@/lib/config";
import { getRpcEndpoints, withFailover } from "@/lib/stellar/rpc";
import { useLocale } from "@/lib/i18n/I18nProvider";
import {
  createActivityPoller,
  eventMatchesInvoice,
  fetchEscrowActivity,
  latestLedger,
} from "@/lib/escrow-activity";

const POLL_INTERVAL_MS = 15000;
const INITIAL_LEDGER_WINDOW = 1000;

function displayValue(value) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item); }
  catch { return String(value); }
}

function mergeNew(incoming, existing) {
  const ids = new Set(existing.map((event) => event.id).filter(Boolean));
  return [...incoming.filter((event) => !event.id || !ids.has(event.id)), ...existing];
}

function appendUnique(existing, incoming) {
  const ids = new Set(existing.map((event) => event.id).filter(Boolean));
  return [...existing, ...incoming.filter((event) => !event.id || !ids.has(event.id))];
}

export default function ActivityFeed({ invoiceId }) {
  const locale = useLocale();
  const [events, setEvents] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [busyOlder, setBusyOlder] = useState(false);
  const pollerRef = useRef(null);
  const cursorRef = useRef(null);
  const loadedRef = useRef(false);

  const fetchPage = useCallback(async ({ cursor: pageCursor }) => {
    const endpoints = getRpcEndpoints();
    const startLedger = pageCursor
      ? undefined
      : Math.max(1, (await withFailover("rpc", (rpcUrl) => latestLedger(rpcUrl), { endpoints })) - INITIAL_LEDGER_WINDOW);
    const page = await withFailover("rpc", (rpcUrl) => fetchEscrowActivity({
      rpcUrl,
      contractId: CONTRACT_ID,
      cursor: pageCursor,
      startLedger,
    }), { endpoints });
    cursorRef.current = page.cursor || pageCursor || null;
    return {
      events: page.events.filter((event) => eventMatchesInvoice(event, invoiceId)),
      cursor: page.cursor,
    };
  }, [invoiceId]);

  useEffect(() => {
    loadedRef.current = false;
    cursorRef.current = null;
    setEvents([]);
    setCursor(null);
    setError(null);
    setLastUpdated(null);
    setAnnouncement("");
    setStatus("loading");

    const poller = createActivityPoller({
      fetchPage,
      intervalMs: POLL_INTERVAL_MS,
      onEvents: (fresh) => {
        if (loadedRef.current) {
          setAnnouncement(fresh.length === 1 ? "1 new on-chain event" : `${fresh.length} new on-chain events`);
        }
        loadedRef.current = true;
        setEvents((current) => mergeNew(fresh, current));
      },
      onStatus: ({ cursor: nextCursor, lastUpdated: stamp }) => {
        if (nextCursor) {
          cursorRef.current = nextCursor;
          setCursor(nextCursor);
        }
        setLastUpdated(stamp);
        setError(null);
        setStatus("ready");
      },
      onError: (err) => {
        setError(err?.message || "Could not load on-chain activity");
        setStatus("error");
      },
    });
    pollerRef.current = poller;
    poller.start();
    return () => {
      poller.stop();
      pollerRef.current = null;
    };
  }, [fetchPage]);

  async function loadOlder() {
    if (busyOlder || !cursorRef.current) return;
    setBusyOlder(true);
    try {
      const endpoints = getRpcEndpoints();
      const page = await withFailover("rpc", (rpcUrl) => fetchEscrowActivity({
        rpcUrl,
        contractId: CONTRACT_ID,
        cursor: cursorRef.current,
      }), { endpoints });
      const matching = page.events.filter((event) => eventMatchesInvoice(event, invoiceId));
      if (page.cursor) {
        cursorRef.current = page.cursor;
        setCursor(page.cursor);
      }
      setEvents((current) => appendUnique(current, matching));
    } catch (err) {
      setError(err?.message || "Could not load on-chain activity");
    } finally {
      setBusyOlder(false);
    }
  }

  function retry() {
    setStatus("loading");
    setError(null);
    pollerRef.current?.pollNow();
  }

  return (
    <section className="card" aria-labelledby="invoice-activity-title">
      <h2 id="invoice-activity-title">On-chain activity</h2>
      <p className="muted">Verified events for this invoice on Stellar {NETWORK}.</p>
      <div aria-live="polite" role="status" className="sr-only">{announcement}</div>
      {status === "loading" && events.length === 0 ? <p role="status">Loading on-chain activity…</p> : null}
      {error ? (
        <div role="alert" className="notice notice-warn">
          {error}. <button className="btn btn-ghost" onClick={retry} disabled={status === "loading"}>Retry</button>
        </div>
      ) : null}
      {lastUpdated ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Live · last updated {new Date(lastUpdated).toLocaleTimeString(locale)}
        </p>
      ) : null}
      {status === "ready" && events.length === 0 ? <p className="muted">No on-chain activity found for this invoice yet.</p> : null}
      {events.length > 0 ? (
        <ol style={{ paddingLeft: 22 }}>
          {events.map((event) => (
            <li key={event.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <strong>{event.name}</strong>
              <div className="muted">Ledger {event.ledger} · {new Date(event.timestamp).toLocaleString(locale)}</div>
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
      {cursor && <button className="btn btn-ghost" onClick={loadOlder} disabled={busyOlder}>{busyOlder ? "Loading…" : "Load older activity"}</button>}
    </section>
  );
}
