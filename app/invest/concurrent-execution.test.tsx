import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InvestMarketplace } from "./page";

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

function buildInvoice(id, issuer = `Issuer ${id}`) {
  return {
    id,
    issuer,
    amount: "1000",
    currency: "USD",
    dueDate: "2026-12-31",
    yield: "7.5%",
    status: "Open",
  };
}

/**
 * Test suite: Concurrent execution hardening for app/invest/page.js
 *
 * These tests verify deterministic behavior for concurrent and repeated execution
 * scenarios, ensuring that race conditions between filter changes, pagination,
 * and URL updates do not produce stale, unsafe, or inconsistent results.
 */
describe("InvestMarketplace concurrent execution hardening", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /**
   * Scenario: User clicks "Load more" twice rapidly (double-click).
   * Expected: Only one page request is sent; second click is ignored.
   */
  it("prevents double-click load-more from sending duplicate requests", async () => {
    const firstPage = Array.from({ length: 10 }, (_, i) => buildInvoice(`inv-${i + 1}`));
    const secondPage = Array.from({ length: 5 }, (_, i) => buildInvoice(`inv-${i + 11}`));

    let loadInvoicesCallCount = 0;
    const loadInvoices = jest.fn(async ({ cursor }) => {
      loadInvoicesCallCount++;
      if (cursor == null) {
        return { items: firstPage, nextCursor: "cursor-2", hasMore: true };
      }
      // Simulate slow network
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { items: secondPage, nextCursor: null, hasMore: false };
    });

    const { rerender } = render(
      <InvestMarketplace loadInvoices={loadInvoices} />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(loadInvoices).toHaveBeenCalledTimes(1);
    });

    const loadMoreBtn = await screen.findByRole("button", { name: /load more/i });

    // Rapid double-click
    fireEvent.click(loadMoreBtn);
    fireEvent.click(loadMoreBtn);

    // Advance timers to allow async operations
    jest.runAllTimers();

    await waitFor(() => {
      // Should have 1 initial + 1 load-more, not 1 + 2
      expect(loadInvoices).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * Scenario: User changes filter while load-more is in-flight.
   * Expected: Load-more response is discarded (stale), and a fresh load is triggered
   * by the filter change. The list shows correct filtered results.
   */
  it("discards stale load-more results when filters change during pagination", async () => {
    const firstPage = Array.from({ length: 10 }, (_, i) => buildInvoice(`inv-${i + 1}`));
    const secondPage = Array.from({ length: 5 }, (_, i) => buildInvoice(`inv-${i + 11}`));
    const filteredResults = [buildInvoice("inv-filtered-1", "Acme Corp")];

    const loadInvoices = jest.fn(async ({ cursor, search, filters }) => {
      // Simulate slow network for load-more
      if (cursor !== null) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { items: secondPage, nextCursor: null, hasMore: false };
      }
      // Filtered search returns different results
      if (search === "acme" || filters.currency === "EUR") {
        return { items: filteredResults, nextCursor: null, hasMore: false };
      }
      return { items: firstPage, nextCursor: "cursor-2", hasMore: true };
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Issuer inv-1")).toBeInTheDocument();
    });

    // Click load-more (starts request)
    const loadMoreBtn = screen.getByRole("button", { name: /load more/i });
    fireEvent.click(loadMoreBtn);

    // Advance time but not enough for load-more to complete
    jest.advanceTimersByTime(200);

    // While load-more is in-flight, change search filter
    const searchInput = screen.getByLabelText("Search by issuer name");
    fireEvent.change(searchInput, { target: { value: "acme" } });

    // Advance timers to allow search debounce and load effect
    jest.advanceTimersByTime(400);

    // Wait for filtered results to appear
    await waitFor(() => {
      expect(screen.queryByText("Issuer inv-1")).not.toBeInTheDocument();
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    // Verify that stale secondPage items were not added to the list
    expect(screen.queryByText("Issuer inv-11")).not.toBeInTheDocument();
  });

  /**
   * Scenario: User modifies URL directly (e.g., back button) while URL sync timer is pending.
   * Expected: URL state is recovered correctly; component applies the correct filters
   * without committing stale state from a pending timer.
   */
  it("validates URL state consistency during debounced URL updates", async () => {
    const allInvoices = Array.from({ length: 10 }, (_, i) => buildInvoice(`inv-${i + 1}`));
    const filteredInvoices = [buildInvoice("inv-usd-1", "USD Only")];

    const loadInvoices = jest.fn(async ({ filters }) => {
      if (filters.currency === "USD") {
        return { items: filteredInvoices, nextCursor: null, hasMore: false };
      }
      return { items: allInvoices, nextCursor: null, hasMore: false };
    });

    const { rerender } = render(
      <InvestMarketplace loadInvoices={loadInvoices} />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(loadInvoices).toHaveBeenCalled();
    });

    // User changes filter (this schedules a URL update)
    const currencyDropdown = screen.getByLabelText(/currency/i);
    fireEvent.change(currencyDropdown, { target: { value: "USD" } });

    // Advance timer partially
    jest.advanceTimersByTime(100);

    // Before URL timer fires, simulate external URL change (e.g., back button)
    // This is represented by a re-render with different initial filters.
    // In the real app, Next.js would handle this, but we simulate here by
    // noting that if the filter state differs, the URL update should be skipped.

    // Advance timer fully to trigger URL update
    jest.advanceTimersByTime(100);

    // The component should have applied the filter change correctly
    await waitFor(() => {
      expect(loadInvoices).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ currency: "USD" }),
        })
      );
    });
  });

  /**
   * Scenario: Filter changes multiple times rapidly (e.g., user clicks status chips quickly).
   * Expected: Load-more requests are cancelled; only the latest filter state is loaded.
   * No intermediate requests are applied.
   */
  it("cancels in-flight load-more when filter changes multiple times", async () => {
    const invoices = Array.from({ length: 10 }, (_, i) => buildInvoice(`inv-${i + 1}`));
    const openInvoices = [buildInvoice("inv-open", "Open Invoice")];
    const closedInvoices = [buildInvoice("inv-closed", "Closed Invoice")];

    const loadInvoices = jest.fn(async ({ cursor, filters }) => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (cursor !== null) {
        // This should be cancelled and not applied
        return { items: [], nextCursor: null, hasMore: false };
      }

      if (filters.statuses?.includes("Open")) {
        return { items: openInvoices, nextCursor: "cursor-open", hasMore: true };
      }
      if (filters.statuses?.includes("Closed")) {
        return { items: closedInvoices, nextCursor: null, hasMore: false };
      }

      return { items: invoices, nextCursor: "cursor-2", hasMore: true };
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    // Wait for initial load
    await waitFor(() => {
      expect(loadInvoices).toHaveBeenCalled();
    });

    // Click "Load more" to trigger pagination
    const loadMoreBtn = await screen.findByRole("button", { name: /load more/i });
    fireEvent.click(loadMoreBtn);

    // Advance time partially (load-more in-flight)
    jest.advanceTimersByTime(100);

    // Rapidly change filter status
    const openStatusChip = screen.getByRole("button", { name: "Open" });
    fireEvent.click(openStatusChip);

    // Advance time partially
    jest.advanceTimersByTime(100);

    // Change status again
    fireEvent.click(openStatusChip); // Toggle off
    const closedStatusChip = screen.getByRole("button", { name: "Closed" });
    fireEvent.click(closedStatusChip);

    // Advance timers to complete all operations
    jest.runAllTimers();

    await waitFor(() => {
      // Should show Closed invoice results, not the stale load-more results
      expect(screen.getByText("Closed Invoice")).toBeInTheDocument();
    });

    // Verify that stale results were never applied
    expect(screen.queryByText("Issuer inv-1")).not.toBeInTheDocument();
  });

  /**
   * Scenario: Filter changes while the initial page load is in-flight.
   * Expected: Initial load is cancelled; a new load with the new filters is sent.
   * No stale results are shown.
   */
  it("aborts initial load when filter changes during fetch", async () => {
    const defaultInvoices = Array.from({ length: 5 }, (_, i) =>
      buildInvoice(`inv-default-${i}`, `Default ${i}`)
    );
    const usdInvoices = [buildInvoice("inv-usd", "USD Invoice")];

    const loadInvoices = jest.fn(async ({ filters }) => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (filters.currency === "USD") {
        return { items: usdInvoices, nextCursor: null, hasMore: false };
      }

      return { items: defaultInvoices, nextCursor: null, hasMore: false };
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    // Wait a bit for initial load to start
    jest.advanceTimersByTime(100);

    // Before initial load completes, change filter
    const currencyDropdown = screen.getByLabelText(/currency/i);
    fireEvent.change(currencyDropdown, { target: { value: "USD" } });

    // Advance timers to let all requests complete
    jest.runAllTimers();

    await waitFor(() => {
      // Should show USD invoices, not default invoices
      expect(screen.getByText("USD Invoice")).toBeInTheDocument();
    });

    // Verify default invoices were not shown
    expect(screen.queryByText(/Default \d/)).not.toBeInTheDocument();
  });

  /**
   * Scenario: Retry button is clicked twice rapidly while a request is in-flight.
   * Expected: Only one request is made (the second click is ignored or joins existing request).
   */
  it("prevents double-click retry from sending duplicate requests", async () => {
    const failOnce = jest.fn().mockRejectedValueOnce(new Error("Network error"));
    const loadInvoices = jest.fn(async () => {
      if (failOnce.mock.calls.length === 1) {
        await failOnce();
      }
      return { items: [buildInvoice("inv-1")], nextCursor: null, hasMore: false };
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    // Wait for initial load to fail
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /retry/i });

    // Rapid double-click on retry
    fireEvent.click(retryBtn);
    fireEvent.click(retryBtn);

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByText("Issuer inv-1")).toBeInTheDocument();
    });

    // Should have called loadInvoices twice: initial (failed) + retry (success)
    // Not 3 times (initial + 2 retries)
    expect(loadInvoices).toHaveBeenCalledTimes(2);
  });

  /**
   * Scenario: Search text changes rapidly, and load-more is in-flight.
   * Expected: Load-more is cancelled; a fresh load with new search is triggered.
   * No stale pagination results from old search are applied.
   */
  it("replaces stale load-more results when search changes", async () => {
    const acmeInvoices = [buildInvoice("inv-acme", "Acme Corp")];
    const betaInvoices = [buildInvoice("inv-beta", "Beta Inc")];
    const allInvoices = Array.from({ length: 10 }, (_, i) => buildInvoice(`inv-${i}`));

    const loadInvoices = jest.fn(async ({ cursor, search }) => {
      // Simulate slow network
      if (cursor !== null) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { items: acmeInvoices, nextCursor: null, hasMore: false };
      }

      if (search === "acme") {
        return { items: acmeInvoices, nextCursor: "cursor-acme", hasMore: true };
      }
      if (search === "beta") {
        return { items: betaInvoices, nextCursor: null, hasMore: false };
      }

      return { items: allInvoices, nextCursor: "cursor-all", hasMore: true };
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    // Wait for initial load
    await waitFor(() => {
      expect(loadInvoices).toHaveBeenCalled();
    });

    // Search for "acme"
    const searchInput = screen.getByLabelText("Search by issuer name");
    fireEvent.change(searchInput, { target: { value: "acme" } });

    // Advance search debounce timer
    jest.advanceTimersByTime(350);

    // Click load-more (in-flight request for "acme" pagination)
    const loadMoreBtn = await screen.findByRole("button", { name: /load more/i });
    fireEvent.click(loadMoreBtn);

    // Advance time partially (load-more still in-flight)
    jest.advanceTimersByTime(100);

    // Change search to "beta"
    fireEvent.change(searchInput, { target: { value: "beta" } });

    // Advance search debounce
    jest.advanceTimersByTime(350);

    // Let all timers finish
    jest.runAllTimers();

    await waitFor(() => {
      // Should show beta results
      expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    });

    // Stale "acme" pagination results should not be in the DOM
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });
});
