import "@testing-library/jest-dom";
import { act, render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { InvestMarketplace } from "./page";
import { loadMockInvoices } from "./lib";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("next/navigation", () => ({
  usePathname: () => "/invest",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return <nav aria-label="site navigation" />;
  }
  return { __esModule: true, default: MockNavMenu };
});

// Stub out the browser-only download path so jsdom does not blow up when
// tests inject their own exporter — the default real implementation uses
// URL.createObjectURL which is monkey-patched for safety.
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInvoices(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `inv-${String(i + 1).padStart(3, "0")}`,
    issuer: `Issuer ${i + 1}`,
    amount: "1,000",
    currency: "USD",
    dueDate: "2026-12-31",
    yield: "5.0%",
    status: "Open",
  }));
}

async function renderLoaded(props = {}) {
  const userProps = {
    loadInvoices: jest.fn(async () => makeInvoices(3)),
    ...props,
  };
  const result = render(<InvestMarketplace {...userProps} />);
  await waitFor(() =>
    expect(screen.getByRole("list", { name: /investable invoices/i })).toBeInTheDocument()
  );
  return result;
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

function getRow(id) {
  return screen.getByTestId(`invoice-row-${id}`);
}

function getCheckbox(id) {
  return screen.getByTestId(`invoice-checkbox-${id}`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("InvestMarketplace — bulk select toolbar", () => {
  it("does not render the toolbar before any row is selected", async () => {
    await renderLoaded();
    expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument();
  });

  it("renders one selectable checkbox per invoice row", async () => {
    await renderLoaded();
    expect(getCheckbox("inv-001")).toBeInTheDocument();
    expect(getCheckbox("inv-002")).toBeInTheDocument();
    expect(getCheckbox("inv-003")).toBeInTheDocument();
  });

  it("row checkboxes have a descriptive aria-label", async () => {
    await renderLoaded();
    expect(getCheckbox("inv-002")).toHaveAttribute(
      "aria-label",
      "Select invoice inv-002 from Issuer 2"
    );
  });

  it("toggling a row checkbox reveals the bulk-action toolbar", async () => {
    await renderLoaded();
    fireEvent.click(getCheckbox("inv-001"));
    expect(screen.getByTestId("bulk-actions-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-selection-count")).toHaveTextContent(
      "1 of 3 invoices selected."
    );
  });

  it("the bulk-selection-count region announces count updates politely", async () => {
    await renderLoaded();
    fireEvent.click(getCheckbox("inv-001"));
    const region = screen.getByTestId("bulk-selection-count");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("clearing the selection via the Clear button hides the toolbar again", async () => {
    await renderLoaded();
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(screen.getByTestId("bulk-clear"));
    await waitFor(() =>
      expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument()
    );
    expect(getCheckbox("inv-001")).not.toBeChecked();
  });

  it("select-all selects every visible row when in 'partial' state", async () => {
    await renderLoaded();
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    expect(getCheckbox("inv-001")).toBeChecked();
    expect(getCheckbox("inv-002")).toBeChecked();
    expect(getCheckbox("inv-003")).toBeChecked();
    expect(screen.getByTestId("bulk-selection-count")).toHaveTextContent(
      "3 of 3 invoices selected."
    );
    const selectAll = screen.getByTestId("bulk-select-all");
    expect(selectAll.indeterminate).toBe(false);
  });

  it("select-all in 'all' state deselects every visible row", async () => {
    await renderLoaded();
    // Build up to the 'all' state in two stages so the toolbar is visible
    // for both click events. Clicking select-all from a hidden toolbar is not
    // a user-reachable state - the toolbar only mounts when at least one row
    // is selected.
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(screen.getByTestId("bulk-select-all"));
    expect(getCheckbox("inv-001")).toBeChecked();
    expect(getCheckbox("inv-002")).toBeChecked();
    expect(getCheckbox("inv-003")).toBeChecked();

    fireEvent.click(screen.getByTestId("bulk-select-all"));
    await waitFor(() =>
      expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument()
    );
    expect(getCheckbox("inv-001")).not.toBeChecked();
  });

  it("selected rows carry a data-selected='true' attribute and visual highlight", async () => {
    await renderLoaded();
    fireEvent.click(getCheckbox("inv-002"));
    expect(getRow("inv-002")).toHaveAttribute("data-selected", "true");
    expect(getRow("inv-001")).toHaveAttribute("data-selected", "false");
  });

  it("auto-prunes selections when a row is filtered out of the visible set", async () => {
    await renderLoaded();
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(getCheckbox("inv-002"));
    expect(screen.getByTestId("bulk-selection-count")).toHaveTextContent(
      "2 of 3 invoices selected."
    );

    // Filter to EUR — only inv-001 matches. Selection should be pruned to one.
    fireEvent.change(screen.getByLabelText("Minimum yield percentage"), {
      target: { value: "999" }, // exclude everything
    });
    await waitFor(() =>
      expect(screen.getByText(/no invoices match your filters/i)).toBeInTheDocument()
    );
    // No more visible rows -> nothing to keep
    expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument();

    // Clear the yield filter; the toolbar should stay hidden because the
    // previously-selected rows are no longer in the UI selection state.
    fireEvent.change(screen.getByLabelText("Minimum yield percentage"), {
      target: { value: "" },
    });
    await waitFor(() =>
      expect(screen.getByRole("list", { name: /investable invoices/i })).toBeInTheDocument()
    );
    expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument();
    expect(getCheckbox("inv-001")).not.toBeChecked();
  });

  it("Export invokes the onBulkExport handler with the selected invoices", async () => {
    const onBulkExport = jest.fn(() => ({ count: 2 }));
    await renderLoaded({ onBulkExport });
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(getCheckbox("inv-002"));
    fireEvent.click(screen.getByTestId("bulk-export"));
    await flushPromises();

    expect(onBulkExport).toHaveBeenCalledTimes(1);
    const [calledWith] = onBulkExport.mock.calls[0];
    expect(Array.isArray(calledWith)).toBe(true);
    expect(calledWith.map((i) => i.id)).toEqual(["inv-001", "inv-002"]);
  });

  it("Export calls the toast.success API on success when supplied", async () => {
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    await renderLoaded({ toast, onBulkExport: () => ({ count: 1 }) });
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(screen.getByTestId("bulk-export"));
    await flushPromises();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Exported 1 invoice"),
      expect.any(String)
    );
  });

  it("Delete opens a confirm dialog", async () => {
    await renderLoaded();
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: /Delete selected invoices\?/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/You are about to permanently delete 1 invoice/i)
    ).toBeInTheDocument();
  });

  it("Cancelling the dialog closes it without deleting anything", async () => {
    const onBulkDelete = jest.fn(async () => ({ count: 0 }));
    await renderLoaded({ onBulkDelete });
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Cancel/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onBulkDelete).not.toHaveBeenCalled();
    // The row the user selected is still in the marketplace list.
    expect(screen.getByTestId("invoice-row-inv-001")).toBeInTheDocument();
  });

  it("Confirming the dialog removes the selected rows from the visible list", async () => {
    const onBulkDelete = jest.fn(async () => ({ count: 1 }));
    await renderLoaded({ onBulkDelete });
    fireEvent.click(getCheckbox("inv-002"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 invoice/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onBulkDelete).toHaveBeenCalledTimes(1);
    // inv-002 should be removed from the list
    expect(screen.queryByTestId("invoice-row-inv-002")).not.toBeInTheDocument();
    expect(screen.getByTestId("invoice-row-inv-001")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-row-inv-003")).toBeInTheDocument();
  });

  it("Confirming the delete calls the toast.success API on success when supplied", async () => {
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    await renderLoaded({ toast, onBulkDelete: async () => ({ count: 1 }) });
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 invoice/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("Removed 1 invoice"),
        expect.any(String)
      )
    );
  });

  it("A failing delete handler surfaces an error toast and keeps the rows", async () => {
    const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    const onBulkDelete = jest.fn(async () => {
      throw new Error("backend down");
    });
    await renderLoaded({ toast, onBulkDelete });
    fireEvent.click(getCheckbox("inv-001"));
    fireEvent.click(screen.getByTestId("bulk-delete"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete 1 invoice/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByTestId("invoice-row-inv-001")).toBeInTheDocument();
  });

  it("press Escape inside the toolbar to clear selection", async () => {
    await renderLoaded();
    fireEvent.click(getCheckbox("inv-001"));
    const toolbar = screen.getByTestId("bulk-actions-toolbar");
    fireEvent.keyDown(toolbar, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument()
    );
    expect(getCheckbox("inv-001")).not.toBeChecked();
  });
});

describe("toExportRecord", () => {
  it("returns a stripped-down record keeping only the public invoice fields", async () => {
    const page = await import("./page");
    const record = page.toExportRecord({
      id: "inv-1",
      issuer: "Acme",
      amount: "12,500",
      currency: "USD",
      dueDate: "2026-06-15",
      yield: "8.2%",
      status: "Open",
      internalField: "should be stripped",
    });
    expect(record).toEqual({
      id: "inv-1",
      issuer: "Acme",
      amount: "12,500",
      currency: "USD",
      dueDate: "2026-06-15",
      yield: "8.2%",
      status: "Open",
    });
    expect(record.internalField).toBeUndefined();
  });
});
