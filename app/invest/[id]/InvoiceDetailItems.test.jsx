/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailItems.test.jsx
 *
 * Integration tests for invoice-detail bulk select:
 *   - toolbar lifecycle (hidden until selection, clear hides again)
 *   - select-all / partial / clear
 *   - export + delete confirm / cancel / success
 *   - buildInvoiceDetailItems helper
 */

import "@testing-library/jest-dom";
import { act, render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import InvoiceDetailItems, {
  buildInvoiceDetailItems,
  defaultDetailBulkExport,
  defaultDetailBulkDelete,
} from "./InvoiceDetailItems";

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

const SAMPLE_ITEMS = [
  { id: "inv-001-doc-invoice", name: "Invoice PDF", kind: "document", issuer: "Acme" },
  { id: "inv-001-doc-pod", name: "Proof of delivery", kind: "document", issuer: "Acme" },
  { id: "inv-001-doc-terms", name: "Payment terms", kind: "document", issuer: "Acme" },
];

function getCheckbox(id) {
  return screen.getByTestId(`detail-item-checkbox-${id}`);
}

function getRow(id) {
  return screen.getByTestId(`detail-item-row-${id}`);
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("buildInvoiceDetailItems", () => {
  it("returns three documents for a valid invoice", () => {
    const items = buildInvoiceDetailItems({ id: "inv-001", issuer: "Acme Supplies Ltd" });
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.id)).toEqual([
      "inv-001-doc-invoice",
      "inv-001-doc-pod",
      "inv-001-doc-terms",
    ]);
    expect(items.every((i) => i.issuer === "Acme Supplies Ltd")).toBe(true);
  });

  it("returns an empty array for missing / invalid invoices", () => {
    expect(buildInvoiceDetailItems(null)).toEqual([]);
    expect(buildInvoiceDetailItems(undefined)).toEqual([]);
    expect(buildInvoiceDetailItems({})).toEqual([]);
    expect(buildInvoiceDetailItems({ id: "" })).toEqual([]);
  });
});

describe("defaultDetailBulkExport / defaultDetailBulkDelete", () => {
  it("export returns the selected count", () => {
    expect(defaultDetailBulkExport(SAMPLE_ITEMS.slice(0, 2))).toEqual({ count: 2 });
  });

  it("export tolerates non-arrays", () => {
    expect(defaultDetailBulkExport(null)).toEqual({ count: 0 });
  });

  it("delete resolves with the set size", async () => {
    await expect(defaultDetailBulkDelete(new Set(["a", "b"]))).resolves.toEqual({ count: 2 });
    await expect(defaultDetailBulkDelete(["a"])).resolves.toEqual({ count: 1 });
  });
});

