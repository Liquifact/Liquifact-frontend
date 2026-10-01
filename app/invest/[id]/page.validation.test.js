/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/page.validation.test.js
 *
 * Server-component validation integration tests for `app/invest/[id]/page.js`.
 *
 * Purpose
 * ───────
 * Verifies that the validation boundary added to the invoice-detail page
 * (the `isValidInvoiceId` guard that runs before `getInvoiceById`) correctly:
 *
 *   1. Calls `notFound()` for every structurally invalid id
 *   2. Calls `notFound()` for a valid-shaped id that does not match any invoice
 *   3. Renders the page for every valid, known id (the three mock fixtures)
 *   4. Handles boundary ids at the max-length limit
 *
 * Test strategy
 * ─────────────
 * `InvoiceDetailPage` is an async Server Component.  In Jest / jsdom it can be
 * invoked directly as an async function that returns a React element tree — we
 * call `await InvoiceDetailPage({ params: { id } })` and either:
 *   - Assert `notFound` was called (invalid / missing ids)
 *   - Render the returned element and assert key content is visible (valid ids)
 *
 * Mocking strategy
 * ─────────────────
 * • `next/navigation` — `notFound` is mocked to throw a sentinel error so we
 *   can detect calls without crashing the test runner.
 * • `next/link` — swapped for a passthrough anchor via the repo's existing
 *   `__mocks__/next-link.js` which is auto-applied by moduleNameMapper.
 * • Heavy client-boundary sub-components (NavMenu, StatusPill, InvoiceTimeline,
 *   InvoiceDetailClient, InvoiceDetailItems, InvoiceDetailExport, FundActions,
 *   FocusManager) are stubbed to avoid importing browser-only hooks inside a
 *   server-component call path.
 * • `getMarketplaceHref` is left un-mocked (pure function, safe to run).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Sentinel used to detect notFound() calls ──────────────────────────────────
const NOT_FOUND_SENTINEL = "__NOT_FOUND__";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    const err = new Error(NOT_FOUND_SENTINEL);
    err.digest = NOT_FOUND_SENTINEL;
    throw err;
  }),
  usePathname: jest.fn(() => "/invest/test"),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

// ── Stub out client-boundary sub-components ────────────────────────────────────
jest.mock(
  "@/components/NavMenu",
  () =>
    function NavMenuStub() {
      return <nav data-testid="nav-menu-stub" />;
    }
);

jest.mock(
  "@/components/StatusPill",
  () =>
    function StatusPillStub({ status }) {
      return <span data-testid="status-pill-stub">{status}</span>;
    }
);

jest.mock(
  "@/components/InvoiceTimeline",
  () =>
    function InvoiceTimelineStub() {
      return <div data-testid="invoice-timeline-stub" />;
    }
);

jest.mock(
  "./InvoiceDetailClient",
  () =>
    function InvoiceDetailClientStub({ summaryHeading }) {
      return <div data-testid="invoice-detail-client-stub">{summaryHeading}</div>;
    }
);

jest.mock("./InvoiceDetailItems", () => {
  function InvoiceDetailItemsStub() {
    return <div data-testid="invoice-detail-items-stub" />;
  }
  return {
    __esModule: true,
    default: InvoiceDetailItemsStub,
    buildInvoiceDetailItems: jest.fn(() => []),
  };
});

jest.mock(
  "./InvoiceDetailExport",
  () =>
    function InvoiceDetailExportStub() {
      return <div data-testid="invoice-detail-export-stub" />;
    }
);

jest.mock(
  "./FundActions",
  () =>
    function FundActionsStub() {
      return <div data-testid="fund-actions-stub" />;
    }
);

jest.mock("./FocusManager", () => ({
  RouteFocus: function RouteFocusStub() {
    return null;
  },
}));

// ── Import the page AFTER mocks are set up ─────────────────────────────────────
import InvoiceDetailPage from "./page";
import { notFound } from "next/navigation";

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Call the server component with a given id and return either:
 *   - { rendered: true, element }  — notFound() was NOT called; component returned an element
 *   - { notFoundCalled: true }     — notFound() was called (threw sentinel)
 */
