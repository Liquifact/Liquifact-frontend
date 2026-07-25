import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import InvoiceFilters, {
  DEFAULT_FILTERS,
  validateYieldRange,
  validateMaturityRange,
} from "./InvoiceFilters";

describe("validateYieldRange", () => {
  it("returns null when both bounds are empty (unbounded)", () => {
    expect(validateYieldRange("", "")).toBeNull();
  });

  it("returns null for a valid range", () => {
    expect(validateYieldRange("5", "10")).toBeNull();
  });

  it("returns null when only min is set", () => {
    expect(validateYieldRange("5", "")).toBeNull();
  });

  it("returns null when only max is set", () => {
    expect(validateYieldRange("", "10")).toBeNull();
  });

  it("returns null when min equals max (boundary)", () => {
    expect(validateYieldRange("5", "5")).toBeNull();
  });

  it("flags non-numeric min", () => {
    expect(validateYieldRange("abc", "")).toBe("Minimum yield must be a valid number.");
  });

  it("flags non-numeric max", () => {
    expect(validateYieldRange("", "xyz")).toBe("Maximum yield must be a valid number.");
  });

  it("flags negative min", () => {
    expect(validateYieldRange("-5", "")).toBe("Minimum yield cannot be negative.");
  });

  it("flags negative max", () => {
    expect(validateYieldRange("", "-1")).toBe("Maximum yield cannot be negative.");
  });

  it("flags min greater than max", () => {
    expect(validateYieldRange("10", "5")).toBe("Minimum yield cannot exceed maximum yield.");
  });
});

describe("validateMaturityRange", () => {
  it("returns null when both bounds are empty (unbounded)", () => {
    expect(validateMaturityRange("", "")).toBeNull();
  });

  it("returns null for a valid range", () => {
    expect(validateMaturityRange("2026-01-01", "2026-12-31")).toBeNull();
  });

  it("returns null when from equals to (boundary)", () => {
    expect(validateMaturityRange("2026-06-15", "2026-06-15")).toBeNull();
  });

  it("flags a malformed from date", () => {
    expect(validateMaturityRange("not-a-date", "")).toBe("From date must be a valid date.");
  });

  it("flags a malformed to date", () => {
    expect(validateMaturityRange("", "2026-13-40")).toBe("To date must be a valid date.");
  });

  it("flags from date after to date", () => {
    expect(validateMaturityRange("2026-12-31", "2026-01-01")).toBe(
      "From date cannot be after to date."
    );
  });
});

describe("InvoiceFilters inline validation UI", () => {
  it("shows no yield error by default", () => {
    render(
      <InvoiceFilters filters={DEFAULT_FILTERS} onFilterChange={() => {}} onClearFilters={() => {}} />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an inline error and marks inputs invalid when yieldMin exceeds yieldMax", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "10", yieldMax: "5" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    const minInput = screen.getByLabelText("Minimum yield percentage");
    const maxInput = screen.getByLabelText("Maximum yield percentage");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Minimum yield cannot exceed maximum yield."
    );
    expect(minInput).toHaveAttribute("aria-invalid", "true");
    expect(maxInput).toHaveAttribute("aria-invalid", "true");
    expect(minInput.getAttribute("aria-describedby")).toBeTruthy();
    expect(maxInput.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("shows an inline error for a negative yield value", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "-2" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Minimum yield cannot be negative.");
  });

  it("still calls onFilterChange while the field is invalid (live typing is not blocked)", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMax: "5" }}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText("Minimum yield percentage"), {
      target: { value: "10" },
    });

    expect(handleChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      yieldMax: "5",
      yieldMin: "10",
    });
  });

  it("shows no maturity error by default", () => {
    render(
      <InvoiceFilters filters={DEFAULT_FILTERS} onFilterChange={() => {}} onClearFilters={() => {}} />
    );
    expect(screen.queryByLabelText("Maturity date from")).toHaveAttribute("aria-invalid", "false");
  });

  it("shows an inline error when maturityFrom is after maturityTo", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, maturityFrom: "2026-12-31", maturityTo: "2026-01-01" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    const fromInput = screen.getByLabelText("Maturity date from");
    const toInput = screen.getByLabelText("Maturity date to");

    expect(screen.getByRole("alert")).toHaveTextContent("From date cannot be after to date.");
    expect(fromInput).toHaveAttribute("aria-invalid", "true");
    expect(toInput).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the yield error once the range becomes valid again", () => {
    const { rerender } = render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "10", yieldMax: "5" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "1", yieldMax: "5" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
