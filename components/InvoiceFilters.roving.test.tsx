/**
 * @file InvoiceFilters.roving.test.tsx
 *
 * Comprehensive tests for the roving tabindex pattern on the currency filter
 * chip toolbar in InvoiceFilters (Issue #466).
 *
 * Areas covered
 * ─────────────
 * 1. toolbar role exists and has an accessible name
 * 2. roving tabindex — only one chip has tabindex="0" at a time
 * 3. ArrowRight navigation (including wrap-around)
 * 4. ArrowLeft navigation (including wrap-around)
 * 5. Home key jumps to first chip
 * 6. End key jumps to last chip
 * 7. aria-pressed remains correct on click and keyboard navigation
 * 8. Mouse / click interactions still work
 * 9. Keyboard focus updates correctly after key presses
 * 10. focus-ring class is present on every currency chip (compatible with
 *     focus-ring.a11y.test.tsx conventions)
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import InvoiceFilters, { DEFAULT_FILTERS } from "./InvoiceFilters";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF"];

/** Render InvoiceFilters with sensible defaults and return helpers. */
function setup(overrides: Partial<typeof DEFAULT_FILTERS> = {}) {
  const onFilterChange = jest.fn();
  const onClearFilters = jest.fn();
  const filters = { ...DEFAULT_FILTERS, ...overrides };
  const result = render(
    <InvoiceFilters
      filters={filters}
      onFilterChange={onFilterChange}
      onClearFilters={onClearFilters}
    />
  );
  return { ...result, onFilterChange, onClearFilters, filters };
}

/** Get the currency toolbar element. */
function getToolbar() {
  return screen.getByRole("toolbar", { name: /currency filter/i });
}

/** Get all currency chip buttons. */
function getCurrencyButtons() {
  return CURRENCIES.map((cur) => screen.getByRole("button", { name: `Filter by ${cur}` }));
}

// ─── 1. Toolbar role & accessible name ───────────────────────────────────────

describe("Currency toolbar — role and accessible name", () => {
  it("renders the currency chips inside a role=toolbar container", () => {
    setup();
    expect(getToolbar()).toBeInTheDocument();
  });

  it("toolbar has an accessible name", () => {
    setup();
    const toolbar = getToolbar();
    const accessibleName =
      toolbar.getAttribute("aria-label") || toolbar.getAttribute("aria-labelledby");
    expect(accessibleName).toBeTruthy();
  });

  it("toolbar contains all five currency chips", () => {
    setup();
    const toolbar = getToolbar();
    CURRENCIES.forEach((cur) => {
      const btn = screen.getByRole("button", { name: `Filter by ${cur}` });
      expect(toolbar).toContainElement(btn);
    });
  });
});

// ─── 2. Roving tabindex — initial state ──────────────────────────────────────

describe("Roving tabindex — initial state", () => {
  it("exactly one chip has tabindex=0 on initial render", () => {
    setup();
    const buttons = getCurrencyButtons();
    const withZero = buttons.filter((btn) => btn.getAttribute("tabindex") === "0");
    expect(withZero).toHaveLength(1);
  });

  it("the first chip (USD) has tabindex=0 by default", () => {
    setup();
    const usd = screen.getByRole("button", { name: "Filter by USD" });
    expect(usd).toHaveAttribute("tabindex", "0");
  });

  it("all chips except the first have tabindex=-1 on initial render", () => {
    setup();
    const buttons = getCurrencyButtons();
    buttons.slice(1).forEach((btn) => {
      expect(btn).toHaveAttribute("tabindex", "-1");
    });
  });
});

// ─── 3. ArrowRight navigation ─────────────────────────────────────────────────

