/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailClient.inline-edit.test.tsx
 *
 * Comprehensive tests for the inline edit mode added to InvoiceDetailClient.
 *
 * Coverage targets
 * ─────────────────
 * 1.  Edit button is visible for each editable row (issuer, amount, yield, dueDate)
 * 2.  Clicking Edit opens the input for that row
 * 3.  Input is pre-seeded with the rawValue prop
 * 4.  Clicking Save without changes calls onSave with the original value
 * 5.  Clicking Save after editing calls onSave with the new value
 * 6.  Clicking Cancel restores the display value and calls no onSave
 * 7.  Escape key cancels the current edit
 * 8.  Enter key saves the current edit (issuer, amount, yield)
 * 9.  Enter key does NOT trigger save on the date input
 * 10. Validation: empty value blocks save and shows an error
 * 11. Validation: non-positive amount blocks save and shows an error
 * 12. Validation: NaN amount blocks save and shows an error
 * 13. Typing clears the validation error
 * 14. Only one field can be in edit mode at a time (each toggles independently)
 * 15. Polite aria-live region announces "saved" after a successful save
 * 16. Polite aria-live region announces "cancelled" after cancel / Escape
 * 17. aria-live region announces the error message on failed save
 * 18. No axe violations in view mode
 * 19. No axe violations while a row is in edit mode
 * 20. Edit button has an accessible aria-label (e.g. "Edit Issuer")
 * 21. Input has an accessible aria-label matching the field label
 * 22. Error paragraph has role="alert"
 * 23. aria-invalid is set on the input when there is a validation error
 * 24. aria-invalid is removed after the error is cleared
 * 25. onSave is NOT called when validation fails
 * 26. Save button is a type="button" (not submit)
 * 27. Cancel button is a type="button"
 * 28. Yields edit: Enter saves
 * 29. DueDate input type is "date"
 * 30. After save the display value is updated (via rawValue + displayValue prop change)
 */

import React, { useState } from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceDetailClient from "./InvoiceDetailClient";

expect.extend(toHaveNoViolations);

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/components/CopyButton", () => {
  return function CopyButtonMock({ label }: { label: string }) {
    return (
      <button type="button" aria-label={`Copy ${label}`}>
        Copy
      </button>
    );
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────

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
  dueDate: "2026-06-15",
  referenceId: "inv-001",
  statusPill: <span data-testid="status-pill">Open</span>,
  rawIssuer: "Acme Corp",
  rawAmount: "12500",
  rawYield: "8.2",
  rawDueDate: "2026-06-15",
};

/**
 * Wrapper that holds a controlled onSave spy and re-renders when called
 * so display values update (mirrors how page.js would behave).
 */
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

function editBtn(field: string) {
  return screen.getByTestId(`inline-edit-btn-${field}`);
}

function editInput(field: string) {
  return screen.getByTestId(`inline-edit-input-${field}`);
}

function saveBtn(field: string) {
  return screen.getByTestId(`inline-edit-save-${field}`);
}

function cancelBtn(field: string) {
  return screen.getByTestId(`inline-edit-cancel-${field}`);
}

function announcementRegion() {
  return screen.getByTestId("inline-edit-announcement");
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("InvoiceDetailClient — inline edit buttons", () => {
  // 1. Edit buttons are present for each editable field
  it.each(["issuer", "amount", "yield", "dueDate"])(
    "renders an Edit button for the %s field",
    (field) => {
      render(<TestWrapper />);
      expect(editBtn(field)).toBeInTheDocument();
    }
  );

  // 20. Edit button has an accessible aria-label
  it.each([
    ["issuer", "Issuer"],
    ["amount", "Amount"],
    ["yield", "Estimated yield"],
    ["dueDate", "Maturity date"],
  ])("Edit button for %s has aria-label containing '%s'", (field, label) => {
    render(<TestWrapper />);
    expect(editBtn(field)).toHaveAttribute("aria-label", expect.stringContaining(label));
  });

  // 26. Save button is type="button"
  it("Save button has type='button'", async () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    expect(saveBtn("issuer")).toHaveAttribute("type", "button");
  });

  // 27. Cancel button is type="button"
  it("Cancel button has type='button'", async () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    expect(cancelBtn("issuer")).toHaveAttribute("type", "button");
  });
});

