import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InvoiceFilters, { DEFAULT_FILTERS } from "./InvoiceFilters";

function FilterWrapper({ initialFilters = DEFAULT_FILTERS }) {
  const [filters, setFilters] = useState({ ...initialFilters });
  return (
    <InvoiceFilters
      filters={filters}
      onFilterChange={setFilters}
      onClearFilters={() => setFilters({ ...DEFAULT_FILTERS })}
    />
  );
}

describe("InvoiceFilters validation", () => {
  describe("Yield range validation", () => {
    it("shows error when min yield is negative", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      fireEvent.change(minInput, { target: { value: "-5" } });
      fireEvent.blur(minInput);
      expect(screen.getByRole("alert")).toHaveTextContent(/positive number/i);
    });

    it("shows error when max yield is negative", () => {
      render(<FilterWrapper />);
      const maxInput = screen.getByLabelText(/maximum yield/i);
      fireEvent.change(maxInput, { target: { value: "-1" } });
      fireEvent.blur(maxInput);
      expect(screen.getByRole("alert")).toHaveTextContent(/positive number/i);
    });

    it("shows error when min exceeds max", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      const maxInput = screen.getByLabelText(/maximum yield/i);
      fireEvent.change(minInput, { target: { value: "10" } });
      fireEvent.blur(minInput);
      fireEvent.change(maxInput, { target: { value: "5" } });
      fireEvent.blur(maxInput);
      expect(screen.getByRole("alert")).toHaveTextContent(/cannot exceed/i);
    });

    it("does not show error for valid range", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      const maxInput = screen.getByLabelText(/maximum yield/i);
      fireEvent.change(minInput, { target: { value: "5" } });
      fireEvent.blur(minInput);
      fireEvent.change(maxInput, { target: { value: "10" } });
      fireEvent.blur(maxInput);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("sets aria-invalid on invalid inputs", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      fireEvent.change(minInput, { target: { value: "-5" } });
      fireEvent.blur(minInput);
      expect(minInput).toHaveAttribute("aria-invalid", "true");
    });

    it("sets aria-describedby linking to error message", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      fireEvent.change(minInput, { target: { value: "-5" } });
      fireEvent.blur(minInput);
      const errorId = minInput.getAttribute("aria-describedby");
      expect(errorId).toBeTruthy();
      expect(document.getElementById(errorId)).toHaveTextContent(/positive number/i);
    });
  });

  describe("Maturity date validation", () => {
    it("shows error when from date is after to date", () => {
      render(<FilterWrapper />);
      const fromInput = screen.getByLabelText(/maturity date from/i);
      const toInput = screen.getByLabelText(/maturity date to/i);
      fireEvent.change(fromInput, { target: { value: "2026-12-31" } });
      fireEvent.blur(fromInput);
      fireEvent.change(toInput, { target: { value: "2026-01-01" } });
      fireEvent.blur(toInput);
      expect(screen.getByRole("alert")).toHaveTextContent(/cannot be after/i);
    });

    it("does not show error for valid date range", () => {
      render(<FilterWrapper />);
      const fromInput = screen.getByLabelText(/maturity date from/i);
      const toInput = screen.getByLabelText(/maturity date to/i);
      fireEvent.change(fromInput, { target: { value: "2026-01-01" } });
      fireEvent.blur(fromInput);
      fireEvent.change(toInput, { target: { value: "2026-12-31" } });
      fireEvent.blur(toInput);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("sets aria-invalid on invalid date inputs", () => {
      render(<FilterWrapper />);
      const fromInput = screen.getByLabelText(/maturity date from/i);
      const toInput = screen.getByLabelText(/maturity date to/i);
      fireEvent.change(fromInput, { target: { value: "2026-12-31" } });
      fireEvent.blur(fromInput);
      fireEvent.change(toInput, { target: { value: "2026-01-01" } });
      fireEvent.blur(toInput);
      expect(fromInput).toHaveAttribute("aria-invalid", "true");
      expect(toInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("Filter controls keyboard accessibility", () => {
    it("yield inputs are focusable", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      const maxInput = screen.getByLabelText(/maximum yield/i);
      minInput.focus();
      expect(minInput).toHaveFocus();
      maxInput.focus();
      expect(maxInput).toHaveFocus();
    });

    it("date inputs are focusable", () => {
      render(<FilterWrapper />);
      const fromInput = screen.getByLabelText(/maturity date from/i);
      const toInput = screen.getByLabelText(/maturity date to/i);
      fromInput.focus();
      expect(fromInput).toHaveFocus();
      toInput.focus();
      expect(toInput).toHaveFocus();
    });

    it("sort select is focusable", () => {
      render(<FilterWrapper />);
      const select = screen.getByLabelText(/sort options/i);
      select.focus();
      expect(select).toHaveFocus();
    });

    it("clear filters button is focusable", () => {
      render(<FilterWrapper initialFilters={{ ...DEFAULT_FILTERS, yieldMin: "5" }} />);
      const clearBtn = screen.getByRole("button", { name: /clear all filters/i });
      clearBtn.focus();
      expect(clearBtn).toHaveFocus();
    });
  });
});
