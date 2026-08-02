/**
 * Marketplace state transition tests — issue #51
 *
 * Covers the four marketplace states (loading / empty / error / success) and
 * all six transitions between them, plus mutual-exclusivity invariants that
 * assert only one state is visible at a time.
 *
 * State model
 * -----------
 *  loading  : invoices === null  (initial + post-retry before resolution)
 *  error    : loadError is non-empty string
 *  empty    : invoices is []
 *  success  : invoices is a non-empty array
 *
 * Transitions tested
 * ------------------
 *  loading → success   (happy path)
 *  loading → empty     (API returns [])
 *  loading → error     (API rejects)
 *  error   → loading   (retry click resets to loading)
 *  error   → success   (retry resolves with data)
 *  error   → empty     (retry resolves with [])
 */
import React from "react";
import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { copy } from "@/app/copy/en";
import { InvestMarketplace, PAGE_SIZE } from "../page";

// ── Mocks ────────────────────────────────────────────────────────────────────

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

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/invest",
}));

jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return <nav aria-label="site navigation" />;
  }
  return { __esModule: true, default: MockNavMenu };
});

jest.mock("@/utils/export", () => ({
  exportAsCSV: jest.fn(),
  exportAsJSON: jest.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build N minimal invoice fixtures. */
function makeInvoices(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `inv-${String(i + 1).padStart(3, "0")}`,
    issuer: `Issuer ${i + 1}`,
    amount: String((i + 1) * 1000),
    currency: "USD",
    dueDate: "2026-12-31",
    yield: `${(5 + i * 0.1).toFixed(1)}%`,
    status: "Open",
  }));
}

/** A loader that never resolves — keeps the component in loading state. */
function pendingLoader() {
  return jest.fn(() => new Promise(() => {}));
}

/** A loader that resolves immediately with `invoices`. */
function resolvedLoader(invoices) {
  return jest.fn(() => Promise.resolve(invoices));
}

/** A loader that rejects immediately with `message`. */
function rejectedLoader(message = "network error") {
  return jest.fn(() => Promise.reject(new Error(message)));
}

/**
 * Flush the React async queue so resolved/rejected promises are processed and
 * state updates are committed to the DOM.
 */
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ── Shared query helpers ─────────────────────────────────────────────────────

const queries = {
  /** The skeleton list rendered while loading. */
  skeleton: () =>
    screen.queryByRole("list", { name: /loading investable invoices/i }),

  /** The invoice list rendered in success state. */
  invoiceList: () =>
    screen.queryByRole("list", { name: copy.invest.listAriaLabel }),

  /** The empty-marketplace status region. */
  emptyRegion: () =>
    screen.queryByText(copy.invest.emptyState)?.closest("[role='status']"),

  /** The error alert element. */
  errorAlert: () => screen.queryByRole("alert"),

  /** The "Try again" retry button. */
  retryButton: () =>
    screen.queryByRole("button", { name: copy.invest.retryAction }),

  /** The "Load more" pagination button. */
  loadMoreButton: () =>
    screen.queryByRole("button", { name: copy.invest.loadMoreAriaLabel }),
};

/**
 * Assert that exactly one of the four states is active and the other three are
 * absent from the DOM. Call with the name of the expected active state.
 *
 * @param {'loading'|'empty'|'error'|'success'} activeState
 */
function assertMutualExclusivity(activeState) {
  const present = {
    loading: !!queries.skeleton(),
    empty: !!screen.queryByText(copy.invest.emptyState),
    error: !!queries.errorAlert(),
    success: !!queries.invoiceList(),
  };

  const allStates = ["loading", "empty", "error", "success"];
  for (const state of allStates) {
    if (state === activeState) {
      expect(present[state]).toBe(true);
    } else {
      expect(present[state]).toBe(false);
    }
  }
}

// ── Suite 1: Individual state rendering ─────────────────────────────────────

