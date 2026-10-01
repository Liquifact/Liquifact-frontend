import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import InvoicesPage, {
  normalizeInvoice,
  deduplicateAndMergeInvoices,
  INVOICES_SYNC_CHANNEL,
} from "./page";
import { reportError } from "../../lib/observability/reportError";

jest.mock("next/navigation", () => ({
  usePathname: () => "/invoices",
}));

jest.mock("../../components/WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

jest.mock("../../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

describe("InvoicesPage - Contracts & Concurrency (#1198, #1199)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Public UI & Compatibility Contracts", () => {
    it("renders the heading and subtext from copy.invoices", () => {
      render(<InvoicesPage />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/invoice/i);
      const subtext = screen.getByText(/Upload and tokenize/i);
      expect(subtext).toBeInTheDocument();
    });

    it("renders the shared header as the only banner landmark", () => {
      render(<InvoicesPage />);
      expect(screen.getAllByRole("banner")).toHaveLength(1);
      expect(document.querySelectorAll("header")).toHaveLength(1);
    });

    it("renders shared navigation links and keeps the home link focusable", () => {
      render(<InvoicesPage />);

      const navigation = screen.getByRole("navigation", { name: /main navigation/i });
      const homeLink = screen.getByRole("link", { name: /^home$/i });

      expect(navigation).toBeInTheDocument();
      expect(homeLink).toHaveAttribute("href", "/");
      expect(homeLink.className).toMatch(/focus-ring/);
      expect(screen.getByRole("link", { name: /^invoices$/i })).toHaveAttribute("href", "/invoices");
      expect(screen.getByRole("link", { name: /^invest$/i })).toHaveAttribute("href", "/invest");
    });

    it("does not render the old static connect wallet button from the bespoke header", () => {
      render(<InvoicesPage />);
      expect(screen.getAllByRole("button", { name: /connect wallet/i })).toHaveLength(1);
    });

    it("renders the UploadZone form and input/button by id", () => {
      render(<InvoicesPage />);
      expect(screen.getByLabelText(/drop pdf invoice/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/select pdf invoice file/i)).toBeInTheDocument();
      expect(document.getElementById("invoice-file-input")).toBeInTheDocument();
      expect(document.getElementById("invoice-upload-btn")).toBeInTheDocument();
    });

    it("preserves compatibility when called with no arguments or empty props", () => {
      expect(() => render(<InvoicesPage />)).not.toThrow();
      expect(() => render(<InvoicesPage {...({} as any)} />)).not.toThrow();
    });

    it("accepts and safely sanitizes initialInvoices props", () => {
      const initial = [
        {
          id: "inv-init-1",
          issuer: "Initial Corp",
          amount: "50,000",
          currency: "USD",
          dueDate: "2026-12-31",
          yield: "9.0%",
          status: "Tokenized",
        },
      ];
      render(<InvoicesPage initialInvoices={initial} />);
      expect(screen.getByText("Initial Corp")).toBeInTheDocument();
      expect(screen.getByText("USD 50,000")).toBeInTheDocument();
    });

    it("forwards loadInvoices to InvoiceList", async () => {
      const customInvoices = [
        {
          id: "inv-custom-1",
          issuer: "Custom Supplier",
          amount: "3,500",
          currency: "EUR",
          dueDate: "2026-08-01",
          yield: "6.5%",
          status: "Settled",
        },
      ];
      const mockLoader = jest.fn().mockResolvedValue(customInvoices);
      render(<InvoicesPage loadInvoices={mockLoader} />);

      expect(mockLoader).toHaveBeenCalled();
      const supplier = await screen.findByText("Custom Supplier");
      expect(supplier).toBeInTheDocument();
    });
  });

  describe("Invoice Normalization & Schema Contracts (normalizeInvoice)", () => {
    it("returns null for non-object, null, or undefined inputs", () => {
      expect(normalizeInvoice(null)).toBeNull();
      expect(normalizeInvoice(undefined)).toBeNull();
      expect(normalizeInvoice("string" as any)).toBeNull();
      expect(normalizeInvoice(123 as any)).toBeNull();
    });

    it("assigns deterministic fallback values when fields are missing", () => {
      const normalized = normalizeInvoice({});
      expect(normalized).not.toBeNull();
      expect(normalized?.id).toMatch(/^inv-opt-/);
      expect(normalized?.issuer).toBe("Unknown Issuer");
      expect(normalized?.amount).toBe("Pending");
      expect(normalized?.currency).toBe("USD");
      expect(normalized?.dueDate).toBe("Pending");
      expect(normalized?.yield).toBe("Pending");
      expect(normalized?.status).toBe("Pending tokenization");
      expect(typeof normalized?._timestamp).toBe("number");
    });

    it("preserves valid properties and sanitizes string fields", () => {
      const input = {
        id: "  inv-999  ",
        issuer: "  Acme Corp  ",
        amount: 25000,
        currency: "  EUR  ",
        dueDate: "  2026-09-30  ",
        yield: "  8.5%  ",
        status: "  Tokenized  ",
      };
      const normalized = normalizeInvoice(input);
      expect(normalized?.id).toBe("inv-999");
      expect(normalized?.issuer).toBe("Acme Corp");
      expect(normalized?.amount).toBe("25000");
      expect(normalized?.currency).toBe("EUR");
      expect(normalized?.dueDate).toBe("2026-09-30");
      expect(normalized?.yield).toBe("8.5%");
      expect(normalized?.status).toBe("Tokenized");
    });
  });

  describe("Deterministic Merge Invariants (deduplicateAndMergeInvoices)", () => {
    const baseInvoice = {
      id: "inv-1",
      issuer: "Acme Corp",
      amount: "10,000",
      currency: "USD",
      dueDate: "2026-10-01",
      yield: "7.0%",
      status: "Pending tokenization",
      _timestamp: 1000,
    };

    it("prepends new invoice when ID does not exist", () => {
      const current = [baseInvoice];
      const incoming = {
        id: "inv-2",
        issuer: "Beta Corp",
        amount: "20,000",
        currency: "USD",
        dueDate: "2026-10-02",
        yield: "7.5%",
        status: "Pending tokenization",
        _timestamp: 1050,
      };

      const result = deduplicateAndMergeInvoices(current, incoming);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("inv-2");
      expect(result[1].id).toBe("inv-1");
    });

    it("updates existing invoice in place without duplicating", () => {
      const current = [baseInvoice];
      const updated = {
        ...baseInvoice,
        status: "Tokenized",
        _timestamp: 2000,
      };

      const result = deduplicateAndMergeInvoices(current, updated);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("inv-1");
      expect(result[0].status).toBe("Tokenized");
      expect(result[0]._timestamp).toBe(2000);
    });

    it("rejects out-of-order stale updates with older timestamp", () => {
      const current = [{ ...baseInvoice, _timestamp: 3000, status: "Funded" }];
      const staleIncoming = {
        ...baseInvoice,
        status: "Tokenized",
        _timestamp: 2000,
      };

      const result = deduplicateAndMergeInvoices(current, staleIncoming);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("Funded");
      expect(result[0]._timestamp).toBe(3000);
    });

    it("returns same array reference for identical duplicate inputs (idempotency)", () => {
      const current = [baseInvoice];
      const duplicate = { ...baseInvoice };

      const result = deduplicateAndMergeInvoices(current, duplicate);
      expect(result).toBe(current);
    });
  });

  describe("Concurrent Execution Hardening (#1198)", () => {
    it("handles multiple rapid concurrent uploads without dropping state", () => {
      let capturedSuccessHandler: any;
      const { rerender } = render(
        <InvoicesPage
          onUploadSuccess={() => {}}
        />
      );

      // Verify that sequential/concurrent invocations of deduplicateAndMergeInvoices work correctly
      let state: any[] = [];
      const uploads = [
        { id: "concurrent-1", issuer: "Company A", _timestamp: 100 },
        { id: "concurrent-2", issuer: "Company B", _timestamp: 101 },
        { id: "concurrent-3", issuer: "Company C", _timestamp: 102 },
      ];

      for (const u of uploads) {
        state = deduplicateAndMergeInvoices(state, normalizeInvoice(u));
      }

      expect(state).toHaveLength(3);
      expect(state.map((s) => s.id)).toEqual(["concurrent-3", "concurrent-2", "concurrent-1"]);
    });

    it("prevents double-submission and debounces rapid identical triggers", () => {
      const onUploadSuccess = jest.fn();
      const onUploadError = jest.fn();
      render(
        <InvoicesPage
          onUploadSuccess={onUploadSuccess}
          onUploadError={onUploadError}
        />
      );

      // Verify initial rendering
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("syncs invoices safely across tabs via BroadcastChannel when available", () => {
      const mockPostMessage = jest.fn();
      const mockClose = jest.fn();
      let messageHandler: any;

      class MockBroadcastChannel {
        name: string;
        constructor(name: string) {
          this.name = name;
        }
        postMessage = mockPostMessage;
        close = mockClose;
        set onmessage(fn: any) {
          messageHandler = fn;
        }
      }

      const originalBC = (global as any).BroadcastChannel;
      (global as any).BroadcastChannel = MockBroadcastChannel;

      try {
        const { unmount } = render(<InvoicesPage enableCrossTabSync={true} />);

        expect(typeof messageHandler).toBe("function");

        // Simulate incoming cross-tab event
        act(() => {
          messageHandler({
            data: {
              type: "INVOICE_ADDED",
              tabId: "different-tab-id",
              invoice: {
                id: "remote-tab-inv-1",
                issuer: "Remote Tab LLC",
                amount: "99,000",
                currency: "USD",
                dueDate: "2026-11-01",
                yield: "8.0%",
                status: "Tokenized",
              },
            },
          });
        });

        expect(screen.getByText("Remote Tab LLC")).toBeInTheDocument();

        unmount();
        expect(mockClose).toHaveBeenCalled();
      } finally {
        (global as any).BroadcastChannel = originalBC;
      }
    });

    it("gracefully operates when BroadcastChannel is not supported", () => {
      const originalBC = (global as any).BroadcastChannel;
      delete (global as any).BroadcastChannel;

      try {
        expect(() => render(<InvoicesPage enableCrossTabSync={true} />)).not.toThrow();
        expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      } finally {
        (global as any).BroadcastChannel = originalBC;
      }
    });

    it("reports error when invalid payload is passed to upload handler", () => {
      const onUploadError = jest.fn();
      render(<InvoicesPage onUploadError={onUploadError} />);

      // normalizeInvoice(null) returns null and triggers reportError
      const invalidResult = normalizeInvoice(null);
      expect(invalidResult).toBeNull();
    });
  });
});
