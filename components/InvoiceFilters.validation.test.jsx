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
      expect(screen.getByRole("alert")).toHaveTextContent("Min yield must be a positive number");
    });

    it("shows error when max yield is negative", () => {
      render(<FilterWrapper />);
      const maxInput = screen.getByLabelText(/maximum yield/i);
      fireEvent.change(maxInput, { target: { value: "-1" } });
      fireEvent.blur(maxInput);
      expect(screen.getByRole("alert")).toHaveTextContent("Max yield must be a positive number");
    });

    it("shows error when min exceeds max", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      const maxInput = screen.getByLabelText(/maximum yield/i);
      fireEvent.change(minInput, { target: { value: "10" } });
      fireEvent.blur(minInput);
      fireEvent.change(maxInput, { target: { value: "5" } });
      fireEvent.blur(maxInput);
      expect(screen.getByRole("alert")).toHaveTextContent("Min yield cannot exceed max yield");
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
      expect(document.getElementById(errorId)).toHaveTextContent(
        "Min yield must be a positive number"
      );
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
      expect(screen.getByRole("alert")).toHaveTextContent("Start date cannot be after end date");
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

  describe("Filter controls accessibility", () => {
    it("does not show validation errors before blur (touched gate)", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      fireEvent.change(minInput, { target: { value: "-5" } });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(minInput).toHaveAttribute("aria-invalid", "false");
    });

    it("shows validation errors after blur (touched gate opens)", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      fireEvent.change(minInput, { target: { value: "-5" } });
      fireEvent.blur(minInput);
      expect(screen.getByRole("alert")).toHaveTextContent("Min yield must be a positive number");
      expect(minInput).toHaveAttribute("aria-invalid", "true");
    });

    it("clears error when value is corrected", () => {
      render(<FilterWrapper />);
      const minInput = screen.getByLabelText(/minimum yield/i);
      fireEvent.change(minInput, { target: { value: "-5" } });
      fireEvent.blur(minInput);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      fireEvent.change(minInput, { target: { value: "5" } });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("clear button is disabled when no filters are active", () => {
      render(<FilterWrapper />);
      const clearBtn = screen.getByRole("button", { name: /clear all filters/i });
      expect(clearBtn).toBeDisabled();
    });

    it("clear button is enabled when filters are active", () => {
      render(<FilterWrapper initialFilters={{ ...DEFAULT_FILTERS, yieldMin: "5" }} />);
      const clearBtn = screen.getByRole("button", { name: /clear all filters/i });
      expect(clearBtn).toBeEnabled();
    });
  });
});