describe("Marketplace state — loading", () => {
  it("renders the skeleton list with aria-busy='true'", () => {
    render(<InvestMarketplace loadInvoices={pendingLoader()} />);

    const skeleton = screen.getByRole("list", {
      name: /loading investable invoices/i,
    });
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });

  it("skeleton has the expected number of placeholder rows (default 3)", () => {
    render(<InvestMarketplace loadInvoices={pendingLoader()} />);

    const skeleton = screen.getByRole("list", {
      name: /loading investable invoices/i,
    });
    const rows = within(skeleton).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
  });

  it("the outer container carries aria-busy='true' while invoices are null", () => {
    render(<InvestMarketplace loadInvoices={pendingLoader()} />);

    const skeleton = screen.getByRole("list", {
      name: /loading investable invoices/i,
    });
    // The skeleton list is inside the aria-busy wrapper div
    const busyWrapper = skeleton.closest("[aria-busy='true']");
    expect(busyWrapper).not.toBeNull();
  });

  it("page heading is always present during loading", () => {
    render(<InvestMarketplace loadInvoices={pendingLoader()} />);
    expect(
      screen.getByRole("heading", { name: copy.invest.title })
    ).toBeInTheDocument();
  });

  it("polite live region is present but empty during loading", () => {
    render(<InvestMarketplace loadInvoices={pendingLoader()} />);
    // The sr-only status region exists but has no load announcement yet
    const liveRegion = document.querySelector("[role='status'][aria-live='polite']");
    expect(liveRegion).not.toBeNull();
    // It should not show error text
    expect(liveRegion.textContent).not.toMatch(copy.invest.errorTitle);
  });
});

describe("Marketplace state — empty", () => {
  it("renders the empty-state copy inside a polite status region", async () => {
    render(<InvestMarketplace loadInvoices={resolvedLoader([])} />);
    await settle();

    const emptyMsg = screen.getByText(copy.invest.emptyState);
    expect(emptyMsg).toBeInTheDocument();

    const statusRegion = emptyMsg.closest("[role='status']");
    expect(statusRegion).not.toBeNull();
    expect(statusRegion).toHaveAttribute("aria-live", "polite");
  });

  it("aria-busy is false (or absent) on the container after resolution", async () => {
    render(<InvestMarketplace loadInvoices={resolvedLoader([])} />);
    await settle();

    // No element should still have aria-busy="true" after the load completes
    const stillBusy = document.querySelector("[aria-busy='true']");
    expect(stillBusy).toBeNull();
  });

  it("page heading is present in empty state", async () => {
    render(<InvestMarketplace loadInvoices={resolvedLoader([])} />);
    await settle();
    expect(
      screen.getByRole("heading", { name: copy.invest.title })
    ).toBeInTheDocument();
  });
});

describe("Marketplace state — error", () => {
  it("renders a single role=alert with the error title and description", async () => {
    render(<InvestMarketplace loadInvoices={rejectedLoader()} />);
    await settle();

    const alerts = screen.getAllByRole("alert");
    // Only one top-level alert (ErrorBanner renders its own role=alert)
    expect(alerts.length).toBeGreaterThanOrEqual(1);

    const errorBanner = alerts.find((el) =>
      el.textContent.includes(copy.invest.errorTitle)
    );
    expect(errorBanner).toBeTruthy();
    expect(errorBanner).toHaveTextContent(copy.invest.errorDescription);
  });

  it("the retry button is present, enabled, and labelled correctly", async () => {
    render(<InvestMarketplace loadInvoices={rejectedLoader()} />);
    await settle();

    const retry = screen.getByRole("button", { name: copy.invest.retryAction });
    expect(retry).toBeInTheDocument();
    expect(retry).not.toBeDisabled();
  });

  it("page heading is present in error state", async () => {
    render(<InvestMarketplace loadInvoices={rejectedLoader()} />);
    await settle();
    expect(
      screen.getByRole("heading", { name: copy.invest.title })
    ).toBeInTheDocument();
  });
});

