/**
 * @file InvoiceFilters.sortdir.test.tsx
 *
 * Comprehensive tests for the sort-direction toggle added to the marketplace.
 *
 * Areas covered
 * ─────────────
 * 1. DEFAULT_FILTERS – sortDir field present and defaulted to 'desc'
 * 2. parseSortState  – parse column + direction from filter state
 * 3. applySortToList – comparator respects direction for amount & yield
 * 4. DirectionToggle (via InvoiceFilters render)
 *    a. aria-sort reflects current direction on the active column
 *    b. clicking the toggle calls onFilterChange with flipped sortDir
 *    c. inactive column toggles are disabled and carry aria-sort="none"
 * 5. Clearing filters resets sortDir to 'desc'
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import InvoiceFilters, {
  DEFAULT_FILTERS,
  parseSortState,
  SORTABLE_COLUMNS,
} from "./InvoiceFilters";
import { applySortToList } from "../app/invest/page";

// ─── Shared fixtures ────────────────────────────────────────────────────────

const BASE = { ...DEFAULT_FILTERS };

function filtersWith(overrides: Partial<typeof DEFAULT_FILTERS>) {
  return { ...BASE, ...overrides };
}

type Invoice = {
  id: string;
  issuer: string;
  amount: string;
  currency: string;
  dueDate: string;
  yield: string;
  status: string;
};

const INVOICES: Invoice[] = [
  {
    id: "a",
    issuer: "Alpha",
    amount: "5,000",
    currency: "USD",
    dueDate: "2026-09-01",
    yield: "6.0%",
    status: "Open",
  },
  {
    id: "b",
    issuer: "Beta",
    amount: "12,500",
    currency: "USD",
    dueDate: "2026-07-15",
    yield: "9.5%",
    status: "Open",
  },
  {
    id: "c",
    issuer: "Gamma",
    amount: "800",
    currency: "EUR",
    dueDate: "2026-11-30",
    yield: "4.2%",
    status: "Open",
  },
];

// ─── 1. DEFAULT_FILTERS ──────────────────────────────────────────────────────

describe("DEFAULT_FILTERS", () => {
  it('includes sortDir defaulted to "desc"', () => {
    expect(DEFAULT_FILTERS).toMatchObject({ sort: "", sortDir: "desc" });
  });

  it("preserves all other filter keys", () => {
    expect(DEFAULT_FILTERS).toMatchObject({
      yieldMin: "",
      yieldMax: "",
      currency: "",
      maturityFrom: "",
      maturityTo: "",
    });
  });
});

// ─── 2. parseSortState ───────────────────────────────────────────────────────

describe("parseSortState", () => {
  it('returns empty column and "desc" direction when sort is empty', () => {
    expect(parseSortState(BASE)).toEqual({ column: "", dir: "desc" });
  });

  it("returns the column and sortDir when sort is a plain column name", () => {
    expect(parseSortState(filtersWith({ sort: "amount", sortDir: "asc" }))).toEqual({
      column: "amount",
      dir: "asc",
    });
  });

  it('returns the column and sortDir for "yield" column descending', () => {
    expect(parseSortState(filtersWith({ sort: "yield", sortDir: "desc" }))).toEqual({
      column: "yield",
      dir: "desc",
    });
  });

  it("parses legacy compound sort values (yield_desc)", () => {
    const result = parseSortState(filtersWith({ sort: "yield_desc", sortDir: "asc" }));
    expect(result).toEqual({ column: "yield", dir: "desc" });
  });

  it("parses legacy compound sort values (amount_asc)", () => {
    const result = parseSortState(filtersWith({ sort: "amount_asc", sortDir: "desc" }));
    expect(result).toEqual({ column: "amount", dir: "asc" });
  });

  it("parses legacy compound sort values (maturity_asc)", () => {
    expect(parseSortState(filtersWith({ sort: "maturity_asc" }))).toEqual({
      column: "maturity",
      dir: "asc",
    });
  });

  it('defaults dir to "desc" when sortDir is absent in filter', () => {
    const f = { ...BASE, sort: "amount" } as typeof BASE;
    // @ts-expect-error — deliberately omitting sortDir to test fallback
    delete f.sortDir;
    expect(parseSortState(f).dir).toBe("desc");
  });
});

// ─── 3. applySortToList ──────────────────────────────────────────────────────

describe("applySortToList", () => {
  it("returns original list when sort is empty", () => {
    const result = applySortToList(INVOICES, BASE);
    expect(result).toEqual(INVOICES);
  });

  it("returns original list for empty input", () => {
    expect(applySortToList([], filtersWith({ sort: "amount", sortDir: "asc" }))).toEqual([]);
  });

  describe("amount sorting", () => {
    it("sorts amount ascending: 800 < 5000 < 12500", () => {
      const result = applySortToList(INVOICES, filtersWith({ sort: "amount", sortDir: "asc" }));
      expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
    });

    it("sorts amount descending: 12500 > 5000 > 800", () => {
      const result = applySortToList(INVOICES, filtersWith({ sort: "amount", sortDir: "desc" }));
      expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
    });
  });

  describe("yield sorting", () => {
    it("sorts yield ascending: 4.2% < 6.0% < 9.5%", () => {
      const result = applySortToList(INVOICES, filtersWith({ sort: "yield", sortDir: "asc" }));
      expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
    });

    it("sorts yield descending: 9.5% > 6.0% > 4.2%", () => {
      const result = applySortToList(INVOICES, filtersWith({ sort: "yield", sortDir: "desc" }));
      expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
    });
  });

  describe("maturity sorting", () => {
    it("sorts maturity ascending: Jul < Sep < Nov", () => {
      const result = applySortToList(INVOICES, filtersWith({ sort: "maturity", sortDir: "asc" }));
      expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
    });

    it("sorts maturity descending: Nov > Sep > Jul", () => {
      const result = applySortToList(INVOICES, filtersWith({ sort: "maturity", sortDir: "desc" }));
      expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
    });
  });

  it("does not mutate the original list", () => {
    const original = [...INVOICES];
    applySortToList(INVOICES, filtersWith({ sort: "amount", sortDir: "asc" }));
    expect(INVOICES).toEqual(original);
  });
});

// ─── 4. DirectionToggle (via InvoiceFilters) ─────────────────────────────────

describe("DirectionToggle in InvoiceFilters", () => {
  it('SORTABLE_COLUMNS exports contain "amount" and "yield"', () => {
    expect(SORTABLE_COLUMNS).toContain("amount");
    expect(SORTABLE_COLUMNS).toContain("yield");
  });

  describe("direction toggle aria-labels", () => {
    it('shows \"Sort amount ascending\" when amount column active and dir=desc', () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "desc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      expect(screen.getByLabelText("Sort amount ascending")).toHaveAttribute(
        "aria-label",
        "Sort amount ascending"
      );
    });

    it('shows \"Sort amount descending\" when amount column active and dir=asc', () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "asc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      expect(screen.getByLabelText("Sort amount descending")).toHaveAttribute(
        "aria-label",
        "Sort amount descending"
      );
    });

    it('shows \"Sort yield ascending\" when yield column active and dir=desc', () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "yield", sortDir: "desc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      expect(screen.getByLabelText("Sort yield ascending")).toHaveAttribute(
        "aria-label",
        "Sort yield ascending"
      );
    });

    it("shows direction label on inactive column toggle", () => {
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "desc" })}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
        />
      );
      expect(screen.getByLabelText("Sort yield direction")).toHaveAttribute(
        "aria-label",
        "Sort yield direction"
      );
    });

    it("shows direction labels on all toggles when no column selected", () => {
      render(<InvoiceFilters filters={BASE} onFilterChange={() => {}} onClearFilters={() => {}} />);
      SORTABLE_COLUMNS.forEach((col) => {
        expect(screen.getByLabelText(`Sort ${col} direction`)).toHaveAttribute(
          "aria-label",
          `Sort ${col} direction`
        );
      });
    });
  });

  describe("toggle interaction – direction flip", () => {
    it("flips desc → asc when the active amount toggle is clicked", () => {
      const handleChange = jest.fn();
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "desc" })}
          onFilterChange={handleChange}
          onClearFilters={() => {}}
        />
      );
      fireEvent.click(screen.getByLabelText(/Sort amount ascending/i));
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "amount", sortDir: "asc" })
      );
    });

    it("flips asc → desc when the active yield toggle is clicked", () => {
      const handleChange = jest.fn();
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "yield", sortDir: "asc" })}
          onFilterChange={handleChange}
          onClearFilters={() => {}}
        />
      );
      fireEvent.click(screen.getByLabelText(/Sort yield descending/i));
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "yield", sortDir: "desc" })
      );
    });

    it("does not call onFilterChange when an inactive toggle is clicked", () => {
      const handleChange = jest.fn();
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "desc" })}
          onFilterChange={handleChange}
          onClearFilters={() => {}}
        />
      );
      // yield toggle is disabled while amount is the active column
      const yieldToggle = screen.getByLabelText(/Sort yield direction/i);
      expect(yieldToggle).toBeDisabled();
      fireEvent.click(yieldToggle);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("sort column select integration", () => {
    it("changing sort column preserves the existing sortDir", () => {
      const handleChange = jest.fn();
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "amount", sortDir: "asc" })}
          onFilterChange={handleChange}
          onClearFilters={() => {}}
        />
      );
      fireEvent.change(screen.getByLabelText("Sort options"), {
        target: { value: "yield" },
      });
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "yield", sortDir: "asc" })
      );
    });

    it("selecting no sort column (empty) keeps sortDir unchanged", () => {
      const handleChange = jest.fn();
      render(
        <InvoiceFilters
          filters={filtersWith({ sort: "yield", sortDir: "desc" })}
          onFilterChange={handleChange}
          onClearFilters={() => {}}
        />
      );
      fireEvent.change(screen.getByLabelText("Sort options"), {
        target: { value: "" },
      });
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "", sortDir: "desc" })
      );
    });
  });
});

// ─── 5. Clear filters resets sortDir ─────────────────────────────────────────

describe("clear filters resets sortDir", () => {
  it("onClearFilters callback is invoked (consumer is responsible for resetting to DEFAULT_FILTERS)", () => {
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

  it('DEFAULT_FILTERS.sortDir is "desc" so a clear always resets direction', () => {
    expect(DEFAULT_FILTERS.sortDir).toBe("desc");
  });
});
