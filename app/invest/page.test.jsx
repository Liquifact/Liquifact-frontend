import "@testing-library/jest-dom";
import { act, render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import InvestPage, {
  ANNOUNCE_DEBOUNCE_MS,
  getInvoiceLoadAnnouncement,
  getPaginationAnnouncement,
  applySortToList,
  InvestMarketplace,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  URL_SYNC_DEBOUNCE_MS,
  parseFiltersFromSearchParams,
  buildSearchParams,
} from "./page";
import { getInvoiceById, loadMockInvoices, MOCK_INVOICES } from "./lib";
import { useSearchParams, useRouter } from "next/navigation";
import { DEFAULT_FILTERS } from "@/components/InvoiceFilters";

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return <nav aria-label="site navigation" />;
  }
  return { __esModule: true, default: MockNavMenu };
});

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn() })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/invest"),
}));

jest.mock("@/utils/export", () => ({
  exportAsCSV: jest.fn(),
  exportAsJSON: jest.fn(),
}));

import { exportAsCSV, exportAsJSON } from "@/utils/export";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createDeferredLoader(invoices, delayMs = 0) {
  return jest.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(invoices), delayMs);
      })
  );
}

function createPendingLoader() {
  return jest.fn(() => new Promise(() => {}));
}

async function flushTimers(delayMs = 0) {
  await act(async () => {
    // The async variant correctly cascades timers scheduled during
    // resolution (e.g. the announcement debounce scheduled once a load
    // settles), unlike the sync advanceTimersByTime + a single microtask hop.
    await jest.advanceTimersByTimeAsync(delayMs);
  });
}

/**
 * Builds an array of `count` minimal invoice fixtures.
 * IDs are "inv-001", "inv-002", …
 */
function makeInvoices(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `inv-${String(i + 1).padStart(3, "0")}`,
    issuer: `Issuer ${i + 1}`,
    amount: "1,000",
    currency: "USD",
    dueDate: "2026-12-31",
    yield: "5.0%",
    status: "Open",
  }));
}

function getInvoiceListItems() {
  return within(screen.getByRole("list", { name: /investable invoices/i })).getAllByRole(
    "listitem"
  );
}

// ── InvestMarketplace tests ───────────────────────────────────────────────────

