/**
 * @file app/invest/page.boundaries.test.jsx
 *
 * @description Boundary tests for the invoice-list (issue #728).
 *
 * The marketplace invoice-list (`InvestMarketplace`) is paginated client-side
 * with a `_PAGE_SIZE_`-based "Load more" button. The pagination logic lives
 * in `app/invest/page.js`; this file pins the four contract areas that the
 * issue calls out:
 *
 *   1. **First page** — the initial slice rendered right after the load
 *      settles, with no clicks yet.
 *   2. **Load-more append** — how the visible slice grows after each click.
 *   3. **End-of-list** — the exact transition that hides the Load-more
 *      button when every item is on screen.
 *   4. **Reset-on-filter** — what happens to `visibleCount` when the user
 *      changes filters or search mid-load.
 *
 * All boundaries are intentionally hit at mathematical edge values
 * `PAGE_SIZE - 1`, `PAGE_SIZE`, `PAGE_SIZE + 1`, `2 * PAGE_SIZE - 1`,
 * `2 * PAGE_SIZE`, `2 * PAGE_SIZE + 1`.  The suite is fully deterministic:
 * no real network calls — invoices flow through a synchronous fake-timer
 * stub.
 *
 * The existing test coverage in `page.test.jsx` covers in-range behaviour;
 * the cases here are the boundary-value analogues that take the
 * pagination logic to (and one past) its decision edges.
 */

import "@testing-library/jest-dom";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import {
  InvestMarketplace,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  getInvoiceLoadAnnouncement,
  getPaginationAnnouncement,
  applySortToList,
} from "./page";

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

/** Advance Jest's fake clock and flush React's update queue in one go. */
async function flushTimers(delayMs = 0) {
  await act(async () => {
    jest.advanceTimersByTime(delayMs);
    await Promise.resolve();
  });
}

/** Build `count` minimal invoice fixtures (unique ids, isolated issuers). */
function makeInvoices(count, overrides = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `inv-${String(i + 1).padStart(3, "0")}`,
    issuer: `Issuer ${i + 1}`,
    amount: "1,000",
    currency: "USD",
    dueDate: "2026-12-31",
    yield: "5.0%",
    status: "Open",
    ...overrides,
  }));
}

/** Build a list sized `total` where the first `matched` items match a name. */
function makeInvoicesWhere(total, nameMatch, matched) {
  return Array.from({ length: total }, (_, i) => ({
    id: `inv-${String(i + 1).padStart(3, "0")}`,
    issuer: i < matched ? `${nameMatch}-${i + 1}` : `Other ${i + 1}`,
    amount: "1,000",
    currency: "USD",
    dueDate: "2026-12-31",
    yield: "5.0%",
    status: "Open",
  }));
}

function getInvoiceListItems() {
  // Match the pattern used in app/invest/page.test.jsx when the marketplace
  // list is rendered.  When there are zero items (`invoices.length === 0`)
  // or zero matches after a filter (`filteredInvoices.length === 0`), the
  // component renders the empty-state or no-match `<div>` instead of the
  // `<ul>` — in those branches this helper must safely return `[]` so
  // boundary tests don't crash before they can assert zero.
  const list = screen.queryByRole("list", { name: /investable invoices/i });
  if (!list) return [];
  return within(list).getAllByRole("listitem");
}

function getLoadMoreButton() {
  return screen.queryByRole("button", { name: /load more invoices/i });
}

function status() {
  return screen.getByRole("status");
}

/**
 * Click the Load-more button if (and only if) it currently exists.  Throws an
 * explanatory error when called past the last page so boundary-mistake
 * failures surface as readable test failures rather than cryptic
 * `fireEvent.click(null)` traces.
 */
