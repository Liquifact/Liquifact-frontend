/**
 * @file app/invest/marketplace.a11y.test.tsx
 *
 * Automated accessibility (jest-axe) tests for the Invest Marketplace view.
 *
 * Covers the following UI states:
 *  - Loading skeleton (invoices = null, no error)
 *  - Loaded state with one or more invoices (happy path)
 *  - Empty marketplace (zero invoices returned)
 *  - Error / load-failure state with retry banner
 *  - Filtered / no-match state (filters eliminate all results)
 *  - Paginated state (more items than PAGE_SIZE, "Load more" button visible)
 *
 * Each test renders the component, waits for the relevant state to settle,
 * then asserts zero axe violations.  The component is fully wrapped in the
 * providers it depends on in production (ToastProvider → WalletProvider) so
 * the accessibility tree is as close to the real DOM as possible.
 *
 * All tests are deterministic: real timers are replaced with Jest fake timers,
 * the loader is injected via `loadInvoices`, and next/navigation + next/link
 * are mocked.
 */

import React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";

import { InvestMarketplace, PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "./page";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/ToastProvider";

// ── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("next/link", () => {
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("next/navigation", () => ({
  usePathname: () => "/invest",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
}));

// NavMenu adds its own router dependency and is already tested independently.
// Replace it with a semantically valid landmark so the axe heading/landmark
// checks still reflect the page structure.
jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return (
      <header>
        <nav aria-label="Site navigation" />
      </header>
    );
  }
  return { __esModule: true, default: MockNavMenu };
});

// ── Fixtures & helpers ────────────────────────────────────────────────────────

/**
 * Minimal invoice fixture factory.
 * IDs follow the pattern "inv-001", "inv-002", …
 */
function makeInvoices(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `inv-${String(i + 1).padStart(3, "0")}`,
    issuer: `Issuer ${i + 1}`,
    amount: "1,000",
    currency: i % 2 === 0 ? "USD" : "EUR",
    dueDate: "2026-12-31",
    yield: "5.0%",
    status: "Open",
  }));
}

/** Loader that resolves immediately with the given invoice array. */
function resolveWith(invoices: ReturnType<typeof makeInvoices>) {
  return jest.fn(() => Promise.resolve(invoices));
}

/** Loader that rejects immediately (simulates a network failure). */
function rejectWith(message = "Network error") {
  return jest.fn(() => Promise.reject(new Error(message)));
}

/** Loader that never settles (simulates a long-running request). */
function pendingLoader() {
  return jest.fn(() => new Promise<never>(() => {}));
}

/**
 * Advance Jest fake timers by `ms` and flush the microtask queue so all
 * pending Promises (including React state updates) are resolved before the
 * test continues.
 */
async function flushTimers(ms = 0) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