describe("InvoiceDetailItems — bulk select toolbar", () => {
  it("renders nothing when there are no items", () => {
    const { container } = render(<InvoiceDetailItems initialItems={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not render the toolbar before any row is selected", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument();
  });

  it("renders one selectable checkbox per detail item", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    expect(getCheckbox("inv-001-doc-invoice")).toBeInTheDocument();
    expect(getCheckbox("inv-001-doc-pod")).toBeInTheDocument();
    expect(getCheckbox("inv-001-doc-terms")).toBeInTheDocument();
  });

  it("row checkboxes have a descriptive aria-label", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    expect(getCheckbox("inv-001-doc-pod")).toHaveAttribute(
      "aria-label",
      "Select document Proof of delivery (inv-001-doc-pod)"
    );
  });

  it("toggling a row checkbox reveals the bulk-action toolbar", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    expect(screen.getByTestId("bulk-actions-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-selection-count")).toHaveTextContent(
      "1 of 3 documents selected."
    );
  });

  it("the bulk-selection-count region announces count updates politely", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    const region = screen.getByTestId("bulk-selection-count");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("clearing the selection via the Clear button hides the toolbar again", async () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-clear"));
    await waitFor(() =>
      expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument()
    );
    expect(getCheckbox("inv-001-doc-invoice")).not.toBeChecked();
  });

  it("select-all selects every visible row when in 'partial' state", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    expect(getCheckbox("inv-001-doc-invoice")).toBeChecked();
    expect(getCheckbox("inv-001-doc-pod")).toBeChecked();
    expect(getCheckbox("inv-001-doc-terms")).toBeChecked();
    expect(screen.getByTestId("bulk-selection-count")).toHaveTextContent(
      "3 of 3 documents selected."
    );
    expect(screen.getByTestId("bulk-select-all").indeterminate).toBe(false);
  });

  it("select-all in 'all' state deselects every visible row", async () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    await waitFor(() =>
      expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument()
    );
    expect(getCheckbox("inv-001-doc-invoice")).not.toBeChecked();
  });

  it("selected rows carry a data-selected='true' attribute", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-pod"));
    expect(getRow("inv-001-doc-pod")).toHaveAttribute("data-selected", "true");
    expect(getRow("inv-001-doc-invoice")).toHaveAttribute("data-selected", "false");
  });

  it("shows indeterminate state on select-all when partially selected", () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(getCheckbox("inv-001-doc-pod"));
    expect(screen.getByTestId("bulk-select-all")).toHaveAttribute("aria-checked", "mixed");
    expect(screen.getByTestId("bulk-select-all").indeterminate).toBe(true);
  });

  it("Export invokes the onBulkExport handler with the selected items", async () => {
    const onBulkExport = jest.fn(() => ({ count: 2 }));
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkExport={onBulkExport} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(getCheckbox("inv-001-doc-pod"));
    fireEvent.click(screen.getByTestId("bulk-export"));
    await flushPromises();

    expect(onBulkExport).toHaveBeenCalledTimes(1);
    const [calledWith] = onBulkExport.mock.calls[0];
    expect(calledWith.map((i) => i.id)).toEqual(["inv-001-doc-invoice", "inv-001-doc-pod"]);
  });

  it("Export calls toast.success on success when supplied", async () => {
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    render(
      <InvoiceDetailItems
        initialItems={SAMPLE_ITEMS}
        toast={toast}
        onBulkExport={() => ({ count: 1 })}
      />
    );
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-export"));
    await flushPromises();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Exported 1 document"),
      expect.any(String)
    );
  });

  it("Delete opens a confirm dialog", async () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: /Delete selected documents\?/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/You are about to permanently delete 1 document/i)
    ).toBeInTheDocument();
  });

  it("Cancelling the dialog closes it without deleting anything", async () => {
    const onBulkDelete = jest.fn(async () => ({ count: 0 }));
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkDelete={onBulkDelete} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Cancel/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onBulkDelete).not.toHaveBeenCalled();
    expect(getCheckbox("inv-001-doc-invoice")).toBeInTheDocument();
  });

  it("Confirming delete removes the selected rows and announces success", async () => {
    const onBulkDelete = jest.fn(async () => ({ count: 1 }));
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    render(
      <InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkDelete={onBulkDelete} toast={toast} />
    );
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 document/i }));
    await flushPromises();

    expect(onBulkDelete).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByTestId("detail-item-row-inv-001-doc-invoice")).not.toBeInTheDocument()
    );
    expect(screen.getByTestId("detail-item-row-inv-001-doc-pod")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Removed 1 document"),
      expect.any(String)
    );
  });

  it("failed delete shows an error toast and keeps the rows", async () => {
    const onBulkDelete = jest.fn(async () => {
      throw new Error("boom");
    });
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    render(
      <InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkDelete={onBulkDelete} toast={toast} />
    );
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 document/i }));
    await flushPromises();

    expect(toast.error).toHaveBeenCalled();
    expect(screen.getByTestId("detail-item-row-inv-001-doc-invoice")).toBeInTheDocument();
  });
});
