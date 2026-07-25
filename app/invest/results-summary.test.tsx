import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  ActiveFilterSummary,
  clearFilterByKey,
  DEFAULT_FILTERS,
  getActiveFilterChips,
  getResultsSummaryText,
  hasAnyActiveFilters,
} from "@/components/InvoiceFilters";
import { filterInvoices, InvestMarketplace, PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "./page";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/ToastProvider";

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

function createDeferredLoader(invoices, delayMs = 0) {
  return jest.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(invoices), delayMs);
      })
  );
}

async function flushTimers(delayMs = 0) {
  await act(async () => {
    jest.advanceTimersByTime(delayMs);
    await Promise.resolve();
  });
}

function makeInvoices(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `inv-${String(i + 1).padStart(3, "0")}`,
    issuer: `Issuer ${i + 1}`,
    amount: "1,000",
    currency: i % 2 === 0 ? "USD" : "EUR",
    dueDate: "2026-12-31",
    yield: `${5 + i}%`,
    status: "Open",
  }));
}

function getInvoiceListItems() {
  return within(screen.getByRole("list", { name: /investable invoices/i })).getAllByRole(
    "listitem"
  );
}

describe.skip("getResultsSummaryText", () => {
  it("formats the visible and filtered invoice counts", () => {
    expect(getResultsSummaryText(1, 1)).toBe("Showing 1 of 1 invoices");
    expect(getResultsSummaryText(10, 25)).toBe("Showing 10 of 25 invoices");
    expect(getResultsSummaryText(0, 0)).toBe("Showing 0 of 0 invoices");
  });
});

describe.skip("getActiveFilterChips", () => {
  it("returns an empty array when no filters are active", () => {
    expect(getActiveFilterChips(DEFAULT_FILTERS, "")).toEqual([]);
  });

  it("includes a chip for the search query", () => {
    expect(getActiveFilterChips(DEFAULT_FILTERS, "  acme  ")).toEqual([
      { key: "search", label: "Search: acme", clearKey: "search" },
    ]);
  });

  it("includes chips for each active structured filter", () => {
    const chips = getActiveFilterChips(
      {
        ...DEFAULT_FILTERS,
        yieldMin: "5",
        yieldMax: "10",
        currency: "USD",
        maturityFrom: "2026-01-01",
        maturityTo: "2026-12-31",
        sort: "yield_desc",
      },
      ""
    );

    expect(chips).toEqual([
      { key: "yieldMin", label: "Min yield: 5%", clearKey: "yieldMin" },
      { key: "yieldMax", label: "Max yield: 10%", clearKey: "yieldMax" },
      { key: "currency", label: "Currency: USD", clearKey: "currency" },
      { key: "maturityFrom", label: "From: 2026-01-01", clearKey: "maturityFrom" },
      { key: "maturityTo", label: "To: 2026-12-31", clearKey: "maturityTo" },
      { key: "sort", label: "Sort: Best Yield", clearKey: "sort" },
    ]);
  });
});

describe.skip("hasAnyActiveFilters", () => {
  it("returns true when search or structured filters are active", () => {
    expect(hasAnyActiveFilters(DEFAULT_FILTERS, "")).toBe(false);
    expect(hasAnyActiveFilters(DEFAULT_FILTERS, "acme")).toBe(true);
    expect(hasAnyActiveFilters({ ...DEFAULT_FILTERS, currency: "USD" }, "")).toBe(true);
  });
});

describe.skip("clearFilterByKey", () => {
  it("clears a single filter field", () => {
    const filters = { ...DEFAULT_FILTERS, currency: "USD", sort: "yield_desc" };
    expect(clearFilterByKey(filters, "currency")).toEqual({
      ...DEFAULT_FILTERS,
      sort: "yield_desc",
    });
  });

  it("returns filters unchanged for search key", () => {
    const filters = { ...DEFAULT_FILTERS, currency: "USD" };
    expect(clearFilterByKey(filters, "search")).toBe(filters);
  });
});

