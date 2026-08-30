import { INVOICE_STATUSES } from "@/lib/types/invoice";

const VALID_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "CHF"]);
const VALID_SORT_COLUMNS = new Set(["amount", "yield", "maturity"]);
const VALID_SORT_DIRS = new Set(["asc", "desc"]);
const VALID_STATUSES = new Set(Object.values(INVOICE_STATUSES));

function isValidISODate(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === str;
}

function isValidYieldString(value) {
  if (typeof value !== "string" || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

function normalizeSearchParams(searchParams) {
  if (!searchParams) return new URLSearchParams();
  if (searchParams instanceof URLSearchParams) return new URLSearchParams(searchParams.toString());
  if (typeof searchParams === "object") {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== undefined && entry !== null) params.append(key, String(entry));
        });
        return;
      }
      params.append(key, String(value));
    });
    return params;
  }
  return new URLSearchParams(String(searchParams));
}

export function sanitizeMarketplaceSearchParams(searchParams) {
  const params = normalizeSearchParams(searchParams);
  const sanitized = new URLSearchParams();

  const searchQuery = (params.get("q") ?? "").trim();
  if (searchQuery) sanitized.set("q", searchQuery);

  const currency = params.get("currency");
  if (VALID_CURRENCIES.has(currency)) sanitized.set("currency", currency);

  const yieldMin = params.get("yieldMin");
  if (isValidYieldString(yieldMin)) sanitized.set("yieldMin", yieldMin);

  const yieldMax = params.get("yieldMax");
  if (isValidYieldString(yieldMax)) sanitized.set("yieldMax", yieldMax);

  const maturityFrom = params.get("maturityFrom");
  if (isValidISODate(maturityFrom)) sanitized.set("maturityFrom", maturityFrom);

  const maturityTo = params.get("maturityTo");
  if (isValidISODate(maturityTo)) sanitized.set("maturityTo", maturityTo);

  const rawSort = params.get("sort") ?? "";
  const rawSortDir = params.get("sortDir") ?? "";
  const compound = rawSort.match(/^(amount|yield|maturity)_(asc|desc)$/);

  if (compound) {
    sanitized.set("sort", compound[1]);
    sanitized.set("sortDir", compound[2]);
  } else if (VALID_SORT_COLUMNS.has(rawSort)) {
    sanitized.set("sort", rawSort);
    if (VALID_SORT_DIRS.has(rawSortDir)) sanitized.set("sortDir", rawSortDir);
    else sanitized.set("sortDir", "desc");
  }

  const statuses = (params.get("statuses") ?? "")
    .split(",")
    .map((status) => status.trim())
    .filter((status) => VALID_STATUSES.has(status));
  if (statuses.length > 0) sanitized.set("statuses", statuses.join(","));

  return sanitized;
}

export function getMarketplaceHref(searchParams) {
  const sanitized = sanitizeMarketplaceSearchParams(searchParams);
  const query = sanitized.toString();
  return query ? `/invest?${query}` : "/invest";
}

export function getInvoiceDetailHref(invoiceId, searchParams) {
  if (!invoiceId) return "/invest";
  const sanitized = sanitizeMarketplaceSearchParams(searchParams);
  const query = sanitized.toString();
  return query ? `/invest/${invoiceId}?${query}` : `/invest/${invoiceId}`;
}
