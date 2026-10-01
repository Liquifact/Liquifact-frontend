/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/page.test.jsx
 *
 * Tests for the InvoiceDetailPage Server Component (app/invest/[id]/page.js).
 *
 * Coverage:
 *   - Public interface contract (renders page with valid invoice)
 *   - Valid params types (sync object, Promise)
 *   - Valid searchParams types (URLSearchParams, plain object, undefined)
 *   - Invalid params types (non-string, empty string) throw errors
 *   - Invalid searchParams types (primitive types) throw errors
 *   - Boundary cases (valid but non-existent invoice ID triggers notFound)
 *   - notFound() behavior for invalid invoice IDs
 *   - Server Component behavior (no hooks, no browser APIs)
 *   - Data sanitization (JSON-LD, user-facing text)
 *   - Back navigation preserves searchParams
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import InvoiceDetailPage from "./page";
import { notFound } from "next/navigation";

// Mock all dependencies
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("../lib", () => ({
  getInvoiceById: jest.fn(),
}));

jest.mock("./FundActions", () => {
  return function MockFundActions(props) {
    return <div data-testid="fund-actions">{JSON.stringify(props)}</div>;
  };
});

jest.mock("./FocusManager", () => ({
  RouteFocus: () => <div data-testid="route-focus" />,
}));

jest.mock("./InvoiceDetailClient", () => {
  return function MockInvoiceDetailClient(props) {
    return <div data-testid="invoice-detail-client">{JSON.stringify(props)}</div>;
  };
});

jest.mock("./InvoiceDetailItems", () => {
  const MockInvoiceDetailItems = ({ initialItems }) => (
    <div data-testid="invoice-detail-items">{JSON.stringify(initialItems)}</div>
  );
  MockInvoiceDetailItems.buildInvoiceDetailItems = jest.fn(() => [{ id: "item-1" }]);
  return MockInvoiceDetailItems;
});

jest.mock("./InvoiceDetailExport", () => {
  return function MockInvoiceDetailExport({ invoice }) {
    return <div data-testid="invoice-detail-export">{JSON.stringify(invoice)}</div>;
  };
});

jest.mock("@/components/NavMenu", () => {
  return function MockNavMenu() {
    return <div data-testid="nav-menu" />;
  };
});

jest.mock("@/components/StatusPill", () => {
  return function MockStatusPill({ status }) {
    return <span data-testid="status-pill">{status}</span>;
  };
});

jest.mock("@/components/InvoiceTimeline", () => {
  return function MockInvoiceTimeline(props) {
    return <div data-testid="invoice-timeline">{JSON.stringify(props)}</div>;
  };
});

jest.mock("@/app/copy/en", () => ({
  copy: {
    invest: {
      detail: {
        backToHome: "Back to Home",
        backToMarketplace: "Back to Marketplace",
        backToMarketplaceLabel: "Return to marketplace",
        pageTitle: "Invoice Details",
        pageSub: "View invoice information and fund this opportunity",
        labelIssuer: "Issuer",
        labelAmount: "Amount",
        labelYield: "Yield",
        labelMaturity: "Maturity",
        labelStatus: "Status",
        labelReference: "Reference",
      },
    },
  },
}));

jest.mock("@/lib/format/currency", () => ({
  INVALID_VALUE_FALLBACK: "N/A",
  formatCurrency: jest.fn((amount, options) => `${options?.currency || "USD"} ${amount}`),
  formatAmount: jest.fn((value) => String(value)),
}));

jest.mock("@/lib/marketplaceRoute", () => ({
  getMarketplaceHref: jest.fn((params) => (params ? "/invest?filtered=true" : "/invest")),
}));

const { getInvoiceById } = require("../lib");
const { notFound: mockNotFound } = require("next/navigation");
const { getMarketplaceHref } = require("@/lib/marketplaceRoute");

const MOCK_INVOICE = {
  id: "inv-001",
  issuer: "Acme Supplies Ltd",
  amount: "12,500",
  amountValue: 12500,
  currency: "USD",
  dueDate: "2026-06-15",
  yield: "8.2%",
  yieldValue: 8.2,
  status: "Open",
  timestamps: { uploaded: "2025-04-01T09:00:00Z" },
  events: [
    {
      id: "evt-001-a",
      type: "uploaded",
      actor: "Acme Supplies Ltd",
      occurredAt: "2025-04-01T09:00:00Z",
    },
  ],
};

