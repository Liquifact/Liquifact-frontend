/**
 * @file app/invest/page.error-recovery.test.jsx
 *
 * Interaction tests for the Invest marketplace error-recovery flows.
 *
 * Scenarios covered
 * ─────────────────
 * 1. Load fails → error state is shown (alert + Try again)
 * 2. User retries → error clears, skeleton shows, list recovers on success
 * 3. User "dismisses" the error by clicking Try again → banner clears
 *    immediately (marketplace has no separate dismiss control; retry is the
 *    clear path, matching ErrorBanner's single action affordance)
 * 4. Retry fails again → error state is shown again with Try again
 * 5. Rapid double retry → only the last result is applied
 *
 * All loads are injected via `loadInvoices`; no real network calls are made.
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { InvestMarketplace } from "./page";
import { copy } from "../copy/en";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function flushTimers(delayMs = 0) {
  await act(async () => {
    jest.advanceTimersByTime(delayMs);
    await Promise.resolve();
  });
}

function getInvoiceListItems() {
  return within(screen.getByRole("list", { name: /investable invoices/i })).getAllByRole(
    "listitem"
  );
}

function failingLoader(message = "boom", delayMs = 50) {
  return jest.fn(
    () => new Promise((_, reject) => setTimeout(() => reject(new Error(message)), delayMs))
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

describe("InvestMarketplace — error-recovery flows", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Scenario 1 — Load fails → error state is shown
  // -------------------------------------------------------------------------
  it("shows an error alert with Try again when the marketplace load fails", async () => {
    render(<InvestMarketplace loadInvoices={failingLoader()} />);
    await flushTimers(50);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent(copy.invest.errorTitle);
    expect(alert).toHaveTextContent(copy.invest.errorDescription);
    expect(screen.getByRole("button", { name: copy.invest.retryAction })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /investable invoices/i })).not.toBeInTheDocument();
  });

  it("does not expose a separate Dismiss control on the marketplace error banner", async () => {
    render(<InvestMarketplace loadInvoices={failingLoader()} />);
    await flushTimers(50);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    // The only recovery action is Try again.
    expect(screen.getAllByRole("button", { name: copy.invest.retryAction })).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Scenario 2 — User retries → recovers to success
  // -------------------------------------------------------------------------
  it("recovers to the invoice list when the user retries after a failed load", async () => {
    const invoices = makeInvoices(2);
    let callCount = 0;
    const loadInvoices = jest.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error("first fail")), 50));
      }
      return new Promise((resolve) => setTimeout(() => resolve(invoices), 50));
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.invest.retryAction }));
      await Promise.resolve();
    });

    // Error clears immediately; loading skeleton returns while retry is in flight.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: /loading investable invoices/i })).toHaveAttribute(
      "aria-busy",
      "true"
    );

    await flushTimers(50);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getInvoiceListItems()).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("2 investable invoices loaded");
    expect(loadInvoices).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Scenario 3 — "Dismiss" / clear path via Try again
  // Marketplace ErrorBanner has a single action (retry). Clicking it clears
  // the error immediately — that is the dismiss/clear affordance.
  // -------------------------------------------------------------------------
  it("clears (dismisses) the error banner immediately when Try again is clicked", async () => {
    // Keep the retry in flight so we can assert the clear happens before settle.
    let callCount = 0;
    const loadInvoices = jest.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error("fail")), 50));
      }
      // Second call never resolves during this assertion window.
      return new Promise(() => {});
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getByRole("alert")).toHaveTextContent(copy.invest.errorDescription);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.invest.retryAction }));
      await Promise.resolve();
    });

    // Dismiss/clear: banner gone before the reload settles.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(copy.invest.errorDescription)).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: /loading investable invoices/i })).toBeInTheDocument();
  });

  it("Escape does not clear the marketplace error banner on its own", async () => {
    render(<InvestMarketplace loadInvoices={failingLoader()} />);
    await flushTimers(50);

    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("alert"), { key: "Escape", code: "Escape" });
      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.invest.retryAction })).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Scenario 4 — Retry fails again → error state shown again
  // -------------------------------------------------------------------------
  it("shows the error state again when a retry also fails", async () => {
    const loadInvoices = failingLoader("always fails", 50);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.invest.retryAction }));
      await Promise.resolve();
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await flushTimers(50);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.invest.errorDescription);
    expect(screen.getByRole("button", { name: copy.invest.retryAction })).toBeInTheDocument();
    expect(loadInvoices).toHaveBeenCalledTimes(2);
  });

  it("error alert retains assertive live region after a retry failure", async () => {
    render(<InvestMarketplace loadInvoices={failingLoader()} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.invest.retryAction }));
      await Promise.resolve();
    });
    await flushTimers(50);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent(copy.invest.errorTitle);
  });

  // -------------------------------------------------------------------------
  // Scenario 5 — Rapid double retry / abort safety
  // -------------------------------------------------------------------------
  it("applies only the last retry result when the user retries rapidly", async () => {
    const invoices = makeInvoices(1);
    let callCount = 0;
    const loadInvoices = jest.fn(() => {
      callCount += 1;
      if (callCount <= 2) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error("fail")), 50));
      }
      return new Promise((resolve) => setTimeout(() => resolve(invoices), 50));
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.invest.retryAction }));
      await Promise.resolve();
    });
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.invest.retryAction }));
      await Promise.resolve();
    });
    await flushTimers(50);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getInvoiceListItems()).toHaveLength(1);
    expect(loadInvoices).toHaveBeenCalledTimes(3);
  });

  it("successful loader after failure restores the polite status announcement", async () => {
    const invoices = makeInvoices(3);
    let callCount = 0;
    const loadInvoices = jest.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error("fail")), 50));
      }
      return new Promise((resolve) => setTimeout(() => resolve(invoices), 50));
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.invest.retryAction }));
      await Promise.resolve();
    });
    await flushTimers(50);

    expect(screen.getByRole("status")).toHaveTextContent("3 investable invoices loaded");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
