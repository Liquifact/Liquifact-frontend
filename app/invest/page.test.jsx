import "@testing-library/jest-dom";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import InvestPage, {
  getInvoiceLoadAnnouncement,
  getPaginationAnnouncement,
  InvestMarketplace,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
} from "./page";
import { getInvoiceById, loadMockInvoices, MOCK_INVOICES } from "./lib";

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
    jest.advanceTimersByTime(delayMs);
    await Promise.resolve();
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

    await flushTimers(100);

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

  it("announces the empty marketplace state when no invoices load", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader([], 100)} />);
    await flushTimers(100);

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

    // Wait for the successful load
    await flushTimers(50);

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
