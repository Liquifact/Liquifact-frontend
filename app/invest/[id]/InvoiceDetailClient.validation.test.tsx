/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailClient.validation.test.tsx
 *
 * Integration tests for the client-side validation behaviour added to
 * `InvoiceDetailClient` per issue #613.
 *
 * Coverage targets
 * ─────────────────
 * 1.  Save button starts enabled when the initial draft is valid.
 * 2.  Save button is disabled the moment the draft becomes invalid.
 * 3.  Save button re-enables when the draft returns to valid.
 * 4.  `aria-invalid` flips to "true" when the draft becomes invalid.
 * 5.  `aria-invalid` flips back to "false" when the draft returns to valid.
 * 6.  `aria-describedby` points to the error-paragraph id while invalid.
 * 7.  `aria-describedby` is absent once the draft is valid again.
 * 8.  Error paragraph has `role="alert"` so it is announced.
 * 9.  Clicking Save while disabled does not invoke `onSave` and does not
 *     toggle edit off.
 * 10. Pressing Enter while invalid does not invoke `onSave` (defensive guard).
 * 11. Live validation applies on every keystroke (no Submit needed).
 * 12. Each field has its own validator: issuer, amount, yield, dueDate.
 * 13. yield: non-numeric value is rejected and Save is disabled.
 * 14. yield: negative value is rejected.
 * 15. dueDate: malformed date is rejected.
 * 16. amount: zero, negative, NaN, and empty are all rejected.
 * 17. amount: comma-separated like "12,500" is accepted.
 * 18. axe: no a11y violations with an inline error rendered.
 */

import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceDetailClient from "./InvoiceDetailClient";

expect.extend(toHaveNoViolations);

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/components/CopyButton", () => {
  return function CopyButtonMock({ label }: { label: string }) {
    return (
      <button type="button" aria-label={`Copy ${label}`}>
        Copy
      </button>
    );
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
  summaryHeading: "Acme Corp",
  labelIssuer: "Issuer",
  labelAmount: "Amount",
  labelYield: "Estimated yield",
  labelMaturity: "Maturity date",
  labelStatus: "Status",
  labelReference: "Reference",
  issuer: "Acme Corp",
  formattedAmount: "$12,500.00",
  formattedYield: "8.2%",
  dueDate: "2030-06-15",
  referenceId: "inv-001",
  statusPill: <span data-testid="status-pill">Open</span>,
  rawIssuer: "Acme Corp",
  rawAmount: "12500",
  rawYield: "8.2",
  rawDueDate: "2030-06-15",
};

function TestWrapper(overrides: Partial<typeof defaultProps> & { onSave?: jest.Mock }) {
  const { onSave: externalOnSave, ...rest } = overrides;
  const [values, setValues] = useState({
    issuer: rest.issuer ?? defaultProps.issuer,
    rawIssuer: rest.rawIssuer ?? defaultProps.rawIssuer,
    formattedAmount: rest.formattedAmount ?? defaultProps.formattedAmount,
    rawAmount: rest.rawAmount ?? defaultProps.rawAmount,
    formattedYield: rest.formattedYield ?? defaultProps.formattedYield,
    rawYield: rest.rawYield ?? defaultProps.rawYield,
    dueDate: rest.dueDate ?? defaultProps.dueDate,
    rawDueDate: rest.rawDueDate ?? defaultProps.rawDueDate,
  });
  const handleSave = (field: string, value: string) => {
    externalOnSave?.(field, value);
    setValues((prev) => ({
      ...prev,
      [field]: value,
      [`raw${field.charAt(0).toUpperCase() + field.slice(1)}`]: value,
    }));
  };
  return (
    <InvoiceDetailClient
      {...defaultProps}
      {...rest}
      issuer={values.issuer}
      rawIssuer={values.rawIssuer}
      formattedAmount={values.formattedAmount}
      rawAmount={values.rawAmount}
      formattedYield={values.formattedYield}
      rawYield={values.rawYield}
      dueDate={values.dueDate}
      rawDueDate={values.rawDueDate}
      onSave={handleSave}
    />
  );
}