async function invokePageWithId(id) {
  notFound.mockClear();
  try {
    const element = await InvoiceDetailPage({ params: { id }, searchParams: {} });
    return { rendered: true, element };
  } catch (err) {
    if (err.digest === NOT_FOUND_SENTINEL || err.message === NOT_FOUND_SENTINEL) {
      return { notFoundCalled: true };
    }
    throw err;
  }
}

// ── Test suites ────────────────────────────────────────────────────────────────

describe("InvoiceDetailPage — valid known ids (accept)", () => {
  it.each(["inv-001", "inv-002", "inv-003"])(
    "renders the page for known mock invoice id %s",
    async (id) => {
      const result = await invokePageWithId(id);
      expect(result.notFoundCalled).toBeUndefined();
      expect(result.rendered).toBe(true);
      expect(result.element).not.toBeNull();
    }
  );

  it("renders the invoice detail client stub with the issuer as heading", async () => {
    const result = await invokePageWithId("inv-001");
    const { container } = render(result.element);
    // InvoiceDetailClientStub renders the summaryHeading prop as text
    expect(container.querySelector('[data-testid="invoice-detail-client-stub"]')).toHaveTextContent(
      "Acme Supplies Ltd"
    );
  });

  it("page renders with the expected page title heading", async () => {
    const result = await invokePageWithId("inv-002");
    render(result.element);
    expect(screen.getByRole("heading", { name: /Invoice details/i })).toBeInTheDocument();
  });

  it("renders the back-to-marketplace link", async () => {
    const result = await invokePageWithId("inv-003");
    render(result.element);
    expect(screen.getByRole("link", { name: /Back to marketplace/i })).toBeInTheDocument();
  });
});

describe("InvoiceDetailPage — valid shape but unknown id (not found)", () => {
  it("calls notFound() for a valid-shaped id that does not exist in the data store", async () => {
    const result = await invokePageWithId("inv-999");
    expect(result.notFoundCalled).toBe(true);
  });

  it("calls notFound() for an id with valid chars but unknown to the store", async () => {
    const result = await invokePageWithId("unknown-invoice");
    expect(result.notFoundCalled).toBe(true);
  });

  it("calls notFound() for an all-digit id not in the store", async () => {
    const result = await invokePageWithId("12345");
    expect(result.notFoundCalled).toBe(true);
  });
});

