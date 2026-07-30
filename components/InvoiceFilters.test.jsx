import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceFilters, {
  DEFAULT_FILTERS,
  hasActiveFilters,
  StatusLegendFilter,
  validateNavigationInputs,
} from "./InvoiceFilters";

describe("DEFAULT_FILTERS", () => {
  it("has the expected shape with empty values", () => {
    expect(DEFAULT_FILTERS).toEqual({
      yieldMin: "",
      yieldMax: "",
      currency: "",
      maturityFrom: "",
      maturityTo: "",
      sort: "",
      sortDir: "desc",
      statuses: [],
      watchlistOnly: false,
    });
  });
});

describe("hasActiveFilters", () => {
  it("returns false for default filters", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it("returns true when yieldMin is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, yieldMin: "5" })).toBe(true);
  });

  it("returns true when yieldMax is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, yieldMax: "10" })).toBe(true);
  });

  it("returns true when currency is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, currency: "USD" })).toBe(true);
  });

  it("returns true when maturityFrom is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, maturityFrom: "2026-01-01" })).toBe(true);
  });

  it("returns true when maturityTo is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, maturityTo: "2026-12-31" })).toBe(true);
  });

  it("returns true when sort is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: "yield_desc" })).toBe(true);
  });
});

describe("InvoiceFilters", () => {
  it("renders all filter controls", () => {
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.getByLabelText("Minimum yield percentage")).toBeInTheDocument();
    expect(screen.getByLabelText("Maximum yield percentage")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by USD")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by EUR")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by GBP")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by JPY")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by CHF")).toBeInTheDocument();
    expect(screen.getByLabelText("Maturity date from")).toBeInTheDocument();
    expect(screen.getByLabelText("Maturity date to")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort options")).toBeInTheDocument();
    expect(screen.getByLabelText("Clear all filters")).toBeInTheDocument();
  });

  it("calls onFilterChange with updated filters when yieldMin changes", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText("Minimum yield percentage"), { target: { value: "5" } });

    expect(handleChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      yieldMin: "5",
    });
  });

  it("calls onFilterChange with updated filters when yieldMax changes", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText("Maximum yield percentage"), {
      target: { value: "10" },
    });

    expect(handleChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      yieldMax: "10",
    });
  });

  it("calls onFilterChange with selected currency on click", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    fireEvent.click(screen.getByLabelText("Filter by USD"));

    expect(handleChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      currency: "USD",
    });
  });

  it("deselects currency when the same currency is clicked again", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, currency: "USD" }}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    fireEvent.click(screen.getByLabelText("Filter by USD"));

    expect(handleChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      currency: "",
    });
  });

  it("calls onFilterChange when maturityFrom changes", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText("Maturity date from"), {
      target: { value: "2026-01-01" },
    });

    expect(handleChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      maturityFrom: "2026-01-01",
    });
  });

  it("calls onFilterChange when maturityTo changes", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText("Maturity date to"), {
      target: { value: "2026-12-31" },
    });

    expect(handleChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      maturityTo: "2026-12-31",
    });
  });

  it("calls onFilterChange when sort option is selected", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText("Sort options"), { target: { value: "yield" } });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: "yield",
      })
    );
  });

  it("calls onFilterChange when sort direction toggle is activated via keyboard", async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, sort: "amount", sortDir: "desc" }}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    const amountToggle = screen.getByLabelText("Sort amount ascending");
    amountToggle.focus();
    await user.keyboard("{Enter}");

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: "amount",
        sortDir: "asc",
      })
    );
  });

  it("calls onClearFilters when clear button is clicked", () => {
    const handleClear = jest.fn();
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, currency: "USD" }}
        onFilterChange={() => {}}
        onClearFilters={handleClear}
      />
    );

    fireEvent.click(screen.getByLabelText("Clear all filters"));

    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("disables clear button when no filters are active", () => {
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.getByLabelText("Clear all filters")).toBeDisabled();
  });

  it("enables clear button when filters are active", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, currency: "GBP" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.getByLabelText("Clear all filters")).toBeEnabled();
  });

  it("marks the selected currency button as pressed", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, currency: "EUR" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.getByLabelText("Filter by EUR")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Filter by USD")).toHaveAttribute("aria-pressed", "false");
  });

  it("renders all sort options", () => {
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    const select = screen.getByLabelText("Sort options");
    expect(select).toHaveDisplayValue("Sort By");
  });

  it("renders all five currency buttons", () => {
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.getByLabelText("Filter by USD")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by EUR")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by GBP")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by JPY")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by CHF")).toBeInTheDocument();
  });
});