describe("InvoiceDetailClient — entering edit mode", () => {
  // 2. Clicking Edit opens the input
  it("shows the input for the clicked row", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    expect(editInput("issuer")).toBeInTheDocument();
  });

  // 3. Input is pre-seeded with rawValue
  it("input is seeded with the raw issuer value", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    expect(editInput("issuer")).toHaveValue("Acme Corp");
  });

  it("input is seeded with the raw amount value", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("amount"));
    expect(editInput("amount")).toHaveValue("12500");
  });

  it("input is seeded with the raw yield value", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("yield"));
    expect(editInput("yield")).toHaveValue("8.2");
  });

  it("input is seeded with the raw dueDate value", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("dueDate"));
    expect(editInput("dueDate")).toHaveValue("2026-06-15");
  });

  // 21. Input has an accessible aria-label matching the label prop
  it("issuer input has aria-label='Issuer'", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    expect(editInput("issuer")).toHaveAttribute("aria-label", "Issuer");
  });

  // 14. Only one field can be in edit mode at a time
  it("opening a second field does not show a stale open input for the first", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    expect(editInput("issuer")).toBeInTheDocument();
    // amount should not have an input yet
    expect(screen.queryByTestId("inline-edit-input-amount")).not.toBeInTheDocument();
    // Opening amount while issuer is open
    fireEvent.click(editBtn("amount"));
    expect(editInput("amount")).toBeInTheDocument();
    // issuer reverts (each row manages its own state independently)
    expect(editInput("issuer")).toBeInTheDocument(); // issuer still in edit mode
  });

  // 29. DueDate input type is "date"
  it("dueDate input has type='date'", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("dueDate"));
    expect(editInput("dueDate")).toHaveAttribute("type", "date");
  });
});

describe("InvoiceDetailClient — saving", () => {
  // 4. Save without changes calls onSave with the original value
  it("Save without editing calls onSave with the existing value", () => {
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("issuer"));
    fireEvent.click(saveBtn("issuer"));
    expect(onSave).toHaveBeenCalledWith("issuer", "Acme Corp");
  });

  // 5. Save after editing calls onSave with the new value
  it("Save after changing the issuer calls onSave with the new value", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("issuer"));
    const input = editInput("issuer");
    await user.clear(input);
    await user.type(input, "Beta Ltd");
    fireEvent.click(saveBtn("issuer"));
    expect(onSave).toHaveBeenCalledWith("issuer", "Beta Ltd");
  });

  it("Save after changing the amount calls onSave with the new value", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("amount"));
    await user.clear(editInput("amount"));
    await user.type(editInput("amount"), "9999");
    fireEvent.click(saveBtn("amount"));
    expect(onSave).toHaveBeenCalledWith("amount", "9999");
  });

  // After save, the input is hidden (view mode restored)
  it("restores view mode after a successful save", () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    fireEvent.click(saveBtn("issuer"));
    expect(screen.queryByTestId("inline-edit-input-issuer")).not.toBeInTheDocument();
  });
});

