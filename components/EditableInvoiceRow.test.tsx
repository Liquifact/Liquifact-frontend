import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditableInvoiceRow from "./EditableInvoiceRow";
import { copy } from "@/app/copy/en";

describe("EditableInvoiceRow", () => {
  const mockInvoice = {
    id: "inv-test",
    issuer: "Test Issuer",
    amount: "10,000",
    currency: "USD",
    dueDate: "2030-10-10",
    yield: "5",
    status: "Open",
  };

  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders in view mode initially", () => {
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
    expect(screen.getByText("Test Issuer")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit Test Issuer/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /Issuer/i })).not.toBeInTheDocument();
  });

  it("enters edit mode when Edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
    const editBtn = screen.getByRole("button", { name: /Edit Test Issuer/i });
    await user.click(editBtn);

    expect(screen.getByRole("textbox", { name: /Issuer/i })).toHaveValue("Test Issuer");
    expect(screen.getByRole("textbox", { name: /Amount/i })).toHaveValue("10,000");
    expect(screen.getByRole("combobox", { name: /Status/i })).toHaveValue("Open");
  });

  it("cancels edit mode on Cancel button click", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    // Enter edit mode
    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    // Change a value
    const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
    await user.clear(issuerInput);
    await user.type(issuerInput, "Changed Issuer");

    // Cancel
    await user.click(screen.getByRole("button", { name: /Cancel/i }));

    // Should be back to view mode with original value
    expect(screen.queryByRole("textbox", { name: /Issuer/i })).not.toBeInTheDocument();
    expect(screen.getByText("Test Issuer")).toBeInTheDocument();
  });

  it("cancels edit mode on Escape key press", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
    await user.clear(issuerInput);
    await user.type(issuerInput, "Changed Issuer");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("textbox", { name: /Issuer/i })).not.toBeInTheDocument();
    expect(screen.getByText("Test Issuer")).toBeInTheDocument();
  });

  it("saves changes when form is submitted with valid data", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
    await user.clear(issuerInput);
    await user.type(issuerInput, "Updated Issuer");

    await user.click(screen.getByRole("button", { name: /Save/i }));

    expect(mockOnSave).toHaveBeenCalledWith({
      ...mockInvoice,
      issuer: "Updated Issuer",
    });
    expect(screen.queryByRole("textbox", { name: /Issuer/i })).not.toBeInTheDocument();
  });

  it("shows an inline error and blocks save when issuer is cleared (live validation)", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
    await user.clear(issuerInput);

    await user.click(screen.getByRole("button", { name: /Save/i }));

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("shows an inline error and blocks save when amount is invalid", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const amountInput = screen.getByRole("textbox", { name: /Amount/i });
    await user.clear(amountInput);
    await user.type(amountInput, "-500");

    await user.click(screen.getByRole("button", { name: /Save/i }));

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("shows validation error when amount is NaN", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const amountInput = screen.getByRole("textbox", { name: /Amount/i });
    await user.clear(amountInput);
    await user.type(amountInput, "abc");

    await user.click(screen.getByRole("button", { name: /Save/i }));

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("clears the inline error when the user types again", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
    await user.clear(issuerInput);
    await user.click(screen.getByRole("button", { name: /Save/i }));

    expect(screen.getByText("Issuer, amount, and maturity are required.")).toBeInTheDocument();

    await user.type(issuerInput, "F");
    expect(
      screen.queryByText("Issuer, amount, and maturity are required.")
    ).not.toBeInTheDocument();
  });
});
