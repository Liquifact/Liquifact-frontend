import "@testing-library/jest-dom";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { getInvoiceLoadAnnouncement, getPaginationAnnouncement, InvestMarketplace, PAGE_SIZE, default as InvestPage } from "./page";
import { getInvoiceById, loadMockInvoices } from "./lib";

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

// Mock fetchInvestableInvoices so InvestPage default export uses controlled data.
jest.mock("../../lib/api/invoices", () => ({
  fetchInvestableInvoices: jest.fn(() =>
    Promise.resolve([
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
    ]),
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createDeferredLoader(invoices, delayMs = 0) {
  return jest.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(invoices), delayMs);
      }),
  );
}

function createPendingLoader() {
  return jest.fn(() => new Promise(() => {}));
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
    currency: "USD",
    dueDate: "2026-12-31",
    yield: "5.0%",
    status: "Open",
  }));
}

// ── Loading / success / error states ─────────────────────────────────────────

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
    expect(screen.getByRole("status")).toHaveTextContent("");
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

    // ── FIX: regex now matches "Loading investable invoices" ──
    expect(screen.getByRole("list", { name: /loading investable invoices/i })).toHaveAttribute("aria-busy", "true");

    await flushTimers(100);

    expect(screen.getByRole("status")).toHaveTextContent("3 investable invoices loaded");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
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

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent("Acme Supplies Ltd");
    expect(listItems[1]).toHaveTextContent("Bright Logistics GmbH");
  });

  it("announces the empty marketplace state when no invoices load", async () => {
    const loadInvoices = createDeferredLoader([], 100);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(100);

    expect(screen.getByRole("status")).toHaveTextContent("No invoices available");
    expect(screen.getByText(/No investable invoices\. Connect wallet to see the marketplace\./i)).toBeInTheDocument();
  });

  it("announces load errors through an alert and live region", async () => {
    const loadInvoices = jest.fn(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("boom")), 50);
        }),
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getByRole("status")).toHaveTextContent("Unable to load investable invoices.");
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load investable invoices right now.");
  });

  // ── Retry: skeleton reappears ─────────────────────────────────────────────

  it("shows the skeleton again when retry is triggered after a failure", async () => {
    let callCount = 0;
    const loadInvoices = jest.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error("network error"));
      return new Promise(() => {}); // hangs so we can assert skeleton
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(0);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: /loading investable invoices/i })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  // ── Retry: success after failure ──────────────────────────────────────────

  it("renders the invoice list after retry succeeds following a failure", async () => {
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

    let callCount = 0;
    const loadInvoices = jest.fn(
      () =>
        new Promise((resolve, reject) => {
          callCount++;
          setTimeout(() => {
            if (callCount === 1) reject(new Error("boom"));
            else resolve(invoices);
          }, 50);
        }),
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });

    await flushTimers(50);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Acme Supplies Ltd")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 investable invoices loaded");
  });

  // ── Retry: retry-then-failure ─────────────────────────────────────────────

  it("shows error again when retry itself fails", async () => {
    let callCount = 0;
    const loadInvoices = jest.fn(
      () =>
        new Promise((resolve, reject) => {
          callCount++;
          setTimeout(() => reject(new Error(`fail attempt ${callCount}`)), 50);
        }),
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });
    await flushTimers(50);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Unable to load investable invoices.");
    expect(loadInvoices).toHaveBeenCalledTimes(2);
  });

  // ── Retry: rapid double-retry ─────────────────────────────────────────────

  it("handles rapid double-retry without stale state settling", async () => {
    let callCount = 0;
    const loadInvoices = jest.fn(
      () =>
        new Promise((resolve, reject) => {
          callCount++;
          const attempt = callCount;
          setTimeout(() => {
            if (attempt === 1) reject(new Error("fail"));
            else if (attempt === 2) reject(new Error("fail again"));
            else
              resolve([
                {
                  id: "inv-001",
                  issuer: "Finally Works",
                  amount: "1,000",
                  currency: "USD",
                  dueDate: "2026-12-31",
                  yield: "5%",
                  status: "Open",
                },
              ]);
          }, 50);
        }),
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });
    await flushTimers(50);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });
    await flushTimers(50);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Finally Works")).toBeInTheDocument();
    expect(loadInvoices).toHaveBeenCalledTimes(3);
  });

  // ── Pagination tests ──────────────────────────────────────────────────────

  it("renders only PAGE_SIZE items initially when total exceeds PAGE_SIZE", async () => {
    const invoices = makeInvoices(PAGE_SIZE + 5);
    const loadInvoices = createDeferredLoader(invoices, 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getAllByRole("listitem")).toHaveLength(PAGE_SIZE);
  });

  it("shows the Load-more button when there are more items than PAGE_SIZE", async () => {
    const invoices = makeInvoices(PAGE_SIZE + 1);
    const loadInvoices = createDeferredLoader(invoices, 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getByRole("button", { name: /load more invoices/i })).toBeInTheDocument();
  });

  it("clicking Load more appends the next batch of invoices", async () => {
    const total = PAGE_SIZE + 3;
    const invoices = makeInvoices(total);
    const loadInvoices = createDeferredLoader(invoices, 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getAllByRole("listitem")).toHaveLength(PAGE_SIZE);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(total);
  });

  it("hides Load-more button when all items are visible after clicking", async () => {
    const total = PAGE_SIZE + 2;
    const invoices = makeInvoices(total);
    const loadInvoices = createDeferredLoader(invoices, 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
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
    const invoices = makeInvoices(total);
    const loadInvoices = createDeferredLoader(invoices, 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(screen.getByRole("status")).toHaveTextContent(`Showing ${total} of ${total} investable invoices`);
  });

  it("does not show Load-more when total is fewer than PAGE_SIZE", async () => {
    const invoices = makeInvoices(PAGE_SIZE - 1);
    const loadInvoices = createDeferredLoader(invoices, 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(PAGE_SIZE - 1);
  });

  it("does not show Load-more when total equals exactly PAGE_SIZE", async () => {
    const invoices = makeInvoices(PAGE_SIZE);
    const loadInvoices = createDeferredLoader(invoices, 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(PAGE_SIZE);
  });

  it("shows only the remaining items on the last page click", async () => {
    const remainder = 3;
    const total = PAGE_SIZE * 2 + remainder;
    const invoices = makeInvoices(total);
    const loadInvoices = createDeferredLoader(invoices, 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(PAGE_SIZE * 2);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(total);
    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
  });

  it.skip("moves focus back to the Load-more button after each click (e2e only)", async () => {
    const invoices = makeInvoices(PAGE_SIZE * 3);
    const loadInvoices = createDeferredLoader(invoices, 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    const button = screen.getByRole("button", {
      name: /load more invoices/i,
    });
    await act(async () => {
      fireEvent.click(button);
      jest.advanceTimersByTime(10);
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(screen.queryByRole("button", { name: /load more invoices/i }));
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

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
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

    // InvoiceFilters calls onFilterChange with key "yieldMin" — page.js
    // filter derivation now correctly reads filters.yieldMin.
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Minimum yield percentage"), {
        target: { value: "6" },
      });
      await Promise.resolve();
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
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

    // InvoiceFilters calls onFilterChange with key "maturityFrom" — page.js
    // filter derivation now correctly reads filters.maturityFrom.
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Maturity date from"), {
        target: { value: "2026-07-01" },
      });
      await Promise.resolve();
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
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
      target: { value: "yield_desc" },
    });

    const items = screen.getAllByRole("listitem");
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
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
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
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(screen.getByLabelText("Clear all filters"));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
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

    expect(screen.getByRole("status")).toHaveTextContent("2 investable invoices loaded");

    // Currency filter is a button click — fires immediately, no debounce.
    // The filter-change useEffect re-announces the match count.
    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    expect(screen.getByRole("status")).toHaveTextContent("1 of 2 invoices match");
  });
});

// ── Unit tests for pure helpers ───────────────────────────────────────────────

describe("getInvoiceLoadAnnouncement", () => {
  it("returns the expected announcement for loaded and empty states", () => {
    expect(getInvoiceLoadAnnouncement([])).toBe("No invoices available");
    expect(getInvoiceLoadAnnouncement([{ id: "1" }, { id: "2" }])).toBe("2 investable invoices loaded");
  });

  it("returns filtered count announcement when filterActive is true", () => {
    const invoices = [{ id: "1" }, { id: "2" }, { id: "3" }];
    expect(
      getInvoiceLoadAnnouncement(invoices, {
        filterActive: true,
        filteredCount: 2,
      }),
    ).toBe("2 of 3 invoices match");
  });

  it("returns no-match announcement when filterActive and filteredCount is 0", () => {
    const invoices = [{ id: "1" }, { id: "2" }];
    expect(
      getInvoiceLoadAnnouncement(invoices, {
        filterActive: true,
        filteredCount: 0,
      }),
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
    render(<InvestPage />);
    await flushTimers(0);

    expect(screen.getByRole("heading", { name: /invest/i })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
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