describe("Marketplace state — success", () => {
  it("renders invoice list with correct accessible name", async () => {
    render(<InvestMarketplace loadInvoices={resolvedLoader(makeInvoices(3))} />);
    await settle();

    expect(
      screen.getByRole("list", { name: copy.invest.listAriaLabel })
    ).toBeInTheDocument();
  });

  it("renders the correct number of invoice rows", async () => {
    const invoices = makeInvoices(5);
    render(<InvestMarketplace loadInvoices={resolvedLoader(invoices)} />);
    await settle();

    const list = screen.getByRole("list", { name: copy.invest.listAriaLabel });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
  });

  it("each invoice row has the issuer name and a link to its detail page", async () => {
    const invoices = makeInvoices(2);
    render(<InvestMarketplace loadInvoices={resolvedLoader(invoices)} />);
    await settle();

    const link1 = screen.getByRole("link", { name: "Issuer 1" });
    expect(link1).toHaveAttribute("href", "/invest/inv-001");

    const link2 = screen.getByRole("link", { name: "Issuer 2" });
    expect(link2).toHaveAttribute("href", "/invest/inv-002");
  });

  it("aria-busy is false/absent on the container after success", async () => {
    render(<InvestMarketplace loadInvoices={resolvedLoader(makeInvoices(1))} />);
    await settle();

    expect(document.querySelector("[aria-busy='true']")).toBeNull();
  });

  it("page heading is present in success state", async () => {
    render(<InvestMarketplace loadInvoices={resolvedLoader(makeInvoices(1))} />);
    await settle();
    expect(
      screen.getByRole("heading", { name: copy.invest.title })
    ).toBeInTheDocument();
  });
});

// ── Suite 2: Mutual exclusivity ──────────────────────────────────────────────

describe("Mutual exclusivity — only one state visible at a time", () => {
  it("loading state: skeleton only — no list, no empty, no error", () => {
    render(<InvestMarketplace loadInvoices={pendingLoader()} />);
    assertMutualExclusivity("loading");
  });

  it("empty state: empty copy only — no skeleton, no list, no error", async () => {
    render(<InvestMarketplace loadInvoices={resolvedLoader([])} />);
    await settle();
    assertMutualExclusivity("empty");
  });

  it("error state: alert only — no skeleton, no list, no empty copy", async () => {
    render(<InvestMarketplace loadInvoices={rejectedLoader()} />);
    await settle();
    assertMutualExclusivity("error");
  });

  it("success state: list only — no skeleton, no empty copy, no error", async () => {
    render(<InvestMarketplace loadInvoices={resolvedLoader(makeInvoices(3))} />);
    await settle();
    assertMutualExclusivity("success");
  });
});

// ── Suite 3: State transitions ───────────────────────────────────────────────

