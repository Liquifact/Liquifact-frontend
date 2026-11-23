"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listInvoices } from "@/lib/api";
import { buildWatchlist } from "@/lib/watchlist";
import { formatDate, formatMoney, formatYield } from "@/lib/format";
import { useT } from "@/lib/i18n/I18nProvider";
import { useNotifications } from "@/components/NotificationsProvider";
import StatusBadge from "@/components/StatusBadge";
import FundingProgress from "@/components/FundingProgress";

function deltaLabel(t, delta) {
  if (delta === null || delta === undefined) return t("watchlist.delta.none");
  if (delta > 0) return t("watchlist.delta.up", { delta });
  if (delta < 0) return t("watchlist.delta.down", { delta });
  return t("watchlist.delta.flat");
}

function deltaTone(delta) {
  if (delta === null || delta === undefined || delta === 0) return "muted";
  return delta > 0 ? "delta-up" : "delta-down";
}

export default function Watchlist() {
  const t = useT();
  const { followedIds, snapshot, unfollow } = useNotifications();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;

    if (!followedIds || followedIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync loading state when watchlist is empty
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    listInvoices()
      .then((res) => {
        if (!active) return;
        setInvoices(Array.isArray(res?.data) ? res.data : []);
        setOffline(Boolean(res?.offline || res?.stale));
      })
      .catch(() => {
        if (!active) return;
        setInvoices([]);
        setOffline(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [followedIds]);

  const rows = useMemo(
    () => buildWatchlist({ followedIds, invoices, snapshot }),
    [followedIds, invoices, snapshot]
  );

  const statusLabel = (status) => {
    if (status === "unavailable") return t("watchlist.unavailable");
    const key = `invoice.status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  return (
    <section className="section">
      <div className="container">
        <div className="page-head">
          <div>
            <p className="eyebrow">{t("watchlist.eyebrow")}</p>
            <h1>{t("watchlist.heading")}</h1>
            <p className="lead">{t("watchlist.lead")}</p>
          </div>
          {rows.length > 0 && (
            <span className="pill" aria-live="polite">
              {t("watchlist.count", { count: rows.length })}
            </span>
          )}
        </div>

        {offline && rows.length > 0 && (
          <div className="banner banner-warn" role="status">
            {t("watchlist.offline")}
          </div>
        )}

        {loading && followedIds.length > 0 ? (
          <div className="grid grid-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="card empty-state" style={{ padding: 32, textAlign: "center" }}>
            <h2>{t("watchlist.empty.title")}</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              {t("watchlist.empty.body")}
            </p>
            <Link href="/marketplace" className="btn btn-primary">
              {t("watchlist.empty.cta")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-3" role="list">
            {rows.map((row) => {
              const inv = row.invoice;
              const debtor = inv?.debtor || row.previous?.debtor;
              return (
                <article key={row.id} className="card" role="listitem" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <div className="mono" style={{ fontWeight: 600 }}>
                        {row.available ? (
                          <Link href={`/marketplace/${row.id}`}>{row.id}</Link>
                        ) : (
                          row.id
                        )}
                      </div>
                      {debtor && (
                        <div className="muted" style={{ fontSize: "0.9rem" }}>
                          {t("invoice.debtor", { name: debtor })}
                        </div>
                      )}
                    </div>
                    <StatusBadge
                      status={row.available ? row.status : "unknown"}
                      label={statusLabel(row.status)}
                    />
                  </div>

                  {row.statusChanged && row.prevStatus && (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {t("watchlist.statusChanged", { status: statusLabel(row.prevStatus) })}
                    </div>
                  )}

                  {row.available && inv ? (
                    <>
                      <div className="meta-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                        <div>
                          <div className="muted" style={{ fontSize: "0.75rem" }}>{t("invoice.faceValue")}</div>
                          <div style={{ fontWeight: 600 }}>{formatMoney(inv.amount, inv.currency)}</div>
                        </div>
                        <div>
                          <div className="muted" style={{ fontSize: "0.75rem" }}>{t("invoice.yield")}</div>
                          <div style={{ fontWeight: 600 }}>{formatYield(inv.yieldBps)}</div>
                        </div>
                        <div>
                          <div className="muted" style={{ fontSize: "0.75rem" }}>{t("invoice.due")}</div>
                          <div style={{ fontWeight: 600 }}>{formatDate(inv.dueDate)}</div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 4 }}>
                          <span>{t("invoice.funded")}</span>
                          <span className="mono">{row.fundedPercent}%</span>
                        </div>
                        <FundingProgress
                          funded={inv.fundedAmount}
                          target={inv.amount}
                          currency={inv.currency || "XLM"}
                          size="sm"
                        />
                        <div
                          className={deltaTone(row.fundedDelta)}
                          style={{ fontSize: "0.8rem", marginTop: 6 }}
                        >
                          {deltaLabel(t, row.fundedDelta)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="muted" style={{ fontSize: "0.9rem", margin: 0 }}>
                      {t("watchlist.unavailableNote")}
                    </p>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 8 }}>
                    {row.available ? (
                      <Link href={`/marketplace/${row.id}`} className="btn btn-ghost">
                        {t("watchlist.viewInvoice")}
                      </Link>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      aria-label={t("watchlist.unfollowAria", { id: row.id })}
                      onClick={() => unfollow(row.id)}
                    >
                      {t("watchlist.unfollow")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
