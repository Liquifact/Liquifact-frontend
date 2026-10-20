import { MOCK_INVOICES } from "../../lib/invoiceFixtures.js";

export { MOCK_INVOICES };

/**
 * Load marketplace fixtures with the Playwright/Jest test hook preserved.
 */

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

// Mock invoice fixtures are defined in lib/invoiceFixtures.js.