const editBtn = (f: string) => screen.getByTestId(`inline-edit-btn-${f}`);
const input = (f: string) => screen.getByTestId(`inline-edit-input-${f}`);
const saveBtn = (f: string) => screen.getByTestId(`inline-edit-save-${f}`);
const errorEl = (f: string) => screen.queryByTestId(`inline-edit-error-${f}`);

// ── Tests ────────────────────────────────────────────────────────────────────

describe("InvoiceDetailClient — validation: Save button state", () => {
  it("Save button starts enabled when the draft is valid", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    expect(saveBtn("issuer")).toBeEnabled();
  });

  it("Save button becomes disabled when issuer is cleared (live)", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    expect(saveBtn("issuer")).toBeEnabled();

    await user.clear(input("issuer"));
    expect(saveBtn("issuer")).toBeDisabled();
    expect(saveBtn("issuer")).toHaveAttribute("aria-disabled", "true");
  });

  it("Save button re-enables after the user types a valid value", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    expect(saveBtn("issuer")).toBeDisabled();
    await user.type(input("issuer"), "X");
    expect(saveBtn("issuer")).toBeEnabled();
  });

  it("Save button is disabled when amount is invalid (live, before clicking Save)", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("amount"));
    await user.clear(input("amount"));
    await user.type(input("amount"), "abc");
    expect(saveBtn("amount")).toBeDisabled();
  });

  it("Save button is disabled when yield is negative", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("yield"));
    await user.clear(input("yield"));
    await user.type(input("yield"), "-5");
    expect(saveBtn("yield")).toBeDisabled();
    expect(errorEl("yield")).toBeInTheDocument();
  });

  it("Save button is disabled when dueDate is malformed", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("dueDate"));
    const dateInput = input("dueDate");
    // Use direct value+change to simulate setting an invalid string
    // (jsdom accepts any string for type=date value).
    fireEvent.change(dateInput, { target: { value: "not-a-date" } });
    expect(saveBtn("dueDate")).toBeDisabled();
    expect(errorEl("dueDate")).toBeInTheDocument();
  });
});

describe("InvoiceDetailClient — validation: aria-describedby wiring", () => {
  it("aria-describedby points to the error id when the draft is invalid", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    const errorId = errorEl("issuer")?.getAttribute("id");
    expect(errorId).toBeTruthy();
    expect(input("issuer")).toHaveAttribute("aria-describedby", errorId!);
  });

  it("aria-describedby is absent once the draft is valid again", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    expect(input("issuer")).toHaveAttribute("aria-describedby");
    await user.type(input("issuer"), "Recovered");
    expect(input("issuer")).not.toHaveAttribute("aria-describedby");
  });

  it("error paragraph has role='alert' so screen readers announce it", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    expect(errorEl("issuer")).toHaveAttribute("role", "alert");
  });
});

describe("InvoiceDetailClient — validation: aria-invalid toggle", () => {
  it("aria-invalid is 'true' when the draft is invalid", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    expect(input("issuer")).toHaveAttribute("aria-invalid", "true");
  });

  it("aria-invalid becomes 'false' when the draft is valid again", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    expect(input("issuer")).toHaveAttribute("aria-invalid", "true");
    await user.type(input("issuer"), "Ok");
    expect(input("issuer")).toHaveAttribute("aria-invalid", "false");
  });
});

describe("InvoiceDetailClient — validation: click / Enter while invalid", () => {
  it("clicking disabled Save does not call onSave", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    // fireEvent.click on a disabled button does NOT invoke React onClick
    fireEvent.click(saveBtn("issuer"));
    expect(onSave).not.toHaveBeenCalled();
    // Still in edit mode (didn't accidentally close)
    expect(input("issuer")).toBeInTheDocument();
  });

  it("Enter while invalid does not call onSave (defensive guard)", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    input("issuer").focus();
    await user.keyboard("{Enter}");
    expect(onSave).not.toHaveBeenCalled();
    expect(input("issuer")).toBeInTheDocument();
  });
});

