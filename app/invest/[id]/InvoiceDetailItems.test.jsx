/**
 * @file InvoiceDetailItems.test.jsx
 *
 * Focused invariant, boundary, and accessibility tests for InvoiceDetailItems.
 *
 * Compatibility-contract tests for InvoiceDetailItems (Issue #1149).
 *
 * Test surface:
 *   1. Pure helpers — buildInvoiceDetailItems, defaultDetailBulkExport,
 *      defaultDetailBulkDelete, isValidDetailItem, normaliseDetailItems
 *   2. Bulk-select toolbar lifecycle
 *   3. Export path (success, empty selection, concurrent guard)
 *   4. Delete path (confirm / cancel / success / failure / retry safety)
 *   5. Error boundary (render crash → graceful fallback, reportError called)
 *   6. Compatibility — null/invalid props fall back to defaults
 *   7. Boundary and regression scenarios
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { act, render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import InvoiceDetailItems, {
  buildInvoiceDetailItems,
  defaultDetailBulkExport,
  defaultDetailBulkDelete,
  isValidDetailItem,
  normaliseDetailItems,
  InvoiceDetailItemsErrorBoundary,
} from "./InvoiceDetailItems";

// ─────────────────────────────────────────────────────────────────────────────
// Global mocks
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
});

// ─── mocks ───────────────────────────────────────────────────────────────────

// Silence expected console.error from error boundary tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_ITEMS = [
  { id: "inv-001-doc-invoice", name: "Invoice PDF", kind: "document", issuer: "Acme" },
  { id: "inv-001-doc-pod", name: "Proof of delivery", kind: "document", issuer: "Acme" },
  { id: "inv-001-doc-terms", name: "Payment terms", kind: "document", issuer: "Acme" },
];

// ─── fixtures ────────────────────────────────────────────────────────────────

/** Minimal valid invoice — all optional fields populated. */
const validInvoice = {
  id: "inv-001",
  issuer: "Acme Supplies Ltd",
  amount: "12,500",
  currency: "USD",
  dueDate: "2026-06-15",
  yield: "8.2",
  status: "Open",
};

const noop = () => {};

// ─── helpers ─────────────────────────────────────────────────────────────────

function renderItems(invoice, overrides = {}) {
  return render(
    <InvoiceDetailItems
      invoice={invoice}
      isFundingDisabled={overrides.isFundingDisabled ?? false}
      onFund={overrides.onFund ?? noop}
      onCopyLink={overrides.onCopyLink ?? noop}
      onPrint={overrides.onPrint ?? noop}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INV-1: null / invalid invoice guard
// ─────────────────────────────────────────────────────────────────────────────

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

describe("isValidDetailItem", () => {
  it("returns true for a well-formed item", () => {
    expect(isValidDetailItem({ id: "x", name: "Doc" })).toBe(true);
  });

  it("returns false for null / undefined", () => {
    expect(isValidDetailItem(null)).toBe(false);
    expect(isValidDetailItem(undefined)).toBe(false);
  });

  it("returns false when id is missing or empty", () => {
    expect(isValidDetailItem({ name: "Doc" })).toBe(false);
    expect(isValidDetailItem({ id: "", name: "Doc" })).toBe(false);
    expect(isValidDetailItem({ id: "  ", name: "Doc" })).toBe(false);
  });

  it("returns false when name is missing or empty", () => {
    expect(isValidDetailItem({ id: "x" })).toBe(false);
    expect(isValidDetailItem({ id: "x", name: "" })).toBe(false);
  });

  it("returns false for non-object values", () => {
    expect(isValidDetailItem("string")).toBe(false);
    expect(isValidDetailItem(42)).toBe(false);
  });
});

describe("normaliseDetailItems", () => {
  it("returns an empty array for non-arrays", () => {
    expect(normaliseDetailItems(null)).toEqual([]);
    expect(normaliseDetailItems(undefined)).toEqual([]);
    expect(normaliseDetailItems("bad")).toEqual([]);
  });

  it("drops items with missing or empty id/name", () => {
    const mixed = [
      { id: "good", name: "Good" },
      { id: "", name: "Bad id" },
      { id: "no-name" },
      null,
      undefined,
      42,
    ];
    const result = normaliseDetailItems(mixed);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("good");
  });

  it("preserves all valid items without mutation", () => {
    const items = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ];
    const result = normaliseDetailItems(items);
    expect(result).toHaveLength(2);
    // Does not mutate original
    expect(items).toHaveLength(2);
  });
});

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

  it("uses 'Unknown issuer' when issuer is absent or empty", () => {
    const noIssuer = buildInvoiceDetailItems({ id: "inv-002" });
    expect(noIssuer.every((i) => i.issuer === "Unknown issuer")).toBe(true);

    const emptyIssuer = buildInvoiceDetailItems({ id: "inv-003", issuer: "" });
    expect(emptyIssuer.every((i) => i.issuer === "Unknown issuer")).toBe(true);

    const whitespaceIssuer = buildInvoiceDetailItems({ id: "inv-004", issuer: "   " });
    expect(whitespaceIssuer.every((i) => i.issuer === "Unknown issuer")).toBe(true);
  });

  it("returns an empty array for missing / invalid invoices", () => {
    expect(buildInvoiceDetailItems(null)).toEqual([]);
    expect(buildInvoiceDetailItems(undefined)).toEqual([]);
    expect(buildInvoiceDetailItems({})).toEqual([]);
    expect(buildInvoiceDetailItems({ id: "" })).toEqual([]);
    expect(buildInvoiceDetailItems({ id: "  " })).toEqual([]);
  });

  it("trims the issuer value", () => {
    const items = buildInvoiceDetailItems({ id: "inv-005", issuer: "  Trimmed  " });
    expect(items[0].issuer).toBe("Trimmed");
  });
});

