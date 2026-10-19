"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { useLocale, useT } from "./I18nProvider";
import { bpsToPercent, formatAmount, formatDate, fundedPercent } from "@/lib/format";

export default function InvoiceCard({ invoice }) {
  const t = useT();
  const locale = useLocale();
  const pct = fundedPercent(invoice);
  return (
    <Link href={`/marketplace/${invoice.id}`} className="card invoice-card">
      <div className="invoice-head">
        <div>
          <div className="invoice-id">{invoice.id}</div>
          <h3 style={{ margin: "4px 0 0" }}>{invoice.sme}</h3>
          <div className="muted" style={{ fontSize: "0.9rem" }}>{t("invoice.debtor", { name: invoice.debtor })}</div>
        </div>
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <StatusBadge status={invoice.status} />
          {invoice.onChain && <span className="badge badge-chain">{t("invoice.onChain")}</span>}
        </div>
      </div>
      <div className="kv">
        <div><span className="k">{t("invoice.faceValue")}</span>{formatAmount(invoice.amount, invoice.currency, locale)}</div>
        <div><span className="k">{t("invoice.yield")}</span>{bpsToPercent(invoice.yieldBps, locale)}</div>
        <div><span className="k">{t("invoice.due")}</span>{formatDate(invoice.dueDate, locale)}</div>
        <div><span className="k">{t("invoice.funded")}</span>{pct}%</div>
      </div>
      <div className="progress" aria-label={t("invoice.fundedAria", { pct })}><span style={{ width: `${pct}%` }} /></div>
    </Link>
  );
}