describe("InvoiceDetailClient — validation: live keystroke validation", () => {
  it("error appears immediately as user types an invalid amount", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("amount"));
    expect(errorEl("amount")).not.toBeInTheDocument();
    await user.clear(input("amount"));
    await user.type(input("amount"), "abc");
    expect(errorEl("amount")).toBeInTheDocument();
    expect(errorEl("amount")).toHaveTextContent(/positive number/i);
  });

  it("error disappears on the next valid keystroke", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("amount"));
    await user.clear(input("amount"));
    await user.type(input("amount"), "0");
    expect(errorEl("amount")).toBeInTheDocument();
    await user.clear(input("amount"));
    await user.type(input("amount"), "1");
    expect(errorEl("amount")).not.toBeInTheDocument();
  });
});

describe("InvoiceDetailClient — validation: amount specifics", () => {
  it.each(["", "0", "-1", "abc", "1,2,3"])(
    "rejects invalid amount %p",
    async (value) => {
      const user = userEvent.setup();
      render(<TestWrapper rawAmount="" />);
      fireEvent.click(editBtn("amount"));
      await user.clear(input("amount"));
      if (value !== "") await user.type(input("amount"), value);
      expect(errorEl("amount")).toBeInTheDocument();
      expect(saveBtn("amount")).toBeDisabled();
    }
  );

  it("accepts comma-separated amount like '12,500'", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} rawAmount="" />);
    fireEvent.click(editBtn("amount"));
    await user.clear(input("amount"));
    await user.type(input("amount"), "12,500");
    expect(errorEl("amount")).not.toBeInTheDocument();
    expect(saveBtn("amount")).toBeEnabled();
  });
});

describe("InvoiceDetailClient — validation: yield specifics", () => {
  it.each(["", "-1", "abc", "150"])("rejects invalid yield %p", async (value) => {
    const user = userEvent.setup();
    render(<TestWrapper rawYield="" />);
    fireEvent.click(editBtn("yield"));
    await user.clear(input("yield"));
    if (value !== "") await user.type(input("yield"), value);
    expect(errorEl("yield")).toBeInTheDocument();
    expect(saveBtn("yield")).toBeDisabled();
  });

  it("accepts a valid yield like '9.5'", async () => {
    const user = userEvent.setup();
    render(<TestWrapper rawYield="" />);
    fireEvent.click(editBtn("yield"));
    await user.clear(input("yield"));
    await user.type(input("yield"), "9.5");
    expect(errorEl("yield")).not.toBeInTheDocument();
    expect(saveBtn("yield")).toBeEnabled();
  });
});

describe("InvoiceDetailClient — validation: dueDate specifics", () => {
  it.each(["not-a-date", "06/15/2030", "2030-13-01", "2030-02-30"])(
    "rejects malformed date %p",
    (value) => {
      render(<TestWrapper />);
      fireEvent.click(editBtn("dueDate"));
      fireEvent.change(input("dueDate"), { target: { value } });
      expect(errorEl("dueDate")).toBeInTheDocument();
      expect(saveBtn("dueDate")).toBeDisabled();
    }
  );

  it("accepts a well-formed future date", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("dueDate"));
    fireEvent.change(input("dueDate"), { target: { value: "2030-12-31" } });
    expect(errorEl("dueDate")).not.toBeInTheDocument();
    expect(saveBtn("dueDate")).toBeEnabled();
  });
});

describe("InvoiceDetailClient — validation: accessibility (axe)", () => {
  it("has no axe violations with the inline error visible", async () => {
    const user = userEvent.setup();
    const { container } = render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations across all four fields opened sequentially", async () => {
    const { container } = render(<TestWrapper />);
    for (const f of ["issuer", "amount", "yield", "dueDate"]) {
      fireEvent.click(editBtn(f));
    }
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("InvoiceDetailClient — validation: optimistic save flow", () => {
  it("valid edit → Save click → onSave called with trimmed value", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(input("issuer"));
    await user.type(input("issuer"), "  Trimmed Co  ");
    expect(saveBtn("issuer")).toBeEnabled();
    fireEvent.click(saveBtn("issuer"));
    expect(onSave).toHaveBeenCalledWith("issuer", "Trimmed Co");
  });
});