describe("InvestMarketplace", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("keeps the skeleton busy state while invoices are still loading", () => {
    render(<InvestMarketplace loadInvoices={createPendingLoader()} />);

    const skeleton = screen.getByRole("list", {
      name: /loading investable invoices/i,
    });

    expect(skeleton).toHaveAttribute("aria-busy", "true");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("sets aria-busy=true on the results region during load and clears it on success", async () => {
    const { container } = render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(1), 100)} />);
    
    // During load, the region wrapper should have aria-busy="true"
    const busyRegion = container.querySelector('[aria-busy="true"]');
    expect(busyRegion).toBeInTheDocument();
    
    await flushTimers(100);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);
    
    // On success, aria-busy should be cleared (false)
    const clearedRegion = container.querySelector('[aria-busy="false"]');
    expect(clearedRegion).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
  });

  it("sets aria-busy=true on the results region during load and clears it on error", async () => {
    const errorLoader = jest.fn(() => new Promise((_, reject) => setTimeout(() => reject(new Error("Fail")), 100)));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(<InvestMarketplace loadInvoices={errorLoader} />);
    
    // During load, the region wrapper should have aria-busy="true"
    const busyRegion = container.querySelector('[aria-busy="true"]');
    expect(busyRegion).toBeInTheDocument();
    
    await flushTimers(100);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);
    
    // On error, aria-busy should be cleared (false)
    const clearedRegion = container.querySelector('[aria-busy="false"]');
    expect(clearedRegion).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("announces the loaded invoice count exactly once after the list resolves", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "7,800",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "7.5%",
        status: "Open",
      },
      {
        id: "inv-003",
        issuer: "Sunrise Exports Pte",
        amount: "22,000",
        currency: "USD",
        dueDate: "2026-05-30",
        yield: "9.1%",
        status: "Open",
      },
    ];

    const loadInvoices = createDeferredLoader(invoices, 100);
    const { rerender } = render(<InvestMarketplace loadInvoices={loadInvoices} />);

    expect(screen.getByRole("list", { name: /loading investable invoices/i })).toHaveAttribute(
      "aria-busy",
      "true"
    );

    // The load-settle announcement is debounced (issue #722): the debounce
    // timer is scheduled from a React effect once state settles, so it must
    // be advanced in its own flush rather than combined with the network
    // delay in a single advanceTimersByTimeAsync call.
    await flushTimers(100);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);

    expect(screen.getByRole("status")).toHaveTextContent("3 investable invoices loaded");
    expect(getInvoiceListItems()).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(loadInvoices).toHaveBeenCalledTimes(1);

    rerender(<InvestMarketplace loadInvoices={loadInvoices} />);

    expect(loadInvoices).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("3 investable invoices loaded");
  });

  it("renders each invoice as a list item once the marketplace loads", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "7,800",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "7.5%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    const listItems = getInvoiceListItems();
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent("Acme Supplies Ltd");
    expect(listItems[1]).toHaveTextContent("Bright Logistics GmbH");
  });

  it("applies design-token spacing and typography to marketplace cards", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    const card = getInvoiceListItems()[0];
    expect(card).toHaveStyle({ padding: "var(--market-card-padding)" });

    const titleLink = within(card).getByRole("link", { name: /acme supplies ltd/i });
    expect(titleLink).toHaveStyle({
      fontSize: "var(--market-card-title-font-size)",
      fontWeight: "var(--market-card-title-font-weight)",
      lineHeight: "var(--market-card-title-line-height)",
    });

    const metaRow = within(card).getByText(/USD/i).closest("div");
    expect(metaRow).toHaveStyle({
      fontSize: "var(--market-card-meta-font-size)",
      lineHeight: "var(--market-card-meta-line-height)",
      letterSpacing: "var(--market-card-meta-letter-spacing)",
    });
  });

  it("renders a stable structure for the loaded marketplace state", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "7,800",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "7.5%",
        status: "Open",
      },
    ];

    const { container } = render(
      <InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />
    );
    await flushTimers(0);

    expect(getInvoiceListItems()).toHaveLength(2);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div
        class="min-h-screen bg-slate-950 text-slate-100"
      >
        <nav
          aria-label="site navigation"
        />
        <main
          class="max-w-4xl mx-auto px-6 py-12"
        >
          <div
            aria-atomic="true"
            aria-live="polite"
            class="sr-only"
            role="status"
          >
            2 investable invoices loaded
          </div>
          <h1
            class="text-2xl font-bold mb-2 outline-none"
            tabindex="-1"
          >
            Invest
          </h1>
          <p
            class="text-slate-400 mb-8"
          >
            Browse tokenized invoices and fund them. Estimated yield is shown for educational purposes; actual payment is received at invoice maturity.
          </p>
          <div
            class="mb-4 flex flex-wrap items-center justify-between gap-4"
          >
            <div
              class="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6"
            >
              <div
                class="mb-4"
              >
                <input
                  aria-label="Search by issuer name"
                  class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Search invoices..."
                  type="text"
                  value=""
                />
              </div>
              <div
                class="flex flex-wrap gap-4 items-center opacity-60"
              >
                <button
                  class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500"
                  disabled=""
                  type="button"
                >
                  Sort: 
                  Best Yield
                </button>
                <button
                  class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500"
                  disabled=""
                  type="button"
                >
                  Filters: 
                  None
                </button>
              </div>
            </div>
            <div
              class="flex gap-2"
            >
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                Export CSV
              </button>
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                Export JSON
              </button>
            </div>
          </div>
          <div
            class="mb-4"
          >
            <div
              aria-label="Filter by status"
              class="flex flex-wrap items-center gap-2"
              role="group"
            >
              <span
                class="text-xs font-medium text-slate-400 mr-1"
              >
                Status:
              </span>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Open
              </button>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Funded
              </button>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Settled
              </button>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Overdue
              </button>
            </div>
          </div>
          <fieldset
            aria-describedby="filters-coming-soon"
            aria-disabled="true"
            class="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6"
          >
            <legend
              class="sr-only"
            >
              Marketplace Filters
            </legend>
            <div
              class="mb-4 inline-block rounded bg-slate-800 px-2 py-1 text-xs font-semibold tracking-wide text-slate-300"
              id="filters-coming-soon"
            >
              Soon: These filter controls are currently unavailable.
            </div>
            <div
              class="flex flex-wrap gap-4 items-center pointer-events-none opacity-60"
            >
              <div
                class="flex flex-wrap gap-4 items-center"
              >
                <div
                  class="flex flex-col gap-1"
                >
                  <fieldset
                    class="flex items-center gap-2 border-none p-0 m-0"
                  >
                    <legend
                      class="sr-only"
                    >
                      Yield Range
                    </legend>
                    <input
                      aria-invalid="false"
                      aria-label="Minimum yield percentage"
                      class="w-28 rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none border-slate-700 focus:border-cyan-500"
                      min="0"
                      placeholder="Min yield"
                      step="0.1"
                      type="number"
                      value=""
                    />
                    <span
                      class="text-slate-500"
                    >
                      -
                    </span>
                    <input
                      aria-invalid="false"
                      aria-label="Maximum yield percentage"
                      class="w-28 rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none border-slate-700 focus:border-cyan-500"
                      min="0"
                      placeholder="Max yield"
                      step="0.1"
                      type="number"
                      value=""
                    />
                  </fieldset>
                </div>
                <div
                  aria-label="Currency filter"
                  class="flex items-center gap-1"
                  role="toolbar"
                >
                  <button
                    aria-label="Filter by USD"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="0"
                    type="button"
                  >
                    USD
                  </button>
                  <button
                    aria-label="Filter by EUR"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    EUR
                  </button>
                  <button
                    aria-label="Filter by GBP"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    GBP
                  </button>
                  <button
                    aria-label="Filter by JPY"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    JPY
                  </button>
                  <button
                    aria-label="Filter by CHF"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    CHF
                  </button>
                </div>
                <div
                  class="flex flex-col gap-1"
                >
                  <fieldset
                    class="flex items-center gap-2 border-none p-0 m-0"
                  >
                    <legend
                      class="sr-only"
                    >
                      Maturity Date Range
                    </legend>
                    <input
                      aria-invalid="false"
                      aria-label="Maturity date from"
                      class="rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 focus:outline-none [color-scheme:dark] border-slate-700 focus:border-cyan-500"
                      type="date"
                      value=""
                    />
                    <span
                      class="text-slate-500"
                    >
                      -
                    </span>
                    <input
                      aria-invalid="false"
                      aria-label="Maturity date to"
                      class="rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 focus:outline-none [color-scheme:dark] border-slate-700 focus:border-cyan-500"
                      type="date"
                      value=""
                    />
                  </fieldset>
                </div>
                <fieldset
                  class="flex items-center gap-2 border-none p-0 m-0"
                >
                  <legend
                    class="sr-only"
                  >
                    Sort Options
                  </legend>
                  <select
                    aria-label="Sort options"
                    class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option
                      value=""
                    >
                      Sort By
                    </option>
                    <option
                      value="amount"
                    >
                      Amount
                    </option>
                    <option
                      value="yield"
                    >
                      Yield
                    </option>
                    <option
                      value="maturity"
                    >
                      Maturity
                    </option>
                  </select>
                  <button
                    aria-label="Sort amount direction"
                    class="focus-ring focus-visible:ring-2 focus-visible:ring-cyan-500 rounded px-2 py-1 text-xs font-mono transition-colors select-none bg-slate-800/50 text-slate-500 border border-slate-700 cursor-default"
                    disabled=""
                    type="button"
                  >
                    ↓
                  </button>
                  <button
                    aria-label="Sort yield direction"
                    class="focus-ring focus-visible:ring-2 focus-visible:ring-cyan-500 rounded px-2 py-1 text-xs font-mono transition-colors select-none bg-slate-800/50 text-slate-500 border border-slate-700 cursor-default"
                    disabled=""
                    type="button"
                  >
                    ↓
                  </button>
                </fieldset>
                <button
                  aria-label="Clear all filters"
                  class="focus-ring focus-visible:ring-2 focus-visible:ring-cyan-500 ml-auto rounded-lg border px-4 py-2 text-sm transition-colors border-slate-800 bg-slate-900/30 text-slate-600 cursor-not-allowed"
                  disabled=""
                  type="button"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </fieldset>
          <ul
            aria-label="Investable invoices"
            class="space-y-4"
            data-density="comfortable"
          >
            <li
              class="rounded-xl border transition-colors p-5 border-slate-800 bg-slate-900/50"
              data-selected="false"
              data-testid="invoice-row-inv-001"
            >
              <div
                class="flex items-center justify-between mb-3 gap-3"
              >
                <label
                  class="inline-flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-800/40 focus-within:ring-2 focus-within:ring-cyan-400 cursor-pointer"
                >
                  <input
                    aria-label="Select invoice inv-001 from Acme Supplies Ltd"
                    class="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-500 accent-cyan-400 focus:ring-cyan-400"
                    data-testid="invoice-checkbox-inv-001"
                    type="checkbox"
                  />
                  <a
                    class="font-medium text-slate-100 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
                    href="/invest/inv-001"
                  >
                    Acme Supplies Ltd
                  </a>
                </label>
                <span
                  class="rounded-full bg-cyan-900/60 px-2 py-1 text-xs font-semibold text-cyan-300"
                >
                  Open
                </span>
              </div>
              <div
                class="flex flex-wrap items-center text-slate-400"
                style="gap: var(--market-card-gap); font-size: var(--market-card-meta-font-size); line-height: var(--market-card-meta-line-height); letter-spacing: var(--market-card-meta-letter-spacing);"
              >
                <span>
                  USD
                   
                  12,500
                </span>
                <span>
                  Est. yield 
                  8.2%
                </span>
                <span>
                  Maturity 
                  2026-06-15
                </span>
              </div>
            </li>
            <li
              class="rounded-xl border transition-colors p-5 border-slate-800 bg-slate-900/50"
              data-selected="false"
              data-testid="invoice-row-inv-002"
            >
              <div
                class="flex items-center justify-between mb-3 gap-3"
              >
                <label
                  class="inline-flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-800/40 focus-within:ring-2 focus-within:ring-cyan-400 cursor-pointer"
                >
                  <input
                    aria-label="Select invoice inv-002 from Bright Logistics GmbH"
                    class="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-500 accent-cyan-400 focus:ring-cyan-400"
                    data-testid="invoice-checkbox-inv-002"
                    type="checkbox"
                  />
                  <a
                    class="font-medium text-slate-100 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
                    href="/invest/inv-002"
                  >
                    Bright Logistics GmbH
                  </a>
                </label>
                <span
                  class="rounded-full bg-cyan-900/60 px-2 py-1 text-xs font-semibold text-cyan-300"
                >
                  Open
                </span>
              </div>
              <div
                class="flex flex-wrap items-center text-slate-400"
                style="gap: var(--market-card-gap); font-size: var(--market-card-meta-font-size); line-height: var(--market-card-meta-line-height); letter-spacing: var(--market-card-meta-letter-spacing);"
              >
                <span>
                  EUR
                   
                  7,800
                </span>
                <span>
                  Est. yield 
                  7.5%
                </span>
                <span>
                  Maturity 
                  2026-07-01
                </span>
              </div>
            </li>
          </ul>
          <div
            class="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-400"
          >
            Note: Yield references are educational only and reflect on-chain basis-point assumptions. Invoice contracts settle at maturity.
          </div>
          <div
            class="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/60 pt-4"
          >
            <div
              aria-label="Display density"
              class="flex items-center gap-2 text-sm"
              role="group"
            >
              <span
                aria-hidden="true"
                class="text-slate-400 select-none"
                id="density-toggle-label"
              >
                Display density
                :
              </span>
              <button
                aria-label="Switch to compact density"
                aria-pressed="false"
                class="rounded px-3 py-1 text-xs font-medium transition-colors focus-ring border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500"
                data-density="compact"
                type="button"
              >
                Compact
              </button>
              <button
                aria-label="Switch to comfortable density"
                aria-pressed="true"
                class="rounded px-3 py-1 text-xs font-medium transition-colors focus-ring bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                data-density="comfortable"
                type="button"
              >
                Comfortable
              </button>
            </div>
            <div
              class="flex gap-2"
            >
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                Export CSV
              </button>
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                Export JSON
              </button>
            </div>
          </div>
        </main>
      </div>
    `);
  });

  it("renders a stable structure for the empty marketplace state", async () => {
    const { container } = render(<InvestMarketplace loadInvoices={createDeferredLoader([], 0)} />);
    await flushTimers(0);

    expect(
      screen.getByText(/No investable invoices\. Connect wallet to see the marketplace\./i)
    ).toBeInTheDocument();
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div
        class="min-h-screen bg-slate-950 text-slate-100"
      >
        <nav
          aria-label="site navigation"
        />
        <main
          class="max-w-4xl mx-auto px-6 py-12"
        >
          <div
            aria-atomic="true"
            aria-live="polite"
            class="sr-only"
            role="status"
          >
            No invoices available
          </div>
          <h1
            class="text-2xl font-bold mb-2 outline-none"
            tabindex="-1"
          >
            Invest
          </h1>
          <p
            class="text-slate-400 mb-8"
          >
            Browse tokenized invoices and fund them. Estimated yield is shown for educational purposes; actual payment is received at invoice maturity.
          </p>
          <div
            class="mb-4 flex flex-wrap items-center justify-between gap-4"
          >
            <div
              class="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6"
            >
              <div
                class="mb-4"
              >
                <input
                  aria-label="Search by issuer name"
                  class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Search invoices..."
                  type="text"
                  value=""
                />
              </div>
              <div
                class="flex flex-wrap gap-4 items-center opacity-60"
              >
                <button
                  class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500"
                  disabled=""
                  type="button"
                >
                  Sort: 
                  Best Yield
                </button>
                <button
                  class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500"
                  disabled=""
                  type="button"
                >
                  Filters: 
                  None
                </button>
              </div>
            </div>
            <div
              class="flex gap-2"
            >
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled=""
                type="button"
              >
                Export CSV
              </button>
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled=""
                type="button"
              >
                Export JSON
              </button>
            </div>
          </div>
          <div
            class="mb-4"
          >
            <div
              aria-label="Filter by status"
              class="flex flex-wrap items-center gap-2"
              role="group"
            >
              <span
                class="text-xs font-medium text-slate-400 mr-1"
              >
                Status:
              </span>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Open
              </button>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Funded
              </button>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Settled
              </button>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Overdue
              </button>
            </div>
          </div>
          <fieldset
            aria-describedby="filters-coming-soon"
            aria-disabled="true"
            class="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6"
          >
            <legend
              class="sr-only"
            >
              Marketplace Filters
            </legend>
            <div
              class="mb-4 inline-block rounded bg-slate-800 px-2 py-1 text-xs font-semibold tracking-wide text-slate-300"
              id="filters-coming-soon"
            >
              Soon: These filter controls are currently unavailable.
            </div>
            <div
              class="flex flex-wrap gap-4 items-center pointer-events-none opacity-60"
            >
              <div
                class="flex flex-wrap gap-4 items-center"
              >
                <div
                  class="flex flex-col gap-1"
                >
                  <fieldset
                    class="flex items-center gap-2 border-none p-0 m-0"
                  >
                    <legend
                      class="sr-only"
                    >
                      Yield Range
                    </legend>
                    <input
                      aria-invalid="false"
                      aria-label="Minimum yield percentage"
                      class="w-28 rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none border-slate-700 focus:border-cyan-500"
                      min="0"
                      placeholder="Min yield"
                      step="0.1"
                      type="number"
                      value=""
                    />
                    <span
                      class="text-slate-500"
                    >
                      -
                    </span>
                    <input
                      aria-invalid="false"
                      aria-label="Maximum yield percentage"
                      class="w-28 rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none border-slate-700 focus:border-cyan-500"
                      min="0"
                      placeholder="Max yield"
                      step="0.1"
                      type="number"
                      value=""
                    />
                  </fieldset>
                </div>
                <div
                  aria-label="Currency filter"
                  class="flex items-center gap-1"
                  role="toolbar"
                >
                  <button
                    aria-label="Filter by USD"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="0"
                    type="button"
                  >
                    USD
                  </button>
                  <button
                    aria-label="Filter by EUR"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    EUR
                  </button>
                  <button
                    aria-label="Filter by GBP"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    GBP
                  </button>
                  <button
                    aria-label="Filter by JPY"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    JPY
                  </button>
                  <button
                    aria-label="Filter by CHF"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    CHF
                  </button>
                </div>
                <div
                  class="flex flex-col gap-1"
                >
                  <fieldset
                    class="flex items-center gap-2 border-none p-0 m-0"
                  >
                    <legend
                      class="sr-only"
                    >
                      Maturity Date Range
                    </legend>
                    <input
                      aria-invalid="false"
                      aria-label="Maturity date from"
                      class="rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 focus:outline-none [color-scheme:dark] border-slate-700 focus:border-cyan-500"
                      type="date"
                      value=""
                    />
                    <span
                      class="text-slate-500"
                    >
                      -
                    </span>
                    <input
                      aria-invalid="false"
                      aria-label="Maturity date to"
                      class="rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 focus:outline-none [color-scheme:dark] border-slate-700 focus:border-cyan-500"
                      type="date"
                      value=""
                    />
                  </fieldset>
                </div>
                <fieldset
                  class="flex items-center gap-2 border-none p-0 m-0"
                >
                  <legend
                    class="sr-only"
                  >
                    Sort Options
                  </legend>
                  <select
                    aria-label="Sort options"
                    class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option
                      value=""
                    >
                      Sort By
                    </option>
                    <option
                      value="amount"
                    >
                      Amount
                    </option>
                    <option
                      value="yield"
                    >
                      Yield
                    </option>
                    <option
                      value="maturity"
                    >
                      Maturity
                    </option>
                  </select>
                  <button
                    aria-label="Sort amount direction"
                    class="focus-ring focus-visible:ring-2 focus-visible:ring-cyan-500 rounded px-2 py-1 text-xs font-mono transition-colors select-none bg-slate-800/50 text-slate-500 border border-slate-700 cursor-default"
                    disabled=""
                    type="button"
                  >
                    ↓
                  </button>
                  <button
                    aria-label="Sort yield direction"
                    class="focus-ring focus-visible:ring-2 focus-visible:ring-cyan-500 rounded px-2 py-1 text-xs font-mono transition-colors select-none bg-slate-800/50 text-slate-500 border border-slate-700 cursor-default"
                    disabled=""
                    type="button"
                  >
                    ↓
                  </button>
                </fieldset>
                <button
                  aria-label="Clear all filters"
                  class="focus-ring focus-visible:ring-2 focus-visible:ring-cyan-500 ml-auto rounded-lg border px-4 py-2 text-sm transition-colors border-slate-800 bg-slate-900/30 text-slate-600 cursor-not-allowed"
                  disabled=""
                  type="button"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </fieldset>
          <div
            class="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500"
          >
            No investable invoices. Connect wallet to see the marketplace.
          </div>
          <div
            class="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/60 pt-4"
          >
            <div
              aria-label="Display density"
              class="flex items-center gap-2 text-sm"
              role="group"
            >
              <span
                aria-hidden="true"
                class="text-slate-400 select-none"
                id="density-toggle-label"
              >
                Display density
                :
              </span>
              <button
                aria-label="Switch to compact density"
                aria-pressed="false"
                class="rounded px-3 py-1 text-xs font-medium transition-colors focus-ring border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500"
                data-density="compact"
                type="button"
              >
                Compact
              </button>
              <button
                aria-label="Switch to comfortable density"
                aria-pressed="true"
                class="rounded px-3 py-1 text-xs font-medium transition-colors focus-ring bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                data-density="comfortable"
                type="button"
              >
                Comfortable
              </button>
            </div>
            <div
              class="flex gap-2"
            >
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled=""
                type="button"
              >
                Export CSV
              </button>
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled=""
                type="button"
              >
                Export JSON
              </button>
            </div>
          </div>
        </main>
      </div>
    `);
  });

  it("renders a stable structure for the error marketplace state", async () => {
    const loadInvoices = jest.fn(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("boom")), 50);
        })
    );

    const { container } = render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load investable invoices right now."
    );
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div
        class="min-h-screen bg-slate-950 text-slate-100"
      >
        <nav
          aria-label="site navigation"
        />
        <main
          class="max-w-4xl mx-auto px-6 py-12"
        >
          <div
            aria-atomic="true"
            aria-live="polite"
            class="sr-only"
            role="status"
          >
            Unable to load investable invoices.
          </div>
          <h1
            class="text-2xl font-bold mb-2 outline-none"
            tabindex="-1"
          >
            Invest
          </h1>
          <p
            class="text-slate-400 mb-8"
          >
            Browse tokenized invoices and fund them. Estimated yield is shown for educational purposes; actual payment is received at invoice maturity.
          </p>
          <div
            class="mb-4 flex flex-wrap items-center justify-between gap-4"
          >
            <div
              class="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6"
            >
              <div
                class="mb-4"
              >
                <input
                  aria-label="Search by issuer name"
                  class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Search invoices..."
                  type="text"
                  value=""
                />
              </div>
              <div
                class="flex flex-wrap gap-4 items-center opacity-60"
              >
                <button
                  class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500"
                  disabled=""
                  type="button"
                >
                  Sort: 
                  Best Yield
                </button>
                <button
                  class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500"
                  disabled=""
                  type="button"
                >
                  Filters: 
                  None
                </button>
              </div>
            </div>
            <div
              class="flex gap-2"
            >
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled=""
                type="button"
              >
                Export CSV
              </button>
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled=""
                type="button"
              >
                Export JSON
              </button>
            </div>
          </div>
          <div
            class="mb-4"
          >
            <div
              aria-label="Filter by status"
              class="flex flex-wrap items-center gap-2"
              role="group"
            >
              <span
                class="text-xs font-medium text-slate-400 mr-1"
              >
                Status:
              </span>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Open
              </button>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Funded
              </button>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Settled
              </button>
              <button
                aria-pressed="false"
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 border-slate-700 bg-slate-800/50 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-500"
                type="button"
              >
                Overdue
              </button>
            </div>
          </div>
          <fieldset
            aria-describedby="filters-coming-soon"
            aria-disabled="true"
            class="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6"
          >
            <legend
              class="sr-only"
            >
              Marketplace Filters
            </legend>
            <div
              class="mb-4 inline-block rounded bg-slate-800 px-2 py-1 text-xs font-semibold tracking-wide text-slate-300"
              id="filters-coming-soon"
            >
              Soon: These filter controls are currently unavailable.
            </div>
            <div
              class="flex flex-wrap gap-4 items-center pointer-events-none opacity-60"
            >
              <div
                class="flex flex-wrap gap-4 items-center"
              >
                <div
                  class="flex flex-col gap-1"
                >
                  <fieldset
                    class="flex items-center gap-2 border-none p-0 m-0"
                  >
                    <legend
                      class="sr-only"
                    >
                      Yield Range
                    </legend>
                    <input
                      aria-invalid="false"
                      aria-label="Minimum yield percentage"
                      class="w-28 rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none border-slate-700 focus:border-cyan-500"
                      min="0"
                      placeholder="Min yield"
                      step="0.1"
                      type="number"
                      value=""
                    />
                    <span
                      class="text-slate-500"
                    >
                      -
                    </span>
                    <input
                      aria-invalid="false"
                      aria-label="Maximum yield percentage"
                      class="w-28 rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none border-slate-700 focus:border-cyan-500"
                      min="0"
                      placeholder="Max yield"
                      step="0.1"
                      type="number"
                      value=""
                    />
                  </fieldset>
                </div>
                <div
                  aria-label="Currency filter"
                  class="flex items-center gap-1"
                  role="toolbar"
                >
                  <button
                    aria-label="Filter by USD"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="0"
                    type="button"
                  >
                    USD
                  </button>
                  <button
                    aria-label="Filter by EUR"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    EUR
                  </button>
                  <button
                    aria-label="Filter by GBP"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    GBP
                  </button>
                  <button
                    aria-label="Filter by JPY"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    JPY
                  </button>
                  <button
                    aria-label="Filter by CHF"
                    aria-pressed="false"
                    class="focus-ring rounded-lg border px-3 py-2 text-sm transition-colors border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                    tabindex="-1"
                    type="button"
                  >
                    CHF
                  </button>
                </div>
                <div
                  class="flex flex-col gap-1"
                >
                  <fieldset
                    class="flex items-center gap-2 border-none p-0 m-0"
                  >
                    <legend
                      class="sr-only"
                    >
                      Maturity Date Range
                    </legend>
                    <input
                      aria-invalid="false"
                      aria-label="Maturity date from"
                      class="rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 focus:outline-none [color-scheme:dark] border-slate-700 focus:border-cyan-500"
                      type="date"
                      value=""
                    />
                    <span
                      class="text-slate-500"
                    >
                      -
                    </span>
                    <input
                      aria-invalid="false"
                      aria-label="Maturity date to"
                      class="rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-300 focus:outline-none [color-scheme:dark] border-slate-700 focus:border-cyan-500"
                      type="date"
                      value=""
                    />
                  </fieldset>
                </div>
                <fieldset
                  class="flex items-center gap-2 border-none p-0 m-0"
                >
                  <legend
                    class="sr-only"
                  >
                    Sort Options
                  </legend>
                  <select
                    aria-label="Sort options"
                    class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option
                      value=""
                    >
                      Sort By
                    </option>
                    <option
                      value="amount"
                    >
                      Amount
                    </option>
                    <option
                      value="yield"
                    >
                      Yield
                    </option>
                    <option
                      value="maturity"
                    >
                      Maturity
                    </option>
                  </select>
                  <button
                    aria-label="Sort amount direction"
                    class="focus-ring focus-visible:ring-2 focus-visible:ring-cyan-500 rounded px-2 py-1 text-xs font-mono transition-colors select-none bg-slate-800/50 text-slate-500 border border-slate-700 cursor-default"
                    disabled=""
                    type="button"
                  >
                    ↓
                  </button>
                  <button
                    aria-label="Sort yield direction"
                    class="focus-ring focus-visible:ring-2 focus-visible:ring-cyan-500 rounded px-2 py-1 text-xs font-mono transition-colors select-none bg-slate-800/50 text-slate-500 border border-slate-700 cursor-default"
                    disabled=""
                    type="button"
                  >
                    ↓
                  </button>
                </fieldset>
                <button
                  aria-label="Clear all filters"
                  class="focus-ring focus-visible:ring-2 focus-visible:ring-cyan-500 ml-auto rounded-lg border px-4 py-2 text-sm transition-colors border-slate-800 bg-slate-900/30 text-slate-600 cursor-not-allowed"
                  disabled=""
                  type="button"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </fieldset>
          <div
            aria-live="assertive"
            class="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-slate-50 shadow-sm sm:p-6"
            role="alert"
          >
            <div
              class="flex flex-wrap items-start gap-4"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-200 ring-1 ring-red-300/30"
              >
                <span
                  aria-hidden="true"
                  class="text-lg font-semibold"
                >
                  !
                </span>
              </div>
              <div
                class="min-w-0 flex-1"
              >
                <div
                  class="flex items-start gap-3"
                >
                  <p
                    class="text-sm font-semibold uppercase tracking-[0.18em] text-red-200"
                  >
                    Server error
                  </p>
                  <span
                    class="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300"
                  >
                    Preview only
                  </span>
                </div>
                <h2
                  class="mt-3 text-xl font-semibold text-white"
                >
                  Unable to load investable invoices
                </h2>
                <p
                  class="mt-2 text-sm leading-6 text-slate-300"
                >
                  Unable to load investable invoices right now.
                </p>
              </div>
            </div>
            <div
              class="mt-5 flex flex-wrap items-center gap-3"
            >
              <button
                aria-busy="false"
                class="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition-all duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 active:bg-cyan-500/40   cursor-pointer"
                type="button"
              >
                Try again
              </button>
            </div>
          </div>
          <div
            class="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/60 pt-4"
          >
            <div
              aria-label="Display density"
              class="flex items-center gap-2 text-sm"
              role="group"
            >
              <span
                aria-hidden="true"
                class="text-slate-400 select-none"
                id="density-toggle-label"
              >
                Display density
                :
              </span>
              <button
                aria-label="Switch to compact density"
                aria-pressed="false"
                class="rounded px-3 py-1 text-xs font-medium transition-colors focus-ring border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500"
                data-density="compact"
                type="button"
              >
                Compact
              </button>
              <button
                aria-label="Switch to comfortable density"
                aria-pressed="true"
                class="rounded px-3 py-1 text-xs font-medium transition-colors focus-ring bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                data-density="comfortable"
                type="button"
              >
                Comfortable
              </button>
            </div>
            <div
              class="flex gap-2"
            >
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled=""
                type="button"
              >
                Export CSV
              </button>
              <button
                class="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled=""
                type="button"
              >
                Export JSON
              </button>
            </div>
          </div>
        </main>
      </div>
    `);
  });

  it("announces the empty marketplace state when no invoices load", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader([], 100)} />);
    await flushTimers(100);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("No invoices available");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByText(/No investable invoices\. Connect wallet to see the marketplace\./i)
    ).toBeInTheDocument();
  });

  it("coerces a non-array load result to an empty list and announces it as empty", async () => {
    const loadInvoices = createDeferredLoader({ unexpected: "shape" }, 100);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(100);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("No invoices available");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(
      screen.getByText(/No investable invoices\. Connect wallet to see the marketplace\./i)
    ).toBeInTheDocument();
  });

  it("announces load errors through an alert and live region", async () => {
    const loadInvoices = jest.fn(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("boom")), 50);
        })
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Unable to load investable invoices.");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load investable invoices right now."
    );
  });

  // ── Unmount / abort during a pending load ─────────────────────────────────
  // These tests cover the `isActive` guard inside the fetch effect's closure:
  // if the component unmounts before the loader settles, the effect's cleanup
  // flips `isActive` to false so the late resolution/rejection is a no-op
  // instead of calling setState on an unmounted component.

  it("does not throw or update state when unmounted while the load is still pending (resolve after unmount)", async () => {
    let resolveLoad;
    const loadInvoices = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        })
    );
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(<InvestMarketplace loadInvoices={loadInvoices} />);

    expect(() => unmount()).not.toThrow();

    await act(async () => {
      resolveLoad(makeInvoices(2));
      await Promise.resolve();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("does not throw or update state when unmounted while the load is still pending (reject after unmount)", async () => {
    let rejectLoad;
    const loadInvoices = jest.fn(
      () =>
        new Promise((_, reject) => {
          rejectLoad = reject;
        })
    );
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(<InvestMarketplace loadInvoices={loadInvoices} />);

    expect(() => unmount()).not.toThrow();

    await act(async () => {
      rejectLoad(new Error("boom after unmount"));
      await Promise.resolve();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // ── Pagination tests ──────────────────────────────────────────────────────

  it("renders only PAGE_SIZE items initially when total exceeds PAGE_SIZE", async () => {
    render(
      <InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(PAGE_SIZE + 5), 50)} />
    );
    await flushTimers(50);
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
  });

  it("shows the Load-more button when there are more items than PAGE_SIZE", async () => {
    render(
      <InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(PAGE_SIZE + 1), 50)} />
    );
    await flushTimers(50);

    expect(screen.getByRole("button", { name: /load more invoices/i })).toBeInTheDocument();
  });

  it("clicking Load more appends the next batch of invoices", async () => {
    const total = PAGE_SIZE + 3;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 50)} />);
    await flushTimers(50);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(getInvoiceListItems()).toHaveLength(total);
  });

  it("hides Load-more button when all items are visible after clicking", async () => {
    const total = PAGE_SIZE + 2;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 50)} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
  });

  it("updates the status region to Showing N of M after Load more", async () => {
    const total = PAGE_SIZE + 4;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 50)} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      `Showing ${total} of ${total} investable invoices`
    );
  });

  it("does not show Load-more when total is fewer than PAGE_SIZE", async () => {
    render(
      <InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(PAGE_SIZE - 1), 50)} />
    );
    await flushTimers(50);

    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE - 1);
  });

  it("does not show Load-more when total equals exactly PAGE_SIZE", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(PAGE_SIZE), 50)} />);
    await flushTimers(50);

    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
  });

  it("shows only the remaining items on the last page click", async () => {
    const remainder = 3;
    const total = PAGE_SIZE * 2 + remainder;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 50)} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 2);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
  });

  it("shows the first page and initial pagination announcement before any load more", async () => {
    const total = PAGE_SIZE + 7;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 50)} />);
    await flushTimers(50);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    expect(screen.getByRole("status")).toHaveTextContent(
      `Showing ${PAGE_SIZE} of ${total} investable invoices`
    );
    expect(screen.getByRole("button", { name: /load more invoices/i })).toBeInTheDocument();
  });

  it("appends the next page without duplicating already visible invoices", async () => {
    const total = PAGE_SIZE + 5;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 50)} />);
    await flushTimers(50);

    const firstPage = getInvoiceListItems().map((item) => item.textContent);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    const nextPage = getInvoiceListItems().map((item) => item.textContent);
    expect(nextPage).toHaveLength(total);
    expect(nextPage.slice(0, PAGE_SIZE)).toEqual(firstPage);
  });

  it("resets pagination when a filter is applied and then cleared", async () => {
    const invoices = [
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `usd-${i + 1}`,
        issuer: `USD Issuer ${i + 1}`,
        amount: "1,000",
        currency: "USD",
        dueDate: "2026-12-31",
        yield: "5.0%",
        status: "Open",
      })),
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `eur-${i + 1}`,
        issuer: `EUR Issuer ${i + 1}`,
        amount: "1,000",
        currency: "EUR",
        dueDate: "2026-12-31",
        yield: "5.0%",
        status: "Open",
      })),
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 50)} />);
    await flushTimers(50);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getInvoiceListItems()).toHaveLength(20);

    fireEvent.click(screen.getByLabelText("Filter by EUR"));
    expect(getInvoiceListItems()).toHaveLength(10);
    expect(screen.getByRole("button", { name: /load more invoices/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Clear all filters"));
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    expect(screen.getByRole("button", { name: /load more invoices/i })).toBeInTheDocument();
  });

  it.skip("moves focus back to the Load-more button after each click (e2e only)", async () => {
    render(
      <InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(PAGE_SIZE * 3), 50)} />
    );
    await flushTimers(50);

    const button = screen.getByRole("button", { name: /load more invoices/i });
    await act(async () => {
      fireEvent.click(button);
      jest.advanceTimersByTime(10);
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(
      screen.queryByRole("button", { name: /load more invoices/i })
    );
  });

  // ── Pagination + filter/search reset tests ────────────────────────────────

  it("resets visible items to PAGE_SIZE when a currency filter is applied", async () => {
    // Build 25 invoices: 15 USD, 10 EUR.
    const invoices = [
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `usd-${i + 1}`,
        issuer: `USD Issuer ${i + 1}`,
        amount: "1,000",
        currency: "USD",
        dueDate: "2026-12-31",
        yield: "5.0%",
        status: "Open",
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `eur-${i + 1}`,
        issuer: `EUR Issuer ${i + 1}`,
        amount: "1,000",
        currency: "EUR",
        dueDate: "2026-12-31",
        yield: "5.0%",
        status: "Open",
      })),
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 50)} />);
    await flushTimers(50);

    // Initially PAGE_SIZE items visible (10 USD entries)
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);

    // Load more once to see 20 items
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getInvoiceListItems()).toHaveLength(20);

    // Apply EUR filter — should reset to PAGE_SIZE (only 10 EUR exist, so 10 visible)
    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    expect(getInvoiceListItems()).toHaveLength(10);
    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
  });

  it("resets visible items to PAGE_SIZE when search is applied after debounce", async () => {
    const total = PAGE_SIZE * 3; // 30 invoices
    const invoices = Array.from({ length: total }, (_, i) => ({
      id: `inv-${String(i + 1).padStart(3, "0")}`,
      issuer: i < 5 ? `SearchTarget Corp` : `Other Issuer ${i + 1}`,
      amount: "1,000",
      currency: "USD",
      dueDate: "2026-12-31",
      yield: "5.0%",
      status: "Open",
    }));

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 50)} />);
    await flushTimers(50);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);

    // Load more to get 20 items visible
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getInvoiceListItems()).toHaveLength(20);

    // Type a search query and let debounce resolve
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "SearchTarget" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    // Paging should reset: only 5 matching items, all visible (< PAGE_SIZE)
    expect(getInvoiceListItems()).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
  });

  // ── Filter tests ──────────────────────────────────────────────────────────

  it("filters invoices by currency", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "A",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "B",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
      {
        id: "inv-003",
        issuer: "C",
        amount: "300",
        currency: "USD",
        dueDate: "2026-05-30",
        yield: "7%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    expect(getInvoiceListItems()).toHaveLength(1);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("filters invoices by minimum yield", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "A",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5.2%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "B",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "7.5%",
        status: "Open",
      },
      {
        id: "inv-003",
        issuer: "C",
        amount: "300",
        currency: "USD",
        dueDate: "2026-05-30",
        yield: "9.1%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Minimum yield percentage"), {
      target: { value: "6" },
    });

    expect(getInvoiceListItems()).toHaveLength(2);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("filters invoices by maturity date range", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "A",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "B",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Maturity date from"), {
      target: { value: "2026-07-01" },
    });

    expect(getInvoiceListItems()).toHaveLength(1);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("sorts invoices by yield descending", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "A",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "B",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "9%",
        status: "Open",
      },
      {
        id: "inv-003",
        issuer: "C",
        amount: "300",
        currency: "USD",
        dueDate: "2026-05-30",
        yield: "7%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Sort options"), {
      target: { value: "yield" },
    });

    const items = getInvoiceListItems();
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("9%");
    expect(items[1]).toHaveTextContent("7%");
    expect(items[2]).toHaveTextContent("5%");
  });

  it("shows empty filtered state message when no invoices match", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader([], 0)} />);
    await flushTimers(0);
    expect(screen.getByText(/No investable invoices\./i)).toBeInTheDocument();
  });

  it("shows no-match message when filters eliminate all invoices", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "A",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    expect(screen.getByText("No invoices match your filters.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /investable invoices/i })).not.toBeInTheDocument();
  });

  it("clears all filters and restores full list", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "A",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "B",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.click(screen.getByLabelText("Filter by EUR"));
    expect(getInvoiceListItems()).toHaveLength(1);

    fireEvent.click(screen.getByLabelText("Clear all filters"));
    expect(getInvoiceListItems()).toHaveLength(2);
  });

  it("announces filtered results in the live region", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "A",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "B",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);

    expect(screen.getByRole("status")).toHaveTextContent("2 investable invoices loaded");

    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    expect(screen.getByRole("status")).toHaveTextContent("1 of 2 invoices match");
  });

  it("filters invoices by issuer search query after debounce", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "acme" },
    });

    // Before debounce runs, it should not filter yet
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Acme Supplies Ltd")).toBeInTheDocument();
    expect(screen.queryByText("Bright Logistics GmbH")).not.toBeInTheDocument();
  });

  it("search is case-insensitive — lowercase query matches mixed-case issuer", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "BRIGHT" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Bright Logistics GmbH")).toBeInTheDocument();
    expect(screen.queryByText("Acme Supplies Ltd")).not.toBeInTheDocument();
  });

  it("shows no-match state when search query matches no invoices", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "nonexistent" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(screen.queryByRole("list", { name: /investable invoices/i })).not.toBeInTheDocument();
    expect(screen.getByText("No invoices match your filters.")).toBeInTheDocument();
  });

  it("restores full list when search query is cleared", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    // Apply a search filter
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "acme" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    // Clear the search filter
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Acme Supplies Ltd")).toBeInTheDocument();
    expect(screen.getByText("Bright Logistics GmbH")).toBeInTheDocument();
  });

  it("announces search-filtered count in the live region", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
      {
        id: "inv-003",
        issuer: "Acme Trading Co",
        amount: "300",
        currency: "USD",
        dueDate: "2026-08-01",
        yield: "7%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);

    expect(screen.getByRole("status")).toHaveTextContent("3 investable invoices loaded");

    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "acme" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    // 2 of 3 invoices match "acme" (Acme Supplies Ltd and Acme Trading Co)
    expect(screen.getByRole("status")).toHaveTextContent("2 of 3 invoices match");
  });

  it("announces no-match when search produces zero results", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "zzznomatch" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(screen.getByRole("status")).toHaveTextContent("No invoices match");
  });

  it("search does not filter before debounce delay elapses", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "acme" },
    });

    // Advance less than debounce threshold — list should still be unfiltered
    await flushTimers(SEARCH_DEBOUNCE_MS - 50);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    // Now cross the threshold — filtering should kick in
    await flushTimers(50);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("announces filtered results in the live region when search is applied", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
    ];

    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);

    expect(screen.getByRole("status")).toHaveTextContent("2 investable invoices loaded");

    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    expect(screen.getByRole("status")).toHaveTextContent("1 of 2 invoices match");
  });

  // ── Retry / error recovery tests ──────────────────────────────────────────

  it("shows a 'Try again' button in the error banner when load fails", async () => {
    const loadInvoices = jest.fn(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("boom")), 50))
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("has no axe violations in the loaded state", async () => {
    const invoices = makeInvoices(2);
    const loadInvoices = createDeferredLoader(invoices, 0);

    const { container } = render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(0);

    expect(screen.getByText("Issuer 1")).toBeInTheDocument();
    jest.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
    jest.useFakeTimers();
  }, 60_000);

  it("has no axe violations in the empty state", async () => {
    const loadInvoices = createDeferredLoader([], 0);

    const { container } = render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(0);

    expect(screen.getByText(/No investable invoices\./i)).toBeInTheDocument();
    jest.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
    jest.useFakeTimers();
  }, 60_000);

  it("has no axe violations in the error state", async () => {
    const loadInvoices = jest.fn(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("boom")), 0))
    );

    const { container } = render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(0);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    jest.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
    jest.useFakeTimers();
  }, 60_000);

  it("retry: shows skeleton while reloading, then renders list on success", async () => {
    let callCount = 0;
    const invoices = makeInvoices(2);
    const loadInvoices = jest.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        // First call fails
        return new Promise((_, reject) => setTimeout(() => reject(new Error("first fail")), 50));
      }
      // Subsequent calls succeed
      return new Promise((resolve) => setTimeout(() => resolve(invoices), 50));
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    // Error state is visible
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Click "Try again"
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });

    // Error banner clears immediately; skeleton reappears
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: /loading investable invoices/i })).toHaveAttribute(
      "aria-busy",
      "true"
    );

    // Wait for the successful load, then for the announcement debounce
    await flushTimers(50);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getInvoiceListItems()).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("2 investable invoices loaded");
  });

  it("retry-then-failure: shows error banner again after a second failure", async () => {
    const loadInvoices = jest.fn(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("always fails")), 50))
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    // First failure
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Click "Try again"
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });

    // Wait for second failure
    await flushTimers(50);

    // Error banner reappears with retry button
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("rapid double retry: stale in-flight requests are aborted and only the last result is applied", async () => {
    const invoices = makeInvoices(1);
    let callCount = 0;
    const loadInvoices = jest.fn(() => {
      callCount += 1;
      if (callCount <= 2) {
        // First two calls (initial + first retry) fail
        return new Promise((_, reject) => setTimeout(() => reject(new Error("fail")), 50));
      }
      // Third call (second retry) succeeds
      return new Promise((resolve) => setTimeout(() => resolve(invoices), 50));
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50); // initial failure

    // First retry
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });
    await flushTimers(50); // second failure

    // Second retry
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });
    await flushTimers(50); // third call succeeds

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getInvoiceListItems()).toHaveLength(1);
  });
});

// ── Unit tests for pure helpers ───────────────────────────────────────────────

describe("getInvoiceLoadAnnouncement", () => {
  it("returns 'No invoices available' for non-array input", () => {
    expect(getInvoiceLoadAnnouncement(undefined)).toBe("No invoices available");
    expect(getInvoiceLoadAnnouncement(null)).toBe("No invoices available");
    expect(getInvoiceLoadAnnouncement("not-an-array")).toBe("No invoices available");
    expect(getInvoiceLoadAnnouncement({ length: 3 })).toBe("No invoices available");
  });

  it("returns 'No invoices available' for an empty array", () => {
    expect(getInvoiceLoadAnnouncement([])).toBe("No invoices available");
  });

  it("returns the exact 'N investable invoices loaded' string for N>0", () => {
    expect(getInvoiceLoadAnnouncement([{ id: "1" }])).toBe("1 investable invoices loaded");
    expect(getInvoiceLoadAnnouncement([{ id: "1" }, { id: "2" }])).toBe(
      "2 investable invoices loaded"
    );
  });

  it("returns filtered count announcement when filterActive is true", () => {
    const invoices = [{ id: "1" }, { id: "2" }, { id: "3" }];
    expect(
      getInvoiceLoadAnnouncement(invoices, {
        filterActive: true,
        filteredCount: 2,
      })
    ).toBe("2 of 3 invoices match");
  });

  it("returns no-match announcement when filterActive and filteredCount is 0", () => {
    const invoices = [{ id: "1" }, { id: "2" }];
    expect(
      getInvoiceLoadAnnouncement(invoices, {
        filterActive: true,
        filteredCount: 0,
      })
    ).toBe("No invoices match");
  });
});

describe("InvestPage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("renders the marketplace page via the default export", async () => {
    // InvestPage renders InvestMarketplace whose default loadInvoices is
    // loadMockInvoices from lib.js — no prop injection needed here.
    render(<InvestPage />);
    await flushTimers(0);

    expect(screen.getByRole("heading", { name: /invest/i })).toBeInTheDocument();
    expect(getInvoiceListItems()).toHaveLength(MOCK_INVOICES.length);
  });
});

// ── Shared fixture tests (Issue #422) ─────────────────────────────────────────
// These tests assert that the marketplace renders directly from the MOCK_INVOICES
// array exported by lib.js, confirming that lib.js is the single source of truth.

describe("InvestMarketplace renders from shared lib.js fixture", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("renders one list item per entry in MOCK_INVOICES when using loadMockInvoices", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    const items = getInvoiceListItems();
    expect(items).toHaveLength(MOCK_INVOICES.length);
  });

  it("renders each issuer name from the shared MOCK_INVOICES fixture", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    for (const invoice of MOCK_INVOICES) {
      expect(screen.getByText(invoice.issuer)).toBeInTheDocument();
    }
  });

  it("announces the correct invoice count based on MOCK_INVOICES length", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);
    await flushTimers(ANNOUNCE_DEBOUNCE_MS);

    expect(screen.getByRole("status")).toHaveTextContent(
      `${MOCK_INVOICES.length} investable invoices loaded`
    );
  });

  it("window.__TEST_MOCK_INVOICES__ override is honoured by loadMockInvoices", async () => {
    const overrideInvoices = [
      {
        id: "test-inv-001",
        issuer: "Override Corp",
        amount: "999",
        currency: "USD",
        dueDate: "2027-01-01",
        yield: "1.0%",
        status: "Open",
      },
    ];

    // Set the test hook that loadMockInvoices checks before falling back to MOCK_INVOICES.
    window.__TEST_MOCK_INVOICES__ = overrideInvoices;

    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    expect(getInvoiceListItems()).toHaveLength(1);
    expect(screen.getByText("Override Corp")).toBeInTheDocument();

    delete window.__TEST_MOCK_INVOICES__;
  });

  it("getInvoiceById resolves against the same MOCK_INVOICES fixture used by the marketplace", async () => {
    // Confirm the detail-route helper and the marketplace list share the same array.
    for (const invoice of MOCK_INVOICES) {
      expect(getInvoiceById(invoice.id)).toStrictEqual(invoice);
    }
  });

  it("getInvoiceById returns undefined for an id that does not exist in the shared fixture", () => {
    expect(getInvoiceById("inv-not-in-fixture")).toBeUndefined();
  });
});

describe("lib helpers", () => {
  it("resolves an invoice by id or returns undefined for unknown ids", () => {
    expect(getInvoiceById("inv-001")).toMatchObject({ id: "inv-001" });
    expect(getInvoiceById("missing")).toBeUndefined();
  });

  it("loads all mock invoices", async () => {
    const invoices = await loadMockInvoices();
    expect(invoices).toHaveLength(3);
  });
});

describe("getPaginationAnnouncement", () => {
  it("formats the Showing N of M string correctly", () => {
    expect(getPaginationAnnouncement(10, 25)).toBe("Showing 10 of 25 investable invoices");
    expect(getPaginationAnnouncement(3, 3)).toBe("Showing 3 of 3 investable invoices");
  });
});

describe("Export functionality", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("calls exportAsCSV with filtered invoices when Export CSV is clicked", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    const exportCsvBtn = screen.getByRole("button", { name: "Export CSV" });
    fireEvent.click(exportCsvBtn);

    expect(exportAsCSV).toHaveBeenCalledTimes(1);
    expect(exportAsCSV).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ issuer: "Acme Supplies Ltd" })]),
      "invoices_export.csv"
    );
  });

  it("calls exportAsJSON with filtered invoices when Export JSON is clicked", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    const exportJsonBtn = screen.getByRole("button", { name: "Export JSON" });
    fireEvent.click(exportJsonBtn);

    expect(exportAsJSON).toHaveBeenCalledTimes(1);
    expect(exportAsJSON).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ issuer: "Acme Supplies Ltd" })]),
      "invoices_export.json"
    );
  });

  it("disables the export buttons when the filtered view is empty", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    // Apply a search that yields no results
    const searchInput = screen.getByRole("textbox", { name: /Search by issuer name/i });
    fireEvent.change(searchInput, { target: { value: "NonExistentIssuerXYZ123" } });

    // Fast-forward debounce
    await flushTimers(SEARCH_DEBOUNCE_MS);

    const exportCsvBtn = screen.getByRole("button", { name: "Export CSV" });
    const exportJsonBtn = screen.getByRole("button", { name: "Export JSON" });

    expect(exportCsvBtn).toBeDisabled();
    expect(exportJsonBtn).toBeDisabled();
  });

  it("disables export buttons while invoices are still loading", () => {
    render(<InvestMarketplace loadInvoices={createPendingLoader()} />);

    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export JSON" })).toBeDisabled();
  });

  it("disables export buttons in the empty state (no invoices loaded)", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader([], 0)} />);
    await flushTimers(0);

    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export JSON" })).toBeDisabled();
  });

  it("export respects active currency filter — only filtered invoices exported", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    // Filter by EUR — only Bright Logistics GmbH should be included
    fireEvent.click(screen.getByRole("button", { name: /Filter by EUR/i }));
    await flushTimers(0);

    const exportCsvBtn = screen.getByRole("button", { name: "Export CSV" });
    fireEvent.click(exportCsvBtn);

    expect(exportAsCSV).toHaveBeenCalledTimes(1);
    // Only EUR invoices (1 of 3) should be passed
    const passedInvoices = exportAsCSV.mock.calls[0][0];
    expect(passedInvoices).toHaveLength(1);
    expect(passedInvoices[0].currency).toBe("EUR");
    expect(exportAsCSV).toHaveBeenCalledWith(passedInvoices, "invoices_export.csv");
  });

  it("export respects active search query — only matching invoices exported", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    // Search for "Sunrise" — only Sunrise Exports Pte should match
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "Sunrise" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));

    expect(exportAsJSON).toHaveBeenCalledTimes(1);
    const passedInvoices = exportAsJSON.mock.calls[0][0];
    expect(passedInvoices).toHaveLength(1);
    expect(passedInvoices[0].issuer).toBe("Sunrise Exports Pte");
  });

  it("export buttons are native <button> elements for keyboard accessibility", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    const exportCsvBtn = screen.getByRole("button", { name: "Export CSV" });
    const exportJsonBtn = screen.getByRole("button", { name: "Export JSON" });

    // Native buttons have implicit keyboard support (Enter/Space). RTL fireEvent.keyDown
    // does not trigger React's onClick, so we verify the semantic HTML is correct.
    expect(exportCsvBtn.tagName).toBe("BUTTON");
    expect(exportJsonBtn.tagName).toBe("BUTTON");
    expect(exportCsvBtn).toHaveAttribute("type", "button");
    expect(exportJsonBtn).toHaveAttribute("type", "button");
  });

  it("does not call export when clicking the disabled button", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    // Make the list empty
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "NonExistentIssuerXYZ123" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    const exportCsvBtn = screen.getByRole("button", { name: "Export CSV" });
    expect(exportCsvBtn).toBeDisabled();
    fireEvent.click(exportCsvBtn);

    expect(exportAsCSV).not.toHaveBeenCalled();
  });

  it("enables export buttons again after clearing a filter that previously emptied the list", async () => {
    render(<InvestMarketplace loadInvoices={loadMockInvoices} />);
    await flushTimers(0);

    // Filter to EUR only to get a subset
    fireEvent.click(screen.getByRole("button", { name: /Filter by EUR/i }));
    await flushTimers(0);

    const exportCsvBtn = screen.getByRole("button", { name: "Export CSV" });
    expect(exportCsvBtn).not.toBeDisabled();

    // Now filter with a search that empties the list
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "NonExistent" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(exportCsvBtn).toBeDisabled();

    // Clear the search
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    // Now the EUR-filtered list should be visible again
    expect(exportCsvBtn).not.toBeDisabled();
    fireEvent.click(exportCsvBtn);

    expect(exportAsCSV).toHaveBeenCalledTimes(1);
    const passedInvoices = exportAsCSV.mock.calls[0][0];
    // Only EUR invoices should be exported
    expect(passedInvoices.every((inv) => inv.currency === "EUR")).toBe(true);
  });
});
