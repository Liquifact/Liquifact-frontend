"use client";

import Link from "next/link";
import FundingProgress from "./FundingProgress";
import StatusBadge from "./StatusBadge";
import RiskBadge from "./RiskBadge";
import DueStatusBadge from "./invoice/DueStatusBadge";
import { bpsToPercent, formatAmount, formatDate, fundedPercent } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { scoreInvoice } from "@/lib/risk";

export default function InvoiceCard({
  invoice,
  medians,
  compareSelected = false,
  compareDisabled = false,
  onToggleCompare,
}) {
  const t = useT();
  const locale = useLocale();
  const pct = fundedPercent(invoice);
  const risk = scoreInvoice(invoice, undefined, medians);

  const cardBody = (
    <>
      <div className="invoice-head">
        <div>
          <div className="invoice-id">{invoice.id}</div>
          <h2 style={{ margin: "4px 0 0" }}>{invoice.sme}</h2>
          <div className="muted" style={{ fontSize: "0.9rem" }}>{t("invoice.debtor", { name: invoice.debtor })}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
          <StatusBadge status={invoice.status} label={t(`invoice.status.${invoice.status}`)} />
          {risk.band && <RiskBadge band={risk.band} score={risk.score} factors={risk.factors} />}
          {invoice.onChain && <StatusBadge kind="chain" label={t("invoice.onChain")} />}
        </div>
      </div>
      <div className="kv">
        <div><span className="k">{t("invoice.faceValue")}</span>{formatAmount(invoice.amount, invoice.currency, locale)}</div>
        <div><span className="k">{t("invoice.yield")}</span>{bpsToPercent(invoice.yieldBps, locale)}</div>
        <div>
          <span className="k">{t("invoice.due")}</span>{formatDate(invoice.dueDate, locale)}
          <div style={{ marginTop: 4 }}><DueStatusBadge invoice={invoice} /></div>
        </div>
        <div><span className="k">{t("invoice.funded")}</span>{pct}%</div>
      </div>
      <FundingProgress funded={invoice.fundedAmount} target={invoice.amount} currency={invoice.currency} size="sm" />
    </>
  );

  if (!onToggleCompare) {
    return (
      <Link href={`/marketplace/${invoice.id}`} className="card invoice-card">
        {cardBody}
      </Link>
    );
  }

  return (
    <article className={`card invoice-card${compareSelected ? " invoice-card-selected" : ""}`}>
      <Link href={`/marketplace/${invoice.id}`} className="invoice-card-link">
        {cardBody}
      </Link>
      <div className="invoice-card-compare">
        <label className="compare-checkbox-label">
          <input
            type="checkbox"
            checked={compareSelected}
            disabled={!compareSelected && compareDisabled}
            onChange={() => onToggleCompare(invoice.id)}
            aria-label={`Select ${invoice.id} (${invoice.sme}) to compare`}
          />
          <span>{compareSelected ? "Selected for compare" : "Compare"}</span>
        </label>
      </div>
    </article>
  );
}
