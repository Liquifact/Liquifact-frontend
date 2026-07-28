import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BulkActionsToolbar, { formatToolbarCountLine } from "./BulkActionsToolbar";

const LABELS = {
  toolbarLabel: "Bulk actions toolbar",
  selectAllLabel: "Select {selected} of {total}",
  selectAllAria: "Select all invoices. Currently {selected} of {total} selected.",
  rowCheckboxAria: "Select invoice {id} from {issuer}",
  selectedCount: "{selected} of {total} invoices selected.",
  clearButton: "Clear selection",
  exportButton: "Export",
  exportButtonAria: "Export selected invoices as a JSON download",
  deleteButton: "Delete",
  deleteButtonAria: "Delete {count} selected invoices after confirmation",
};

function renderToolbar(overrides = {}, partialLabels = {}) {
  const props = {
    selectedCount: 3,
    visibleCount: 10,
    allState: "partial",
    onToggleSelectAll: jest.fn(),
    onClearSelection: jest.fn(),
    onExport: jest.fn(),
    onRequestDelete: jest.fn(),
    labels: { ...LABELS, ...partialLabels },
    ...overrides,
  };
  const utils = render(<BulkActionsToolbar {...props} />);
  return { ...utils, props };
}

describe("BulkActionsToolbar", () => {
  it("renders nothing when no rows are selected", () => {
    const { container } = renderToolbar({ selectedCount: 0 });
    expect(container.firstChild).toBeNull();
  });

  it("renders the toolbar with role=toolbar and accessible name", () => {
    renderToolbar();
    const toolbar = screen.getByRole("toolbar", { name: /bulk actions toolbar/i });
    expect(toolbar).toBeInTheDocument();
  });

  it("renders a polite live region announcing the count", () => {
    renderToolbar({ selectedCount: 4, visibleCount: 9 });
    const region = screen.getByTestId("bulk-selection-count");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent("4 of 9 invoices selected.");
  });

  it("renders a tri-state checkbox with aria-checked=true when fully selected", () => {
    renderToolbar({ allState: "all" });
    const checkbox = screen.getByTestId("bulk-select-all");
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("renders a tri-state checkbox with aria-checked=false when none selected", () => {
    renderToolbar({ allState: "none" });
    const checkbox = screen.getByTestId("bulk-select-all");
    expect(checkbox).toHaveAttribute("aria-checked", "false");
  });

  it("renders a tri-state checkbox in 'mixed' state when partially selected", () => {
    renderToolbar({ allState: "partial" });
    expect(screen.getByTestId("bulk-select-all")).toHaveAttribute("aria-checked", "mixed");
  });

  it("sets indeterminate DOM property to true when partially selected", () => {
    renderToolbar({ allState: "partial" });
    expect(screen.getByTestId("bulk-select-all").indeterminate).toBe(true);
  });

  it("sets indeterminate DOM property to false when none selected", () => {
    renderToolbar({ allState: "none" });
    expect(screen.getByTestId("bulk-select-all").indeterminate).toBe(false);
  });

  it("sets indeterminate DOM property to false when fully selected", () => {
    renderToolbar({ allState: "all" });
    expect(screen.getByTestId("bulk-select-all").indeterminate).toBe(false);
  });

  it("renders the visible label with replacements", () => {
    renderToolbar({ selectedCount: 2, visibleCount: 7 });
    expect(screen.getByText(/Select 2 of 7/i)).toBeInTheDocument();
  });

  it("renders the selectAll aria-label with replacements", () => {
    renderToolbar({ selectedCount: 5, visibleCount: 12 });
    const cb = screen.getByTestId("bulk-select-all");
    expect(cb).toHaveAttribute(
      "aria-label",
      "Select all invoices. Currently 5 of 12 selected."
    );
  });

  it("calls onToggleSelectAll when the select-all checkbox is clicked", () => {
    const onToggleSelectAll = jest.fn();
    renderToolbar({ onToggleSelectAll });
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    expect(onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it("calls onClearSelection when the Clear button is clicked", () => {
    const onClearSelection = jest.fn();
    renderToolbar({ onClearSelection });
    fireEvent.click(screen.getByTestId("bulk-clear"));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("calls onClearSelection when Escape is pressed inside the toolbar", () => {
    const onClearSelection = jest.fn();
    renderToolbar({ onClearSelection });
    fireEvent.keyDown(screen.getByRole("toolbar"), { key: "Escape" });
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onClearSelection when Escape is pressed with modifier", () => {
    const onClearSelection = jest.fn();
    renderToolbar({ onClearSelection });
    fireEvent.keyDown(screen.getByRole("toolbar"), {
      key: "Escape",
      ctrlKey: true,
    });
    fireEvent.keyDown(screen.getByRole("toolbar"), {
      key: "Escape",
      metaKey: true,
    });
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  it("calls onExport when the Export button is clicked", () => {
    const onExport = jest.fn();
    renderToolbar({ onExport });
    fireEvent.click(screen.getByTestId("bulk-export"));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("disables the export button while exporting", () => {
    renderToolbar({ exporting: true });
    const btn = screen.getByTestId("bulk-export");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("calls onRequestDelete when the Delete button is clicked", () => {
    const onRequestDelete = jest.fn();
    renderToolbar({ onRequestDelete });
    fireEvent.click(screen.getByTestId("bulk-delete"));
    expect(onRequestDelete).toHaveBeenCalledTimes(1);
  });

  it("disables the delete button while deleting", () => {
    renderToolbar({ deleting: true });
    const btn = screen.getByTestId("bulk-delete");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("renders the delete button aria label with count replacement", () => {
    renderToolbar({ selectedCount: 7 });
    const btn = screen.getByTestId("bulk-delete");
    expect(btn).toHaveAttribute(
      "aria-label",
      "Delete 7 selected invoices after confirmation"
    );
    expect(btn).toHaveTextContent("Delete");
  });

  it("tolerates missing optional handlers (does not throw)", () => {
    expect(() =>
      renderToolbar({
        onToggleSelectAll: undefined,
        onClearSelection: undefined,
        onExport: undefined,
        onRequestDelete: undefined,
      })
    ).not.toThrow();
    fireEvent.click(screen.getByTestId("bulk-export"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    fireEvent.click(screen.getByTestId("bulk-clear"));
    fireEvent.click(screen.getByTestId("bulk-select-all"));
  });
});

describe("formatToolbarCountLine", () => {
  it("returns X of Y selected string", () => {
    expect(formatToolbarCountLine(0, 0)).toBe("0 of 0 selected");
    expect(formatToolbarCountLine(3, 5)).toBe("3 of 5 selected");
  });
});
