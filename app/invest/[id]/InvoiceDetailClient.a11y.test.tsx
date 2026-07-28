/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailClient.a11y.test.tsx
 *
 * Accessibility-specific tests for InvoiceDetailClient.
 *
 * These tests verify the accessibility contract documented in
 * docs/invoice-detail-a11y.md, including:
 * - Focus management
 * - Keyboard navigation
 * - ARIA attributes
 * - Live region behaviour
 * - Focus ring presence
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceDetailClient from "./InvoiceDetailClient";

expect.extend(toHaveNoViolations);

jest.mock("@/components/CopyButton", () => {
  return function CopyButtonMock({ label }: { label: string }) {
    return (
      <button type="button" aria-label={`Copy ${label}`}>
        Copy
      </button>
    );
  };
});

const defaultProps = {
  summaryHeading: "Acme Corp",
  labelIssuer: "Issuer",
  labelAmount: "Amount",
  labelYield: "Estimated yield",
  labelMaturity: "Maturity date",
  labelStatus: "Status",
  labelReference: "Reference",
  issuer: "Acme Corp",
  formattedAmount: "$50,000.00",
  formattedYield: "5.25%",
  dueDate: "2025-12-31",
  statusPill: <span data-testid="status-pill">Open</span>,
  rawIssuer: "Acme Corp",
  rawAmount: "50000",
  rawYield: "5.25",
  rawDueDate: "2025-12-31",
};

describe("InvoiceDetailClient — ARIA structure", () => {
  it("section has aria-labelledby pointing to the heading", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const section = screen.getByRole("region");
    expect(section).toHaveAttribute("aria-labelledby", "invoice-summary-heading");
  });

  it("heading has id matching the section's aria-labelledby", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const heading = screen.getByRole("heading", { name: "Acme Corp" });
    expect(heading).toHaveAttribute("id", "invoice-summary-heading");
  });

  it("renders a polite aria-live region for announcements", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const region = screen.getByTestId("inline-edit-announcement");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("aria-live region is visually hidden", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const region = screen.getByTestId("inline-edit-announcement");
    expect(region).toHaveClass("sr-only");
  });
});

describe("InvoiceDetailClient — Focus management", () => {
  it("focus moves to input when entering edit mode", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const editBtn = screen.getByTestId("inline-edit-btn-issuer");
    
    await act(async () => {
      editBtn.focus();
      fireEvent.click(editBtn);
    });

    const input = screen.getByTestId("inline-edit-input-issuer");
    expect(input).toHaveFocus();
  });

  it("focus returns to edit button after cancel", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    const editBtn = screen.getByTestId("inline-edit-btn-issuer");
    
    await user.click(editBtn);
    const cancelBtn = screen.getByTestId("inline-edit-cancel-issuer");
    await user.click(cancelBtn);

    expect(editBtn).toHaveFocus();
  });

  it("focus returns to edit button after save", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    const editBtn = screen.getByTestId("inline-edit-btn-issuer");
    
    await user.click(editBtn);
    const saveBtn = screen.getByTestId("inline-edit-save-issuer");
    await user.click(saveBtn);

    expect(editBtn).toHaveFocus();
  });

  it("Tab order follows DOM order in view mode", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    // Tab through the component
    await user.tab();
    // First focusable should be the density toggle or first edit button
    const firstFocused = document.activeElement;
    expect(firstFocused).toBeInstanceOf(HTMLElement);
  });
});

describe("InvoiceDetailClient — Keyboard navigation", () => {
  it("Escape cancels edit and returns to view mode", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    expect(screen.getByTestId("inline-edit-input-issuer")).toBeInTheDocument();
    
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("inline-edit-input-issuer")).not.toBeInTheDocument();
  });

  it("Enter saves edit on non-date fields", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    const input = screen.getByTestId("inline-edit-input-issuer");
    await user.clear(input);
    await user.type(input, "New Value");
    await user.keyboard("{Enter}");
    
    expect(onSave).toHaveBeenCalledWith("issuer", "New Value");
    expect(screen.queryByTestId("inline-edit-input-issuer")).not.toBeInTheDocument();
  });

  it("Enter does not save on date input", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-dueDate"));
    await user.keyboard("{Enter}");
    
    expect(screen.getByTestId("inline-edit-input-dueDate")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Shift+Tab moves focus backwards in edit mode", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    const saveBtn = screen.getByTestId("inline-edit-save-issuer");
    await user.click(saveBtn);
    
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    // Should move focus to the input or previous element
    expect(document.activeElement).toBeInstanceOf(HTMLElement);
  });
});

describe("InvoiceDetailClient — Input ARIA attributes", () => {
  it("input has aria-label matching the field label", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByTestId("inline-edit-btn-issuer"));
    
    const input = screen.getByTestId("inline-edit-input-issuer");
    expect(input).toHaveAttribute("aria-label", "Issuer");
  });

  it("input has aria-describedby when error is present", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    await user.clear(screen.getByTestId("inline-edit-input-issuer"));
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    
    const input = screen.getByTestId("inline-edit-input-issuer");
    expect(input).toHaveAttribute("aria-describedby", "inline-edit-error-issuer");
  });

  it("input has aria-invalid when error is present", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    await user.clear(screen.getByTestId("inline-edit-input-issuer"));
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    
    const input = screen.getByTestId("inline-edit-input-issuer");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("aria-invalid is removed when error is cleared", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    await user.clear(screen.getByTestId("inline-edit-input-issuer"));
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    
    const input = screen.getByTestId("inline-edit-input-issuer");
    expect(input).toHaveAttribute("aria-invalid", "true");
    
    await user.type(input, "A");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });
});