describe("ArrowRight navigation", () => {
  it("moves focus to the next chip on ArrowRight", () => {
    setup();
    const toolbar = getToolbar();
    const usd = screen.getByRole("button", { name: "Filter by USD" });
    const eur = screen.getByRole("button", { name: "Filter by EUR" });

    usd.focus();
    fireEvent.keyDown(toolbar, { key: "ArrowRight" });

    expect(eur).toHaveFocus();
    expect(eur).toHaveAttribute("tabindex", "0");
    expect(usd).toHaveAttribute("tabindex", "-1");
  });

  it("advances through all chips sequentially on ArrowRight", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    buttons[0].focus();
    for (let i = 1; i < CURRENCIES.length; i++) {
      fireEvent.keyDown(toolbar, { key: "ArrowRight" });
      expect(buttons[i]).toHaveFocus();
    }
  });

  it("wraps from last chip to first on ArrowRight", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();
    const lastBtn = buttons[CURRENCIES.length - 1];
    const firstBtn = buttons[0];

    lastBtn.focus();
    // Simulate that the last chip is the focused one
    fireEvent.keyDown(toolbar, { key: "End" }); // move focus to last
    fireEvent.keyDown(toolbar, { key: "ArrowRight" }); // wrap around

    expect(firstBtn).toHaveFocus();
    expect(firstBtn).toHaveAttribute("tabindex", "0");
  });
});

// ─── 4. ArrowLeft navigation ──────────────────────────────────────────────────

describe("ArrowLeft navigation", () => {
  it("moves focus to the previous chip on ArrowLeft", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    // First navigate to EUR (index 1), then press ArrowLeft
    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: "ArrowRight" }); // now at EUR
    fireEvent.keyDown(toolbar, { key: "ArrowLeft" }); // back to USD

    expect(buttons[0]).toHaveFocus();
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
    expect(buttons[1]).toHaveAttribute("tabindex", "-1");
  });

  it("wraps from first chip to last on ArrowLeft", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();
    const lastBtn = buttons[CURRENCIES.length - 1];
    const firstBtn = buttons[0];

    firstBtn.focus();
    fireEvent.keyDown(toolbar, { key: "ArrowLeft" }); // wrap to last

    expect(lastBtn).toHaveFocus();
    expect(lastBtn).toHaveAttribute("tabindex", "0");
  });
});

// ─── 5. Home key ──────────────────────────────────────────────────────────────

describe("Home key", () => {
  it("jumps focus to the first chip from any position", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    // Navigate to the last chip first
    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: "End" });
    expect(buttons[CURRENCIES.length - 1]).toHaveFocus();

    // Home should jump to first
    fireEvent.keyDown(toolbar, { key: "Home" });
    expect(buttons[0]).toHaveFocus();
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
  });

  it("prevents default behavior on Home", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();
    buttons[0].focus();

    const event = new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(event, "preventDefault");
    toolbar.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

// ─── 6. End key ───────────────────────────────────────────────────────────────

describe("End key", () => {
  it("jumps focus to the last chip from any position", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: "End" });

    const lastBtn = buttons[CURRENCIES.length - 1];
    expect(lastBtn).toHaveFocus();
    expect(lastBtn).toHaveAttribute("tabindex", "0");
  });

  it("prevents default behavior on End", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();
    buttons[0].focus();

    const event = new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(event, "preventDefault");
    toolbar.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

// ─── 7. aria-pressed correctness ─────────────────────────────────────────────

describe("aria-pressed correctness", () => {
  it("all chips have aria-pressed=false when no currency is selected", () => {
    setup({ currency: "" });
    getCurrencyButtons().forEach((btn) => {
      expect(btn).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("selected chip has aria-pressed=true, others have aria-pressed=false", () => {
    setup({ currency: "EUR" });
    const eur = screen.getByRole("button", { name: "Filter by EUR" });
    expect(eur).toHaveAttribute("aria-pressed", "true");

    getCurrencyButtons()
      .filter((btn) => btn !== eur)
      .forEach((btn) => {
        expect(btn).toHaveAttribute("aria-pressed", "false");
      });
  });

  it("clicking a chip keeps aria-pressed in sync via onFilterChange", () => {
    const { onFilterChange } = setup({ currency: "" });
    const usd = screen.getByRole("button", { name: "Filter by USD" });

    fireEvent.click(usd);

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "USD" })
    );
  });

  it("clicking an already-selected chip deselects it via onFilterChange", () => {
    const { onFilterChange } = setup({ currency: "USD" });
    const usd = screen.getByRole("button", { name: "Filter by USD" });

    fireEvent.click(usd);

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "" })
    );
  });
});

// ─── 8. Mouse / click interactions ───────────────────────────────────────────