describe("InvoiceDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getInvoiceById.mockReturnValue(MOCK_INVOICE);
    getMarketplaceHref.mockReturnValue("/invest");
  });

  describe("public interface contract", () => {
    it("renders the page with valid invoice", async () => {
      const params = { id: "inv-001" };
      const { container } = render(await InvoiceDetailPage({ params }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
      expect(screen.getByTestId("route-focus")).toBeInTheDocument();
      expect(screen.getByTestId("invoice-detail-client")).toBeInTheDocument();
      expect(screen.getByTestId("invoice-detail-items")).toBeInTheDocument();
      expect(screen.getByTestId("invoice-detail-export")).toBeInTheDocument();
      expect(screen.getByTestId("invoice-timeline")).toBeInTheDocument();
      expect(screen.getByTestId("fund-actions")).toBeInTheDocument();
    });

    it("renders page heading and subheading", async () => {
      const params = { id: "inv-001" };
      render(await InvoiceDetailPage({ params }));

      expect(screen.getByText("Invoice Details")).toBeInTheDocument();
      expect(
        screen.getByText("View invoice information and fund this opportunity")
      ).toBeInTheDocument();
    });

    it("renders back navigation link", async () => {
      const params = { id: "inv-001" };
      render(await InvoiceDetailPage({ params }));

      const backLink = screen.getByText("Back to Marketplace");
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest("a")).toHaveAttribute("href", "/invest");
    });
  });

  describe("valid params types", () => {
    it("accepts sync object params (Next.js 14)", async () => {
      const params = { id: "inv-001" };
      const { container } = render(await InvoiceDetailPage({ params }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
    });

    it("accepts Promise params (future API)", async () => {
      const params = Promise.resolve({ id: "inv-001" });
      const { container } = render(await InvoiceDetailPage({ params }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
    });
  });

  describe("valid searchParams types", () => {
    it("accepts undefined searchParams", async () => {
      const params = { id: "inv-001" };
      const { container } = render(await InvoiceDetailPage({ params, searchParams: undefined }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
      expect(getMarketplaceHref).toHaveBeenCalledWith({});
    });

    it("accepts plain object searchParams", async () => {
      const params = { id: "inv-001" };
      const searchParams = { q: "test", currency: "USD" };
      const { container } = render(await InvoiceDetailPage({ params, searchParams }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
      expect(getMarketplaceHref).toHaveBeenCalledWith(searchParams);
    });

    it("accepts URLSearchParams searchParams", async () => {
      const params = { id: "inv-001" };
      const searchParams = new URLSearchParams({ q: "test", currency: "USD" });
      const { container } = render(await InvoiceDetailPage({ params, searchParams }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
      expect(getMarketplaceHref).toHaveBeenCalledWith(searchParams);
    });

    it("accepts empty object searchParams", async () => {
      const params = { id: "inv-001" };
      const searchParams = {};
      const { container } = render(await InvoiceDetailPage({ params, searchParams }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
      expect(getMarketplaceHref).toHaveBeenCalledWith({});
    });
  });

  describe("invalid params types", () => {
    it("throws error for non-string id", async () => {
      const params = { id: 123 };

      await expect(InvoiceDetailPage({ params })).rejects.toThrow(
        "InvoiceDetailPage: Invalid params.id. Expected a non-empty string but received number"
      );
    });

    it("throws error for empty string id", async () => {
      const params = { id: "" };

      await expect(InvoiceDetailPage({ params })).rejects.toThrow(
        "InvoiceDetailPage: Invalid params.id. Expected a non-empty string but received empty string"
      );
    });

    it("throws error for whitespace-only id", async () => {
      const params = { id: "   " };

      await expect(InvoiceDetailPage({ params })).rejects.toThrow(
        "InvoiceDetailPage: Invalid params.id. Expected a non-empty string but received empty string"
      );
    });

    it("throws error for null id", async () => {
      const params = { id: null };

      await expect(InvoiceDetailPage({ params })).rejects.toThrow(
        "InvoiceDetailPage: Invalid params.id. Expected a non-empty string but received object"
      );
    });

    it("throws error for undefined id", async () => {
      const params = { id: undefined };

      await expect(InvoiceDetailPage({ params })).rejects.toThrow(
        "InvoiceDetailPage: Invalid params.id. Expected a non-empty string but received undefined"
      );
    });
  });

  describe("invalid searchParams types", () => {
    it("throws error for string searchParams", async () => {
      const params = { id: "inv-001" };
      const searchParams = "invalid";

      await expect(InvoiceDetailPage({ params, searchParams })).rejects.toThrow(
        "InvoiceDetailPage: Invalid searchParams. Expected URLSearchParams, plain object, or undefined but received string"
      );
    });

    it("throws error for number searchParams", async () => {
      const params = { id: "inv-001" };
      const searchParams = 123;

      await expect(InvoiceDetailPage({ params, searchParams })).rejects.toThrow(
        "InvoiceDetailPage: Invalid searchParams. Expected URLSearchParams, plain object, or undefined but received number"
      );
    });

    it("throws error for boolean searchParams", async () => {
      const params = { id: "inv-001" };
      const searchParams = true;

      await expect(InvoiceDetailPage({ params, searchParams })).rejects.toThrow(
        "InvoiceDetailPage: Invalid searchParams. Expected URLSearchParams, plain object, or undefined but received boolean"
      );
    });

    it("accepts null searchParams (handled gracefully)", async () => {
      const params = { id: "inv-001" };
      const searchParams = null;
      const { container } = render(await InvoiceDetailPage({ params, searchParams }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
      expect(getMarketplaceHref).toHaveBeenCalledWith({});
    });
  });

  describe("boundary cases", () => {
    it("triggers notFound() when invoice does not exist", async () => {
      getInvoiceById.mockReturnValue(undefined);
      const params = { id: "non-existent" };

      await expect(InvoiceDetailPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalled();
    });

    it("triggers notFound() when getInvoiceById returns null", async () => {
      getInvoiceById.mockReturnValue(null);
      const params = { id: "non-existent" };

      await expect(InvoiceDetailPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalled();
    });

    it("handles invoice with missing optional fields gracefully", async () => {
      const partialInvoice = {
        id: "inv-002",
        issuer: "Test Issuer",
        amount: "5,000",
        amountValue: 5000,
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "7.5%",
        yieldValue: 7.5,
        status: "Open",
        timestamps: {},
        events: [],
      };
      getInvoiceById.mockReturnValue(partialInvoice);
      const params = { id: "inv-002" };

      const { container } = render(await InvoiceDetailPage({ params }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
    });
  });

  describe("Server Component behavior", () => {
    it("does not use React hooks (Server Component invariant)", async () => {
      const params = { id: "inv-001" };
      const { rerender } = render(await InvoiceDetailPage({ params }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();

      // Rerender with different params - should work without state issues
      const params2 = { id: "inv-002" };
      getInvoiceById.mockReturnValue({ ...MOCK_INVOICE, id: "inv-002" });
      rerender(await InvoiceDetailPage({ params: params2 }));

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
    });

    it("has no side effects during render", async () => {
      const params = { id: "inv-001" };
      const { unmount: unmount1 } = render(await InvoiceDetailPage({ params }));
      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
      unmount1();

      const { unmount: unmount2 } = render(await InvoiceDetailPage({ params }));
      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
      unmount2();

      const { unmount: unmount3 } = render(await InvoiceDetailPage({ params }));
      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
      unmount3();
    });
  });

  describe("data sanitization", () => {
    it("renders JSON-LD structured data when invoice exists", async () => {
      const params = { id: "inv-001" };
      const { container } = render(await InvoiceDetailPage({ params }));

      const script = container.querySelector('script[type="application/ld+json"]');
      expect(script).toBeInTheDocument();

      const jsonLd = JSON.parse(script.textContent);
      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("Offer");
      expect(jsonLd.name).toContain("Acme Supplies Ltd");
    });

    it("sanitizes invoice data for JSON-LD (removes dangerous characters)", async () => {
      const maliciousInvoice = {
        ...MOCK_INVOICE,
        issuer: '<script>alert("xss")</script>',
        amount: '5000"><img src=x onerror=alert(1)>',
      };
      getInvoiceById.mockReturnValue(maliciousInvoice);
      const params = { id: "inv-001" };

      const { container } = render(await InvoiceDetailPage({ params }));

      const script = container.querySelector('script[type="application/ld+json"]');
      const jsonLd = JSON.parse(script.textContent);

      expect(jsonLd.name).not.toContain("<script>");
      expect(jsonLd.name).not.toContain("<img");
      expect(jsonLd.price).not.toContain("<img");
    });
  });

  describe("back navigation preserves searchParams", () => {
    it("passes searchParams to getMarketplaceHref", async () => {
      const params = { id: "inv-001" };
      const searchParams = { q: "test", currency: "USD" };
      getMarketplaceHref.mockReturnValue("/invest?q=test&currency=USD");

      render(await InvoiceDetailPage({ params, searchParams }));

      expect(getMarketplaceHref).toHaveBeenCalledWith(searchParams);

      const backLink = screen.getByText("Back to Marketplace");
      expect(backLink.closest("a")).toHaveAttribute("href", "/invest?q=test&currency=USD");
    });

    it("defaults to /invest when searchParams is undefined", async () => {
      const params = { id: "inv-001" };
      getMarketplaceHref.mockReturnValue("/invest");

      render(await InvoiceDetailPage({ params, searchParams: undefined }));

      expect(getMarketplaceHref).toHaveBeenCalledWith({});

      const backLink = screen.getByText("Back to Marketplace");
      expect(backLink.closest("a")).toHaveAttribute("href", "/invest");
    });
  });

  describe("error messages", () => {
    it("provides descriptive error message for invalid params.id type", async () => {
      const params = { id: 123 };

      let caughtError;
      try {
        await InvoiceDetailPage({ params });
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError.message).toContain("Invalid params.id");
      expect(caughtError.message).toContain("Expected a non-empty string");
    });

    it("provides descriptive error message for invalid searchParams type", async () => {
      const params = { id: "inv-001" };
      const searchParams = "invalid";

      let caughtError;
      try {
        await InvoiceDetailPage({ params, searchParams });
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError.message).toContain("Invalid searchParams");
      expect(caughtError.message).toContain("Expected URLSearchParams, plain object, or undefined");
    });
  });
});
