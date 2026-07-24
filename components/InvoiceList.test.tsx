import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import InvoiceList from "./InvoiceList";
import { copy } from "../app/copy/en";

describe("InvoiceList", () => {
  it("renders invoices and status badges on successful load", async () => {
    // ❌ Change the component mock data arrays inside your test file to match this:
    const MOCK_TEST_INVOICES = [
      {
        id: "inv-1001",
        issuer: "Test Supplier",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Tokenized",
      },
      {
        id: "inv-1002",
        issuer: "Another LLC",
        amount: "7,800",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "7.5%",
        status: "Settled",
      },
    ];

    const loader = jest.fn().mockResolvedValue(MOCK_TEST_INVOICES);

    render(<InvoiceList loadInvoices={loader} />);

    await waitFor(() => expect(screen.getByText("Test Supplier")).toBeInTheDocument());

    expect(screen.getByRole("heading", { name: /your invoices/i })).toBeInTheDocument();
    expect(screen.getByText("Another LLC")).toBeInTheDocument();
    expect(screen.getByText("Tokenized")).toBeInTheDocument();
    expect(screen.getByText("Settled")).toBeInTheDocument();
  });

  it("renders empty state when loader returns no invoices", async () => {
    const loader = jest.fn().mockResolvedValue([]);

    render(<InvoiceList loadInvoices={loader} />);

    await waitFor(() =>
      expect(screen.getAllByText(/Upload your first invoice/i).length).toBeGreaterThan(0)
    );
  });

  it("renders ErrorBanner when loader rejects", async () => {
    const loader = jest.fn().mockRejectedValue(new Error("Network failure"));

    render(<InvoiceList loadInvoices={loader} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/unable to load invoices/i)).toBeInTheDocument();
  });

  it("optimistically appends a new invoice when optimisticInvoices changes", async () => {
    const loader = jest.fn().mockResolvedValue([
      {
        id: "inv-003",
        issuer: "Stable Cargo",
        amount: "9,000",
        currency: "USD",
        dueDate: "2026-09-20",
        yield: "4.5%",
        status: "Funded",
      },
    ]);

    const { rerender } = render(<InvoiceList loadInvoices={loader} optimisticInvoices={[]} />);

    await waitFor(() => expect(screen.getByText("Stable Cargo")).toBeInTheDocument());

    rerender(
      <InvoiceList
        loadInvoices={loader}
        optimisticInvoices={[
          {
            id: "upload-123",
            issuer: "New Upload.pdf",
            amount: "Pending",
            currency: "USD",
            dueDate: "Pending",
            yield: "Pending",
            status: "Pending tokenization",
          },
        ]}
      />
    );

    await waitFor(() => expect(screen.getByText("New Upload.pdf")).toBeInTheDocument());
    expect(screen.getByText("Pending tokenization")).toBeInTheDocument();
  });

  describe("live-region announcements", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("does not announce on initial mount and announces the first meaningful status after a debounce", async () => {
      const loader = jest.fn().mockResolvedValue([]);

      render(<InvoiceList loadInvoices={loader} />);

      const announcer = screen.getByTestId("invoice-list-live-region");
      expect(announcer).toHaveTextContent("");

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(announcer).toHaveTextContent("No invoices are currently available.");
    });

    it("debounces rapid successive updates to the latest invoice count", async () => {
      const loader = jest.fn().mockResolvedValue([]);
      const { rerender } = render(<InvoiceList loadInvoices={loader} optimisticInvoices={[]} />);

      const announcer = screen.getByTestId("invoice-list-live-region");

      rerender(
        <InvoiceList
          loadInvoices={loader}
          optimisticInvoices={[
            {
              id: "upload-123",
              issuer: "Upload A.pdf",
              amount: "Pending",
              currency: "USD",
              dueDate: "Pending",
              yield: "Pending",
              status: "Pending tokenization",
            },
          ]}
        />
      );

      rerender(
        <InvoiceList
          loadInvoices={loader}
          optimisticInvoices={[
            {
              id: "upload-123",
              issuer: "Upload A.pdf",
              amount: "Pending",
              currency: "USD",
              dueDate: "Pending",
              yield: "Pending",
              status: "Pending tokenization",
            },
            {
              id: "upload-456",
              issuer: "Upload B.pdf",
              amount: "Pending",
              currency: "USD",
              dueDate: "Pending",
              yield: "Pending",
              status: "Pending tokenization",
            },
          ]}
        />
      );

      act(() => {
        jest.advanceTimersByTime(149);
      });
      expect(announcer).toHaveTextContent("");

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(announcer).toHaveTextContent("2 invoices available.");
    });
  });
});
