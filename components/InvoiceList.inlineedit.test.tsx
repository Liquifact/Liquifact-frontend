import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import InvoiceList from "./InvoiceList";
import { copy } from "../app/copy/en";

const MOCK_INVOICES = [
  {
    id: "inv-1001",
    issuer: "Original Supplier",
    amount: "10,000",
    currency: "USD",
    dueDate: "2026-08-01",
    yield: "5.0%",
    status: "Pending tokenization",
  },
  {
    id: "inv-1002",
    issuer: "Second Corp",
    amount: "5,000",
    currency: "EUR",
    dueDate: "2026-09-01",
    yield: "6.0%",
    status: "Tokenized",
  },
];

function makeLoader(invoices = MOCK_INVOICES) {
  return jest.fn().mockResolvedValue(invoices);
}

async function renderAndWait(invoices = MOCK_INVOICES, props = {}) {
  const loader = makeLoader(invoices);
  const utils = render(<InvoiceList loadInvoices={loader} {...props} />);
  await waitFor(() => expect(screen.getByText(invoices[0].issuer)).toBeInTheDocument());
  return utils;
}

describe("InvoiceList — Inline Edit Mode", () => {
  it("renders an Edit button for each invoice row in view mode", async () => {
    await renderAndWait();
    const editButtons = screen.getAllByRole("button", { name: /edit invoice/i });
    expect(editButtons).toHaveLength(2);
    expect(editButtons[0]).toHaveTextContent("Edit");
  });

  it("switches to inline edit mode when Edit button is clicked", async () => {
    await renderAndWait();
    const editButton = screen.getByRole("button", { name: "Edit invoice inv-1001" });
    fireEvent.click(editButton);

    expect(screen.getByLabelText("Issuer")).toHaveValue("Original Supplier");
    expect(screen.getByLabelText("Amount")).toHaveValue("10,000");
    expect(screen.getByLabelText("Currency")).toHaveValue("USD");
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-08-01");
    expect(screen.getByLabelText("Estimated yield")).toHaveValue("5.0%");

    expect(screen.getByRole("button", { name: "Save edits for invoice inv-1001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel editing invoice inv-1001" })).toBeInTheDocument();
  });

  it("saves valid inline edits and updates the displayed row", async () => {
    const onUpdateInvoice = jest.fn();
    await renderAndWait(MOCK_INVOICES, { onUpdateInvoice });

    fireEvent.click(screen.getByRole("button", { name: "Edit invoice inv-1001" }));

    const issuerInput = screen.getByLabelText("Issuer");
    const amountInput = screen.getByLabelText("Amount");

    fireEvent.change(issuerInput, { target: { value: "Updated Supplier Inc" } });
    fireEvent.change(amountInput, { target: { value: "15,500" } });

    fireEvent.click(screen.getByRole("button", { name: "Save edits for invoice inv-1001" }));

    await waitFor(() => {
      expect(screen.getByText("Updated Supplier Inc")).toBeInTheDocument();
    });

    expect(screen.getByText("USD 15,500")).toBeInTheDocument();
    expect(screen.queryByLabelText("Issuer")).not.toBeInTheDocument();
    expect(onUpdateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "inv-1001",
        issuer: "Updated Supplier Inc",
        amount: "15,500",
      })
    );
  });

  it("blocks save when required fields are empty and displays validation error", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole("button", { name: "Edit invoice inv-1001" }));

    const issuerInput = screen.getByLabelText("Issuer");
    fireEvent.change(issuerInput, { target: { value: "   " } });

    fireEvent.click(screen.getByRole("button", { name: "Save edits for invoice inv-1001" }));

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/issuer name is required/i);
    expect(screen.getByLabelText("Issuer")).toBeInTheDocument();
  });

  it("blocks save when amount is empty", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole("button", { name: "Edit invoice inv-1001" }));

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save edits for invoice inv-1001" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/amount is required/i);
  });

  it("blocks save when currency is empty", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole("button", { name: "Edit invoice inv-1001" }));

    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save edits for invoice inv-1001" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/currency is required/i);
  });

  it("blocks save when due date is empty", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole("button", { name: "Edit invoice inv-1001" }));

    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save edits for invoice inv-1001" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/due date is required/i);
  });

  it("cancels editing and restores original values when Cancel button is clicked", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole("button", { name: "Edit invoice inv-1001" }));

    fireEvent.change(screen.getByLabelText("Issuer"), { target: { value: "Discarded Changes" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel editing invoice inv-1001" }));

    expect(screen.getByText("Original Supplier")).toBeInTheDocument();
    expect(screen.queryByText("Discarded Changes")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Issuer")).not.toBeInTheDocument();
  });

  it("cancels editing when Escape key is pressed", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole("button", { name: "Edit invoice inv-1001" }));

    const issuerInput = screen.getByLabelText("Issuer");
    fireEvent.change(issuerInput, { target: { value: "Unsaved Text" } });

    fireEvent.keyDown(issuerInput, { key: "Escape" });

    expect(screen.getByText("Original Supplier")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved Text")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Issuer")).not.toBeInTheDocument();
  });

  it("announces edit status changes to screen readers via live region", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole("button", { name: "Edit invoice inv-1001" }));

    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toHaveTextContent(/editing invoice inv-1001/i);

    fireEvent.click(screen.getByRole("button", { name: "Save edits for invoice inv-1001" }));
    expect(statusRegion).toHaveTextContent(/updated successfully/i);
  });
});
