/**
 * @file page.announce.test.jsx
 *
 * Tests for issue #722 – marketplace async load/retry results are announced
 * via the existing polite live region, debounced so a burst of rapid
 * results settles into a single announcement of the latest outcome.
 *
 * Filter, pagination, and search-driven announcement text (already covered
 * extensively in page.test.jsx) are NOT async results and remain immediate;
 * this file focuses on the new debounce behavior around the load effect.
 */

import "@testing-library/jest-dom";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { InvestMarketplace, ANNOUNCE_DEBOUNCE_MS } from "./page";

expect.extend(toHaveNoViolations);

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

function createDeferredLoader(invoices, delayMs = 0) {
  return jest.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(invoices), delayMs);
      })
  );
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

// A single flushTimers call only reliably fires timers that already existed
// before it started (e.g. the network setTimeout). The announcement
// debounce timer is (re)scheduled from a React effect once state settles,
// so it needs its own separate flush — see page.test.jsx's flushTimers for
// the same note.
async function flushTimers(delayMs = 0) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(delayMs);
  });
}

async function flushAnnounce() {
  await flushTimers(ANNOUNCE_DEBOUNCE_MS);
}

function getStatusRegion() {
  return screen.getByRole("status");
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe("InvestMarketplace – async load/retry announcement debounce (issue #722)", () => {
  describe("success announced", () => {
    it("announces the loaded invoice count once the load resolves", async () => {
      const loadInvoices = createDeferredLoader(makeInvoices(2), 50);
      render(<InvestMarketplace loadInvoices={loadInvoices} />);

      await flushTimers(50);
      expect(getStatusRegion()).toHaveTextContent("2 investable invoices loaded");
    });
  });

  describe("failure announced", () => {
    it("announces the load-error message once the failure settles", async () => {
      const loadInvoices = jest.fn(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("boom")), 50))
      );
      render(<InvestMarketplace loadInvoices={loadInvoices} />);

      await flushTimers(50);
      expect(getStatusRegion()).toHaveTextContent("Unable to load investable invoices.");
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("debounced rapid results", () => {
    it("coalesces a burst of retries into a single final announcement", async () => {
      const invoices = makeInvoices(1);
      let callCount = 0;
      const loadInvoices = jest.fn(() => {
        callCount += 1;
        if (callCount <= 2) {
          return new Promise((_, reject) => setTimeout(() => reject(new Error("fail")), 10));
        }
        return new Promise((resolve) => setTimeout(() => resolve(invoices), 10));
      });

      render(<InvestMarketplace loadInvoices={loadInvoices} />);

      await flushTimers(10);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /try again/i }));
        await Promise.resolve();
      });
      await flushTimers(10);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /try again/i }));
        await Promise.resolve();
      });
      await flushTimers(10);

      expect(getStatusRegion()).toHaveTextContent("1 investable invoices loaded");
      expect(getStatusRegion()).not.toHaveTextContent("Unable to load");
      expect(loadInvoices).toHaveBeenCalledTimes(3);
    });

    it("announces after the load completes", async () => {
      const loadInvoices = createDeferredLoader(makeInvoices(3), 20);
      render(<InvestMarketplace loadInvoices={loadInvoices} />);

      await flushTimers(20);
      expect(getStatusRegion()).toHaveTextContent("3 investable invoices loaded");
    });
  });

  describe("non-async announcements stay immediate", () => {
    it("does not debounce Load-more (pagination) announcements", async () => {
      const total = 14; // > PAGE_SIZE (10)
      render(<InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(total), 0)} />);
      await flushTimers(0);
      await flushAnnounce();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
        await Promise.resolve();
      });

      // No additional debounce wait needed — pagination text is immediate.
      expect(getStatusRegion()).toHaveTextContent(`Showing ${total} of ${total}`);
    });
  });

  describe("accessibility", () => {
    it("passes axe accessibility checks with the live region present", async () => {
      jest.useRealTimers();
      const { container } = render(
        <InvestMarketplace loadInvoices={createDeferredLoader(makeInvoices(1), 0)} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      jest.useFakeTimers();
    });
  });
});
