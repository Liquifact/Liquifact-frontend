/**
 * @jest-environment jsdom
 *
 * @file components/WatchlistSection.test.tsx
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";

import WatchlistSection, { WatchlistGrid, WatchlistSectionSkeleton } from "./WatchlistSection";

expect.extend(toHaveNoViolations);

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

const mockAddWatchlist = jest.fn();
const mockRemoveWatchlist = jest.fn();

jest.mock("@/lib/hooks/useWatchlist", () => ({
  useWatchlist: jest.fn(),
}));

jest.mock("@/lib/hooks/useHydrated", () => ({
  useHydrated: jest.fn(),
}));

jest.mock("@/lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useHydrated } from "@/lib/hooks/useHydrated";

const VALID_WATCHLISTS = [
  {
    id: "1",
    name: "High Yield",
    invoiceIds: ["inv-1", "inv-2"],
  },
  {
    id: "2",
    name: "Short Term",
    invoiceIds: [],
  },
];

// Invalid data used to trigger the ErrorBoundary
const CORRUPT_WATCHLISTS = [
  {
    id: "1",
    name: "Corrupted",
  },
];

function mockHook({ watchlists = [] } = {}) {
  (useWatchlist as jest.Mock).mockReturnValue({
    watchlists,
    addWatchlist: mockAddWatchlist,
    removeWatchlist: mockRemoveWatchlist,
  });
}

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
  (useHydrated as jest.Mock).mockReturnValue(true);
});

// -----------------------------------------------------------------------------
// Loading State
// -----------------------------------------------------------------------------

describe("WatchlistSection — Loading State & Exclusivity", () => {
  it("renders an accessible loading placeholder before hydration", () => {
    (useHydrated as jest.Mock).mockReturnValue(false);

    mockHook({
      watchlists: [],
    });

    render(<WatchlistSection />);

    const loading = screen.getByTestId("watchlist-section-loading");

    expect(loading).toHaveAttribute("role", "status");
    expect(loading).toHaveAttribute("aria-live", "polite");
    expect(loading).toHaveAttribute("aria-busy", "true");

    expect(screen.getAllByTestId("watchlist-section-skeleton-card").length).toBeGreaterThan(0);
  });

  it("does not render empty, error or success content while loading", () => {
    (useHydrated as jest.Mock).mockReturnValue(false);

    mockHook({
      watchlists: VALID_WATCHLISTS,
    });

    render(<WatchlistSection />);

    expect(screen.queryByText("You don't have any watchlists yet")).not.toBeInTheDocument();

    expect(screen.queryByText("High Yield")).not.toBeInTheDocument();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("standalone skeleton exposes the same accessibility contract", () => {
    render(<WatchlistSectionSkeleton />);

    const loading = screen.getByTestId("watchlist-section-loading");

    expect(loading).toHaveAttribute("role", "status");
    expect(loading).toHaveAttribute("aria-busy", "true");
  });
});
