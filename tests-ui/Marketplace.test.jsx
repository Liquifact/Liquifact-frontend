/**
 * tests/Marketplace.test.jsx
 *
 * Component tests for app/marketplace/Marketplace.jsx.
 * Tooling: Vitest + @testing-library/react + jsdom.
 *
 * Design:
 *   - `useSearchParams` returns whatever `_qs` holds at call time.
 *   - `useRouter` returns fresh push/replace spies each render; they update
 *     `_qs` so the *next* render (triggered manually with `rerender`) sees the
 *     new params.
 *   - For tests that only need "load a URL and assert the view", setting `_qs`
 *     before `render()` is sufficient — no re-render required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { Suspense } from "react";

// ---------------------------------------------------------------------------
// Shared mutable URL state
// ---------------------------------------------------------------------------
let _qs = "";

// ---------------------------------------------------------------------------
// Mocks — declared before any imports that depend on them
// ---------------------------------------------------------------------------

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }) =>
    React.createElement("a", { href, ...rest }, children),
}));

// Capture push/replace calls in module-level arrays for assertions
const pushLog = [];
const replaceLog = [];

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(_qs),
  useRouter: () => ({
    push: (url) => {
      pushLog.push(url);
      _qs = url.includes("?") ? url.split("?")[1] : "";
    },
    replace: (url) => {
      replaceLog.push(url);
      _qs = url.includes("?") ? url.split("?")[1] : "";
    },
  }),
}));

const MOCK_INVOICES = [
  { id: "INV_0001", sme: "Acme Components",      debtor: "Globex Retail",      amount: 100,   currency: "XLM",  fundedAmount: 0,     yieldBps: 800,  dueDate: "2027-01-17", status: "open",      onChain: false },
  { id: "INV_0002", sme: "Northwind Textiles",    debtor: "Initech Wholesale",  amount: 25000, currency: "USDC", fundedAmount: 18000, yieldBps: 650,  dueDate: "2026-12-30", status: "open",      onChain: false },
  { id: "INV_0003", sme: "Blue Harbor Logistics", debtor: "Umbrella Foods",     amount: 42000, currency: "USDC", fundedAmount: 42000, yieldBps: 720,  dueDate: "2026-11-28", status: "funded",    onChain: false },
  { id: "INV_0004", sme: "Sunrise Agritech",      debtor: "Stark Industries",   amount: 12500, currency: "USDC", fundedAmount: 12500, yieldBps: 900,  dueDate: "2026-09-30", status: "settled",   onChain: false },
  { id: "INV_0005", sme: "Delta Freight",         debtor: "North Star Exports", amount: 5000,  currency: "USDC", fundedAmount: 0,     yieldBps: 1000, dueDate: "2026-10-15", status: "cancelled", onChain: false },
];

const listInvoicesMock = vi.fn(() =>
  Promise.resolve({ data: MOCK_INVOICES, offline: false }),
);

vi.mock("../lib/api.js", () => ({
  listInvoices: (...args) => listInvoicesMock(...args),
}));

// Import after mocks are registered
const { default: Marketplace } = await import("../app/marketplace/Marketplace.jsx");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderMarketplace(initialQs = "") {
  _qs = initialQs;
  return render(
    <Suspense fallback={<div>Loading…</div>}>
      <Marketplace />
    </Suspense>,
  );
}

/** Re-render with a new URL (simulates Back/Forward or a push taking effect). */
function navigate(renderResult, newQs) {
  _qs = newQs;
  renderResult.rerender(
    <Suspense fallback={<div>Loading…</div>}>
      <Marketplace />
    </Suspense>,
  );
}