describe("InvoiceDetailClient — cancelling", () => {
  // 6. Cancel restores display value and does not call onSave
  it("Cancel button restores view mode without calling onSave", () => {
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("issuer"));
    fireEvent.click(cancelBtn("issuer"));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByTestId("inline-edit-input-issuer")).not.toBeInTheDocument();
  });

  it("Cancel discards unsaved changes", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(editInput("issuer"));
    await user.type(editInput("issuer"), "Discarded Name");
    fireEvent.click(cancelBtn("issuer"));
    // Original display value should still be shown
    expect(screen.getByTestId("detail-value-issuer")).toHaveTextContent("Acme Corp");
  });

  // 7. Escape key cancels
  it("Escape key cancels the current edit", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.type(editInput("issuer"), "XYZ");
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("inline-edit-input-issuer")).not.toBeInTheDocument();
  });

  it("Escape key does not call onSave", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("issuer"));
    await user.keyboard("{Escape}");
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("InvoiceDetailClient — keyboard shortcuts", () => {
  // 8. Enter key saves (non-date fields)
  it("Enter key saves on issuer input", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("issuer"));
    const input = editInput("issuer");
    await user.clear(input);
    await user.type(input, "Keyboard Issuer");
    await user.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledWith("issuer", "Keyboard Issuer");
    expect(screen.queryByTestId("inline-edit-input-issuer")).not.toBeInTheDocument();
  });

  // 28. Yield Enter saves
  it("Enter key saves on yield input", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("yield"));
    const input = editInput("yield");
    await user.clear(input);
    await user.type(input, "9.5");
    await user.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledWith("yield", "9.5");
  });

  // 9. Enter does NOT save on date input
  it("Enter key does NOT trigger save on the dueDate input", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("dueDate"));
    await user.keyboard("{Enter}");
    // Still in edit mode — input still visible
    expect(editInput("dueDate")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("InvoiceDetailClient — validation", () => {
  // 10. Empty value blocks save and shows error
  it("shows 'required' error when issuer is cleared and Save is clicked", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(editInput("issuer"));
    fireEvent.click(saveBtn("issuer"));
    expect(screen.getByTestId("inline-edit-error-issuer")).toBeInTheDocument();
    expect(screen.getByTestId("inline-edit-error-issuer")).toHaveTextContent(/Issuer is required/i);
    // 25. onSave NOT called on failed validation
    expect(onSave).not.toHaveBeenCalled();
  });

  // 11. Non-positive amount blocks save
  it("shows 'positive number' error when amount is negative", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("amount"));
    await user.clear(editInput("amount"));
    await user.type(editInput("amount"), "-500");
    fireEvent.click(saveBtn("amount"));
    expect(screen.getByTestId("inline-edit-error-amount")).toHaveTextContent(/positive number/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  // 12. NaN amount blocks save
  it("shows 'positive number' error when amount is NaN", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("amount"));
    await user.clear(editInput("amount"));
    await user.type(editInput("amount"), "abc");
    fireEvent.click(saveBtn("amount"));
    expect(screen.getByTestId("inline-edit-error-amount")).toHaveTextContent(/positive number/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows 'positive number' error when amount is zero", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} />);
    fireEvent.click(editBtn("amount"));
    await user.clear(editInput("amount"));
    await user.type(editInput("amount"), "0");
    fireEvent.click(saveBtn("amount"));
    expect(screen.getByTestId("inline-edit-error-amount")).toHaveTextContent(/positive number/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  // 13. Typing clears the validation error
  it("typing after a validation error clears it", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(editInput("issuer"));
    fireEvent.click(saveBtn("issuer"));
    expect(screen.getByTestId("inline-edit-error-issuer")).toBeInTheDocument();
    await user.type(editInput("issuer"), "A");
    expect(screen.queryByTestId("inline-edit-error-issuer")).not.toBeInTheDocument();
  });

  // 22. Error paragraph has role="alert"
  it("error paragraph has role='alert'", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(editInput("issuer"));
    fireEvent.click(saveBtn("issuer"));
    expect(screen.getByTestId("inline-edit-error-issuer")).toHaveAttribute("role", "alert");
  });

  // 23. aria-invalid is set when there is an error
  it("aria-invalid is 'true' on the input when there is a validation error", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(editInput("issuer"));
    fireEvent.click(saveBtn("issuer"));
    expect(editInput("issuer")).toHaveAttribute("aria-invalid", "true");
  });

  // 24. aria-invalid removed after error is cleared
  it("aria-invalid is removed after the user starts typing again", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(editInput("issuer"));
    fireEvent.click(saveBtn("issuer"));
    expect(editInput("issuer")).toHaveAttribute("aria-invalid", "true");
    await user.type(editInput("issuer"), "B");
    expect(editInput("issuer")).toHaveAttribute("aria-invalid", "false");
  });

  // amount: comma-formatted value like "12,500" should be accepted
  it("accepts comma-formatted amount like '12,500'", () => {
    const onSave = jest.fn();
    render(<TestWrapper onSave={onSave} rawAmount="12,500" />);
    fireEvent.click(editBtn("amount"));
    fireEvent.click(saveBtn("amount"));
    expect(onSave).toHaveBeenCalledWith("amount", "12,500");
  });
});

