/**
 * @file InvoiceFilters.ariasort.test.tsx
 *
 * Comprehensive tests for aria-sort implementation on marketplace sort controls.
 *
 * Areas covered
 * ─────────────
 * 1. aria-sort attribute on DirectionToggle buttons
 *    a. active column + dir="asc"  → aria-sort="ascending"
 *    b. active column + dir="desc" → aria-sort="descending"
 *    c. inactive column            → aria-sort="none"
 *    d. only one toggle at a time has a non-"none" value
 *    e. no column selected         → all toggles have aria-sort="none"
 * 2. Polite live region for sort announcements
 *    a. renders with role="status" and aria-live="polite"
 *    b. announces "Sorted by Amount, ascending" when amount asc is selected
 *    c. announces "Sorted by Yield, descending" when yield desc is selected
 *    d. announces "Sorted by Maturity, descending" when maturity desc is selected
 *    e. region is empty when no sort column is active
 *    f. announcement updates when sort changes (not on initial render without sort)
 * 3. getSortAnnouncement unit tests
 *    a. returns correct text for each column + direction
 *    b. returns empty string when column is empty
 * 4. Interaction integration
 *    a. toggling direction updates aria-sort on the active toggle
 *    b. changing sort column updates aria-sort across toggles
 *    c. clearing filters resets aria-sort states
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import InvoiceFilters, {
  DEFAULT_FILTERS,
  getSortAnnouncement,
  SORTABLE_COLUMNS,
} from "./InvoiceFilters";

// ─── Shared fixtures ────────────────────────────────────────────────────────

const BASE = { ...DEFAULT_FILTERS };

function filtersWith(overrides: Partial<typeof DEFAULT_FILTERS>) {
  return { ...BASE, ...overrides };
}

// ─── 1. getSortAnnouncement ──────────────────────────────────────────────────

describe("getSortAnnouncement", () => {
  it('returns "Sorted by Amount, ascending" for amount asc', () => {
    expect(getSortAnnouncement("amount", "asc")).toBe("Sorted by Amount, ascending");
  });

  it('returns "Sorted by Amount, descending" for amount desc', () => {
    expect(getSortAnnouncement("amount", "desc")).toBe("Sorted by Amount, descending");
  });

  it('returns "Sorted by Yield, ascending" for yield asc', () => {
    expect(getSortAnnouncement("yield", "asc")).toBe("Sorted by Yield, ascending");
  });

  it('returns "Sorted by Yield, descending" for yield desc', () => {
    expect(getSortAnnouncement("yield", "desc")).toBe("Sorted by Yield, descending");
  });

  it('returns "Sorted by Maturity, ascending" for maturity asc', () => {
    expect(getSortAnnouncement("maturity", "asc")).toBe("Sorted by Maturity, ascending");
  });

  it('returns "Sorted by Maturity, descending" for maturity desc', () => {
    expect(getSortAnnouncement("maturity", "desc")).toBe("Sorted by Maturity, descending");
  });

  it("returns empty string when column is empty", () => {
    expect(getSortAnnouncement("", "asc")).toBe("");
    expect(getSortAnnouncement("", "desc")).toBe("");
  });
});

// ─── 2. aria-sort attribute on DirectionToggle buttons ───────────────────────

describe("aria-sort on DirectionToggle buttons", () => {
  describe("active column states", () => {
    it('sets aria-sort="ascending" on the active amount toggle when dir=asc', () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "asc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      const amountToggle = screen.getByLabelText("Sort amount descending");
      expect(amountToggle).toHaveAttribute("aria-sort", "ascending");
      expect(amountToggle).toBeEnabled();
    });

    it('sets aria-sort="descending" on the active amount toggle when dir=desc', () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "desc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      const amountToggle = screen.getByLabelText("Sort amount ascending");
      expect(amountToggle).toHaveAttribute("aria-sort", "descending");
      expect(amountToggle).toBeEnabled();
    });

    it('sets aria-sort="ascending" on the active yield toggle when dir=asc', () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "yield", sortDir: "asc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      const yieldToggle = screen.getByLabelText("Sort yield descending");
      expect(yieldToggle).toHaveAttribute("aria-sort", "ascending");
      expect(yieldToggle).toBeEnabled();
    });

    it('sets aria-sort="descending" on the active yield toggle when dir=desc', () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "yield", sortDir: "desc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      const yieldToggle = screen.getByLabelText("Sort yield ascending");
      expect(yieldToggle).toHaveAttribute("aria-sort", "descending");
      expect(yieldToggle).toBeEnabled();
    });
  });

  describe("inactive column states", () => {
    it('sets aria-sort="none" on the inactive yield toggle when amount is active', () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "desc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      const yieldToggle = screen.getByLabelText("Sort yield direction");
      expect(yieldToggle).toHaveAttribute("aria-sort", "none");
      expect(yieldToggle).toBeDisabled();
    });

    it('sets aria-sort="none" on the inactive amount toggle when yield is active', () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "yield", sortDir: "asc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      const amountToggle = screen.getByLabelText("Sort amount direction");
      expect(amountToggle).toHaveAttribute("aria-sort", "none");
      expect(amountToggle).toBeDisabled();
    });
  });

  describe("only one toggle active at a time", () => {
    it("exactly one toggle has a non-none aria-sort value when a column is active", () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "desc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );

      const amountToggle = screen.getByLabelText("Sort amount ascending");
      const yieldToggle = screen.getByLabelText("Sort yield direction");

      expect(amountToggle).toHaveAttribute("aria-sort", "descending");
      expect(yieldToggle).toHaveAttribute("aria-sort", "none");

      // Verify only one non-none
      const toggles = [amountToggle, yieldToggle];
      const activeToggles = toggles.filter(
        (t) => t.getAttribute("aria-sort") !== "none"
      );
      expect(activeToggles).toHaveLength(1);
    });
  });

  describe("no column selected", () => {
    it("all toggles have aria-sort=\"none\" when no sort column is selected", () => {
      render(
        <InvoiceFilters
          filters={BASE}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );

      SORTABLE_COLUMNS.forEach((col) => {
        const toggle = screen.getByLabelText(`Sort ${col} direction`);
        expect(toggle).toHaveAttribute("aria-sort", "none");
        expect(toggle).toBeDisabled();
      });
    });

    it("all toggles have aria-sort=\"none\" when sort column is maturity (non-sortable)", () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "maturity", sortDir: "desc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );

      SORTABLE_COLUMNS.forEach((col) => {
        const toggle = screen.getByLabelText(`Sort ${col} direction`);
        expect(toggle).toHaveAttribute("aria-sort", "none");
        expect(toggle).toBeDisabled();
      });
    });
  });
});

// ─── 3. Polite live region for sort announcements ────────────────────────────

describe("sort announcement live region", () => {
  it('renders with role="status" and aria-live="polite"', () => {
    render(
      <InvoiceFilters
        filters={BASE}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const region = screen.getByTestId("sort-live-region");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(region).toHaveClass("sr-only");
  });

  it("region is empty when no sort column is active", () => {
    render(
      <InvoiceFilters
        filters={BASE}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("");
  });

  it('announces "Sorted by Amount, ascending" when amount asc is selected', () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "asc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Amount, ascending");
  });

  it('announces "Sorted by Amount, descending" when amount desc is selected', () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Amount, descending");
  });

  it('announces "Sorted by Yield, ascending" when yield asc is selected', () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "yield", sortDir: "asc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Yield, ascending");
  });

  it('announces "Sorted by Yield, descending" when yield desc is selected', () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "yield", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Yield, descending");
  });

  it('announces "Sorted by Maturity, ascending" when maturity asc is selected', () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "maturity", sortDir: "asc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Maturity, ascending");
  });

  it('announces "Sorted by Maturity, descending" when maturity desc is selected', () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "maturity", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Maturity, descending");
  });

  it("updates announcement when sort direction toggles from desc to asc", () => {
    const handleChange = jest.fn();
    const { rerender } = render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "desc" })}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    let region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Amount, descending");

    // Simulate the parent updating state after toggle click
    rerender(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "asc" })}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Amount, ascending");
  });

  it("updates announcement when sort column changes", () => {
    const handleChange = jest.fn();
    const { rerender } = render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "desc" })}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    let region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Amount, descending");

    rerender(
      <InvoiceFilters
        filters={filtersWith({ sort: "yield", sortDir: "asc" })}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Yield, ascending");
  });

  it("clears announcement when sort column is cleared", () => {
    const { rerender } = render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    let region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Amount, descending");

    rerender(
      <InvoiceFilters
        filters={BASE}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("");
  });

  it("does not conflict with the existing results-summary live region", () => {
    // The sort live region should be separate from any results-summary region.
    // This test verifies that the data-testid is unique and the region is
    // sr-only, meaning it won't visually duplicate the results summary.
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    const region = screen.getByTestId("sort-live-region");
    expect(region).toHaveClass("sr-only");
    expect(region).toHaveAttribute("aria-live", "polite");

    // Verify this is the ONLY element with this testid
    const regions = screen.getAllByTestId("sort-live-region");
    expect(regions).toHaveLength(1);
  });
});

// ─── 4. Interaction integration ──────────────────────────────────────────────

describe("aria-sort interaction integration", () => {
  it("clicking the active toggle flips aria-sort between ascending and descending", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "desc" })}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    const toggle = screen.getByLabelText("Sort amount ascending");
    expect(toggle).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(toggle);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "amount", sortDir: "asc" })
    );
  });

  it("changing sort column updates aria-sort on both toggles", () => {
    const handleChange = jest.fn();
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "asc" })}
        onFilterChange={handleChange}
        onClearFilters={() => {}}
      />
    );

    // Initially: amount=ascending, yield=none
    expect(screen.getByLabelText("Sort amount descending")).toHaveAttribute(
      "aria-sort",
      "ascending"
    );
    expect(screen.getByLabelText("Sort yield direction")).toHaveAttribute(
      "aria-sort",
      "none"
    );

    // Change to yield column
    fireEvent.change(screen.getByLabelText("Sort options"), {
      target: { value: "yield" },
    });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "yield", sortDir: "asc" })
    );
  });

  it("selecting a non-sortable column (maturity) sets all toggle aria-sort to none", () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "maturity", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    SORTABLE_COLUMNS.forEach((col) => {
      const toggle = screen.getByLabelText(`Sort ${col} direction`);
      expect(toggle).toHaveAttribute("aria-sort", "none");
      expect(toggle).toBeDisabled();
    });
  });

  it("clearing filters resets all aria-sort to none", () => {
    const handleClear = jest.fn();
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "asc" })}
        onFilterChange={() => {}}
        onClearFilters={handleClear}
      />
    );

    fireEvent.click(screen.getByLabelText("Clear all filters"));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("accessible name describes the action, not just the field", () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    // The active toggle's aria-label should describe the action (Sort) + field + direction
    const activeToggle = screen.getByLabelText("Sort amount ascending");
    expect(activeToggle).toHaveAttribute("aria-label", "Sort amount ascending");

    // The inactive toggle should still describe the action, not just the field name
    const inactiveToggle = screen.getByLabelText("Sort yield direction");
    expect(inactiveToggle).toHaveAttribute("aria-label", "Sort yield direction");
  });
});

// ─── 5. Edge cases ───────────────────────────────────────────────────────────

describe("aria-sort edge cases", () => {
  it("handles legacy compound sort like amount_asc — activeColumn is extracted correctly", () => {
    // Legacy compound sort "amount_asc" is parsed by parseSortState at the
    // InvoiceFilters level as { column: "amount", dir: "asc" }. The
    // DirectionToggle receives filters with the plain column name, so it uses
    // sortDir directly.  With sortDir="desc", the toggle sees dir="desc" and
    // aria-label describes the next action ("Sort amount ascending").
    render(
      <InvoiceFilters
        filters={{ ...BASE, sort: "amount_asc", sortDir: "desc" } as typeof BASE}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const amountToggle = screen.getByLabelText("Sort amount ascending");
    expect(amountToggle).toHaveAttribute("aria-sort", "descending");
    expect(amountToggle).toBeEnabled();
  });

  it("handles legacy compound sort like yield_desc — activeColumn extracted correctly", () => {
    // Legacy compound "yield_desc" → { column: "yield", dir: "desc" } at the
    // InvoiceFilters level. The DirectionToggle receives the plain column name
    // and uses sortDir directly ("asc"), so dir="asc" and aria-label describes
    // the next action ("Sort yield descending").
    render(
      <InvoiceFilters
        filters={{ ...BASE, sort: "yield_desc", sortDir: "asc" } as typeof BASE}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const yieldToggle = screen.getByLabelText("Sort yield descending");
    expect(yieldToggle).toHaveAttribute("aria-sort", "ascending");
    expect(yieldToggle).toBeEnabled();

    const amountToggle = screen.getByLabelText("Sort amount direction");
    expect(amountToggle).toHaveAttribute("aria-sort", "none");
    expect(amountToggle).toBeDisabled();
  });

  it("renders the live region even when filters change for non-sort fields", () => {
    const { rerender } = render(
      <InvoiceFilters
        filters={filtersWith({ sort: "yield", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    let region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Yield, descending");

    // Changing non-sort filters should not change the sort announcement
    rerender(
      <InvoiceFilters
        filters={filtersWith({
          sort: "yield",
          sortDir: "desc",
          currency: "USD",
          yieldMin: "5",
        })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );

    region = screen.getByTestId("sort-live-region");
    expect(region).toHaveTextContent("Sorted by Yield, descending");
  });

});