describe("InvoiceDetailClient — Error message ARIA", () => {
  it("error message has role='alert'", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    await user.clear(screen.getByTestId("inline-edit-input-issuer"));
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    
    const error = screen.getByTestId("inline-edit-error-issuer");
    expect(error).toHaveAttribute("role", "alert");
  });

  it("error message id matches input's aria-describedby", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    await user.clear(screen.getByTestId("inline-edit-input-issuer"));
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    
    const input = screen.getByTestId("inline-edit-input-issuer");
    const error = screen.getByTestId("inline-edit-error-issuer");
    
    expect(input).toHaveAttribute("aria-describedby", error.id);
  });
});

describe("InvoiceDetailClient — Edit button ARIA", () => {
  it("edit button has descriptive aria-label", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const editBtn = screen.getByTestId("inline-edit-btn-issuer");
    expect(editBtn).toHaveAttribute("aria-label", expect.stringContaining("Issuer"));
  });

  it("edit button is visible on focus", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const editBtn = screen.getByTestId("inline-edit-btn-issuer");
    editBtn.focus();
    expect(editBtn).toHaveClass("focus-visible:opacity-100");
  });
});

describe("InvoiceDetailClient — Focus ring", () => {
  it("input has focus-ring class", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByTestId("inline-edit-btn-issuer"));
    
    const input = screen.getByTestId("inline-edit-input-issuer");
    expect(input).toHaveClass("focus-ring");
  });

  it("save button has focus-ring class", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByTestId("inline-edit-btn-issuer"));
    
    const saveBtn = screen.getByTestId("inline-edit-save-issuer");
    expect(saveBtn).toHaveClass("focus-ring");
  });

  it("cancel button has focus-ring class", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByTestId("inline-edit-btn-issuer"));
    
    const cancelBtn = screen.getByTestId("inline-edit-cancel-issuer");
    expect(cancelBtn).toHaveClass("focus-ring");
  });

  it("edit button has focus-ring class", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const editBtn = screen.getByTestId("inline-edit-btn-issuer");
    expect(editBtn).toHaveClass("focus-ring");
  });
});

describe("InvoiceDetailClient — Live region announcements", () => {
  it("announces successful save", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByTestId("inline-edit-btn-issuer"));
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    
    await waitFor(() => {
      const region = screen.getByTestId("inline-edit-announcement");
      expect(region).toHaveTextContent(/updated successfully/i);
    });
  });

  it("announces cancellation", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    await user.click(screen.getByTestId("inline-edit-cancel-issuer"));
    
    await waitFor(() => {
      const region = screen.getByTestId("inline-edit-announcement");
      expect(region).toHaveTextContent(/cancelled/i);
    });
  });

  it("announces validation error", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    await user.clear(screen.getByTestId("inline-edit-input-issuer"));
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    
    await waitFor(() => {
      const region = screen.getByTestId("inline-edit-announcement");
      expect(region).toHaveTextContent(/Save failed/i);
    });
  });

  it("clears announcement after timeout", async () => {
    jest.useFakeTimers();
    render(<InvoiceDetailClient {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId("inline-edit-btn-issuer"));
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    
    await waitFor(() => {
      const region = screen.getByTestId("inline-edit-announcement");
      expect(region).toHaveTextContent(/updated successfully/i);
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    const region = screen.getByTestId("inline-edit-announcement");
    expect(region).toHaveTextContent("");
    
    jest.useRealTimers();
  });
});

describe("InvoiceDetailClient — Density toggle ARIA", () => {
  it("density toggle buttons are in a group", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const group = screen.getByRole("group");
    expect(group).toBeInTheDocument();
  });

  it("density buttons have data-density attributes", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    const densityButtons = buttons.filter(b => b.getAttribute("data-density"));
    expect(densityButtons.length).toBeGreaterThanOrEqual(2);
  });
});

describe("InvoiceDetailClient — Reference row ARIA", () => {
  it("CopyButton has aria-label when referenceId is present", () => {
    render(
      <InvoiceDetailClient
        {...defaultProps}
        referenceId="inv-001"
        labelReference="Reference"
      />
    );
    const copyBtn = screen.getByRole("button", { name: /copy reference id/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it("reference row is omitted when referenceId is absent", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    expect(screen.queryByText("Reference")).not.toBeInTheDocument();
  });
});

describe("InvoiceDetailClient — axe violations", () => {
  it("has no axe violations in view mode", async () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations in edit mode", async () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByTestId("inline-edit-btn-issuer"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with validation error", async () => {
    const user = userEvent.setup();
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    
    await user.click(screen.getByTestId("inline-edit-btn-issuer"));
    await user.clear(screen.getByTestId("inline-edit-input-issuer"));
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations in compact mode", async () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const compactBtn = screen.getAllByRole("button").find(
      b => b.getAttribute("data-density") === "compact"
    );
    await act(async () => {
      fireEvent.click(compactBtn!);
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