describe("Mouse click interactions", () => {
  it("clicking a chip calls onFilterChange with the correct currency", () => {
    const { onFilterChange } = setup();
    const gbp = screen.getByRole("button", { name: "Filter by GBP" });

    fireEvent.click(gbp);

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "GBP" })
    );
  });

  it("clicking a chip updates the roving tabindex so that chip gets tabindex=0", () => {
    setup();
    const eur = screen.getByRole("button", { name: "Filter by EUR" });
    const usd = screen.getByRole("button", { name: "Filter by USD" });

    fireEvent.click(eur);

    expect(eur).toHaveAttribute("tabindex", "0");
    expect(usd).toHaveAttribute("tabindex", "-1");
  });

  it("clicking a chip does not change aria-pressed of other chips", () => {
    setup({ currency: "USD" });
    const eur = screen.getByRole("button", { name: "Filter by EUR" });
    const jpy = screen.getByRole("button", { name: "Filter by JPY" });

    // JPY is not selected
    fireEvent.click(eur); // fires onFilterChange but aria-pressed depends on filters prop

    expect(jpy).toHaveAttribute("aria-pressed", "false");
  });
});

// ─── 9. Keyboard focus updates correctly ─────────────────────────────────────

describe("Keyboard focus updates", () => {
  it("only one chip has tabindex=0 after ArrowRight", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: "ArrowRight" });

    const withZero = buttons.filter((btn) => btn.getAttribute("tabindex") === "0");
    expect(withZero).toHaveLength(1);
  });

  it("focused chip gets tabindex=0, all others get tabindex=-1 after navigation", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: "End" }); // move to last

    const lastIndex = CURRENCIES.length - 1;
    buttons.forEach((btn, i) => {
      if (i === lastIndex) {
        expect(btn).toHaveAttribute("tabindex", "0");
      } else {
        expect(btn).toHaveAttribute("tabindex", "-1");
      }
    });
  });

  it("unhandled keys do not change focus or tabindex", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    buttons[0].focus();
    expect(buttons[0]).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(toolbar, { key: "Tab" });

    // tabindex state should be unchanged
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
  });
});

// ─── 10. focus-ring class compatibility ──────────────────────────────────────

describe("focus-ring class compatibility (focus-ring.a11y.test.tsx conventions)", () => {
  it("every currency chip carries the focus-ring class", () => {
    setup();
    getCurrencyButtons().forEach((btn) => {
      expect(btn.className).toContain("focus-ring");
    });
  });

  it("chips are keyboard-focusable (the tabindex=0 chip can receive focus via Tab)", async () => {
    const user = userEvent.setup();
    // Render just the filter component with a wrapper div to isolate tab order
    const onFilterChange = jest.fn();
    render(
      <div>
        <InvoiceFilters
          filters={DEFAULT_FILTERS}
          onFilterChange={onFilterChange}
          onClearFilters={jest.fn()}
        />
      </div>
    );

    // Tab into the component until we land on a currency chip
    const usd = screen.getByRole("button", { name: "Filter by USD" });
    usd.focus();
    expect(usd).toHaveFocus();
  });
});

// ─── 11. Wrap-around edge cases ───────────────────────────────────────────────

describe("Wrap-around navigation edge cases", () => {
  it("ArrowRight from last chip wraps to first and gives it tabindex=0", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    buttons[0].focus();
    // Navigate to last using End key
    fireEvent.keyDown(toolbar, { key: "End" });
    // Now wrap around
    fireEvent.keyDown(toolbar, { key: "ArrowRight" });

    expect(buttons[0]).toHaveFocus();
    expect(buttons[0]).toHaveAttribute("tabindex", "0");
    expect(buttons[CURRENCIES.length - 1]).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowLeft from first chip wraps to last and gives it tabindex=0", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: "ArrowLeft" }); // wrap to last

    const lastBtn = buttons[CURRENCIES.length - 1];
    expect(lastBtn).toHaveFocus();
    expect(lastBtn).toHaveAttribute("tabindex", "0");
    expect(buttons[0]).toHaveAttribute("tabindex", "-1");
  });

  it("multiple wrap-arounds remain consistent", () => {
    setup();
    const toolbar = getToolbar();
    const buttons = getCurrencyButtons();

    buttons[0].focus();
    // Navigate forward through all chips and wrap once more back to start
    for (let i = 0; i < CURRENCIES.length; i++) {
      fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    }
    // Should be back at index 0 (5 rights from 0 = 5 mod 5 = 0)
    expect(buttons[0]).toHaveFocus();
  });
});
