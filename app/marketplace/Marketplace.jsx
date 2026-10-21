"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InvoiceCard from "@/components/InvoiceCard";
import { listInvoices } from "@/lib/api";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  getNetworkName,
  getPublicKey,
  hasFreighter,
  isConnected,
} from "@/lib/stellar/freighter";
import { getAccountState } from "@/lib/stellar/horizon";
import { CONFIGURED_NETWORK } from "@/lib/stellar/networks";

const FILTERS = [
  { v: "", key: "marketplace.filter.all" },
  { v: "open", key: "marketplace.filter.open" },
  { v: "funded", key: "marketplace.filter.funded" },
  { v: "settled", key: "marketplace.filter.settled" },
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
  const t = useT();
  const [status, setStatus] = useState("");
  const [state, setState] = useState({ loading: true, data: [], offline: false });
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

  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow">{t("marketplace.eyebrow")}</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>{t("marketplace.heading")}</h1>
        <p className="lead">{t("marketplace.lead")}</p>

        {showOnboardNotice && (
          <div className="notice notice-warn" style={{ marginBottom: 20 }}>
            {t("marketplace.unfundedWallet")}{" "}
            <Link href="/get-started" style={{ fontWeight: 600 }}>
              {t("marketplace.unfundedWalletCta")}
            </Link>
          </div>
        )}

        <div className="toolbar" style={{ marginTop: 28 }}>
          <div className="tabs" role="group" aria-label={t("marketplace.filterLabel")}>
            {FILTERS.map((f) => (
              <button key={f.v || "all"} aria-pressed={status === f.v} onClick={() => setStatus(f.v)}>
                {t(f.key)}
              </button>
            ))}
          </div>
          <Link href="/submit" className="btn btn-primary">{t("marketplace.submit")}</Link>
        </div>

        {state.offline && (
          <div className="notice notice-warn" style={{ marginBottom: 20 }}>
            {t("marketplace.offline")}
          </div>
        )}

        {state.loading ? (
          <div className="grid grid-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>
        ) : state.data.length === 0 ? (
          <div className="card center">
            <h3>{t("marketplace.empty.title")}</h3>
            <p className="muted">{t("marketplace.empty.body")}</p>
            <Link href="/submit" className="btn btn-primary">{t("marketplace.empty.cta")}</Link>
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
