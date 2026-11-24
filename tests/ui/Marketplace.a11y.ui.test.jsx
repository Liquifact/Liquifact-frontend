/**
 * tests/ui/Marketplace.a11y.ui.test.jsx
 *
 * Axe accessibility checks for the Marketplace page in three states:
 *   1. default   — invoices loaded, no active filters
 *   2. filtered-empty — active filter returns zero results
 *   3. offline   — API unreachable, demo data shown with offline notice
 *
 * Mocks: listInvoices, next/navigation, next/link, I18nProvider sub-components.
 * No network traffic is made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { axe } from "./axe.js";

// ---------------------------------------------------------------------------
// Shared mutable URL state (mirrors tests-ui/Marketplace.test.jsx pattern)
// ---------------------------------------------------------------------------
let _qs = "";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/link", () => ({
  default: ({ href, children, className, style, ...rest }) =>
    React.createElement("a", { href, className, style, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(_qs),
  useRouter: () => ({
    push: (url) => {
      _qs = url.includes("?") ? url.split("?")[1] : "";
    },
    replace: (url) => {
      _qs = url.includes("?") ? url.split("?")[1] : "";
    },
  }),
}));

// Stub out heavy sub-components that have their own test suites.
// Keep them structurally valid so axe can still inspect the page scaffold.
vi.mock("@/components/pwa/OfflineNotice", () => ({
  default: ({ offline }) =>
    offline ? (
      <div role="status" aria-live="polite" aria-atomic="true" className="notice pwa-notice">
        The API is unreachable right now — showing demo data.
      </div>
    ) : (
      <div role="status" aria-live="polite" aria-atomic="true" />
    ),
}));

vi.mock("@/components/InvoiceCard", () => ({
  default: ({ invoice }) => (
    <article className="card invoice-card">
      <a href={`/marketplace/${invoice.id}`} className="invoice-card-link">
        <h2>{invoice.sme}</h2>
        <p>{invoice.debtor}</p>
      </a>
    </article>
  ),
}));

vi.mock("@/components/InvoiceTable", () => ({
  default: ({ invoices }) => (
    <table>
      <caption>Marketplace invoices</caption>
      <thead>
        <tr>
          <th scope="col">Invoice</th>
          <th scope="col">Company</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv) => (
          <tr key={inv.id}>
            <th scope="row">
              <a href={`/marketplace/${inv.id}`}>{inv.id}</a>
            </th>
            <td>{inv.sme}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

// Minimal Freighter stubs so the unfunded-wallet detection resolves quickly.
vi.mock("@/lib/stellar/freighter", () => ({
  hasFreighter: () => false,
  isConnected: () => Promise.resolve(false),
  getNetworkName: () => Promise.resolve(null),
  getPublicKey: () => Promise.resolve(null),
}));

vi.mock("@/lib/stellar/horizon", () => ({
  getAccountState: () => Promise.resolve({ exists: true }),
}));

const MOCK_INVOICES = [
  {
    id: "INV_0001",
    sme: "Acme Components",
    debtor: "Globex Retail",
    amount: 100,
    currency: "XLM",
    fundedAmount: 0,
    yieldBps: 800,
    dueDate: "2027-01-17",
    status: "open",
    onChain: false,
  },
  {
    id: "INV_0002",
    sme: "Northwind Textiles",
    debtor: "Initech Wholesale",
    amount: 25000,
    currency: "USDC",
    fundedAmount: 18000,
    yieldBps: 650,
    dueDate: "2026-12-30",
    status: "open",
    onChain: false,
  },
  {
    id: "INV_0003",
    sme: "Blue Harbor Logistics",
    debtor: "Umbrella Foods",
    amount: 42000,
    currency: "USDC",
    fundedAmount: 42000,
    yieldBps: 720,
    dueDate: "2026-11-28",
    status: "funded",
    onChain: false,
  },
];

const listInvoicesMock = vi.fn();

vi.mock("@/lib/api", () => ({
  listInvoices: (...args) => listInvoicesMock(...args),
}));

// Import after all vi.mock declarations.
const { default: Marketplace } = await import(
  "@/app/marketplace/Marketplace.jsx"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wrap in a Suspense boundary (Marketplace uses useSearchParams which requires
 * it in Next.js) and in a minimal page scaffold so landmark checks pass.
 */
function renderMarketplace(initialQs = "") {
  _qs = initialQs;
  return render(
    <main id="main">
      <Suspense fallback={<div>Loading…</div>}>
        <Marketplace />
      </Suspense>
    </main>,
  );
}

beforeEach(() => {
  _qs = "";
  window.localStorage.clear();
  listInvoicesMock.mockReset();
  listInvoicesMock.mockResolvedValue({ data: MOCK_INVOICES, offline: false });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Marketplace a11y", () => {
  it("has no axe violations in the default state (invoices loaded)", async () => {
    const { container } = renderMarketplace();

    // Wait for the async fetch to complete and cards to appear.
    await waitFor(() =>
      expect(container.querySelector(".grid")).toBeTruthy(),
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the filtered-empty state", async () => {
    const { container } = renderMarketplace("q=zzznomatch");

    // Wait for the empty-state heading to appear.
    await waitFor(() =>
      expect(
        container.querySelector("h2"),
      ).toBeTruthy(),
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the offline state", async () => {
    listInvoicesMock.mockResolvedValueOnce({
      data: MOCK_INVOICES,
      offline: true,
      stale: false,
      cachedAt: null,
    });

    const { container } = renderMarketplace();

    // Wait for data to resolve so the offline notice renders.
    await waitFor(() =>
      expect(container.querySelector(".pwa-notice")).toBeTruthy(),
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
