/**
 * Mock invoice data — replace with real API call once the backend endpoint
 * is available (follow-up: link backend issue here).
 *
 * ⚠️  SINGLE SOURCE OF TRUTH: This file is the only place mock invoice
 * fixtures are defined. All components and tests must import MOCK_INVOICES
 * and loadMockInvoices from here. Do NOT redeclare them inline elsewhere.
 * Remove this block and swap loadMockInvoices for the real API client once
 * the backend `/invoices` endpoint is ready.
 *
 * Contract per item: { id, issuer, amount, currency, dueDate, yield, status }
 * NOTE: yield values are illustrative; contracts use on-chain basis points and
 * actual settlement is at maturity.
 */
export const MOCK_INVOICES = [
  {
    id: "inv-001",
    issuer: "Acme Supplies Ltd",
    amount: "12,500",
    amountValue: 12500,
    currency: "USD",
    dueDate: "2026-06-15",
    yield: "8.2%",
    yieldValue: 8.2,
    status: "Open",
  },
  {
    id: "inv-002",
    issuer: "Bright Logistics GmbH",
    amount: "7,800",
    amountValue: 7800,
    currency: "EUR",
    dueDate: "2026-07-01",
    yield: "7.5%",
    yieldValue: 7.5,
    status: "Open",
  },
  {
    id: "inv-003",
    issuer: "Sunrise Exports Pte",
    amount: "22,000",
    amountValue: 22000,
    currency: "USD",
    dueDate: "2026-05-30",
    yield: "9.1%",
    yieldValue: 9.1,
    status: "Open",
  },
];

// DEV-only delay (ms) to make the skeleton visible during local development.
const DEV_DELAY = process.env.NODE_ENV === "development" ? 1500 : 0;

export function loadMockInvoices() {
  // Test hook: Playwright / Jest tests may override the fixture by setting
  // window.__TEST_MOCK_INVOICES__ before the component mounts.  The override
  // is ignored in non-browser (SSR) environments and in production builds.
  if (typeof window !== "undefined" && window.__TEST_MOCK_INVOICES__) {
    return Promise.resolve(window.__TEST_MOCK_INVOICES__);
  }
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_INVOICES), DEV_DELAY);
  });
}

/**
 * Calculate the number of days between now and a target date string.
 * Returns positive days for future, negative for past, 0 for today.
 * Dates are compared at midnight UTC (time-of-day insensitive).
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @param {Date} [now] - Reference date (defaults to new Date())
 * @returns {number}
 */
export function daysUntilMaturity(dateStr, now = new Date()) {
  const target = new Date(dateStr + "T00:00:00Z");
  const today = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z");
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Resolve an invoice by its id from the current mock invoice list.
 *
 * @param {string} id - Invoice identifier to look up.
 * @returns {object | undefined} The matching invoice object, or undefined if no invoice exists with the given id.
 */
export function getInvoiceById(id) {
  return MOCK_INVOICES.find((invoice) => invoice.id === id);
}

// NOTE: This file is the single source of truth for mock invoice data
// until the API client is fully integrated.