describe("validateNavigationInputs", () => {
  it("returns no errors for empty (default) inputs", () => {
    expect(validateNavigationInputs(DEFAULT_FILTERS)).toEqual({});
  });

  it("returns no errors for valid yield inputs", () => {
    expect(
      validateNavigationInputs({ ...DEFAULT_FILTERS, yieldMin: "2", yieldMax: "8.5" })
    ).toEqual({});
  });

  it("rejects negative yieldMin", () => {
    const err = validateNavigationInputs({ ...DEFAULT_FILTERS, yieldMin: "-1" });
    expect(err.yieldMin).toBeDefined();
    expect(err.yieldRange).toBeUndefined();
  });

  it("rejects non-numeric yieldMax", () => {
    const err = validateNavigationInputs({ ...DEFAULT_FILTERS, yieldMax: "abc" });
    expect(err.yieldMax).toBeDefined();
  });

  it("accepts yield values with trailing %", () => {
    expect(
      validateNavigationInputs({ ...DEFAULT_FILTERS, yieldMin: "3%", yieldMax: "7%" })
    ).toEqual({});
  });

  it("sets yieldRange when min > max", () => {
    const err = validateNavigationInputs({ ...DEFAULT_FILTERS, yieldMin: "10", yieldMax: "5" });
    expect(err.yieldRange).toBeDefined();
    expect(err.yieldMin).toBeUndefined();
    expect(err.yieldMax).toBeUndefined();
  });

  it("does not set yieldRange when one bound is invalid", () => {
    const err = validateNavigationInputs({ ...DEFAULT_FILTERS, yieldMin: "-1", yieldMax: "5" });
    expect(err.yieldMin).toBeDefined();
    expect(err.yieldRange).toBeUndefined();
  });

  it("rejects invalid maturityFrom date", () => {
    const err = validateNavigationInputs({ ...DEFAULT_FILTERS, maturityFrom: "not-a-date" });
    expect(err.maturityFrom).toBeDefined();
  });

  it("rejects invalid maturityTo date", () => {
    const err = validateNavigationInputs({ ...DEFAULT_FILTERS, maturityTo: "13-01-2026" });
    expect(err.maturityTo).toBeDefined();
  });

  it("sets maturityRange when from > to", () => {
    const err = validateNavigationInputs({
      ...DEFAULT_FILTERS,
      maturityFrom: "2026-12-31",
      maturityTo: "2026-01-01",
    });
    expect(err.maturityRange).toBeDefined();
    expect(err.maturityFrom).toBeUndefined();
    expect(err.maturityTo).toBeUndefined();
  });

  it("accepts valid maturity dates", () => {
    expect(
      validateNavigationInputs({
        ...DEFAULT_FILTERS,
        maturityFrom: "2026-01-01",
        maturityTo: "2026-12-31",
      })
    ).toEqual({});
  });

  it("does not set maturityRange when one bound is invalid", () => {
    const err = validateNavigationInputs({
      ...DEFAULT_FILTERS,
      maturityFrom: "bad-date",
      maturityTo: "2026-01-01",
    });
    expect(err.maturityFrom).toBeDefined();
    expect(err.maturityRange).toBeUndefined();
  });
});

describe("InvoiceFilters — validation display", () => {
  it("does not show errors before blur", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "-1" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows yieldMin error after blur on invalid input", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "-5" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    fireEvent.blur(screen.getByLabelText("Minimum yield percentage"));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("sets aria-invalid and aria-describedby on errored input", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMax: "abc" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    fireEvent.blur(screen.getByLabelText("Maximum yield percentage"));

    const input = screen.getByLabelText("Maximum yield percentage");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby");
  });

  it("removes error when input becomes valid", () => {
    const { rerender } = render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "-1" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    fireEvent.blur(screen.getByLabelText("Minimum yield percentage"));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "5" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("removes aria-invalid when error clears", () => {
    const { rerender } = render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "-1" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    fireEvent.blur(screen.getByLabelText("Minimum yield percentage"));

    rerender(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "5" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    expect(screen.getByLabelText("Minimum yield percentage")).toHaveAttribute(
      "aria-invalid",
      "false"
    );
  });

  it("shows range error on both yield inputs when min > max", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, yieldMin: "15", yieldMax: "3" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    fireEvent.blur(screen.getByLabelText("Minimum yield percentage"));
    fireEvent.blur(screen.getByLabelText("Maximum yield percentage"));

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBe(2);
  });

  it("shows maturity error after blur on invalid date", () => {
    render(
      <InvoiceFilters
        filters={{ ...DEFAULT_FILTERS, maturityFrom: "invalid" }}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    fireEvent.blur(screen.getByLabelText("Maturity date from"));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("StatusLegendFilter", () => {
  it("renders a chip for each canonical status", () => {
    render(
      <StatusLegendFilter
        selectedStatuses={[]}
        onStatusToggle={() => {}}
        onClearStatuses={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Funded" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settled" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overdue" })).toBeInTheDocument();
  });

  it("marks no chip as pressed when selectedStatuses is empty", () => {
    render(
      <StatusLegendFilter
        selectedStatuses={[]}
        onStatusToggle={() => {}}
        onClearStatuses={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Funded" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Settled" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Overdue" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("marks a selected status chip as aria-pressed=true", () => {
    render(
      <StatusLegendFilter
        selectedStatuses={["Open", "Overdue"]}
        onStatusToggle={() => {}}
        onClearStatuses={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Overdue" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Funded" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Settled" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("calls onStatusToggle with the clicked status", () => {
    const handleToggle = jest.fn();
    render(
      <StatusLegendFilter
        selectedStatuses={[]}
        onStatusToggle={handleToggle}
        onClearStatuses={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Funded" }));

    expect(handleToggle).toHaveBeenCalledWith("Funded");
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("shows a Clear button only when statuses are selected", () => {
    const { rerender } = render(
      <StatusLegendFilter
        selectedStatuses={[]}
        onStatusToggle={() => {}}
        onClearStatuses={() => {}}
      />
    );

    expect(screen.queryByLabelText("Clear status filters")).not.toBeInTheDocument();

    rerender(
      <StatusLegendFilter
        selectedStatuses={["Open"]}
        onStatusToggle={() => {}}
        onClearStatuses={() => {}}
      />
    );

    expect(screen.getByLabelText("Clear status filters")).toBeInTheDocument();
  });

  it("calls onClearStatuses when the Clear button is clicked", () => {
    const handleClear = jest.fn();
    render(
      <StatusLegendFilter
        selectedStatuses={["Settled"]}
        onStatusToggle={() => {}}
        onClearStatuses={handleClear}
      />
    );

    fireEvent.click(screen.getByLabelText("Clear status filters"));

    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("hasActiveFilters returns true when statuses array is non-empty", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, statuses: ["Open"] })).toBe(true);
  });

  it("hasActiveFilters returns false when statuses array is empty", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, statuses: [] })).toBe(false);
  });
});
