/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetail.keyboard.test.tsx
 *
 * Keyboard operability coverage for invoice-detail interactive controls (issue #612).
 *
 * Verifies:
 *  1. Every interactive control is a natively focusable element (button, input, checkbox).
 *  2. Tab order follows the visual layout: density toggle → inline-edit controls →
 *     document checkboxes → export buttons (and bulk toolbar when visible).
 *  3. Enter and Space activate button-type controls.
 *  4. Visible focus styles via the shared `.focus-ring` utility (or focus-visible rings).
 */

import "@testing-library/jest-dom";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceDetailClient from "./InvoiceDetailClient";
import InvoiceDetailExport from "./InvoiceDetailExport";
import InvoiceDetailItems from "./InvoiceDetailItems";
import { copy } from "@/app/copy/en";

jest.mock("@/components/CopyButton", () => {
  return function CopyButtonMock({ label }: { label: string }) {
    return (
      <button type="button" aria-label={`Copy ${label}`} data-testid="copy-button-mock">
        Copy
      </button>
    );
  };
});

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

const detail = copy.invest.detail;

const CLIENT_PROPS = {
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
  referenceId: "inv-001",
  rawIssuer: "Acme Corp",
  rawAmount: "50000",
  rawYield: "5.25",
  rawDueDate: "2025-12-31",
  statusPill: <span data-testid="status-pill">Open</span>,
};

const SAMPLE_INVOICE = {
  id: "inv-001",
  issuer: "Acme Corp",
  amount: "50,000",
  currency: "USD",
  dueDate: "2025-12-31",
  yield: "5.25%",
  status: "Open",
};

const SAMPLE_ITEMS = [
  { id: "inv-001-doc-invoice", name: "Invoice PDF", kind: "document", issuer: "Acme" },
  { id: "inv-001-doc-pod", name: "Proof of delivery", kind: "document", issuer: "Acme" },
];

function editBtn(field: string) {
  return screen.getByTestId(`inline-edit-btn-${field}`);
}

function renderDetailSurface() {
  return render(
    <div data-testid="invoice-detail-surface">
      <InvoiceDetailClient {...CLIENT_PROPS} />
      <InvoiceDetailItems initialItems={SAMPLE_ITEMS} />
      <InvoiceDetailExport invoice={SAMPLE_INVOICE} />
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

// ─── 1. Native, focusable elements ───────────────────────────────────────────

describe("Invoice detail — native focusable controls", () => {
  it("density toggle buttons are real <button> elements", () => {
    renderDetailSurface();
    const compact = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    const comfortable = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });
    expect(compact.tagName).toBe("BUTTON");
    expect(comfortable.tagName).toBe("BUTTON");
    expect(compact).toHaveAttribute("type", "button");
    expect(comfortable).toHaveAttribute("type", "button");
  });

  it("inline edit controls are real <button> elements", () => {
    renderDetailSurface();
    ["issuer", "amount", "yield", "dueDate"].forEach((field) => {
      const btn = editBtn(field);
      expect(btn.tagName).toBe("BUTTON");
      expect(btn).toHaveAttribute("type", "button");
    });
  });

  it("document row checkboxes are real <input type=checkbox>", () => {
    renderDetailSurface();
    const list = screen.getByRole("list", { name: detail.bulk.listAriaLabel });
    const boxes = within(list).getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    boxes.forEach((box) => {
      expect(box.tagName).toBe("INPUT");
      expect(box).toHaveAttribute("type", "checkbox");
    });
  });

  it("export controls are real <button> elements", () => {
    renderDetailSurface();
    const group = screen.getByRole("group", { name: detail.exportGroupLabel });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(2);
    buttons.forEach((btn) => expect(btn.tagName).toBe("BUTTON"));
  });

  it("reference copy control is a real <button>", () => {
    renderDetailSurface();
    expect(screen.getByTestId("copy-button-mock").tagName).toBe("BUTTON");
  });
});

// ─── 2. Tab order ────────────────────────────────────────────────────────────

describe("Invoice detail — tab order", () => {
  it("moves through density toggle, inline-edit buttons, copy, checkboxes, and export in DOM order", async () => {
    const user = userEvent.setup();
    renderDetailSurface();

    const compact = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    const comfortable = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });
    const editIssuer = editBtn("issuer");
    const editAmount = editBtn("amount");
    const editYield = editBtn("yield");
    const editDueDate = editBtn("dueDate");
    const copyBtn = screen.getByTestId("copy-button-mock");
    const checkboxInvoice = screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice");
    const checkboxPod = screen.getByTestId("detail-item-checkbox-inv-001-doc-pod");
    const exportCsv = screen.getByRole("button", { name: detail.exportCSVLabel });
    const exportJson = screen.getByRole("button", { name: detail.exportJSONLabel });

    await user.tab();
    expect(compact).toHaveFocus();

    await user.tab();
    expect(comfortable).toHaveFocus();

    await user.tab();
    expect(editIssuer).toHaveFocus();

    await user.tab();
    expect(editAmount).toHaveFocus();

    await user.tab();
    expect(editYield).toHaveFocus();

    await user.tab();
    expect(editDueDate).toHaveFocus();

    await user.tab();
    expect(copyBtn).toHaveFocus();

    await user.tab();
    expect(checkboxInvoice).toHaveFocus();

    await user.tab();
    expect(checkboxPod).toHaveFocus();

    await user.tab();
    expect(exportCsv).toHaveFocus();

    await user.tab();
    expect(exportJson).toHaveFocus();
  });

  it("bulk toolbar controls join the sequence after a row is selected", async () => {
    const user = userEvent.setup();
    renderDetailSurface();

    await user.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));

    const copyBtn = screen.getByTestId("copy-button-mock");
    copyBtn.focus();

    const toolbar = screen.getByTestId("bulk-actions-toolbar");
    const selectAll = within(toolbar).getByTestId("bulk-select-all");
    const clearBtn = within(toolbar).getByTestId("bulk-clear");
    const bulkExport = within(toolbar).getByTestId("bulk-export");
    const bulkDelete = within(toolbar).getByTestId("bulk-delete");

    await user.tab();
    expect(selectAll).toHaveFocus();

    await user.tab();
    expect(clearBtn).toHaveFocus();

    await user.tab();
    expect(bulkExport).toHaveFocus();

    await user.tab();
    expect(bulkDelete).toHaveFocus();
  });
});

