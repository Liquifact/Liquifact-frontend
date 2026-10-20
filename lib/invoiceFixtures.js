/**
 * Canonical mock invoice data for the invest marketplace and SEO fallbacks.
 * Yield values are illustrative; contracts use on-chain basis points and
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
