import { INVOICE_STATUSES } from "../types/invoice";

const VALID_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "CHF"]);
const VALID_SORT_COLUMNS = new Set(["amount", "yield", "maturity"]);
const VALID_SORT_DIRS = new Set(["asc", "desc"]);
const VALID_STATUSES = new Set(Object.values(INVOICE_STATUSES));

// Maximum number of characters allowed in the free-text search query.
// Kept in sync with the marketplace filter input maxlength so the URL cannot
// be used to bypass client-side constraints or to generate unbounded URLs.
export const MAXSEARCH_QUERY_LENGTH = 200;

// Maximum number of statuses that can be requested at once. This matches the
// number of known invoice statuses and guarantees the sanitized query stays bounded.
export const MAX_STATUSES = VALID_STATUSES.size;

// Maximum number of decimal digits accepted for yield bounds. Prevents accidental
// or maliciously long numeric strings from being round-tripped through the URL.
export const MAX_YIELD_LENGTH = 20;

function isValidISODate(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === str;
}

function isValidYieldString(value) {
  if (typeof value !== "string" || value === "") return false;
  if (value.length > MAX_YIELD_LENGTH) return false;
  // Only allow a single optional leading "+" and digits/decimal point to keep the
  // normalized value deterministic and free of exponent notation or whitespace.
  if (!/^\+?\d+(\.\d+)?$/.test(value)) return false;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return false;
  // Reject values that would stringify to exponent notation to keep URLs stable.
  return !/e/i.test(n.toString(10));
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

function normalizeYield(value) {
  // Normalize the yield string to a canonical decimal representation so that
  // equivalent inputs ("05", "5.0", "+5") produce the same URL and cache key.
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  // Use a stable decimal rendering that avoids exponent notation for the
  // values we accept (bounded length, non-negative).
  return n.toString(10);
}

export function sanitizeMarketplaceSearchParams(searchParams) {
  const params = normalizeSearchParams(searchParams);
  const sanitized = new URLSearchParams();

  const searchQuery = (params.get("q") ?? "").trim();
  if (searchQuery) sanitized.set("q", searchQuery.slice(0, MAXSEARCH_QUERY_LENGTH));

  const currency = params.get("currency");
  if (VALID_CURRENCIES.has(currency)) sanitized.set("currency", currency);

  const yieldMin = params.get("yieldMin");
  if (isValidYieldString(yieldMin)) {
    const normalized = normalizeYield(yieldMin);
    if (normalized !== null) sanitized.set("yieldMin", normalized);
  }

  const yieldMax = params.get("yieldMax");
  if (isValidYieldString(yieldMax)) {
    const normalized = normalizeYield(yieldMax);
    if (normalized !== null) sanitized.set("yieldMax", normalized);
  }

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

  // Support both the comma-separated legacy format and repeated parameters.
  // Deduplicate and cap the number of statuses to keep the resulting URL bounded.
  const rawStatuses = [
    ...params.getAll("statuses").flatMap((string) => string.split(",")),
  ];
  const seenStatuses = new Set();
  const statuses = [];
  for (const rawStatus of rawStatuses) {
    const status = rawStatus.trim();
    if (!VALID_STATUSES.has(status)) continue;
    if (seenStatuses.has(status)) continue;
    seenStatuses.add(status);
    statuses.push(status);
    if (statuses.length >= MAX_STATUSES) break;
  }
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
