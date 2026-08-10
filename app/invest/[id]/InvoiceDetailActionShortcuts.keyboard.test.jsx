/**
 * InvoiceDetailActionShortcuts.keyboard.test.jsx
 *
 * Coverage for the invoice-detail keyboard shortcuts (issue #928).
 *
 * Tests:
 *   - Registry entries appear in KEYBOARD_SHORTCUTS
 *   - Discoverable hint is rendered
 *   - Pressing e / f / c focuses the matching interactive element
 *   - Ignores editable elements and modifier keys
 *   - Cleans up listeners on unmount
 *   - Dismiss button hides the hint
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import InvoiceDetailActionShortcuts from "./InvoiceDetailActionShortcuts";
import {
  INVOICE_DETAIL_EXPORT_SHORTCUT_KEY,
  INVOICE_DETAIL_FUND_SHORTCUT_KEY,
  INVOICE_DETAIL_COPY_SHORTCUT_KEY,
  KEYBOARD_SHORTCUTS,
} from "@/lib/shortcuts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pressKey(key, init = {}) {
  fireEvent.keyDown(document, { key, bubbles: true, ...init });
}

/** Mount the target buttons into the document body, then render the component. */
function renderWithActions() {
  const buttons = document.createElement("div");
  buttons.innerHTML = `
      <div role="group" aria-label="Export actions">
        <button type="button" aria-label="Export as CSV">Export CSV</button>
        <button type="button" aria-label="Export as JSON">Export JSON</button>
      </div>
      <button type="button" aria-label="Fund this invoice">Fund</button>
      <button type="button" aria-label="Copy link to clipboard">Copy link</button>
    `;
  document.body.appendChild(buttons);
  return render(<InvoiceDetailActionShortcuts />);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// Registry tests
// ---------------------------------------------------------------------------

describe("Invoice-detail shortcut registry entries", () => {
  it("export shortcut key is 'e'", () => {
    expect(INVOICE_DETAIL_EXPORT_SHORTCUT_KEY).toBe("e");
  });

  it("fund shortcut key is 'f'", () => {
    expect(INVOICE_DETAIL_FUND_SHORTCUT_KEY).toBe("f");
  });

  it("copy shortcut key is 'c'", () => {
    expect(INVOICE_DETAIL_COPY_SHORTCUT_KEY).toBe("c");
  });

  it("export entry appears in KEYBOARD_SHORTCUTS exactly once", () => {
    const entries = KEYBOARD_SHORTCUTS.filter(
      (s) => s.id === "invoice-detail-export"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe(INVOICE_DETAIL_EXPORT_SHORTCUT_KEY);
  });

  it("fund entry appears in KEYBOARD_SHORTCUTS exactly once", () => {
    const entries = KEYBOARD_SHORTCUTS.filter(
      (s) => s.id === "invoice-detail-fund"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe(INVOICE_DETAIL_FUND_SHORTCUT_KEY);
  });

  it("copy entry appears in KEYBOARD_SHORTCUTS exactly once", () => {
    const entries = KEYBOARD_SHORTCUTS.filter(
      (s) => s.id === "invoice-detail-copy"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe(INVOICE_DETAIL_COPY_SHORTCUT_KEY);
  });

  it("no duplicate keys across the registry", () => {
    ["e", "f", "c"].forEach((key) => {
      const matches = KEYBOARD_SHORTCUTS.filter((s) => s.key === key);
      expect(matches.length).toBeLessThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Hint rendering
// ---------------------------------------------------------------------------

describe("Invoice-detail shortcut hint", () => {
  it("renders the discoverable hint with data-testid", () => {
    render(<InvoiceDetailActionShortcuts />);
    expect(screen.getByTestId("invoice-detail-shortcut-hint")).toBeInTheDocument();
  });

  it("shows the export, fund, and copy keys in the hint", () => {
    render(<InvoiceDetailActionShortcuts />);
    const hint = screen.getByTestId("invoice-detail-shortcut-hint");
    expect(hint.textContent).toMatch(/e/i);
    expect(hint.textContent).toMatch(/f/i);
    expect(hint.textContent).toMatch(/c/i);
  });

  it("dismisses the hint when the × button is clicked", () => {
    render(<InvoiceDetailActionShortcuts />);
    const dismiss = screen.getByRole("button", { name: /dismiss shortcut/i });
    fireEvent.click(dismiss);
    expect(
      screen.queryByTestId("invoice-detail-shortcut-hint")
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Activation tests
// ---------------------------------------------------------------------------

describe("Invoice-detail shortcut activation", () => {
  it("pressing e focuses the first export button", () => {
    renderWithActions();
    const csvBtn = screen.getByRole("button", { name: /export as csv/i });
    expect(csvBtn).not.toHaveFocus();

    act(() => {
      pressKey("e");
    });

    expect(csvBtn).toHaveFocus();
  });

  it("pressing f focuses the fund button", () => {
    renderWithActions();
    const fundBtn = screen.getByRole("button", { name: /fund this invoice/i });
    expect(fundBtn).not.toHaveFocus();

    act(() => {
      pressKey("f");
    });

    expect(fundBtn).toHaveFocus();
  });

  it("pressing c focuses the copy link button", () => {
    renderWithActions();
    const copyBtn = screen.getByRole("button", {
      name: /copy link to clipboard/i,
    });
    expect(copyBtn).not.toHaveFocus();

    act(() => {
      pressKey("c");
    });

    expect(copyBtn).toHaveFocus();
  });

  it("does not focus when a different key is pressed", () => {
    renderWithActions();
    const csvBtn = screen.getByRole("button", { name: /export as csv/i });

    act(() => {
      pressKey("x");
    });

    expect(csvBtn).not.toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Editable-element bypass
// ---------------------------------------------------------------------------

describe("Invoice-detail shortcuts — ignore editable elements", () => {
  it("does not focus export when an <input> has focus", () => {
    renderWithActions();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const csvBtn = screen.getByRole("button", { name: /export as csv/i });
    act(() => {
      pressKey("e");
    });
    expect(csvBtn).not.toHaveFocus();
  });

  it("does not focus fund when a <textarea> has focus", () => {
    renderWithActions();
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    const fundBtn = screen.getByRole("button", { name: /fund this invoice/i });
    act(() => {
      pressKey("f");
    });
    expect(fundBtn).not.toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Modifier-key bypass
// ---------------------------------------------------------------------------

describe("Invoice-detail shortcuts — modifier keys", () => {
  it("does not focus export when Ctrl+e is pressed", () => {
    renderWithActions();
    const csvBtn = screen.getByRole("button", { name: /export as csv/i });

    act(() => {
      pressKey("e", { ctrlKey: true });
    });

    expect(csvBtn).not.toHaveFocus();
  });

  it("does not focus fund when Meta+f is pressed", () => {
    renderWithActions();
    const fundBtn = screen.getByRole("button", { name: /fund this invoice/i });

    act(() => {
      pressKey("f", { metaKey: true });
    });

    expect(fundBtn).not.toHaveFocus();
  });

  it("does not focus copy when Alt+c is pressed", () => {
    renderWithActions();
    const copyBtn = screen.getByRole("button", {
      name: /copy link to clipboard/i,
    });

    act(() => {
      pressKey("c", { altKey: true });
    });

    expect(copyBtn).not.toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

describe("Invoice-detail shortcuts — cleanup", () => {
  it("removes listeners when the component unmounts", () => {
    const { unmount } = renderWithActions();
    const csvBtn = screen.getByRole("button", { name: /export as csv/i });

    unmount();

    act(() => {
      pressKey("e");
    });

    expect(csvBtn).not.toHaveFocus();
  });
});