/**
 * @file components/__tests__/icon-button-accessibility.test.tsx
 *
 * Accessibility tests for marketplace icon-only buttons (issue #769).
 *
 * Verifies that every icon-only control carries:
 *   - A descriptive `aria-label`
 *   - Correct toggle semantics (`aria-pressed` where applicable)
 *   - Decorative SVGs marked `aria-hidden="true"` and `focusable="false"`
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import WatchlistStar from "@/components/WatchlistStar";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/lib/hooks/useWatchlist", () => ({
  useWatchlist: jest.fn(() => ({
    watchlists: [],
    addWatchlist: jest.fn(),
    toggleInvoice: jest.fn(),
  })),
}));

// ── WatchlistStar ──────────────────────────────────────────────────────────

describe("WatchlistStar — icon button accessibility", () => {
  it("has an aria-label describing its action (not starred)", () => {
    render(<WatchlistStar invoiceId="inv-001" />);
    const button = screen.getByRole("button", { name: /add to watchlist/i });
    expect(button).toHaveAttribute("aria-label", "Add to watchlist");
  });

  it("has aria-pressed toggle attribute", () => {
    render(<WatchlistStar invoiceId="inv-001" />);
    const button = screen.getByRole("button", { name: /add to watchlist/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("child SVG has aria-hidden to prevent double-announcement", () => {
    const { container } = render(<WatchlistStar invoiceId="inv-001" />);
    const button = screen.getByRole("button", { name: /add to watchlist/i });
    const svg = button.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("child SVG has focusable=false to exclude from tab order", () => {
    const { container } = render(<WatchlistStar invoiceId="inv-001" />);
    const button = screen.getByRole("button", { name: /add to watchlist/i });
    const svg = button.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("focusable", "false");
  });
});

// ── DirectionToggle (via InvoiceFilters) ───────────────────────────────────

import InvoiceFilters, { DEFAULT_FILTERS } from "@/components/InvoiceFilters";

function filtersWith(overrides) {
  return { ...DEFAULT_FILTERS, ...overrides };
}

describe("DirectionToggle — icon button accessibility", () => {
  it("active toggle has aria-pressed=true", () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const toggle = screen.getByLabelText("Sort amount ascending");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("inactive toggle has aria-pressed=false", () => {
    render(
      <InvoiceFilters
        filters={filtersWith({ sort: "amount", sortDir: "desc" })}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const toggle = screen.getByLabelText("Sort yield direction");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("all toggles have aria-pressed when no column is active", () => {
    render(
      <InvoiceFilters
        filters={DEFAULT_FILTERS}
        onFilterChange={() => {}}
        onClearFilters={() => {}}
      />
    );
    const toggles = screen.getAllByRole("button", { name: /sort .* direction/i });
    for (const toggle of toggles) {
      expect(toggle).toHaveAttribute("aria-pressed", "false");
    }
  });
});
