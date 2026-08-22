/**
 * @file InvoiceFilters.keyboard.test.tsx
 *
 * Component-level keyboard operability & focus-visible coverage for the
 * two controls in InvoiceFilters that previously lacked a visible focus
 * indicator: the sort-direction toggle (DirectionToggle) and the
 * "Clear Filters" button (Issue: "Keyboard-operate marketplace").
 *
 * The currency-chip roving-tabindex toolbar already has dedicated coverage
 * in InvoiceFilters.roving.test.tsx; this file focuses on the two gaps
 * closed by this change plus a couple of full-component tab-order checks.
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InvoiceFilters, { DEFAULT_FILTERS } from "./InvoiceFilters";

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

describe("DirectionToggle — keyboard operability", () => {
  it("is reachable by keyboard (Tab) once its column is active", async () => {
    const user = userEvent.setup();
    setup({ sort: "amount" });

    const toggle = screen.getByRole("button", { name: /^Sort amount/ });
    expect(toggle).toBeEnabled();

    // Tab from the sort <select> should reach the now-enabled toggle next.
    const sortSelect = screen.getByLabelText("Sort options");
    sortSelect.focus();
    await user.tab();
    expect(toggle).toHaveFocus();
  });

  it("is skipped by Tab while its column is inactive (correctly disabled, not a trap)", async () => {
    const user = userEvent.setup();
    setup({ sort: "" });

    const amountToggle = screen.getByRole("button", { name: /^Sort amount/ });
    expect(amountToggle).toBeDisabled();

    const sortSelect = screen.getByLabelText("Sort options");
    sortSelect.focus();
    await user.tab();
    expect(amountToggle).not.toHaveFocus();
  });

  it("activates on Enter and flips sortDir", async () => {
    const user = userEvent.setup();
    const { onFilterChange } = setup({ sort: "amount", sortDir: "desc" });

    const toggle = screen.getByRole("button", { name: /^Sort amount/ });
    toggle.focus();
    await user.keyboard("{Enter}");

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "amount", sortDir: "asc" })
    );
  });

  it("activates on Space and flips sortDir", async () => {
    const user = userEvent.setup();
    const { onFilterChange } = setup({ sort: "yield", sortDir: "asc" });

    const toggle = screen.getByRole("button", { name: /^Sort yield/ });
    toggle.focus();
    await user.keyboard(" ");

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "yield", sortDir: "desc" })
    );
  });

  it("carries a focus-visible ring utility class", () => {
    setup({ sort: "amount" });
    const toggle = screen.getByRole("button", { name: /^Sort amount/ });
    expect(toggle.className).toMatch(/focus-visible:ring/);
  });

  it("carries a focus-visible ring utility class even when disabled (inactive column)", () => {
    setup({ sort: "" });
    const toggle = screen.getByRole("button", { name: /^Sort amount/ });
    expect(toggle.className).toMatch(/focus-visible:ring/);
  });
});

describe("Clear Filters — keyboard operability", () => {
  it("is reachable by keyboard and disabled when no filters are active", () => {
    setup();
    const clearFilters = screen.getByRole("button", { name: /clear all filters/i });
    expect(clearFilters).toBeDisabled();
  });

  it("activates on Enter once enabled", async () => {
    const user = userEvent.setup();
    const { onClearFilters } = setup({ currency: "USD" });

    const clearFilters = screen.getByRole("button", { name: /clear all filters/i });
    expect(clearFilters).toBeEnabled();
    clearFilters.focus();
    await user.keyboard("{Enter}");

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("activates on Space once enabled", async () => {
    const user = userEvent.setup();
    const { onClearFilters } = setup({ yieldMin: "5" });

    const clearFilters = screen.getByRole("button", { name: /clear all filters/i });
    clearFilters.focus();
    await user.keyboard(" ");

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("does not fire the handler via keyboard while disabled", async () => {
    const user = userEvent.setup();
    const { onClearFilters } = setup();

    const clearFilters = screen.getByRole("button", { name: /clear all filters/i });
    clearFilters.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onClearFilters).not.toHaveBeenCalled();
  });

  it("carries a focus-visible ring utility class regardless of enabled state", () => {
    setup();
    const disabledClear = screen.getByRole("button", { name: /clear all filters/i });
    expect(disabledClear.className).toMatch(/focus-visible:ring/);

    setup({ currency: "EUR" });
    const enabledClear = screen.getAllByRole("button", { name: /clear all filters/i })[1];
    expect(enabledClear.className).toMatch(/focus-visible:ring/);
  });
});

describe("InvoiceFilters — full component tab order", () => {
  it("moves yieldMin → yieldMax → currency toolbar (single stop) → maturity from/to → sort select → direction toggles → clear filters", async () => {
    const user = userEvent.setup();
    setup({ sort: "amount", currency: "GBP" });

    const yieldMin = screen.getByLabelText("Minimum yield percentage");
    const yieldMax = screen.getByLabelText("Maximum yield percentage");
    // Roving tabindex always starts at index 0 (USD) regardless of which
    // currency is selected — only the chip carrying tabindex="0" is ever a
    // Tab stop (see InvoiceFilters.roving.test.tsx for dedicated coverage
    // of arrow-key navigation within the toolbar).
    const currencyChip = screen.getByRole("button", { name: "Filter by USD" });
    const maturityFrom = screen.getByLabelText("Maturity date from");
    const maturityTo = screen.getByLabelText("Maturity date to");
    const sortSelect = screen.getByLabelText("Sort options");
    const amountToggle = screen.getByRole("button", { name: /^Sort amount/ });
    const yieldToggle = screen.getByRole("button", { name: /^Sort yield direction/ });
    const clearFilters = screen.getByRole("button", { name: /clear all filters/i });

    yieldMin.focus();
    expect(yieldMin).toHaveFocus();

    await user.tab();
    expect(yieldMax).toHaveFocus();

    await user.tab();
    expect(currencyChip).toHaveFocus();

    await user.tab();
    expect(maturityFrom).toHaveFocus();

    await user.tab();
    expect(maturityTo).toHaveFocus();

    await user.tab();
    expect(sortSelect).toHaveFocus();

    await user.tab();
    expect(amountToggle).toHaveFocus();

    // yield toggle is disabled (amount is the active column) and therefore
    // correctly excluded from the tab sequence.
    await user.tab();
    expect(yieldToggle).not.toHaveFocus();
    expect(clearFilters).toHaveFocus();
  });
});