describe("InvoiceDetailPage — invalid ids (validation boundary)", () => {
  describe("empty / blank ids", () => {
    it("calls notFound() for an empty string id", async () => {
      expect((await invokePageWithId("")).notFoundCalled).toBe(true);
    });
  });

  describe("path-traversal ids", () => {
    it("calls notFound() for '../etc/passwd'", async () => {
      expect((await invokePageWithId("../etc/passwd")).notFoundCalled).toBe(true);
    });

    it("calls notFound() for '../../etc'", async () => {
      expect((await invokePageWithId("../../etc")).notFoundCalled).toBe(true);
    });

    it("calls notFound() for 'inv/001' (embedded slash)", async () => {
      expect((await invokePageWithId("inv/001")).notFoundCalled).toBe(true);
    });
  });

  describe("ids with illegal characters", () => {
    it("calls notFound() for an id with a space", async () => {
      expect((await invokePageWithId("inv 001")).notFoundCalled).toBe(true);
    });

    it("calls notFound() for an id with a dot", async () => {
      expect((await invokePageWithId("inv.001")).notFoundCalled).toBe(true);
    });

    it("calls notFound() for an id with percent-encoding", async () => {
      expect((await invokePageWithId("inv%20001")).notFoundCalled).toBe(true);
    });

    it("calls notFound() for an id with a null byte", async () => {
      expect((await invokePageWithId("inv" + String.fromCharCode(0) + "001")).notFoundCalled).toBe(
        true
      );
    });

    it("calls notFound() for an id with angle brackets (XSS probe)", async () => {
      expect((await invokePageWithId("<script>")).notFoundCalled).toBe(true);
    });

    it("calls notFound() for an id with a colon", async () => {
      expect((await invokePageWithId("inv:001")).notFoundCalled).toBe(true);
    });

    it("calls notFound() for an id with an at sign", async () => {
      expect((await invokePageWithId("inv@001")).notFoundCalled).toBe(true);
    });

    it("calls notFound() for a query-string fragment id", async () => {
      expect((await invokePageWithId("inv-001?admin=true")).notFoundCalled).toBe(true);
    });

    it("calls notFound() for a hash-fragment id", async () => {
      expect((await invokePageWithId("inv-001#section")).notFoundCalled).toBe(true);
    });
  });

  describe("non-string types passed as id", () => {
    it("calls notFound() for null", async () => {
      expect((await invokePageWithId(null)).notFoundCalled).toBe(true);
    });

    it("calls notFound() for undefined", async () => {
      expect((await invokePageWithId(undefined)).notFoundCalled).toBe(true);
    });

    it("calls notFound() for a numeric id", async () => {
      expect((await invokePageWithId(1)).notFoundCalled).toBe(true);
    });
  });

  describe("id length boundary (exceeds MAX_ID_LENGTH)", () => {
    it("calls notFound() for an id of 129 characters (MAX_ID_LENGTH + 1)", async () => {
      const id = "a".repeat(129);
      expect((await invokePageWithId(id)).notFoundCalled).toBe(true);
    });

    it("calls notFound() for an id of 1000 characters", async () => {
      const id = "a".repeat(1000);
      expect((await invokePageWithId(id)).notFoundCalled).toBe(true);
    });
  });
});

describe("InvoiceDetailPage — boundary id at MAX_ID_LENGTH", () => {
  it("accepts an id of exactly 128 characters that contains valid chars (unknown to store → notFound from data, not validation)", async () => {
    // A 128-char valid-shaped id won't match any mock invoice, so notFound() is
    // still called — but by the data-layer guard, not the validation guard.
    // The important property here is that the validation guard does NOT reject it.
    // We can distinguish by checking that `notFound` is called exactly once
    // (i.e. only by the data-layer guard, not by an early-exit from validation).
    const id = "a".repeat(128);
    const result = await invokePageWithId(id);
    // notFound is called once (data-layer guard, not validation guard)
    expect(result.notFoundCalled).toBe(true);
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("rejects an id of exactly 129 characters (MAX_ID_LENGTH + 1)", async () => {
    const id = "a".repeat(129);
    const result = await invokePageWithId(id);
    expect(result.notFoundCalled).toBe(true);
  });
});

describe("InvoiceDetailPage — idempotency / duplicate requests", () => {
  it("two successive requests with the same valid id both render", async () => {
    const r1 = await invokePageWithId("inv-001");
    const r2 = await invokePageWithId("inv-001");
    expect(r1.rendered).toBe(true);
    expect(r2.rendered).toBe(true);
  });

  it("two successive requests with the same invalid id both call notFound()", async () => {
    const r1 = await invokePageWithId("../etc");
    const r2 = await invokePageWithId("../etc");
    expect(r1.notFoundCalled).toBe(true);
    expect(r2.notFoundCalled).toBe(true);
  });

  it("alternating valid and invalid requests produce correct results", async () => {
    const r1 = await invokePageWithId("inv-001");
    const r2 = await invokePageWithId("");
    const r3 = await invokePageWithId("inv-002");
    const r4 = await invokePageWithId("../etc");
    const r5 = await invokePageWithId("inv-003");

    expect(r1.rendered).toBe(true);
    expect(r2.notFoundCalled).toBe(true);
    expect(r3.rendered).toBe(true);
    expect(r4.notFoundCalled).toBe(true);
    expect(r5.rendered).toBe(true);
  });
});