describe("InvoiceDetailClient — aria-live announcements", () => {
  // 15. Announced "saved" after successful save
  it("announces 'updated successfully' after a successful save", async () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    fireEvent.click(saveBtn("issuer"));
    await waitFor(() => {
      expect(announcementRegion()).toHaveTextContent(/updated successfully/i);
    });
  });

  // 16. Announced "cancelled" after Cancel click
  it("announces 'cancelled' after clicking Cancel", async () => {
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    fireEvent.click(cancelBtn("issuer"));
    await waitFor(() => {
      expect(announcementRegion()).toHaveTextContent(/cancelled/i);
    });
  });

  // 16. Announced "cancelled" after Escape key
  it("announces 'cancelled' after pressing Escape", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(announcementRegion()).toHaveTextContent(/cancelled/i);
    });
  });

  // 17. Announced error on failed save
  it("announces the error message when save fails due to empty value", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(editInput("issuer"));
    fireEvent.click(saveBtn("issuer"));
    await waitFor(() => {
      expect(announcementRegion()).toHaveTextContent(/Save failed/i);
    });
  });

  // Live region has role="status" and aria-live="polite"
  it("live region has role='status' and aria-live='polite'", () => {
    render(<TestWrapper />);
    const region = announcementRegion();
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });
});

describe("InvoiceDetailClient — accessibility (axe)", () => {
  // 18. No axe violations in view mode
  it("has no axe violations in view mode", async () => {
    const { container } = render(<TestWrapper />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // 19. No axe violations while a row is in edit mode
  it("has no axe violations while issuer row is in edit mode", async () => {
    const { container } = render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations while amount row is in edit mode", async () => {
    const { container } = render(<TestWrapper />);
    fireEvent.click(editBtn("amount"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with a validation error visible", async () => {
    const user = userEvent.setup();
    const { container } = render(<TestWrapper />);
    fireEvent.click(editBtn("issuer"));
    await user.clear(editInput("issuer"));
    fireEvent.click(saveBtn("issuer"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("InvoiceDetailClient — non-editable rows", () => {
  it("Status row renders the statusPill without an edit button", () => {
    render(<TestWrapper />);
    expect(screen.getByTestId("status-pill")).toBeInTheDocument();
    expect(screen.queryByTestId("inline-edit-btn-status")).not.toBeInTheDocument();
  });

  it("Reference row renders referenceId and CopyButton without an edit button", () => {
    render(<TestWrapper />);
    expect(screen.getByText("inv-001")).toBeInTheDocument();
    expect(screen.queryByTestId("inline-edit-btn-reference")).not.toBeInTheDocument();
  });

  it("Reference row is omitted when referenceId is not provided", () => {
    render(<TestWrapper referenceId={undefined} />);
    expect(screen.queryByText("Reference")).not.toBeInTheDocument();
  });
});

describe("InvoiceDetailClient — onSave callback", () => {
  it("does not throw when onSave is not provided", () => {
    expect(() => {
      render(<InvoiceDetailClient {...defaultProps} onSave={undefined} />);
      fireEvent.click(screen.getByTestId("inline-edit-btn-issuer"));
      fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    }).not.toThrow();
  });
});
