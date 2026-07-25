import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceList from "./InvoiceList";

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("./ToastProvider", () => ({
  useToast: () => mockToast,
  ToastContext: null,
  ToastProvider: ({ children }) => children,
}));

function createMockInvoices(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `inv-${1001 + i}`,
    issuer: `Company ${i + 1}`,
    amount: `${(i + 1) * 1000}`,
    currency: "USD",
    dueDate: "2026-06-15",
    yield: `${((i + 1) * 0.5).toFixed(1)}%`,
    status: i % 2 === 0 ? "Tokenized" : "Settled",
  }));
}

// Helper: wait for invoices to finish loading
async function waitForLoad() {
  await waitFor(() => {
    expect(screen.getByText("Company 1")).toBeInTheDocument();
  });
}

describe("InvoiceList - Bulk selection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Row selection", () => {
    it("renders a checkbox for each invoice row", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const rowCheckboxes = screen.getAllByRole("checkbox").filter(
        (cb) => cb.getAttribute("aria-label")?.startsWith("Select invoice")
      );
      expect(rowCheckboxes).toHaveLength(2);
    });

    it("selecting an individual checkbox checks it and shows the toolbar", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();

      const checkbox = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toBeInTheDocument();
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });

    it("deselecting an individual checkbox unchecks it", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByRole("toolbar")).toBeInTheDocument();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    it("select-all selects every visible row", async () => {
      const invoices = createMockInvoices(3);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const selectAll = screen.getByLabelText("Select all invoices");
      fireEvent.click(selectAll);

      const rowCheckboxes = screen.getAllByRole("checkbox").filter(
        (cb) => cb.getAttribute("aria-label")?.startsWith("Select invoice")
      );
      rowCheckboxes.forEach((cb) => expect(cb).toBeChecked());

      expect(screen.getByText("3 selected")).toBeInTheDocument();
    });

    it("select-all toggled again deselects all rows", async () => {
      const invoices = createMockInvoices(3);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const selectAll = screen.getByLabelText("Select all invoices");
      fireEvent.click(selectAll);

      fireEvent.click(selectAll);

      const rowCheckboxes = screen.getAllByRole("checkbox").filter(
        (cb) => cb.getAttribute("aria-label")?.startsWith("Select invoice")
      );
      rowCheckboxes.forEach((cb) => expect(cb).not.toBeChecked());

      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    it("shows indeterminate state on select-all when partially selected", async () => {
      const invoices = createMockInvoices(3);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      const selectAll = screen.getByLabelText("Select all invoices") as HTMLInputElement;
      expect(selectAll.indeterminate).toBe(true);
    });

    it("does NOT trigger select-all behavior when some rows are selected individually", async () => {
      const invoices = createMockInvoices(3);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      const checkbox2 = screen.getByLabelText("Select invoice inv-1003 from Company 3");
      expect(checkbox2).not.toBeChecked();
    });

    it("clear selection removes all selections and hides toolbar", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);
      const checkbox2 = screen.getByLabelText("Select invoice inv-1002 from Company 2");
      fireEvent.click(checkbox2);

      expect(screen.getByRole("toolbar")).toBeInTheDocument();

      const clearBtn = screen.getByRole("button", { name: /clear selection/i });
      fireEvent.click(clearBtn);

      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
      expect(checkbox1).not.toBeChecked();
      expect(checkbox2).not.toBeChecked();
    });
  });

  describe("Bulk delete with confirmation", () => {
    it("opens confirmation dialog when delete is requested", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      const deleteBtn = screen.getByRole("button", { name: /delete selected/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Delete 1 invoice/i)).toBeInTheDocument();
    });

    it("deletes selected invoices when confirmation is accepted", async () => {
      const invoices = createMockInvoices(2);
      const loader = jest.fn().mockResolvedValue(invoices);
      render(<InvoiceList loadInvoices={loader} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      const deleteBtn = screen.getByRole("button", { name: /delete selected/i });
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByRole("button", { name: /^delete$/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.queryByText("Company 1")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Company 2")).toBeInTheDocument();

      expect(mockToast.success).toHaveBeenCalledWith("Deleted 1 invoice.");
    });

    it("does NOT delete invoices when confirmation is cancelled", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      const deleteBtn = screen.getByRole("button", { name: /delete selected/i });
      fireEvent.click(deleteBtn);

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelBtn);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("Company 1")).toBeInTheDocument();
      expect(screen.getByText("Company 2")).toBeInTheDocument();
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it("closes dialog on backdrop click", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      const deleteBtn = screen.getByRole("button", { name: /delete selected/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const backdrop = screen.getByTestId("confirm-dialog-backdrop");
      fireEvent.click(backdrop);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes dialog on Escape key", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      const deleteBtn = screen.getByRole("button", { name: /delete selected/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Bulk delete — multiple selections", () => {
    it("deletes multiple selected invoices on confirm", async () => {
      const invoices = createMockInvoices(3);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);
      const checkbox2 = screen.getByLabelText("Select invoice inv-1003 from Company 3");
      fireEvent.click(checkbox2);

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }));

      expect(screen.getByText(/Delete 2 invoices/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => {
        expect(screen.queryByText("Company 1")).not.toBeInTheDocument();
      });
      expect(screen.queryByText("Company 3")).not.toBeInTheDocument();
      expect(screen.getByText("Company 2")).toBeInTheDocument();

      expect(mockToast.success).toHaveBeenCalledWith("Deleted 2 invoices.");
    });
  });

  describe("Accessibility", () => {
    it("checkboxes are keyboard-operable via Space", async () => {
      const user = userEvent.setup();
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      checkbox1.focus();
      expect(checkbox1).toHaveFocus();

      await user.keyboard(" ");
      expect(checkbox1).toBeChecked();
      expect(screen.getByRole("toolbar")).toBeInTheDocument();

      await user.keyboard(" ");
      expect(checkbox1).not.toBeChecked();
      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    it("toolbar buttons are focusable and operable via keyboard", async () => {
      const user = userEvent.setup();
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      const clearBtn = screen.getByRole("button", { name: /clear selection/i });
      clearBtn.focus();
      expect(clearBtn).toHaveFocus();

      await user.keyboard(" ");
      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    it("checkboxes have accessible labels identifying the row", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const cb1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      expect(cb1).toBeInTheDocument();
      expect(cb1).toHaveAttribute("type", "checkbox");

      const cb2 = screen.getByLabelText("Select invoice inv-1002 from Company 2");
      expect(cb2).toBeInTheDocument();
    });

    it("select-all checkbox has appropriate aria-label", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      expect(screen.getByLabelText("Select all invoices")).toBeInTheDocument();
    });

    it("select-all aria-label changes to deselect when all selected", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const selectAll = screen.getByLabelText("Select all invoices");
      fireEvent.click(selectAll);

      expect(screen.getByLabelText("Deselect all invoices")).toBeInTheDocument();
    });

    it("announces bulk delete result via aria-live region", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }));
      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => {
        const statusElements = screen.getAllByRole("status");
        const announcementEl = statusElements.find((el) => el.textContent === "Deleted 1 invoice.");
        expect(announcementEl).toBeInTheDocument();
        expect(announcementEl).toHaveAttribute("aria-live", "polite");
      });
    });
  });

  describe("Toolbar visibility", () => {
    it("is not shown when no rows are selected", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    it("is shown with correct count when one row is selected", async () => {
      const invoices = createMockInvoices(3);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      fireEvent.click(screen.getByLabelText("Select invoice inv-1001 from Company 1"));
      expect(screen.getByText("1 selected")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Select invoice inv-1002 from Company 2"));
      expect(screen.getByText("2 selected")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Select invoice inv-1003 from Company 3"));
      expect(screen.getByText("3 selected")).toBeInTheDocument();
    });

    it("hides after bulk delete completes", async () => {
      const invoices = createMockInvoices(2);
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue(invoices)} />);
      await waitForLoad();

      fireEvent.click(screen.getByLabelText("Select invoice inv-1001 from Company 1"));
      expect(screen.getByRole("toolbar")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }));
      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => {
        expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
      });
    });
  });

  describe("Edge cases", () => {
    it("select-all checkbox is not rendered when list is empty", async () => {
      render(<InvoiceList loadInvoices={jest.fn().mockResolvedValue([])} />);
      await waitFor(() => {
        expect(screen.getAllByText(/Upload your first invoice/i).length).toBeGreaterThan(0);
      });

      expect(screen.queryByLabelText(/select all/i)).not.toBeInTheDocument();
    });

    it("select-all checkbox is not rendered while loading", () => {
      const loader = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<InvoiceList loadInvoices={loader} />);

      expect(screen.queryByLabelText(/select all/i)).not.toBeInTheDocument();
    });

    it("no checkboxes in error state", async () => {
      render(
        <InvoiceList loadInvoices={jest.fn().mockRejectedValue(new Error("fail"))} />
      );
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("selection is preserved when optimisticInvoices changes", async () => {
      const invoices = createMockInvoices(2);
      const loader = jest.fn().mockResolvedValue(invoices);
      const { rerender } = render(
        <InvoiceList loadInvoices={loader} optimisticInvoices={[]} />
      );
      await waitForLoad();

      const checkbox1 = screen.getByLabelText("Select invoice inv-1001 from Company 1");
      fireEvent.click(checkbox1);

      rerender(
        <InvoiceList
          loadInvoices={loader}
          optimisticInvoices={[
            {
              id: "inv-new",
              issuer: "New Co",
              amount: "500",
              currency: "USD",
              dueDate: "2026-08-01",
              yield: "5.0%",
              status: "Pending tokenization",
            },
          ]}
        />
      );

      expect(checkbox1).toBeChecked();
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });
  });

  describe("Existing tests still pass", () => {
    it("renders invoices and status badges on successful load", async () => {
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
  });
});
