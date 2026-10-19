"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InvoiceCard from "@/components/InvoiceCard";
import { listInvoices } from "@/lib/api";

import { useT } from "@/components/I18nProvider";

const FILTERS = [
  { v: "", k: "marketplace.filter.all" },
  { v: "open", k: "marketplace.filter.open" },
  { v: "funded", k: "marketplace.filter.funded" },
  { v: "settled", k: "marketplace.filter.settled" },
];

export default function Marketplace() {
  const t = useT();
  const [status, setStatus] = useState("");
  const [state, setState] = useState({ loading: true, data: [], offline: false });

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
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>{t("marketplace.title")}</h1>
        <p className="lead">{t("marketplace.lead")}</p>

        <div className="toolbar" style={{ marginTop: 28 }}>
          <div className="tabs" role="group" aria-label={t("marketplace.filterLabel")}>
            {FILTERS.map((f) => (
              <button key={f.v || "all"} aria-pressed={status === f.v} onClick={() => setStatus(f.v)}>
                {t(f.k)}
              </button>
            ))}
          </div>
          <Link href="/submit" className="btn btn-primary">{t("marketplace.submit")}</Link>
        </div>

        {state.offline && (
          <div className="notice notice-warn" role="status" style={{ marginBottom: 20 }}>
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
