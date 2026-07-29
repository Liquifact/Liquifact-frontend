/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailItems.a11y.test.jsx
 *
 * Accessibility-specific tests for InvoiceDetailItems.
 *
 * These tests verify the accessibility contract documented in
 * docs/invoice-detail-a11y.md, including:
 * - Focus management
 * - Keyboard navigation
 * - ARIA attributes
 * - Live region behaviour
 * - Focus trap in ConfirmDialog
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceDetailItems, { buildInvoiceDetailItems } from "./InvoiceDetailItems";

expect.extend(toHaveNoViolations);

const SAMPLE_ITEMS = [
  { id: "inv-001-doc-invoice", name: "Invoice PDF", kind: "document", issuer: "Acme" },
  { id: "inv-001-doc-pod", name: "Proof of delivery", kind: "document", issuer: "Acme" },
  { id: "inv-001-doc-terms", name: "Payment terms", kind: "document", issuer: "Acme" },
];

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

describe("InvoiceDetailItems — ARIA structure", () => {
  it("section has aria-labelledby pointing to the heading", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    const section = screen.getByRole("region");
    expect(section).toHaveAttribute("aria-labelledby", "invoice-detail-items-heading");
  });

  it("heading has id matching the section's aria-labelledby", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    const heading = screen.getByRole("heading", { name: /invoice detail documents/i });
    expect(heading).toHaveAttribute("id", "invoice-detail-items-heading");
  });

  it("document list has aria-label", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("aria-label");
  });

  it("row checkboxes have descriptive aria-label", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    const checkbox = screen.getByTestId("detail-item-checkbox-inv-001-doc-pod");
    expect(checkbox).toHaveAttribute(
      "aria-label",
      "Select document Proof of delivery (inv-001-doc-pod)"
    );
  });
});

describe("InvoiceDetailItems — BulkActionsToolbar ARIA", () => {
  it("toolbar has role='toolbar' when visible", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    // Select an item to show the toolbar
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    
    const toolbar = screen.getByTestId("bulk-actions-toolbar");
    expect(toolbar).toHaveAttribute("role", "toolbar");
  });

  it("toolbar has aria-labelledby", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    
    const toolbar = screen.getByTestId("bulk-actions-toolbar");
    expect(toolbar).toHaveAttribute("aria-labelledby");
  });

  it("toolbar has aria-controls pointing to the list", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    
    const toolbar = screen.getByTestId("bulk-actions-toolbar");
    expect(toolbar).toHaveAttribute("aria-controls");
  });

  it("select-all checkbox has correct aria-checked values", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    
    // Initially unchecked
    expect(screen.getByTestId("bulk-select-all")).toHaveAttribute("aria-checked", "false");
    
    // Select one item - partial
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    expect(screen.getByTestId("bulk-select-all")).toHaveAttribute("aria-checked", "mixed");
    
    // Select all - true
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    expect(screen.getByTestId("bulk-select-all")).toHaveAttribute("aria-checked", "true");
    
    // Deselect all - false
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    expect(screen.queryByTestId("bulk-select-all")).not.toBeInTheDocument();
  });

  it("selection count region has role='status' and aria-live='polite'", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    
    const countRegion = screen.getByTestId("bulk-selection-count");
    expect(countRegion).toHaveAttribute("role", "status");
    expect(countRegion).toHaveAttribute("aria-live", "polite");
    expect(countRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("selection count region is visually hidden", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    
    const countRegion = screen.getByTestId("bulk-selection-count");
    expect(countRegion).toHaveClass("sr-only");
  });
});

describe("InvoiceDetailItems — Focus management", () => {
  it("checkboxes are focusable", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    
    const checkbox = screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice");
    await user.click(checkbox);
    expect(checkbox).toHaveFocus();
  });

  it("toolbar buttons are focusable when visible", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    
    const clearBtn = screen.getByTestId("bulk-clear");
    await user.click(clearBtn);
    expect(clearBtn).toHaveFocus();
  });

  it("focus remains on checkbox after selection", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    
    const checkbox = screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice");
    await user.click(checkbox);
    expect(checkbox).toHaveFocus();
  });
});

describe("InvoiceDetailItems — Keyboard navigation", () => {
  it("Space toggles checkbox selection", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    
    const checkbox = screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice");
    checkbox.focus();
    await user.keyboard(" ");
    
    expect(checkbox).toBeChecked();
  });

  it("Escape clears selection when toolbar is focused", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    const toolbar = screen.getByTestId("bulk-actions-toolbar");
    toolbar.focus();
    
    await user.keyboard("{Escape}");
    
    expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument();
    expect(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice")).not.toBeChecked();
  });

  it("Tab moves through toolbar buttons in order", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} toast={mockToast} />);
    
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    
    const selectAll = screen.getByTestId("bulk-select-all");
    selectAll.focus();
    
    await user.tab();
    expect(screen.getByTestId("bulk-clear")).toHaveFocus();
    
    await user.tab();
    expect(screen.getByTestId("bulk-export")).toHaveFocus();
    
    await user.tab();
    expect(screen.getByTestId("bulk-delete")).toHaveFocus();
  });
});