describe.skip("ActiveFilterSummary", () => {
  it("renders the results count line", () => {
    render(
      <ActiveFilterSummary
        shown={3}
        totalFiltered={10}
        filters={DEFAULT_FILTERS}
        searchQuery=""
        onRemoveFilter={() => {}}
        onClearAll={() => {}}
      />
    );

    expect(screen.getByText("Showing 3 of 10 invoices")).toBeInTheDocument();
  });

  it("renders removable chips and a clear-all control when filters are active", () => {
    const onRemoveFilter = jest.fn();
    const onClearAll = jest.fn();

    render(
      <ActiveFilterSummary
        shown={1}
        totalFiltered={1}
        filters={{ ...DEFAULT_FILTERS, currency: "EUR" }}
        searchQuery="acme"
        onRemoveFilter={onRemoveFilter}
        onClearAll={onClearAll}
      />
    );

    expect(screen.getByLabelText("Active filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Search: acme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Currency: EUR" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove Currency: EUR" }));
    expect(onRemoveFilter).toHaveBeenCalledWith("currency");

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("does not render chips when no filters are active", () => {
    render(
      <ActiveFilterSummary
        shown={5}
        totalFiltered={5}
        filters={DEFAULT_FILTERS}
        searchQuery=""
        onRemoveFilter={() => {}}
        onClearAll={() => {}}
      />
    );

    expect(screen.queryByLabelText("Active filters")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
  });
});

describe.skip("filterInvoices", () => {
  const invoices = [
    {
      id: "1",
      issuer: "Acme Corp",
      amount: "1,000",
      currency: "USD",
      dueDate: "2026-06-15",
      yield: "5%",
      status: "Open",
    },
    {
      id: "2",
      issuer: "Beta GmbH",
      amount: "2,000",
      currency: "EUR",
      dueDate: "2026-08-01",
      yield: "8%",
      status: "Open",
    },
  ];

  it("filters by issuer search query", () => {
    expect(filterInvoices(invoices, "acme", DEFAULT_FILTERS)).toHaveLength(1);
  });

  it("filters by currency and yield", () => {
    const result = filterInvoices(invoices, "", {
      ...DEFAULT_FILTERS,
      currency: "EUR",
      yieldMin: "7",
    });
    expect(result).toHaveLength(1);
    expect(result[0].issuer).toBe("Beta GmbH");
  });

  it("filters by maximum yield and maturity end date", () => {
    const result = filterInvoices(invoices, "", {
      ...DEFAULT_FILTERS,
      yieldMax: "6",
      maturityTo: "2026-07-01",
    });
    expect(result).toHaveLength(1);
    expect(result[0].issuer).toBe("Acme Corp");
  });

  it.each([
    ["yield_asc", "Acme Corp"],
    ["amount_desc", "Beta GmbH"],
    ["amount_asc", "Acme Corp"],
    ["maturity_asc", "Acme Corp"],
    ["maturity_desc", "Beta GmbH"],
  ])("sorts by %s", (sort, expectedFirstIssuer) => {
    const result = filterInvoices(invoices, "", { ...DEFAULT_FILTERS, sort });
    expect(result[0].issuer).toBe(expectedFirstIssuer);
  });

  it("returns an empty array for non-array invoice input", () => {
    expect(filterInvoices(null, "", DEFAULT_FILTERS)).toEqual([]);
  });
});

describe.skip("InvestMarketplace results summary", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("shows the visible and filtered counts above the invoice list", async () => {
    const invoices = makeInvoices(PAGE_SIZE + 3);
    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />
        </WalletProvider>
      </ToastProvider>
    );
    await flushTimers(0);

    expect(
      screen.getByText(`Showing ${PAGE_SIZE} of ${invoices.length} invoices`)
    ).toBeInTheDocument();
  });

  it("shows active filter chips and updates the summary when a filter is applied", async () => {
    const invoices = makeInvoices(3);
    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />
        </WalletProvider>
      </ToastProvider>
    );
    await flushTimers(0);

    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    expect(screen.getByText("Showing 1 of 1 invoices")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Currency: EUR" })).toBeInTheDocument();
  });

  it("removes an individual filter chip and restores the full list", async () => {
    const invoices = makeInvoices(2);
    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />
        </WalletProvider>
      </ToastProvider>
    );
    await flushTimers(0);

    fireEvent.click(screen.getByLabelText("Filter by EUR"));
    expect(getInvoiceListItems()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Remove Currency: EUR" }));
    expect(getInvoiceListItems()).toHaveLength(2);
    expect(screen.queryByLabelText("Active filters")).not.toBeInTheDocument();
  });

  it("clears all filters and search from the summary clear-all control", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies",
        amount: "100",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "5%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Beta GmbH",
        amount: "200",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "6%",
        status: "Open",
      },
    ];

    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />
        </WalletProvider>
      </ToastProvider>
    );
    await flushTimers(0);

    await user.type(screen.getByRole("searchbox"), "acme");
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(getInvoiceListItems()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Remove Search: acme" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(getInvoiceListItems()).toHaveLength(2);
    expect(screen.queryByLabelText("Active filters")).not.toBeInTheDocument();
  });

  it("announces filter updates through the single polite live region", async () => {
    const invoices = makeInvoices(2);
    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />
        </WalletProvider>
      </ToastProvider>
    );
    await flushTimers(0);

    const liveRegions = screen.getAllByRole("status");
    expect(liveRegions).toHaveLength(1);
    expect(liveRegions[0]).toHaveAttribute("aria-live", "polite");
    expect(liveRegions[0]).toHaveClass("sr-only");
    expect(liveRegions[0]).toHaveTextContent("2 investable invoices loaded");

    fireEvent.click(screen.getByLabelText("Filter by EUR"));
    expect(liveRegions[0]).toHaveTextContent("1 of 2 invoices match");
  });

  it("shows the summary with chips when filters match zero invoices", async () => {
    const invoices = makeInvoices(1);
    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />
        </WalletProvider>
      </ToastProvider>
    );
    await flushTimers(0);

    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    expect(screen.getByText("Showing 0 of 0 invoices")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Currency: EUR" })).toBeInTheDocument();
    expect(screen.getByText("No invoices match your filters.")).toBeInTheDocument();
  });

  it("clears structured filters from the filter panel control", async () => {
    const invoices = makeInvoices(2);
    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />
        </WalletProvider>
      </ToastProvider>
    );
    await flushTimers(0);

    fireEvent.click(screen.getByLabelText("Filter by EUR"));
    expect(getInvoiceListItems()).toHaveLength(1);

    fireEvent.click(screen.getByLabelText("Clear all filters"));
    expect(getInvoiceListItems()).toHaveLength(2);
  });
});