/**
 * Full provider wrapper used by every test.
 * Mirrors the production provider tree in app/layout.js.
 */
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <WalletProvider>{children}</WalletProvider>
    </ToastProvider>
  );
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("InvestMarketplace – jest-axe accessibility", () => {
  // Use fake timers for every test so async state transitions are controllable.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Always drain pending timers before restoring real ones to avoid act()
    // warnings leaking between tests.
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  // ── Loading skeleton ────────────────────────────────────────────────────────

  it("loading skeleton: no axe violations while invoices are pending", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={pendingLoader()} />
      </Providers>
    );

    // The skeleton is visible right away — no timer advance needed.
    expect(screen.getByRole("list", { name: /loading investable invoices/i })).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // ── Loaded state (happy path) ───────────────────────────────────────────────

  it("loaded state (3 invoices): no axe violations", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(3))} />
      </Providers>
    );

    await flushTimers(0);

    // Confirm the list rendered before running axe.
    expect(screen.getByRole("list", { name: /investable invoices/i })).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("loaded state (1 invoice): no axe violations", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(1))} />
      </Providers>
    );

    await flushTimers(0);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // ── Empty marketplace ───────────────────────────────────────────────────────

  it("empty marketplace (0 invoices): no axe violations", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith([])} />
      </Providers>
    );

    await flushTimers(0);

    // Verify the empty-state message is in the DOM before asserting axe.
    expect(screen.getByText(/No investable invoices\./i)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // ── Error / load-failure state ──────────────────────────────────────────────

  it("error state (load fails): no axe violations", async () => {
    // Suppress the console.error that React emits for an unhandled rejection.
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={rejectWith("Network error")} />
      </Providers>
    );

    await flushTimers(0);

    // Confirm the error banner rendered before running axe.
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();

    consoleErrorSpy.mockRestore();
  });

  // ── Filtered / no-match state ───────────────────────────────────────────────

  it("no-match filter state: no axe violations when filters eliminate all invoices", async () => {
    // Render with USD-only invoices, then filter by EUR → zero matches.
    const usdOnlyInvoices = makeInvoices(3).map((inv) => ({
      ...inv,
      currency: "USD",
    }));

    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(usdOnlyInvoices)} />
      </Providers>
    );

    await flushTimers(0);

    // Apply a EUR currency filter — should produce zero matches.
    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    expect(screen.getByText("No invoices match your filters.")).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("search no-match state: no axe violations when issuer search finds nothing", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(2))} />
      </Providers>
    );

    await flushTimers(0);

    // Type a query that matches no issuer.
    fireEvent.change(screen.getByLabelText("Search by issuer name"), {
      target: { value: "zzznomatch" },
    });
    // Wait for the debounce to settle.
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(screen.getByText("No invoices match your filters.")).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // ── Paginated state ─────────────────────────────────────────────────────────

  it("paginated state (more than PAGE_SIZE invoices): no axe violations", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(PAGE_SIZE + 5))} />
      </Providers>
    );

    await flushTimers(0);

    // Confirm the Load-more button is rendered.
    expect(screen.getByRole("button", { name: /load more invoices/i })).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("after Load more click: no axe violations when additional invoices are appended", async () => {
    const total = PAGE_SIZE + 3;

    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(total))} />
      </Providers>
    );

    await flushTimers(0);

    // Click Load more to expand the list.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    // All items should now be visible (no Load-more button).
    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // ── Filter panel (coming-soon / aria-disabled) ──────────────────────────────

  it("filter panel with aria-disabled 'coming soon' state: no axe violations", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(3))} />
      </Providers>
    );

    await flushTimers(0);

    // Verify the fieldset is in the DOM with the expected accessibility attributes.
    const fieldset = screen.getByRole("group", { name: /Marketplace Filters/i });
    expect(fieldset).toHaveAttribute("aria-disabled", "true");
    expect(fieldset).toHaveAttribute("aria-describedby", "filters-coming-soon");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // ── Screen-reader live region ───────────────────────────────────────────────

  it("polite live region is present and accessible in loaded state", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(3))} />
      </Providers>
    );

    await flushTimers(0);

    // There are two role="status" regions in the full provider tree:
    // 1. The marketplace's own sr-only region (aria-atomic="true")
    // 2. The ToastProvider's notification container
    // We target the marketplace region specifically via aria-atomic.
    const marketplaceLiveRegion = container.querySelector("[role='status'][aria-atomic='true']");
    expect(marketplaceLiveRegion).not.toBeNull();
    expect(marketplaceLiveRegion).toHaveAttribute("aria-live", "polite");
    expect(marketplaceLiveRegion).toHaveTextContent(/3 investable invoices loaded/i);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("live region is empty during loading (no premature announcement)", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={pendingLoader()} />
      </Providers>
    );

    // The marketplace live region is the one with aria-atomic="true".
    const marketplaceLiveRegion = container.querySelector("[role='status'][aria-atomic='true']");
    expect(marketplaceLiveRegion).not.toBeNull();
    expect(marketplaceLiveRegion).toHaveTextContent("");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("live region announces error status when load fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={rejectWith("boom")} />
      </Providers>
    );

    await flushTimers(0);

    // Target the marketplace-owned status region (aria-atomic="true").
    const marketplaceLiveRegion = container.querySelector("[role='status'][aria-atomic='true']");
    expect(marketplaceLiveRegion).not.toBeNull();
    expect(marketplaceLiveRegion).toHaveTextContent(/Unable to load/i);

    const results = await axe(container);
    expect(results).toHaveNoViolations();

    consoleErrorSpy.mockRestore();
  });

  // ── Currency filter chips ───────────────────────────────────────────────────

  it("EUR filter active state: no axe violations after filtering to a subset", async () => {
    const mixedInvoices = [
      ...makeInvoices(2).map((inv) => ({ ...inv, currency: "USD" })),
      { ...makeInvoices(1)[0], id: "inv-eur-1", currency: "EUR" },
    ];

    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(mixedInvoices)} />
      </Providers>
    );

    await flushTimers(0);

    fireEvent.click(screen.getByLabelText("Filter by EUR"));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("cleared filters restore full list: no axe violations", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(3))} />
      </Providers>
    );

    await flushTimers(0);

    // Apply then clear a EUR filter.
    fireEvent.click(screen.getByLabelText("Filter by EUR"));
    fireEvent.click(screen.getByLabelText("Clear all filters"));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // ── Retry flow ──────────────────────────────────────────────────────────────

  it("after successful retry: no axe violations when list renders post-failure", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    let callCount = 0;
    const invoices = makeInvoices(2);
    const loadInvoices = jest.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.reject(new Error("first fail"));
      }
      return Promise.resolve(invoices);
    });

    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={loadInvoices} />
      </Providers>
    );

    // Wait for the initial failure.
    await flushTimers(0);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Click "Try again".
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      await Promise.resolve();
    });

    // Wait for the successful reload.
    await flushTimers(0);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: /investable invoices/i })).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();

    consoleErrorSpy.mockRestore();
  });

  // ── Heading structure ───────────────────────────────────────────────────────

  it("page has a single h1 heading in loaded state", async () => {
    render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(3))} />
      </Providers>
    );

    await flushTimers(0);

    const h1Elements = screen.getAllByRole("heading", { level: 1 });
    expect(h1Elements).toHaveLength(1);
  });

  it("page has a single h1 heading in error state", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Providers>
        <InvestMarketplace loadInvoices={rejectWith("boom")} />
      </Providers>
    );

    await flushTimers(0);

    const h1Elements = screen.getAllByRole("heading", { level: 1 });
    expect(h1Elements).toHaveLength(1);

    consoleErrorSpy.mockRestore();
  });

  it("page has a single h1 heading in empty state", async () => {
    render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith([])} />
      </Providers>
    );

    await flushTimers(0);

    const h1Elements = screen.getAllByRole("heading", { level: 1 });
    expect(h1Elements).toHaveLength(1);
  });

  // ── Search input accessibility ──────────────────────────────────────────────

  it("search input has an accessible label in all states", async () => {
    render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(2))} />
      </Providers>
    );

    await flushTimers(0);

    // The InvoiceSearch component should expose a labelled input.
    const searchInput = screen.getByLabelText("Search by issuer name");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput.tagName).toBe("INPUT");
  });

  // ── Focus management ────────────────────────────────────────────────────────

  it("invoice list links are keyboard-accessible (tabIndex not set to -1)", async () => {
    render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(3))} />
      </Providers>
    );

    await flushTimers(0);

    const links = screen.getAllByRole("link");
    // Every link in the invoice list should be focusable (no tabIndex=-1).
    for (const link of links) {
      expect(link).not.toHaveAttribute("tabIndex", "-1");
    }
  });

  // ── Status / role="status" region ───────────────────────────────────────────

  it("marketplace owns a role=status aria-live=polite region with aria-atomic=true", async () => {
    const { container } = render(
      <Providers>
        <InvestMarketplace loadInvoices={resolveWith(makeInvoices(3))} />
      </Providers>
    );

    await flushTimers(0);

    // The marketplace component owns exactly one atomic status live region.
    // (The ToastProvider adds a second non-atomic role="status" container for
    // toast notifications — that is intentional and expected.)
    const marketplaceStatusRegions = container.querySelectorAll(
      "[role='status'][aria-atomic='true']"
    );
    expect(marketplaceStatusRegions).toHaveLength(1);
    expect(marketplaceStatusRegions[0]).toHaveAttribute("aria-live", "polite");
  });
});