beforeEach(() => {
  // Always restore real timers first — a fake-timer test that times out would
  // otherwise leave vi.useFakeTimers() active and break every subsequent test's
  // waitFor() calls (which rely on real setTimeout internally).
  vi.useRealTimers();
  _qs = "";
  pushLog.length = 0;
  replaceLog.length = 0;
  listInvoicesMock.mockClear();
  listInvoicesMock.mockResolvedValue({ data: MOCK_INVOICES, offline: false });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Marketplace component", () => {

  // ── Initial render ────────────────────────────────────────────────────────

  it("renders all invoices on initial load (no filters)", async () => {
    renderMarketplace();
    await waitFor(() => expect(screen.getByText("Acme Components")).toBeInTheDocument());
    expect(screen.getByText("Northwind Textiles")).toBeInTheDocument();
    expect(screen.getByText("Blue Harbor Logistics")).toBeInTheDocument();
  });

  it("calls listInvoices exactly once on mount with no arguments", async () => {
    renderMarketplace();
    await waitFor(() => expect(screen.getByText("Acme Components")).toBeInTheDocument());
    expect(listInvoicesMock).toHaveBeenCalledTimes(1);
    expect(listInvoicesMock).toHaveBeenCalledWith();
  });

  // ── One fetch across filter changes ───────────────────────────────────────

  it("does NOT call listInvoices again after a status tab click", async () => {
    const user = userEvent.setup();
    const result = renderMarketplace();
    await waitFor(() => expect(screen.getByText("Acme Components")).toBeInTheDocument());
    expect(listInvoicesMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Open" }));
    // router.push updated _qs; simulate the URL change taking effect
    navigate(result, _qs);

    expect(listInvoicesMock).toHaveBeenCalledTimes(1);
  });

  // ── URL updates on discrete filter changes ────────────────────────────────

  it("calls router.push with status=funded when Funded tab is clicked", async () => {
    const user = userEvent.setup();
    renderMarketplace();
    await waitFor(() => expect(screen.getByText("Acme Components")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Funded" }));

    expect(pushLog.some((url) => url.includes("status=funded"))).toBe(true);
  });

  it("calls router.push with sort=yield_desc when sort select changes", async () => {
    const user = userEvent.setup();
    renderMarketplace();
    await waitFor(() => expect(screen.getByText("Acme Components")).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText("Sort invoices"), "yield_desc");

    expect(pushLog.some((url) => url.includes("sort=yield_desc"))).toBe(true);
  });

  // ── Search uses router.replace with debounce ──────────────────────────────

  it("uses router.replace (not push) for search input after 250 ms debounce", async () => {
    // Use real timers throughout. Type into the search box directly via DOM
    // APIs (avoids userEvent timer complications) and wait >250ms.
    renderMarketplace();
    await waitFor(() => expect(screen.getByText("Acme Components")).toBeInTheDocument());

    const input = screen.getByRole("searchbox");
    // Simulate React controlled-input change by calling the setter + dispatching
    // a synthetic event — waitFor(+timeout) checks the result asynchronously.
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set;
    nativeInputValueSetter.call(input, "north");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // Debounce not yet fired
    expect(replaceLog.some((u) => u.includes("q=north"))).toBe(false);

    // Wait past the 250ms debounce (real timers)
    await new Promise((r) => setTimeout(r, 400));

    expect(replaceLog.some((u) => u.includes("q=north"))).toBe(true);
    expect(pushLog.some((u) => u.includes("q=north"))).toBe(false);
  });

  // ── Loading a URL with params renders the correct filtered view ───────────

  it("shows only funded invoices when URL has status=funded", async () => {
    renderMarketplace("status=funded");
    await waitFor(() => expect(screen.getByText("Blue Harbor Logistics")).toBeInTheDocument());
    expect(screen.queryByText("Acme Components")).not.toBeInTheDocument();
    expect(screen.queryByText("Northwind Textiles")).not.toBeInTheDocument();
  });

  it("filters by search query q=north from URL", async () => {
    renderMarketplace("q=north");
    // INV_0002 sme=Northwind, INV_0005 debtor=North Star Exports
    await waitFor(() => expect(screen.getByText("Northwind Textiles")).toBeInTheDocument());
    expect(screen.getByText("Delta Freight")).toBeInTheDocument();
    expect(screen.queryByText("Acme Components")).not.toBeInTheDocument();
    expect(screen.queryByText("Blue Harbor Logistics")).not.toBeInTheDocument();
  });

  it("shows cancelled invoices when URL has status=cancelled", async () => {
    renderMarketplace("status=cancelled");
    await waitFor(() => expect(screen.getByText("Delta Freight")).toBeInTheDocument());
    expect(screen.queryByText("Acme Components")).not.toBeInTheDocument();
  });

  // ── Back navigation restores previous filter ──────────────────────────────

  it("restores the open filter when URL reverts to status=open (simulates Back)", async () => {
    const result = renderMarketplace("status=funded");
    await waitFor(() => expect(screen.getByText("Blue Harbor Logistics")).toBeInTheDocument());

    // Back button: browser restores status=open
    navigate(result, "status=open");

    await waitFor(() => expect(screen.getByText("Acme Components")).toBeInTheDocument());
    expect(screen.getByText("Northwind Textiles")).toBeInTheDocument();
    expect(screen.queryByText("Blue Harbor Logistics")).not.toBeInTheDocument();
  });

  // ── aria-pressed on status tabs ───────────────────────────────────────────

  it("sets aria-pressed=true only on the active status tab", async () => {
    renderMarketplace("status=funded");
    await waitFor(() => expect(screen.getByText("Blue Harbor Logistics")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "Funded" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
  });

  // ── Result count with aria-live ───────────────────────────────────────────

  it("result count element has aria-live=polite", async () => {
    renderMarketplace();
    await waitFor(() => expect(screen.getByText(/Showing/)).toBeInTheDocument());
    expect(screen.getByText(/Showing/)).toHaveAttribute("aria-live", "polite");
  });

  it("result count reflects active status filter", async () => {
    renderMarketplace("status=open");
    await waitFor(() => expect(screen.getByText(/Showing 1–2 of 2/)).toBeInTheDocument());
  });

  // ── Clear filters button ──────────────────────────────────────────────────

  it("shows Clear filters button when a non-default filter is active", async () => {
    renderMarketplace("status=open");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument(),
    );
  });

  it("does not show Clear filters when no filter is active", async () => {
    renderMarketplace();
    await waitFor(() => expect(screen.getByText("Acme Components")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("Clear filters button calls router.push to /marketplace (no query string)", async () => {
    const user = userEvent.setup();
    renderMarketplace("status=open");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(pushLog.some((url) => url === "/marketplace")).toBe(true);
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  it("shows filter-specific empty state when no invoices match", async () => {
    renderMarketplace("q=zzznomatch");
    // The text appears in both the aria-live count and the h3; target the heading.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "No invoices match these filters" })).toBeInTheDocument(),
    );
  });

  // ── Offline notice ────────────────────────────────────────────────────────

  it("shows offline notice when API returns offline=true", async () => {
    listInvoicesMock.mockResolvedValueOnce({ data: MOCK_INVOICES, offline: true });
    renderMarketplace();
    await waitFor(() => expect(screen.getByText(/API is unreachable/)).toBeInTheDocument());
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  function bigList(n = 10) {
    return Array.from({ length: n }, (_, i) => ({
      id: `INV_${String(i + 1).padStart(4, "0")}`,
      sme: `SME ${i}`,
      debtor: `Debtor ${i}`,
      amount: 1000,
      currency: "USDC",
      fundedAmount: 0,
      yieldBps: 500,
      dueDate: "2027-01-01",
      status: "open",
      onChain: false,
    }));
  }

  describe("with 10 invoices (pagination)", () => {
    beforeEach(() => {
      listInvoicesMock.mockResolvedValue({ data: bigList(10), offline: false });
    });

    it("renders pagination nav when invoice count exceeds pageSize (9)", async () => {
      renderMarketplace();
      const nav = await screen.findByRole("navigation", { name: "Pagination" }, { timeout: 5000 });
      expect(within(nav).getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
      expect(within(nav).getByRole("button", { name: "Page 2" })).not.toHaveAttribute("aria-current");
    });

    it("Next button pushes page=2 to the URL", async () => {
      const user = userEvent.setup();
      renderMarketplace();
      const nextBtn = await screen.findByRole("button", { name: "Next page" }, { timeout: 5000 });
      await user.click(nextBtn);
      expect(pushLog.some((url) => url.includes("page=2"))).toBe(true);
    });

    it("Prev button is disabled on page 1", async () => {
      renderMarketplace();
      const prevBtn = await screen.findByRole("button", { name: "Previous page" }, { timeout: 5000 });
      expect(prevBtn).toBeDisabled();
    });
  });
});
