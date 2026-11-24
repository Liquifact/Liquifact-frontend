"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listInvoices } from "@/lib/api";
import { escrowFor } from "@/lib/escrow/registry";
import { format as formatMinor } from "@/lib/money";
import { buildPortfolio } from "@/lib/portfolio";
import { getWalletAddress } from "@/lib/stellar/freighter";
import { readContributionFor, readIsRefundedFor } from "@/lib/stellar/rpc";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import StatusBadge from "@/components/StatusBadge";

/**
 * Read one invoice's on-chain position. Resolves `null` when the invoice has no
 * resolvable escrow (nothing on-chain to read) and stores an Error on failure so
 * the row renders an error state instead of a misleading zero.
 */
async function readPosition(invoice, address, { resolveEscrow, readContribution, readRefunded }) {
  const escrow = resolveEscrow(invoice);
  if (!escrow?.contractId) return { contribution: null, refunded: false };
  try {
    const contribution = await readContribution(escrow.contractId, address);
    let refunded = false;
    if (invoice.status === "cancelled" && contribution > 0n) {
      refunded = await readRefunded(escrow.contractId, address);
    }
    return { contribution, refunded };
  } catch (error) {
    return { contribution: error instanceof Error ? error : new Error(String(error)), refunded: false };
  }
}

export default function Portfolio({
  getAddress = getWalletAddress,
  loadInvoices = listInvoices,
  resolveEscrow = escrowFor,
  readContribution = readContributionFor,
  readRefunded = readIsRefundedFor,
}) {
  const t = useT();
  const locale = useLocale();
  const [address, setAddress] = useState(undefined); // undefined = checking, null = not connected
  const [state, setState] = useState({ loading: false, error: false, invoices: [], contributions: {}, refunded: {} });
  const [reloadKey, setReloadKey] = useState(0);

  const connect = useCallback(() => {
    setAddress(undefined);
    Promise.resolve(getAddress())
      .then((a) => setAddress(a || null))
      .catch(() => setAddress(null));
  }, [getAddress]);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (!address) return undefined;
    let active = true;
    setState((s) => ({ ...s, loading: true, error: false }));

    (async () => {
      try {
        const res = await loadInvoices();
        const invoices = Array.isArray(res?.data) ? res.data : [];
        const positions = await Promise.all(
          invoices.map((inv) => readPosition(inv, address, { resolveEscrow, readContribution, readRefunded }))
        );
        if (!active) return;
        const contributions = {};
        const refunded = {};
        invoices.forEach((inv, i) => {
          if (!inv?.id) return;
          contributions[inv.id] = positions[i].contribution;
          refunded[inv.id] = positions[i].refunded;
        });
        setState({ loading: false, error: false, invoices, contributions, refunded });
      } catch {
        if (active) setState({ loading: false, error: true, invoices: [], contributions: {}, refunded: {} });
      }
    })();

    return () => {
      active = false;
    };
  }, [address, loadInvoices, resolveEscrow, readContribution, readRefunded, reloadKey]);

  const { rows, totals } = useMemo(
    () => buildPortfolio({ invoices: state.invoices, contributions: state.contributions, refunded: state.refunded }),
    [state.invoices, state.contributions, state.refunded]
  );

  const money = (minor, currency) => formatMinor(minor, currency, { locale });
  const statusLabel = (status) => {
    const key = `invoice.status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  let body;
  if (address === undefined || (address && state.loading)) {
    body = (
      <div aria-busy="true" role="status" aria-live="polite">
        <span className="sr-only">{t("portfolio.loading")}</span>
        <div className="skeleton" style={{ minHeight: 160 }} />
      </div>
    );
  } else if (address === null) {
    body = (
      <div className="card empty-state" style={{ padding: 32, textAlign: "center" }}>
        <h2>{t("portfolio.notConnected.title")}</h2>
        <p className="muted" style={{ marginBottom: 20 }}>{t("portfolio.notConnected.body")}</p>
        <button type="button" className="btn btn-primary" onClick={connect}>
          {t("portfolio.notConnected.cta")}
        </button>
      </div>
    );
  } else if (state.error) {
    body = (
      <div className="notice notice-err" role="alert">
        <p style={{ margin: "0 0 10px" }}>{t("portfolio.error")}</p>
        <button type="button" className="btn btn-secondary" onClick={() => setReloadKey((k) => k + 1)}>
          {t("portfolio.retry")}
        </button>
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="card empty-state" style={{ padding: 32, textAlign: "center" }}>
        <h2>{t("portfolio.empty.title")}</h2>
        <p className="muted" style={{ marginBottom: 20 }}>{t("portfolio.empty.body")}</p>
        <Link href="/marketplace" className="btn btn-primary">
          {t("portfolio.empty.cta")}
        </Link>
      </div>
    );
  } else {
    body = (
      <>
        {totals.length > 0 && (
          <ul className="grid grid-3" aria-label={t("portfolio.totals.label")} style={{ listStyle: "none", padding: 0, marginBottom: 20 }}>
            {totals.map((total) => (
              <li key={total.currency} className="card">
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  {t("portfolio.totals.contributed", { currency: total.currency })}
                </div>
                <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{money(total.contributed, total.currency)}</div>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {t("portfolio.totals.outstanding", { amount: money(total.outstanding, total.currency) })}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">{t("portfolio.table.caption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("portfolio.table.invoice")}</th>
                <th scope="col">{t("portfolio.table.status")}</th>
                <th scope="col">{t("portfolio.table.contributed")}</th>
                <th scope="col">{t("portfolio.table.exit")}</th>
                <th scope="col"><span className="sr-only">{t("portfolio.table.actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="mono">{row.id}</th>
                  <td>
                    <StatusBadge status={row.status} label={statusLabel(row.status)} />
                  </td>
                  <td className="mono">
                    {row.error ? (
                      <span role="status" className="muted">{t("portfolio.rowError")}</span>
                    ) : (
                      money(row.contributed, row.currency)
                    )}
                  </td>
                  <td>{row.error ? "—" : t(`portfolio.exit.${row.exitStatus}`)}</td>
                  <td>
                    <Link href={`/marketplace/${encodeURIComponent(row.id)}`} aria-label={t("portfolio.viewInvoiceAria", { id: row.id })}>
                      {t("portfolio.viewInvoice")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="page-head">
          <div>
            <p className="eyebrow">{t("portfolio.eyebrow")}</p>
            <h1>{t("portfolio.heading")}</h1>
            <p className="lead">{t("portfolio.lead")}</p>
          </div>
          {rows.length > 0 && (
            <span className="pill" aria-live="polite">
              {t("portfolio.count", { count: rows.length })}
            </span>
          )}
        </div>
        {body}
      </div>
    </section>
  );
}
