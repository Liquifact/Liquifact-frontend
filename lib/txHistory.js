import { toCsv } from "./csv.js";

export const TX_COLUMNS = [
  { key: "hash", label: "Transaction hash" },
  { key: "label", label: "Description" },
  { key: "invoiceId", label: "Invoice ID" },
  { key: "status", label: "Status" },
  {
    key: "createdAt",
    label: "Created at (UTC)",
    value: (tx) => {
      const date = new Date(tx.createdAt);
      return Number.isNaN(date.getTime()) ? "" : date.toISOString();
    },
  },
];

export function filterTxs(entries, { status = "", invoiceId = "", query = "" } = {}) {
  const selectedStatus = String(status).trim().toUpperCase();
  const invoiceSearch = String(invoiceId).trim().toLocaleLowerCase();
  const textSearch = String(query).trim().toLocaleLowerCase();

  return (Array.isArray(entries) ? entries : []).filter((tx) => {
    if (selectedStatus && selectedStatus !== "ALL" && tx.status?.toUpperCase() !== selectedStatus) return false;
    if (invoiceSearch && !String(tx.invoiceId || "").toLocaleLowerCase().includes(invoiceSearch)) return false;
    if (textSearch) {
      const searchable = [tx.label, tx.hash, tx.invoiceId, tx.status]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      if (!searchable.includes(textSearch)) return false;
    }
    return true;
  });
}

export function txsToCsv(entries, options) {
  return toCsv(entries, TX_COLUMNS, options);
}