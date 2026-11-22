"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FundingProgress from "@/components/FundingProgress";
import OfflineNotice from "@/components/pwa/OfflineNotice";
import RiskBadge from "@/components/RiskBadge";
import StatusBadge from "@/components/StatusBadge";
import { listInvoices } from "@/lib/api";
import {
  MAX_COMPARE,
  buildComparison,
  parseCompareIds,
  serializeCompareIds,
} from "@/lib/compare";
import { bpsToPercent, formatAmount, formatDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { computeListMedians } from "@/lib/risk";

function formatDaysToDue(days) {
  if (days === null || days === undefined) return "—";
  if (days < 0) {
    const overdue = Math.abs(days);
    return `Overdue (${overdue}d)`;
  }
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

export default function CompareTable() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedIds = useMemo(
    () => parseCompareIds(searchParams, MAX_COMPARE),
    [searchParams],
  );

  const [fetchState, setFetchState] = useState({
    loading: true,
    data: [],
    offline: false,
  });
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    let alive = true;
    setFetchState((s) => ({ ...s, loading: true }));
    listInvoices().then((r) => {
      if (alive) setFetchState({ loading: false, ...r, data: r.data || [] });
    });
    return () => {
      alive = false;
    };
  }, []);

  const medians = useMemo(
    () => computeListMedians(fetchState.data),
    [fetchState.data],
  );

  const { matchedInvoices, unknownIds } = useMemo(() => {
    const byId = new Map(fetchState.data.map((inv) => [inv.id, inv]));
    const matched = [];
    const unknown = [];
    for (const id of requestedIds) {
      const inv = byId.get(id);
      if (inv) matched.push(inv);
      else unknown.push(id);
    }
    return { matchedInvoices: matched, unknownIds: unknown };
  }, [fetchState.data, requestedIds]);

  const comparison = useMemo(
    () => buildComparison(matchedInvoices, Date.now(), medians),
    [matchedInvoices, medians],
  );

  const rowMap = useMemo(() => {
    const map = {};
    for (const row of comparison.rows) {
      map[row.key] = row;
    }
    return map;
  }, [comparison.rows]);

  function handleRemove(idToRemove) {
    const next = requestedIds.filter((id) => id !== idToRemove);
    const qs = serializeCompareIds(next, MAX_COMPARE);
    router.replace(qs ? `/marketplace/compare?ids=${encodeURIComponent(qs)}` : "/marketplace/compare", {
      scroll: false,
    });
  }

  async function handleCopyLink() {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      if (url && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopyStatus("Comparison link copied to clipboard.");
      } else {
        setCopyStatus("Copy the URL from your browser address bar to share.");
      }
    } catch {
      setCopyStatus("Could not copy link. Copy the URL from your address bar.");
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="compare-header">
          <div>
            <Link href="/marketplace" className="muted" style={{ fontSize: "0.9rem" }}>
              ← Back to marketplace
            </Link>
            <h1 style={{ fontSize: "clamp(1.6rem,3.5vw,2.3rem)", margin: "8px 0 6px" }}>
              Compare Invoices
            </h1>
            <p className="lead" style={{ margin: 0 }}>
              Side-by-side comparison of yield, tenor, remaining capacity, funding progress, and risk.
            </p>
          </div>
          {comparison.items.length > 0 && (
            <div className="compare-header-actions">
              <button type="button" className="btn btn-ghost" onClick={handleCopyLink}>
                Copy share link
              </button>
            </div>
          )}
        </div>

        <div
          role="status"
          aria-live="polite"
          className="muted"
          style={{ fontSize: "0.85rem", minHeight: "1.25em", marginTop: 8, marginBottom: 12 }}
        >
          {copyStatus}
        </div>

        <OfflineNotice {...fetchState} />

        {!fetchState.loading && unknownIds.length > 0 && (
          <div className="notice notice-warn" role="status" style={{ marginBottom: 16 }}>
            Unknown invoice ID{unknownIds.length === 1 ? "" : "s"} ignored:{" "}
            <strong>{unknownIds.join(", ")}</strong>
          </div>
        )}

        {!fetchState.loading && comparison.mixedCurrencies && (
          <div className="notice" role="status" style={{ marginBottom: 16 }}>
            Selected invoices use different currencies ({comparison.currencies.join(", ")}).
            Best-value highlights are disabled across different currencies.
          </div>
        )}

        {fetchState.loading ? (
          <div className="skeleton" style={{ height: 260 }} />
        ) : comparison.items.length === 0 ? (
          <div className="card center" style={{ padding: 36 }}>
            <h2>No invoices selected to compare</h2>
            <p className="muted">
              Select up to {MAX_COMPARE} invoices in the marketplace to compare them side by side.
            </p>
            <Link href="/marketplace" className="btn btn-primary" style={{ marginTop: 12 }}>
              Browse marketplace
            </Link>
          </div>
        ) : (
          <div className="compare-table-wrap">
            <table className="compare-table">
              <caption className="sr-only">
                Side-by-side comparison of {comparison.items.length} selected invoice
                {comparison.items.length === 1 ? "" : "s"}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="compare-metric-col">Metric</th>
                  {comparison.items.map((item) => (
                    <th key={item.id} scope="col" className="compare-invoice-col">
                      <div className="compare-col-head">
                        <div>
                          <div className="invoice-id">{item.id}</div>
                          <Link href={`/marketplace/${item.id}`} className="compare-col-title">
                            {item.invoice.sme}
                          </Link>
                          <div className="muted" style={{ fontSize: "0.85rem", fontWeight: 400 }}>
                            {t("invoice.debtor", { name: item.invoice.debtor })}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost compare-remove-btn"
                          onClick={() => handleRemove(item.id)}
                          aria-label={`Remove ${item.id} from comparison`}
                        >
                          Remove
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Status</th>
                  {comparison.items.map((item) => (
                    <td key={item.id}>
                      <StatusBadge
                        status={item.invoice.status}
                        label={t(`invoice.status.${item.invoice.status}`)}
                      />
                    </td>
                  ))}
                </tr>

                <tr>
                  <th scope="row">{t("invoice.faceValue")}</th>
                  {comparison.items.map((item) => (
                    <td key={item.id}>
                      {formatAmount(item.invoice.amount, item.invoice.currency, locale)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th scope="row">{t("invoice.yield")}</th>
                  {comparison.items.map((item, idx) => {
                    const cell = rowMap.yield?.cells[idx];
                    return (
                      <td key={item.id} className={cell?.best ? "compare-cell-best" : undefined}>
                        <span>{bpsToPercent(item.invoice.yieldBps, locale)}</span>
                        {cell?.best && <span className="compare-best-badge">Best</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th scope="row">Days to due</th>
                  {comparison.items.map((item, idx) => {
                    const cell = rowMap.daysToDue?.cells[idx];
                    return (
                      <td key={item.id} className={cell?.best ? "compare-cell-best" : undefined}>
                        <div>
                          <span>{formatDaysToDue(item.daysToDue)}</span>
                          {cell?.best && <span className="compare-best-badge">Best</span>}
                        </div>
                        <div className="muted" style={{ fontSize: "0.82rem" }}>
                          {formatDate(item.invoice.dueDate, locale)}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th scope="row">Remaining capacity</th>
                  {comparison.items.map((item, idx) => {
                    const cell = rowMap.remainingCapacity?.cells[idx];
                    return (
                      <td key={item.id} className={cell?.best ? "compare-cell-best" : undefined}>
                        <span>
                          {formatAmount(item.remainingCapacity, item.invoice.currency, locale)}
                        </span>
                        {cell?.best && <span className="compare-best-badge">Best</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th scope="row">{t("invoice.funded")}</th>
                  {comparison.items.map((item) => (
                    <td key={item.id}>
                      <div style={{ marginBottom: 6, fontWeight: 600 }}>{item.fundedPct}%</div>
                      <FundingProgress
                        funded={item.invoice.fundedAmount}
                        target={item.invoice.amount}
                        currency={item.invoice.currency}
                        size="sm"
                      />
                    </td>
                  ))}
                </tr>

                <tr>
                  <th scope="row">Risk band</th>
                  {comparison.items.map((item, idx) => {
                    const cell = rowMap.riskBand?.cells[idx];
                    return (
                      <td key={item.id} className={cell?.best ? "compare-cell-best" : undefined}>
                        <div className="compare-risk-cell">
                          {item.riskBand ? (
                            <RiskBadge
                              band={item.riskBand}
                              score={item.riskScore}
                              factors={item.riskFactors}
                            />
                          ) : (
                            <span className="muted">—</span>
                          )}
                          {cell?.best && <span className="compare-best-badge">Best</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th scope="row">Backing</th>
                  {comparison.items.map((item) => (
                    <td key={item.id}>
                      {item.invoice.onChain ? (
                        <StatusBadge kind="chain" label={t("invoice.onChain")} />
                      ) : (
                        <span className="muted">Off-chain</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