describe("InvoiceDetailItems — ConfirmDialog focus trap", () => {
  it("focus moves to Confirm button when dialog opens", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} toast={mockToast} />);
    
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    
    const dialog = await screen.findByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: /delete/i });
    
    await waitFor(() => {
      expect(confirmBtn).toHaveFocus();
    });
  });

  it("focus is trapped inside the dialog", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} toast={mockToast} />);
    
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    
    const dialog = await screen.findByRole("dialog");
    const buttons = within(dialog).getAllByRole("button");
    
    // Focus on first button
    buttons[0].focus();
    
    // Tab should cycle to the next button
    await user.tab();
    expect(buttons[1]).toHaveFocus();
    
    // Tab should cycle back to the first button (trap)
    await user.tab();
    expect(buttons[0]).toHaveFocus();
  });

  it("Escape closes the dialog", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} toast={mockToast} />);
    
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    
    await user.keyboard("{Escape}");
    
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("focus is restored to Delete button after cancel", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} toast={mockToast} />);
    
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    const deleteBtn = screen.getByTestId("bulk-delete");
    deleteBtn.focus();
    
    fireEvent.click(deleteBtn);
    const dialog = await screen.findByRole("dialog");
    const cancelBtn = within(dialog).getByRole("button", { name: /cancel/i });
    
    await user.click(cancelBtn);
    
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    
    expect(deleteBtn).toHaveFocus();
  });

  it("dialog has role='dialog' and aria-modal='true'", async () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} toast={mockToast} />);
    
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("role", "dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });
});

describe("InvoiceDetailItems — Focus ring", () => {
  it("checkboxes have focus ring styles", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    const checkbox = screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice");
    expect(checkbox).toHaveClass("focus:ring-cyan-400");
  });

  it("toolbar buttons have focus ring via Button component", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} toast={mockToast} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    
    const clearBtn = screen.getByTestId("bulk-clear");
    // Button component should have focus-ring class
    expect(clearBtn).toHaveClass("focus-ring");
  });
});

describe("InvoiceDetailItems — Live region announcements", () => {
  it("selection count is announced when selection changes", async () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    
    const countRegion = screen.getByTestId("bulk-selection-count");
    expect(countRegion).toHaveTextContent(/1 of 3 documents selected/i);
  });

  it("selection count updates when more items are selected", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-pod"));
    
    const countRegion = screen.getByTestId("bulk-selection-count");
    expect(countRegion).toHaveTextContent(/2 of 3 documents selected/i);
  });

  it("selection count updates when all items are selected", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    
    const countRegion = screen.getByTestId("bulk-selection-count");
    expect(countRegion).toHaveTextContent(/3 of 3 documents selected/i);
  });
});

describe("InvoiceDetailItems — axe violations", () => {
  it("has no axe violations in default state", async () => {
    const { container } = render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with selection", async () => {
    const { container } = render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with toolbar visible", async () => {
    const { container } = render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with confirm dialog open", async () => {
    const { container } = render(
      <InvoiceDetailItems initialItems={SAMPLE_ITEMS} toast={mockToast} />
    );
    fireEvent.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    
    await screen.findByRole("dialog");
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("InvoiceDetailItems — Empty state", () => {
  it("renders nothing when there are no items", () => {
    const { container } = render(<InvoiceDetailItems initialItems={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("buildInvoiceDetailItems returns empty array for invalid invoice", () => {
    expect(buildInvoiceDetailItems(null)).toEqual([]);
    expect(buildInvoiceDetailItems(undefined)).toEqual([]);
    expect(buildInvoiceDetailItems({})).toEqual([]);
    expect(buildInvoiceDetailItems({ id: "" })).toEqual([]);
  });
});

// Helper function for within queries
function within(element) {
  return {
    getByRole: (role, options) => {
      const elements = element.querySelectorAll(`[role="${role}"]`);
      for (const el of elements) {
        if (options?.name) {
          if (el.textContent?.includes(options.name)) {
            return el;
          }
        } else {
          return el;
        }
      }
      throw new Error(`Element with role "${role}" not found`);
    },
    getAllByRole: (role) => Array.from(element.querySelectorAll(`[role="${role}"]`)),
  };
}
