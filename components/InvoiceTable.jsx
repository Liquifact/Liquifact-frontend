"use client";

import Link from "next/link";
import RiskBadge from "./RiskBadge";
import StatusBadge from "./StatusBadge";
import { bpsToPercent, formatAmount, formatDate, fundedPercent } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { scoreInvoice } from "@/lib/risk";

const SORTABLE_COLUMNS = [
  { key: "due", label: "Due date", ascending: "due_asc", descending: "due_desc", defaultSort: "due_asc" },
  { key: "yield", label: "Yield", ascending: "yield_asc", descending: "yield_desc", defaultSort: "yield_desc" },
  { key: "amount", label: "Face value", descending: "amount_desc", defaultSort: "amount_desc" },
  { key: "funded", label: "Funded", descending: "funded_desc", defaultSort: "funded_desc" },
];

function getSortDirection(sort, column) {
  if (sort === column.ascending) return "ascending";
  if (sort === column.descending) return "descending";
  return "none";
}

function nextSort(sort, column) {
  if (!column.ascending) return column.defaultSort;
  if (sort === column.ascending) return column.descending;
  if (sort === column.descending) return column.ascending;
  return column.defaultSort;
}

export default function InvoiceTable({ invoices, sort, onSortChange, medians }) {
  const t = useT();
  const locale = useLocale();

  function renderSortableHeader(column) {
    const direction = getSortDirection(sort, column);
    return (
      <th key={column.key} scope="col" aria-sort={direction}>
        <button
          type="button"
          className="invoice-table-sort"
          onClick={() => onSortChange(nextSort(sort, column))}
          aria-label={`Sort by ${column.label}`}
        >
          {column.label}
          <span aria-hidden="true">
            {direction === "ascending" ? " ↑" : direction === "descending" ? " ↓" : ""}
          </span>
        </button>
      </th>
    );
  }

  return (
    <div className="table-wrap invoice-table-wrap">
      <table className="table invoice-table">
        <caption className="sr-only">Marketplace invoices</caption>
        <thead>
          <tr>
            <th scope="col">Invoice</th>
            <th scope="col">Company</th>
            <th scope="col">Debtor</th>
            <th scope="col">Status</th>
            {renderSortableHeader(SORTABLE_COLUMNS[2])}
            {renderSortableHeader(SORTABLE_COLUMNS[1])}
            {renderSortableHeader(SORTABLE_COLUMNS[0])}
            {renderSortableHeader(SORTABLE_COLUMNS[3])}
            <th scope="col">Risk</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const risk = scoreInvoice(invoice, undefined, medians);
            return (
              <tr key={invoice.id}>
                <th scope="row">
                  <Link href={`/marketplace/${invoice.id}`} aria-label={`View invoice ${invoice.id}`}>
                    {invoice.id}
                  </Link>
                </th>
                <td>{invoice.sme}</td>
                <td>{invoice.debtor}</td>
                <td>
                  <StatusBadge
                    status={invoice.status}
                    label={t(`invoice.status.${invoice.status}`)}
                  />
                </td>
                <td>{formatAmount(invoice.amount, invoice.currency, locale)}</td>
                <td>{bpsToPercent(invoice.yieldBps, locale)}</td>
                <td>{formatDate(invoice.dueDate, locale)}</td>
                <td>{fundedPercent(invoice)}%</td>
                <td>
                  {risk.band && (
                    <RiskBadge band={risk.band} score={risk.score} factors={risk.factors} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