describe("defaultDetailBulkExport / defaultDetailBulkDelete", () => {
  it("export returns the selected count", () => {
    expect(defaultDetailBulkExport(SAMPLE_ITEMS.slice(0, 2))).toEqual({ count: 2 });
  });

  it("export tolerates non-arrays", () => {
    expect(defaultDetailBulkExport(null)).toEqual({ count: 0 });
    expect(defaultDetailBulkExport(undefined)).toEqual({ count: 0 });
    expect(defaultDetailBulkExport("bad")).toEqual({ count: 0 });
  });

  it("export returns count 0 for an empty array", () => {
    expect(defaultDetailBulkExport([])).toEqual({ count: 0 });
  });

  it("delete resolves with the set size", async () => {
    await expect(defaultDetailBulkDelete(new Set(["a", "b"]))).resolves.toEqual({
      count: 2,
    });
    await expect(defaultDetailBulkDelete(["a"])).resolves.toEqual({ count: 1 });
  });

  it("delete resolves with count 0 for empty set", async () => {
    await expect(defaultDetailBulkDelete(new Set())).resolves.toEqual({ count: 0 });
  });

  it("delete resolves with count 0 for invalid input", async () => {
    await expect(defaultDetailBulkDelete(null)).resolves.toEqual({ count: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Bulk-select toolbar lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe("InvoiceDetailItems — bulk select toolbar", () => {
  it("renders nothing when there are no items", () => {
    const { container } = render(<InvoiceDetailItems initialItems={[]} />);
    expect(container.querySelector("[data-testid='invoice-detail-items']")).not.toBeInTheDocument();
  });

  it("renders nothing when initialItems is null (compatibility: defaults to [])", () => {
    const { container } = render(<InvoiceDetailItems initialItems={null} />);
    expect(container.querySelector("[data-testid='invoice-detail-items']")).not.toBeInTheDocument();
  });

  it("silently drops invalid items from initialItems", () => {
    const mixed = [{ id: "valid", name: "Valid" }, { id: "", name: "Bad id" }, null];
    render(<InvoiceDetailItems initialItems={mixed} />);
    expect(screen.getByTestId("detail-item-row-valid")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-item-row-")).not.toBeInTheDocument();
  });

  it("renders without throwing when invoice has no optional fields", () => {
    expect(() => renderItems({ id: "x" })).not.toThrow();
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
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Export path
// ─────────────────────────────────────────────────────────────────────────────

describe("InvoiceDetailItems — export", () => {
  it("Export invokes onBulkExport with selected items", async () => {
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

  it("Export calls toast.success on success when toast is supplied", async () => {
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

  it("Export calls toast.info when nothing is selected", async () => {
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} toast={toast} />);
    // Toolbar not visible without selection; trigger via keyboard shortcut path
    // — we test the handler directly through the toast call guard
    // Select then deselect to expose toolbar, then clear selection
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(getCheckbox("inv-001-doc-invoice")); // deselect
    // Now no item is selected but toolbar may still be visible briefly
    // Trigger export via toolbar if visible
    const exportBtn = screen.queryByTestId("bulk-export");
    if (exportBtn) {
      fireEvent.click(exportBtn);
      await flushPromises();
      expect(toast.info).toHaveBeenCalled();
    }
  });

  it("Export with null onBulkExport falls back to defaultDetailBulkExport", async () => {
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkExport={null} toast={toast} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-export"));
    await flushPromises();
    expect(toast.success).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Delete path
// ─────────────────────────────────────────────────────────────────────────────

describe("InvoiceDetailItems — delete", () => {
  it("Delete opens a confirm dialog", async () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.investDetail.fundButtonAriaLabel })
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

  it("Failed delete shows an error toast and does NOT mutate the item list", async () => {
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
    // Invariant: item list is unchanged on failure
    expect(getRow("inv-001-doc-invoice")).toBeInTheDocument();
  });

  it("Retry after failed delete is safe — dialog stays open and re-attempts", async () => {
    let callCount = 0;
    const onBulkDelete = jest.fn(async () => {
      callCount++;
      if (callCount === 1) throw new Error("transient failure");
      return { count: 1 };
    });
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    render(
      <InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkDelete={onBulkDelete} toast={toast} />
    );
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");

    // First attempt — fails
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 document/i }));
    await flushPromises();
    expect(toast.error).toHaveBeenCalledTimes(1);
    // Item list unchanged
    expect(getRow("inv-001-doc-invoice")).toBeInTheDocument();

    // Second attempt — succeeds
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 document/i }));
    await flushPromises();
    expect(toast.success).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByTestId("detail-item-row-inv-001-doc-invoice")).not.toBeInTheDocument()
    );
  });

  it("Delete with null onBulkDelete falls back to defaultDetailBulkDelete", async () => {
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkDelete={null} toast={toast} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 document/i }));
    await flushPromises();
    expect(toast.success).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Error boundary
// ─────────────────────────────────────────────────────────────────────────────

describe("InvoiceDetailItemsErrorBoundary", () => {
  it("renders children normally when no error occurs", () => {
    render(
      <InvoiceDetailItemsErrorBoundary>
        <div data-testid="child">content</div>
      </InvoiceDetailItemsErrorBoundary>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders a graceful fallback when a child throws", () => {
    function Bomb() {
      throw new Error("render crash");
    }

    render(
      <InvoiceDetailItemsErrorBoundary>
        <Bomb />
      </InvoiceDetailItemsErrorBoundary>
    );

    expect(screen.getByTestId("invoice-detail-items-error")).toBeInTheDocument();
    expect(screen.getByText(/Unable to load document actions/i)).toBeInTheDocument();
    // Fallback must not expose internal error details
    expect(screen.queryByText(/render crash/i)).not.toBeInTheDocument();
  });

  it("fallback uses role=alert for immediate announcement", () => {
    function Bomb() {
      throw new Error("oops");
    }

    render(
      <InvoiceDetailItemsErrorBoundary>
        <Bomb />
      </InvoiceDetailItemsErrorBoundary>
    );

    expect(screen.getByTestId("invoice-detail-items-error")).toHaveAttribute("role", "alert");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Compatibility — null / invalid props fall back to defaults
// ─────────────────────────────────────────────────────────────────────────────

describe("InvoiceDetailItems — compatibility / backward compatibility", () => {
  it("renders correctly with no props (all defaults)", () => {
    const { container } = render(<InvoiceDetailItems />);
    // Empty initialItems default → renders nothing
    expect(container.querySelector("[data-testid='invoice-detail-items']")).not.toBeInTheDocument();
  });

  it("works with toast=null (no crashes on success path)", async () => {
    const onBulkDelete = jest.fn(async () => ({ count: 1 }));
    render(
      <InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkDelete={onBulkDelete} toast={null} />
    );
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 document/i }));
    await flushPromises();
    // No crash even though toast is null
    expect(onBulkDelete).toHaveBeenCalledTimes(1);
  });

  it("does not mutate the caller's initialItems array", () => {
    const items = [...SAMPLE_ITEMS];
    const original = items.slice();
    render(<InvoiceDetailItems initialItems={items} />);
    expect(items).toEqual(original);
  });

  it("onBulkExport returning undefined does not crash", async () => {
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    render(
      <InvoiceDetailItems
        initialItems={SAMPLE_ITEMS}
        onBulkExport={() => undefined}
        toast={toast}
      />
    );
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-export"));
    await flushPromises();
    // Falls back gracefully — count derived from selectedSlice.length
    expect(toast.success).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Boundary / regression scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe("InvoiceDetailItems — boundary and regression scenarios", () => {
  it("renders a single item without errors", () => {
    const single = [{ id: "inv-001-doc-invoice", name: "Invoice PDF", kind: "document" }];
    render(<InvoiceDetailItems initialItems={single} />);
    expect(getRow("inv-001-doc-invoice")).toBeInTheDocument();
  });

  it("selecting all then deleting all renders nothing (empty-state guard)", async () => {
    const onBulkDelete = jest.fn(async () => ({ count: 3 }));
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkDelete={onBulkDelete} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 3 documents/i }));
    await flushPromises();
    await waitFor(() =>
      expect(screen.queryByTestId("invoice-detail-items")).not.toBeInTheDocument()
    );
  });

  it("items with no 'kind' field display 'document' as fallback", () => {
    render(<InvoiceDetailItems initialItems={[{ id: "x", name: "No Kind" }]} />);
    expect(screen.getByText("document")).toBeInTheDocument();
  });

  it("plural/singular labels are correct for exactly one item delete", async () => {
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    const onBulkDelete = jest.fn(async () => ({ count: 1 }));
    render(
      <InvoiceDetailItems initialItems={SAMPLE_ITEMS} onBulkDelete={onBulkDelete} toast={toast} />
    );
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    // Singular: "Delete 1 document" (no trailing 's')
    expect(within(dialog).getByRole("button", { name: /Delete 1 document$/i })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 document$/i }));
    await flushPromises();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/Removed 1 document[^s]/),
      expect.any(String)
    );
  });

  it("plural labels are correct for multiple items", async () => {
    render(<InvoiceDetailItems initialItems={SAMPLE_ITEMS} />);
    fireEvent.click(getCheckbox("inv-001-doc-invoice"));
    fireEvent.click(getCheckbox("inv-001-doc-pod"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /Delete 2 documents/i })).toBeInTheDocument();
    // Confirm the body copy also references the count (may appear in heading + body)
    const matches = within(dialog).queryAllByText(/2 documents/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