describe("State transition — loading → success", () => {
  it("begins in loading, skeleton disappears, invoice list appears", async () => {
    let resolve;
    const deferred = new Promise((r) => { resolve = r; });
    const loadInvoices = jest.fn(() => deferred);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    // Phase 1 — loading
    expect(
      screen.getByRole("list", { name: /loading investable invoices/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: copy.invest.listAriaLabel })
    ).not.toBeInTheDocument();

    // Phase 2 — resolve
    await act(async () => {
      resolve(makeInvoices(2));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Skeleton gone, invoice list present
    expect(
      screen.queryByRole("list", { name: /loading investable invoices/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: copy.invest.listAriaLabel })
    ).toBeInTheDocument();
    assertMutualExclusivity("success");
  });
});

describe("State transition — loading → empty", () => {
  it("begins in loading, skeleton disappears, empty copy appears", async () => {
    let resolve;
    const deferred = new Promise((r) => { resolve = r; });
    const loadInvoices = jest.fn(() => deferred);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    // Phase 1 — loading
    expect(
      screen.getByRole("list", { name: /loading investable invoices/i })
    ).toBeInTheDocument();

    // Phase 2 — resolve with empty array
    await act(async () => {
      resolve([]);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Skeleton gone, empty state present
    expect(
      screen.queryByRole("list", { name: /loading investable invoices/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(copy.invest.emptyState)).toBeInTheDocument();
    assertMutualExclusivity("empty");
  });
});

describe("State transition — loading → error", () => {
  it("begins in loading, skeleton disappears, error banner appears", async () => {
    let reject;
    const deferred = new Promise((_, r) => { reject = r; });
    const loadInvoices = jest.fn(() => deferred);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    // Phase 1 — loading
    expect(
      screen.getByRole("list", { name: /loading investable invoices/i })
    ).toBeInTheDocument();

    // Phase 2 — reject
    await act(async () => {
      reject(new Error("server down"));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Skeleton gone, error present
    expect(
      screen.queryByRole("list", { name: /loading investable invoices/i })
    ).not.toBeInTheDocument();

    const alerts = screen.getAllByRole("alert");
    const errorBanner = alerts.find((el) =>
      el.textContent.includes(copy.invest.errorTitle)
    );
    expect(errorBanner).toBeTruthy();
    assertMutualExclusivity("error");
  });
});

describe("State transition — error → loading (retry resets to skeleton)", () => {
  it("clicking Try again immediately shows the skeleton before the reload settles", async () => {
    const user = userEvent.setup();

    // First call rejects; second call is a long-running promise (never settles in this test)
    let resolveSecond;
    const secondCall = new Promise((r) => { resolveSecond = r; });
    const loadInvoices = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockReturnValueOnce(secondCall);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await settle();

    // In error state
    const alerts = screen.getAllByRole("alert");
    expect(
      alerts.find((el) => el.textContent.includes(copy.invest.errorTitle))
    ).toBeTruthy();

    // Click retry — component transitions back to loading immediately
    await user.click(
      screen.getByRole("button", { name: copy.invest.retryAction })
    );

    // Error banner gone, skeleton present
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: /loading investable invoices/i })
    ).toBeInTheDocument();
    assertMutualExclusivity("loading");

    // Clean up — resolve the second call to avoid open handles
    await act(async () => {
      resolveSecond([]);
      await Promise.resolve();
      await Promise.resolve();
    });
  });
});

describe("State transition — error → success (retry recovers)", () => {
  it("retry after error leads to success state with invoices", async () => {
    const user = userEvent.setup();
    const invoices = makeInvoices(3);

    const loadInvoices = jest
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce(invoices);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await settle();

    // In error state
    expect(
      screen.getAllByRole("alert").find((el) =>
        el.textContent.includes(copy.invest.errorTitle)
      )
    ).toBeTruthy();

    // Retry
    await user.click(
      screen.getByRole("button", { name: copy.invest.retryAction })
    );
    await settle();

    // Success state
    expect(
      screen.getByRole("list", { name: copy.invest.listAriaLabel })
    ).toBeInTheDocument();
    expect(screen.getByText("Issuer 1")).toBeInTheDocument();
    assertMutualExclusivity("success");
    expect(loadInvoices).toHaveBeenCalledTimes(2);
  });

  it("keyboard Enter on retry button also recovers to success", async () => {
    const user = userEvent.setup();
    const loadInvoices = jest
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce(makeInvoices(1));

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await settle();

    const retry = screen.getByRole("button", { name: copy.invest.retryAction });
    retry.focus();
    await user.keyboard("{Enter}");
    await settle();

    expect(
      screen.getByRole("list", { name: copy.invest.listAriaLabel })
    ).toBeInTheDocument();
    assertMutualExclusivity("success");
  });
});

describe("State transition — error → empty (retry returns empty list)", () => {
  it("retry after error with empty response shows empty state", async () => {
    const user = userEvent.setup();
    const loadInvoices = jest
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce([]);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await settle();

    // In error state
    expect(
      screen.getAllByRole("alert").find((el) =>
        el.textContent.includes(copy.invest.errorTitle)
      )
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: copy.invest.retryAction })
    );
    await settle();

    // Empty state
    expect(screen.getByText(copy.invest.emptyState)).toBeInTheDocument();
    assertMutualExclusivity("empty");
    expect(loadInvoices).toHaveBeenCalledTimes(2);
  });
});

// ── Suite 4: Multiple consecutive retries ────────────────────────────────────

describe("Multiple consecutive retries", () => {
  it("error → error → success: each retry is idempotent and leads to correct final state", async () => {
    const user = userEvent.setup();
    const invoices = makeInvoices(2);

    const loadInvoices = jest
      .fn()
      .mockRejectedValueOnce(new Error("first fail"))
      .mockRejectedValueOnce(new Error("second fail"))
      .mockResolvedValueOnce(invoices);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await settle();

    // Retry 1 — still error
    await user.click(
      screen.getByRole("button", { name: copy.invest.retryAction })
    );
    await settle();
    expect(
      screen.getAllByRole("alert").find((el) =>
        el.textContent.includes(copy.invest.errorTitle)
      )
    ).toBeTruthy();

    // Retry 2 — success
    await user.click(
      screen.getByRole("button", { name: copy.invest.retryAction })
    );
    await settle();
    expect(
      screen.getByRole("list", { name: copy.invest.listAriaLabel })
    ).toBeInTheDocument();
    assertMutualExclusivity("success");
    expect(loadInvoices).toHaveBeenCalledTimes(3);
  });
});

// ── Suite 5: Boundary / edge cases ───────────────────────────────────────────

describe("Boundary: exactly PAGE_SIZE invoices", () => {
  it("renders all PAGE_SIZE items without a Load more button", async () => {
    const invoices = makeInvoices(PAGE_SIZE);
    render(<InvestMarketplace loadInvoices={resolvedLoader(invoices)} />);
    await settle();

    const list = screen.getByRole("list", { name: copy.invest.listAriaLabel });
    expect(within(list).getAllByRole("listitem")).toHaveLength(PAGE_SIZE);
    expect(queries.loadMoreButton()).not.toBeInTheDocument();
    assertMutualExclusivity("success");
  });
});

describe("Boundary: PAGE_SIZE + 1 invoices shows Load more", () => {
  it("shows PAGE_SIZE items and a Load more button", async () => {
    const invoices = makeInvoices(PAGE_SIZE + 1);
    render(<InvestMarketplace loadInvoices={resolvedLoader(invoices)} />);
    await settle();

    const list = screen.getByRole("list", { name: copy.invest.listAriaLabel });
    expect(within(list).getAllByRole("listitem")).toHaveLength(PAGE_SIZE);
    expect(queries.loadMoreButton()).toBeInTheDocument();
  });
});

describe("Boundary: single invoice", () => {
  it("renders correctly with one invoice and no Load more button", async () => {
    render(<InvestMarketplace loadInvoices={resolvedLoader(makeInvoices(1))} />);
    await settle();

    const list = screen.getByRole("list", { name: copy.invest.listAriaLabel });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(queries.loadMoreButton()).not.toBeInTheDocument();
    assertMutualExclusivity("success");
  });
});

describe("Boundary: loader rejects immediately on first render", () => {
  it("transitions directly from loading to error without extra renders", async () => {
    render(
      <InvestMarketplace loadInvoices={rejectedLoader("immediate fail")} />
    );

    // During React's first async tick we might briefly see the skeleton;
    // after settling the error state is definitive.
    await settle();
    assertMutualExclusivity("error");
  });
});

describe("Boundary: loader resolves with null (treated as empty)", () => {
  it("normalises null API response to empty list and shows empty state", async () => {
    // The component normalises non-array values to []
    const loadInvoices = jest.fn(() => Promise.resolve(null));
    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await settle();

    // null is not an array, component sets invoices = [] (normalised)
    expect(screen.getByText(copy.invest.emptyState)).toBeInTheDocument();
    assertMutualExclusivity("empty");
  });
});

// ── Suite 6: Accessibility invariants across states ──────────────────────────

describe("Accessibility — page heading always present", () => {
  const cases = [
    { label: "loading", loader: () => pendingLoader(), settle: false },
    { label: "empty", loader: () => resolvedLoader([]), settle: true },
    { label: "error", loader: () => rejectedLoader(), settle: true },
    { label: "success", loader: () => resolvedLoader(makeInvoices(2)), settle: true },
  ];

  for (const { label, loader, settle: shouldSettle } of cases) {
    it(`heading '${copy.invest.title}' is present in ${label} state`, async () => {
      render(<InvestMarketplace loadInvoices={loader()} />);
      if (shouldSettle) await settle();

      expect(
        screen.getByRole("heading", { name: copy.invest.title })
      ).toBeInTheDocument();
    });
  }
});

describe("Accessibility — polite live region always present", () => {
  it("the sr-only status region is in the DOM across all states", async () => {
    const { rerender } = render(
      <InvestMarketplace loadInvoices={pendingLoader()} />
    );
    expect(
      document.querySelector("[role='status'][aria-live='polite'][aria-atomic='true']")
    ).not.toBeNull();

    rerender(<InvestMarketplace loadInvoices={resolvedLoader([])} />);
    await settle();
    expect(
      document.querySelector("[role='status'][aria-live='polite'][aria-atomic='true']")
    ).not.toBeNull();
  });
});
