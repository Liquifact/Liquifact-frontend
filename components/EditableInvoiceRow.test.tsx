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

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
    await user.clear(issuerInput);
    await user.type(issuerInput, "Changed Issuer");

    await user.click(screen.getByRole("button", { name: /Cancel/i }));

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

    // Live validation surfaces the error BEFORE the user even clicks Save.
    expect(screen.getByTestId("edit-error-issuer")).toBeInTheDocument();
    expect(screen.getByTestId("edit-error-issuer")).toHaveTextContent(/empty/i);

    // Save button is disabled; clicking it does not save.
    const save = screen.getByRole("button", { name: /Save/i });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("shows an inline error and blocks save when amount is invalid", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const amountInput = screen.getByRole("textbox", { name: /Amount/i });
    await user.clear(amountInput);
    await user.type(amountInput, "-500");

    expect(screen.getByTestId("edit-error-amount")).toBeInTheDocument();
    expect(screen.getByTestId("edit-error-amount")).toHaveTextContent(/positive number/i);
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("shows an inline error and blocks save when amount is NaN", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const amountInput = screen.getByRole("textbox", { name: /Amount/i });
    await user.clear(amountInput);
    await user.type(amountInput, "abc");

    expect(screen.getByTestId("edit-error-amount")).toHaveTextContent(/positive number/i);
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("clears the inline error when the user types again", async () => {
    const user = userEvent.setup();
    render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);

    await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));

    const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
    await user.clear(issuerInput);
    expect(screen.getByTestId("edit-error-issuer")).toBeInTheDocument();

    await user.type(issuerInput, "F");
    expect(screen.queryByTestId("edit-error-issuer")).not.toBeInTheDocument();
  });

  // ── New tests for the inline-validation pattern (issue #613) ──────────────

  describe("validation: aria wiring", () => {
    it("aria-describedby on the issuer input points to the issuer error paragraph when invalid", async () => {
      const user = userEvent.setup();
      render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
      await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));
      const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
      await user.clear(issuerInput);
      const errorId = screen.getByTestId("edit-error-issuer").getAttribute("id");
      expect(errorId).toBeTruthy();
      expect(issuerInput).toHaveAttribute("aria-describedby", errorId);
    });

    it("aria-invalid is 'true' when the issuer error is present", async () => {
      const user = userEvent.setup();
      render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
      await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));
      const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
      await user.clear(issuerInput);
      expect(issuerInput).toHaveAttribute("aria-invalid", "true");
    });

    it("aria-describedby is removed once the user types a valid value", async () => {
      const user = userEvent.setup();
      render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
      await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));
      const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
      await user.clear(issuerInput);
      expect(issuerInput).toHaveAttribute("aria-describedby");
      await user.type(issuerInput, "Restored");
      expect(issuerInput).not.toHaveAttribute("aria-describedby");
      expect(issuerInput).toHaveAttribute("aria-invalid", "false");
    });

    it("error paragraph has role='alert' so screen readers announce it", async () => {
      const user = userEvent.setup();
      render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
      await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));
      const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
      await user.clear(issuerInput);
      expect(screen.getByTestId("edit-error-issuer")).toHaveAttribute("role", "alert");
    });
  });

  describe("validation: Save button blocked", () => {
    it("Save button is enabled when all fields stay valid", async () => {
      const user = userEvent.setup();
      render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
      await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));
      expect(screen.getByRole("button", { name: /Save/i })).toBeEnabled();
    });

    it("Save button is disabled if currency becomes invalid", async () => {
      const user = userEvent.setup();
      render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
      await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));
      const currencyInput = screen.getByRole("textbox", { name: /Currency/i });
      await user.clear(currencyInput);
      await user.type(currencyInput, "US-DOLLAR");
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
    });

    it("Save button is disabled if yield becomes invalid", async () => {
      const user = userEvent.setup();
      render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
      await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));
      const yieldInput = screen.getByRole("textbox", { name: /Yield/i });
      await user.clear(yieldInput);
      await user.type(yieldInput, "-1");
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
    });

    it("Save button is disabled if dueDate becomes invalid", () => {
      render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
      fireEvent.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));
      // <input type="date"> is not queryable via getByRole("textbox") in
      // jsdom, so use the dedicated testid instead.
      const dateInput = screen.getByTestId("edit-input-dueDate");
      fireEvent.change(dateInput, { target: { value: "not-a-date" } });
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
    });

    it("clicking a disabled Save does not call onSave", async () => {
      const user = userEvent.setup();
      render(<EditableInvoiceRow invoice={mockInvoice} onSave={mockOnSave} />);
      await user.click(screen.getByRole("button", { name: /Edit Test Issuer/i }));
      const issuerInput = screen.getByRole("textbox", { name: /Issuer/i });
      await user.clear(issuerInput);
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });
});