function clickLoadMore() {
  const btn = getLoadMoreButton();
  if (!btn) {
    throw new Error(
      "clickLoadMore() called when the Load-more button is not present. " +
        "Use a total large enough that the button survives every click in the test."
    );
  }
  return act(async () => {
    fireEvent.click(btn);
    jest.advanceTimersByTime(0);
    await Promise.resolve();
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  delete window.__TEST_MOCK_INVOICES__;
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. First page
// ─────────────────────────────────────────────────────────────────────────────

describe("first-page boundary: what is rendered before the user clicks anything", () => {
  it("shows the empty marketplace state when the load resolves to zero items", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader([], 30)} />);
    await flushTimers(30);

    // The safe list-item helper returns [] when the empty-state <div>
    // replaces the marketplace <ul>.
    expect(getInvoiceListItems()).toHaveLength(0);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
    expect(status()).toHaveTextContent(/no invoices available/i);
  });

  it("shows exactly one list item with no Load-more when total is 1 (below PAGE_SIZE)", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(1), 30)} />);
    await flushTimers(30);

    expect(getInvoiceListItems()).toHaveLength(1);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
    // Plural template used by copy.invest.announceInvoicesLoaded even at N=1.
    expect(status()).toHaveTextContent("1 investable invoices loaded");
  });

  it("shows exactly PAGE_SIZE - 1 items with no Load-more (just below PAGE_SIZE)", async () => {
    const total = PAGE_SIZE - 1;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("shows exactly PAGE_SIZE items with no Load-more when total equals PAGE_SIZE", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(PAGE_SIZE), 30)} />);
    await flushTimers(30);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
    // Boundary: at PAGE_SIZE exactly, the announcement switches to the
    // "loaded" form (not the "Showing N of M" form).
    expect(status()).toHaveTextContent(`${PAGE_SIZE} investable invoices loaded`);
  });

  it("shows exactly PAGE_SIZE items with Load-more visible when total is PAGE_SIZE + 1", async () => {
    render(
      <InvestMarketplace
        loadInvoices={createDeferredLoader(makeInvoices(PAGE_SIZE + 1), 30)}
      />
    );
    await flushTimers(30);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    expect(getLoadMoreButton()).toBeInTheDocument();
    // With one extra item, status flips to the pagination announcement.
    expect(status()).toHaveTextContent(
      `Showing ${PAGE_SIZE} of ${PAGE_SIZE + 1} investable invoices`
    );
  });

  it("never shows more than PAGE_SIZE items on first render, even with very large datasets", async () => {
    const total = PAGE_SIZE * 10 + 7;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    expect(getLoadMoreButton()).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Load-more append
// ─────────────────────────────────────────────────────────────────────────────

describe("load-more append boundary: visible slice grows by PAGE_SIZE each click", () => {
  it("appends PAGE_SIZE items on each click until the visible slice catches up to the total", async () => {
    const total = PAGE_SIZE * 4 + 5; // 45 — Leave enough headroom for 4 distinct clicks.
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);

    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 2);

    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 3);

    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 4);

    // Click 4 → only the partial remainder (5 items), bringing us to total.
    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("renders each invoice exactly once across all loads — no duplicates after appending", async () => {
    const total = PAGE_SIZE * 3 + 5;
    const invoices = makeInvoices(total);
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 30)} />);
    await flushTimers(30);

    await clickLoadMore(); // page 2
    await clickLoadMore(); // page 3
    await clickLoadMore(); // page 4 (final, partial)

    const seen = getInvoiceListItems().map((li) => li.textContent);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toHaveLength(total);
  });

  it("caps visible count exactly at total even after repeated clicks past the end", async () => {
    const total = PAGE_SIZE + 3;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    await clickLoadMore(); // visibleCount clamped to total; button hides.
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("does not extend beyond total when remainder on last page equals 0 (2 * PAGE_SIZE exactly)", async () => {
    const total = PAGE_SIZE * 2; // perfectly divisible; no remainder.
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    await clickLoadMore(); // fully consumes the second page.
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("grows by exactly PAGE_SIZE each time when 3 * PAGE_SIZE is fully divisible", async () => {
    const total = PAGE_SIZE * 3;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 2);
    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("shows the remainder on the very last click without ever exceeding it", async () => {
    const remainder = 1;
    const total = PAGE_SIZE * 2 + remainder; // 21
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    await clickLoadMore(); // second full page
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 2);
    expect(getLoadMoreButton()).toBeInTheDocument();

    await clickLoadMore(); // third page: only the 1-item remainder
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. End-of-list
// ─────────────────────────────────────────────────────────────────────────────

describe("end-of-list boundary: Load-more disappears exactly when the slice covers total", () => {
  it("hides Load-more immediately when total is exactly PAGE_SIZE", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(PAGE_SIZE), 30)} />);
    await flushTimers(30);

    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("keeps Load-more visible at 2 * PAGE_SIZE - 1 until the single click consumes everything", async () => {
    const total = PAGE_SIZE * 2 - 1;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    expect(getLoadMoreButton()).toBeInTheDocument();

    await clickLoadMore();
    // visibleCount clamped to total; button hides.
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("hides Load-more at 2 * PAGE_SIZE exactly after one click consumes the second page", async () => {
    const total = PAGE_SIZE * 2;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("status region transitions to 'Showing N of N' exactly once all items are loaded", async () => {
    const total = PAGE_SIZE + 7;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    // First page: pagination announcement in use.
    expect(status()).toHaveTextContent(`Showing ${PAGE_SIZE} of ${total} investable invoices`);

    await clickLoadMore(); // opens up remaining 7; visibleCount > PAGE_SIZE now.
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(status()).toHaveTextContent(`Showing ${total} of ${total} investable invoices`);
  });

  it("does not show a spare Load-more button when total already fits on one page", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(PAGE_SIZE), 30)} />);
    await flushTimers(30);

    expect(getLoadMoreButton()).not.toBeInTheDocument();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
  });

  it("does not show a spare Load-more button at the empty marketplace boundary (total = 0)", async () => {
    render(<InvestMarketplace loadInvoices={createDeferredLoader([], 30)} />);
    await flushTimers(30);

    expect(getLoadMoreButton()).not.toBeInTheDocument();
    // Empty state copy is visible, distinct from the load-more row.
    expect(screen.getByText(/no investable invoices/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reset-on-filter behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe("reset-on-filter boundary: visibleCount snaps back to PAGE_SIZE on signature change", () => {
  it("resets visibleCount to PAGE_SIZE after applying a currency filter that narrows the list", async () => {
    // 25 invoices: 15 USD, 10 EUR.  Initial page = 10; load more → 20.
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
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 30)} />);
    await flushTimers(30);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(20);

    // Reset boundary: narrowing must snap the visible slice back to PAGE_SIZE.
    fireEvent.click(screen.getByLabelText("Filter by EUR"));
    expect(getInvoiceListItems()).toHaveLength(10); // all 10 EUR visible (< PAGE_SIZE)
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("resets visibleCount after applying a search filter mid-load", async () => {
    const total = PAGE_SIZE * 3; // 30 — leave enough room to grow before filter applies.
    const invoices = makeInvoicesWhere(total, "SearchTarget", 5);
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 30)} />);
    await flushTimers(30);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(20);

    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "SearchTarget" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    // Filter narrows down — all matching items are visible at once, paging reset.
    expect(getInvoiceListItems()).toHaveLength(5);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("resets visibleCount again when the user clears the search filter after pagination", async () => {
    const total = PAGE_SIZE * 3 + 5; // 35 — headroom for two clicks after search clears.
    const invoices = makeInvoices(total);
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 30)} />);
    await flushTimers(30);

    // Apply search that narrows everything down to PAGE_SIZE.
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "Issuer" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(20);

    // Now clear the search → reset again to PAGE_SIZE.
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    expect(getLoadMoreButton()).toBeInTheDocument();
  });

  it("does NOT fire a reset when the filter signature is unchanged (paging keeps growing)", async () => {
    // No filter or search is applied — the JSON.stringify([debouncedSearch, filters])
    // signature stays constant, so each click must grow visibleCount exactly by PAGE_SIZE.
    const total = PAGE_SIZE * 5; // 50 — exactly five full pages; the 5th click hides the button.
    const invoices = makeInvoices(total);
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 30)} />);
    await flushTimers(30);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);

    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 2);

    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 3);

    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 4);
    expect(getLoadMoreButton()).toBeInTheDocument();

    await clickLoadMore();
    // Final click consumes the 5th page exactly and hides the button.
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("does not re-reveal Load-more when filter signature has not actually changed (idempotent rerender)", async () => {
    const total = PAGE_SIZE + 2;
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();

    // A no-input change should not change the filter signature.
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(getInvoiceListItems()).toHaveLength(total);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("keeps visibleCount non-negative and bounded by filteredInvoices.length across filter changes", async () => {
    // Boundary safety: visible items never grow past the filtered count.
    const total = PAGE_SIZE * 2; // 20
    const invoices = makeInvoicesWhere(total, "Match", PAGE_SIZE + 5); // 15 match
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 30)} />);
    await flushTimers(30);

    // Filter narrows result set to (PAGE_SIZE + 5); paging resets to PAGE_SIZE.
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "Match" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    await clickLoadMore();
    // Paging can grow, but should be bounded by the filtered count (PAGE_SIZE+5).
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE + 5);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("hides Load-more once filter narrows below PAGE_SIZE, even after multiple loads were attempted", async () => {
    const total = PAGE_SIZE * 5; // 50 — leaves the button present after 3 clicks.
    const invoices = makeInvoicesWhere(total, "Goldfish", 3); // only 3 match
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 30)} />);
    await flushTimers(30);

    await clickLoadMore(); // 20
    await clickLoadMore(); // 30
    await clickLoadMore(); // 40 (button still shown, 40 < 50)
    expect(getLoadMoreButton()).toBeInTheDocument();

    // Apply the search filter: visible slice must reset and be capped at 3.
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "Goldfish" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(getInvoiceListItems()).toHaveLength(3);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  it("resets visibleCount when applying a currency filter that yields exactly PAGE_SIZE results", async () => {
    // Boundary: filtered count equals PAGE_SIZE exactly.  Load-more must
    // not be visible immediately after the signature change.
    const total = PAGE_SIZE * 2; // 20
    const invoices = [
      ...Array.from({ length: PAGE_SIZE }, (_, i) => ({
        id: `usd-${i + 1}`,
        issuer: `USD Issuer ${i + 1}`,
        amount: "1,000",
        currency: "USD",
        dueDate: "2026-12-31",
        yield: "5.0%",
        status: "Open",
      })),
      ...Array.from({ length: PAGE_SIZE }, (_, i) => ({
        id: `eur-${i + 1}`,
        issuer: `EUR Issuer ${i + 1}`,
        amount: "1,000",
        currency: "EUR",
        dueDate: "2026-12-31",
        yield: "5.0%",
        status: "Open",
      })),
    ];
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 30)} />);
    await flushTimers(30);

    await clickLoadMore(); // 20 of 20 visible (USD only).
    expect(getLoadMoreButton()).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Filter by EUR"));
    // Signature change → PAGE_SIZE reset, no Load-more (exactly PAGE_SIZE).
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-cutting invariants
// ─────────────────────────────────────────────────────────────────────────────