// ─── 3. Enter / Space activation ─────────────────────────────────────────────

describe("Invoice detail — Enter and Space activation", () => {
  it("Enter and Space on density Compact both switch to compact density", async () => {
    const user = userEvent.setup();
    renderDetailSurface();

    const compact = screen.getByRole("button", { name: detail.densityCompactAriaLabel });
    compact.focus();
    await user.keyboard("{Enter}");
    expect(compact).toHaveAttribute("aria-pressed", "true");

    const comfortable = screen.getByRole("button", { name: detail.densityComfortableAriaLabel });
    comfortable.focus();
    await user.keyboard(" ");
    expect(comfortable).toHaveAttribute("aria-pressed", "true");
    expect(compact).toHaveAttribute("aria-pressed", "false");
  });

  it("Enter and Space on an inline Edit button both open edit mode", async () => {
    const user = userEvent.setup();
    renderDetailSurface();

    const issuerEdit = editBtn("issuer");
    issuerEdit.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("inline-edit-input-issuer")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    issuerEdit.focus();
    await user.keyboard(" ");
    expect(screen.getByTestId("inline-edit-input-issuer")).toBeInTheDocument();
  });

  it("Enter and Space on Save / Cancel in edit mode commit or discard", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(<InvoiceDetailClient {...CLIENT_PROPS} onSave={onSave} />);

    editBtn("issuer").focus();
    await user.keyboard("{Enter}");
    const input = screen.getByTestId("inline-edit-input-issuer");
    await user.clear(input);
    await user.type(input, "Keyboard Corp");

    const save = screen.getByTestId("inline-edit-save-issuer");
    save.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("issuer", "Keyboard Corp");
    });

    editBtn("amount").focus();
    await user.keyboard("{Enter}");
    const cancel = screen.getByTestId("inline-edit-cancel-amount");
    cancel.focus();
    await user.keyboard(" ");
    expect(screen.queryByTestId("inline-edit-input-amount")).not.toBeInTheDocument();
  });

  it("Space toggles a document checkbox", async () => {
    const user = userEvent.setup();
    renderDetailSurface();

    const checkbox = screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice");
    checkbox.focus();
    expect(checkbox).not.toBeChecked();
    await user.keyboard(" ");
    expect(checkbox).toBeChecked();
  });

  it("Enter triggers CSV export when the export button is focused", async () => {
    const user = userEvent.setup();
    const clickSpy = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    renderDetailSurface();
    const exportCsv = screen.getByRole("button", { name: detail.exportCSVLabel });
    exportCsv.focus();
    await user.keyboard("{Enter}");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("does not trigger CSV export via keyboard when export is disabled", async () => {
    const user = userEvent.setup();
    const clickSpy = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    render(<InvoiceDetailExport invoice={null} />);
    const exportCsv = screen.getByRole("button", { name: detail.exportCSVLabel });
    expect(exportCsv).toBeDisabled();
    exportCsv.focus();
    await user.keyboard("{Enter}");
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

// ─── 4. Visible focus styles ─────────────────────────────────────────────────

describe("Invoice detail — visible focus styles", () => {
  it("density toggle buttons carry the focus-ring class", () => {
    renderDetailSurface();
    [
      screen.getByRole("button", { name: detail.densityCompactAriaLabel }),
      screen.getByRole("button", { name: detail.densityComfortableAriaLabel }),
    ].forEach((btn) => {
      expect(btn.className).toContain("focus-ring");
    });
  });

  it("inline edit, save, and cancel buttons carry focus-ring", async () => {
    const user = userEvent.setup();
    renderDetailSurface();

    expect(editBtn("issuer").className).toContain("focus-ring");

    editBtn("issuer").focus();
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("inline-edit-save-issuer").className).toContain("focus-ring");
    expect(screen.getByTestId("inline-edit-cancel-issuer").className).toContain("focus-ring");
    expect(screen.getByTestId("inline-edit-input-issuer").className).toContain("focus-ring");
  });

  it("document checkboxes carry the focus-ring class", () => {
    renderDetailSurface();
    const checkbox = screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice");
    expect(checkbox.className).toContain("focus-ring");
  });

  it("export buttons carry the focus-ring class", () => {
    renderDetailSurface();
    [
      screen.getByRole("button", { name: detail.exportCSVLabel }),
      screen.getByRole("button", { name: detail.exportJSONLabel }),
    ].forEach((btn) => {
      expect(btn.className).toContain("focus-ring");
    });
  });

  it("bulk toolbar select-all checkbox carries focus-ring when toolbar is visible", async () => {
    const user = userEvent.setup();
    renderDetailSurface();
    await user.click(screen.getByTestId("detail-item-checkbox-inv-001-doc-invoice"));
    const selectAll = screen.getByTestId("bulk-select-all");
    expect(selectAll.className).toContain("focus-ring");
  });
});