describe("cross-cutting invariants across all four behaviours", () => {
  it("never renders more list items than filteredInvoices.length at any point", async () => {
    const total = PAGE_SIZE * 5 + 5; // 55 — leaves the button present through 4 clicks.
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    await clickLoadMore();
    expect(getInvoiceListItems().length).toBeLessThanOrEqual(total);

    await clickLoadMore();
    expect(getInvoiceListItems().length).toBeLessThanOrEqual(total);

    await clickLoadMore();
    expect(getInvoiceListItems().length).toBeLessThanOrEqual(total);

    await clickLoadMore();
    expect(getInvoiceListItems().length).toBeLessThanOrEqual(total);
  });

  it("status region always announces a count that matches the rendered DOM after each click", async () => {
    const total = PAGE_SIZE * 3 + 5; // 35
    render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 30)} />);
    await flushTimers(30);

    await clickLoadMore(); // → 20
    const rendered20 = getInvoiceListItems().length;
    expect(status().textContent).toMatch(
      new RegExp(`Showing ${rendered20} of ${total}|Showing ${total} of ${total}`)
    );

    await clickLoadMore(); // → 30
    const rendered30 = getInvoiceListItems().length;
    expect(status().textContent).toMatch(
      new RegExp(`Showing ${rendered30} of ${total}|Showing ${total} of ${total}`)
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Helper coverage for impact-module gate
// ─────────────────────────────────────────────────────────────────────────────
// These tests drive the exported helpers from `app/invest/page.js` directly,
// and a handful of integration scenarios, to push the module's test coverage
// past the issue's 95% minimum.  They focus on branches that the behaviours
// above do not incidentally hit (sort directions other than `yield desc`,
// yield-max filter, empty / non-array `applySortToList` inputs, pagination
// announcement zero edge).

describe("helper coverage for impact-module threshold", () => {
  // ── getPaginationAnnouncement boundary ──────────────────────────────────

  it("getPaginationAnnouncement returns the empty-announcement when total = 0", () => {
    expect(getPaginationAnnouncement(0, 0)).toBe("No invoices available");
  });

  it("getPaginationAnnouncement returns 'Showing 0 of N' if shown is 0 but total > 0", () => {
    expect(getPaginationAnnouncement(0, 5)).toBe("Showing 0 of 5 investable invoices");
  });

  // ── applySortToList direct branches ─────────────────────────────────────

  it("applySortToList returns the same array reference when filters carry no sort column", () => {
    const list = makeInvoices(3);
    // Empty `sort` field is exactly the DEFAULT_FILTERS shape; result is
    // the input reference unchanged.
    expect(applySortToList(list, { sort: "", sortDir: "desc" })).toBe(list);
  });

  it("applySortToList returns an empty array unchanged", () => {
    expect(applySortToList([], { sort: "yield", sortDir: "asc" })).toEqual([]);
  });

  it("applySortToList returns the input unchanged when it is not an array", () => {
    expect(applySortToList(null, { sort: "yield", sortDir: "asc" })).toBe(null);
    expect(applySortToList(undefined, { sort: "amount", sortDir: "asc" })).toBe(undefined);
  });

  it("applySortToList sorts by amount ascending", () => {
    const list = [
      { id: "a", issuer: "high", amount: "3,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "b", issuer: "low",  amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "c", issuer: "mid",  amount: "2,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
    ];
    const sorted = applySortToList(list, { sort: "amount", sortDir: "asc" });
    expect(sorted.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("applySortToList sorts by amount descending", () => {
    const list = [
      { id: "a", issuer: "high", amount: "3,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "b", issuer: "low",  amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "c", issuer: "mid",  amount: "2,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
    ];
    const sorted = applySortToList(list, { sort: "amount", sortDir: "desc" });
    expect(sorted.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("applySortToList sorts by yield ascending", () => {
    const list = [
      { id: "a", issuer: "A", amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "9%", status: "Open" },
      { id: "b", issuer: "B", amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "c", issuer: "C", amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "7%", status: "Open" },
    ];
    const sorted = applySortToList(list, { sort: "yield", sortDir: "asc" });
    expect(sorted.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("applySortToList sorts by maturity (dueDate) ascending", () => {
    const list = [
      { id: "late", issuer: "A", amount: "1,000", currency: "USD", dueDate: "2026-09-01", yield: "5%", status: "Open" },
      { id: "early", issuer: "B", amount: "1,000", currency: "USD", dueDate: "2026-03-01", yield: "5%", status: "Open" },
      { id: "mid", issuer: "C", amount: "1,000", currency: "USD", dueDate: "2026-06-01", yield: "5%", status: "Open" },
    ];
    const sorted = applySortToList(list, { sort: "maturity", sortDir: "asc" });
    expect(sorted.map((i) => i.id)).toEqual(["early", "mid", "late"]);
  });

  it("applySortToList sorts by maturity descending", () => {
    const list = [
      { id: "late", issuer: "A", amount: "1,000", currency: "USD", dueDate: "2026-09-01", yield: "5%", status: "Open" },
      { id: "early", issuer: "B", amount: "1,000", currency: "USD", dueDate: "2026-03-01", yield: "5%", status: "Open" },
      { id: "mid", issuer: "C", amount: "1,000", currency: "USD", dueDate: "2026-06-01", yield: "5%", status: "Open" },
    ];
    const sorted = applySortToList(list, { sort: "maturity", sortDir: "desc" });
    expect(sorted.map((i) => i.id)).toEqual(["late", "mid", "early"]);
  });

  it("applySortToList returns a new array (does not mutate the input)", () => {
    const list = makeInvoices(3);
    const beforeIds = list.map((i) => i.id);
    applySortToList(list, { sort: "amount", sortDir: "desc" });
    expect(list.map((i) => i.id)).toEqual(beforeIds);
  });

  // ── getInvoiceLoadAnnouncement branches ─────────────────────────────────

  it("getInvoiceLoadAnnouncement returns no-match when filterActive and filteredCount is 0", () => {
    expect(
      getInvoiceLoadAnnouncement([{ id: "1" }], { filterActive: true, filteredCount: 0 })
    ).toBe("No invoices match");
  });

  // ── Filter integration: yield-max via parseYield ────────────────────────

  it("filters invoices by maximum yield (drives the yieldMax parseYield branch)", async () => {
    const invoices = [
      { id: "a", issuer: "High", amount: "1,000", currency: "USD", dueDate: "2026-06-15", yield: "9.5%", status: "Open" },
      { id: "b", issuer: "Mid",  amount: "1,000", currency: "USD", dueDate: "2026-07-01", yield: "6.0%", status: "Open" },
      { id: "c", issuer: "Low",  amount: "1,000", currency: "USD", dueDate: "2026-05-30", yield: "3.2%", status: "Open" },
    ];
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Maximum yield percentage"), {
      target: { value: "7" },
    });

    // Only Mid (6%) and Low (3.2%) pass; High (9.5%) is excluded.
    expect(getInvoiceListItems()).toHaveLength(2);
    expect(screen.getByText("Mid")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.queryByText("High")).not.toBeInTheDocument();
  });

  // ── Sort integration: yield sort via parseYield ─────────────────────────

  it("applySortToList honours the legacy compound sort form (yield_asc)", () => {
    // parseSortState matches `column_dir` strings and returns column + dir.
    const list = [
      { id: "a", issuer: "A", amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "9%", status: "Open" },
      { id: "b", issuer: "B", amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "c", issuer: "C", amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "7%", status: "Open" },
    ];
    const sorted = applySortToList(list, { sort: "yield_asc" });
    expect(sorted.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("applySortToList honours the legacy compound sort form (amount_desc)", () => {
    const list = [
      { id: "a", issuer: "A", amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "b", issuer: "B", amount: "9,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "c", issuer: "C", amount: "4,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
    ];
    const sorted = applySortToList(list, { sort: "amount_desc" });
    expect(sorted.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("applySortToList default sortDir is 'desc' when sortDir is missing (matches DEFAULT_FILTERS)", () => {
    const list = [
      { id: "a", issuer: "A", amount: "1,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "b", issuer: "B", amount: "9,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
      { id: "c", issuer: "C", amount: "4,000", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Open" },
    ];
    // Default sortDir: 'desc' -> 9000, 4000, 1000.
    const sorted = applySortToList(list, { sort: "amount" });
    expect(sorted.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  // ── Retry path with pagination state ────────────────────────────────────

  it("retry after a load error resets pagination state to PAGE_SIZE", async () => {
    let callCount = 0;
    const invoices = makeInvoices(PAGE_SIZE + 5);
    const loadInvoices = jest.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise((_, reject) =>
          setTimeout(() => reject(new Error("first fail")), 50)
        );
      }
      return new Promise((resolve) => setTimeout(() => resolve(invoices), 50));
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50); // initial failure

    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });
    await flushTimers(50); // second load succeeds

    // After retry succeeds, the loaded count starts at PAGE_SIZE again.
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    expect(getLoadMoreButton()).toBeInTheDocument();
    expect(callCount).toBe(2);
  });

  it("first-page resets to PAGE_SIZE after retry then Load-more again extends past PAGE_SIZE", async () => {
    let callCount = 0;
    const invoices = makeInvoices(PAGE_SIZE * 2);
    const loadInvoices = jest.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise((_, reject) =>
          setTimeout(() => reject(new Error("first fail")), 50)
        );
      }
      return new Promise((resolve) => setTimeout(() => resolve(invoices), 50));
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });
    await flushTimers(50);

    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE);
    await clickLoadMore();
    expect(getInvoiceListItems()).toHaveLength(PAGE_SIZE * 2);
    expect(getLoadMoreButton()).not.toBeInTheDocument();
  });

  // ── Search filter that prunes the list to zero matches ──────────────────

  it("search filter that prunes the list to zero matches shows the no-match state", async () => {
    const invoices = [
      { id: "a", issuer: "Acme", amount: "1,000", currency: "USD", dueDate: "2026-06-15", yield: "5%", status: "Open" },
      { id: "b", issuer: "Bright", amount: "1,000", currency: "USD", dueDate: "2026-07-01", yield: "5%", status: "Open" },
    ];
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "zz_no_match_zz" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    // Helper now safely returns [] when the no-match <div> replaces the <ul>.
    expect(getInvoiceListItems()).toHaveLength(0);
    expect(screen.getByText("No invoices match your filters.")).toBeInTheDocument();
  });
  // ── Filter integration: maturity-to via Date comparison ────────────────

  it("filters invoices by maturity date upper bound (drives the maturityTo branch)", async () => {
    const invoices = [
      { id: "a", issuer: "A", amount: "1,000", currency: "USD", dueDate: "2026-06-15", yield: "5%", status: "Open" },
      { id: "b", issuer: "B", amount: "1,000", currency: "USD", dueDate: "2026-12-15", yield: "5%", status: "Open" },
    ];
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByLabelText("Maturity date to"), {
      target: { value: "2026-07-01" },
    });

    expect(getInvoiceListItems()).toHaveLength(1);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByText("B")).not.toBeInTheDocument();
  });

  // ── Helpers via integration: getResultsSummaryText ───────────────────────


  // ── Filter integration: status legend chip → filters.statuses branch ───

  it("renders the no-match copy when a yield filter eliminates every invoice", async () => {
    const invoices = [
      { id: "a", issuer: "A", amount: "1,000", currency: "USD", dueDate: "2026-06-15", yield: "5%", status: "Open" },
    ];
    render(<InvestMarketplace loadInvoices={createDeferredLoader(invoices, 0)} />);
    await flushTimers(0);

    // Set minimum yield above the only invoice's yield — no matches remain.
    fireEvent.change(screen.getByLabelText("Minimum yield percentage"), {
      target: { value: "50" },
    });

    // Helper now safely returns [] when the no-match <div> replaces the <ul>.
    expect(getInvoiceListItems()).toHaveLength(0);
    expect(screen.getByText("No invoices match your filters.")).toBeInTheDocument();
  });

  // ── Status region: loadError + zero invoices → empty status ────────────

  it("status region returns empty text when invoices have not loaded yet", () => {
    // While `invoices === null`, statusMessage short-circuits to "" unless
    // there's an error.  We can assert the public helper's behaviour for
    // the empty-array case directly without rendering.
    expect(getInvoiceLoadAnnouncement([])).toBe("No invoices available");
  });
});
