/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 *
 * @file components/Watchlist.test.tsx
 * Focused React Testing Library tests for the Watchlist component:
 *   - Loading state & loading exclusivity
 *   - Empty state & empty exclusivity
 *   - Error state & error exclusivity
 *   - Success state, accessible roles, live regions & axe compliance
 *   - Primary interactions (star toggle, remove item, clear all, search/filter)
 *   - Keyboard accessibility
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import Watchlist from "./Watchlist";

expect.extend(toHaveNoViolations);

// Mock next/link to render simple HTML <a> anchor tags for testing
jest.mock("next/link", () => {
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

// Mock StatusPill
jest.mock("./StatusPill", () => {
  return function MockStatusPill({ status }: { status: string }) {
    return (
      <span role="status" data-testid="status-pill">
        {status}
      </span>
    );
  };
});

// Fixture Data
const MOCK_ITEMS = [
  {
    id: "inv-101",
    issuer: "Acme Corp",
    amount: "15,000",
    currency: "USD",
    dueDate: "2026-08-30",
    yield: "8.5%",
    status: "Tokenized",
  },
  {
    id: "inv-102",
    issuer: "Global Logistics",
    amount: 42000,
    currency: "EUR",
    dueDate: "2026-09-15",
    yield: "9.2%",
    status: "Open",
  },
];

describe("Watchlist Component — States and Interactions", () => {
  // ===========================================================================
  // 1. Loading State & Loading Exclusivity
  // ===========================================================================
  describe("Loading State & Exclusivity", () => {
    it("renders loading container with aria-busy='true' and skeletons", () => {
      const { container } = render(<Watchlist loading={true} />);

      const section = screen.getByRole("region", { name: "Watchlist" });
      expect(section).toHaveAttribute("aria-busy", "true");

      const skeletons = screen.getAllByTestId("watchlist-skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
      expect(screen.getByRole("status")).toHaveTextContent("Loading watchlist...");
    });

    it("enforces loading exclusivity: does NOT render empty state, error banner, or success items", () => {
      render(<Watchlist loading={true} items={MOCK_ITEMS} error="Some error" />);

      expect(screen.queryByText("Your watchlist is empty")).not.toBeInTheDocument();
      expect(screen.queryByText("Unable to load watchlist")).not.toBeInTheDocument();
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.queryByRole("list", { name: "Watchlist items" })).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 2. Empty State & Exclusivity
  // ===========================================================================
  describe("Empty State & Exclusivity", () => {
    it("renders empty state heading, description, and marketplace CTA link", () => {
      render(<Watchlist items={[]} loading={false} />);

      expect(screen.getByText("Your watchlist is empty")).toBeInTheDocument();
      expect(
        screen.getByText("Star invoices from the marketplace to keep track of them here.")
      ).toBeInTheDocument();

      const ctaLink = screen.getByRole("link", { name: "Browse marketplace" });
      expect(ctaLink).toBeInTheDocument();
      expect(ctaLink).toHaveAttribute("href", "/invest");
    });

    it("enforces empty state exclusivity: does NOT render loading skeletons, error banner, or items list", () => {
      render(<Watchlist items={[]} loading={false} />);

      expect(screen.queryByTestId("watchlist-skeleton")).not.toBeInTheDocument();
      expect(screen.queryByText("Unable to load watchlist")).not.toBeInTheDocument();
      expect(screen.queryByRole("list", { name: "Watchlist items" })).not.toBeInTheDocument();
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    });

    it("supports keyboard navigation to the CTA link in empty state", async () => {
      const user = userEvent.setup();
      render(<Watchlist items={[]} />);

      const ctaLink = screen.getByRole("link", { name: "Browse marketplace" });
      await user.tab();
      expect(ctaLink).toHaveFocus();
    });
  });

  // ===========================================================================
  // 3. Error State & Exclusivity
  // ===========================================================================
  describe("Error State & Exclusivity", () => {
    it("renders error banner with role='alert' and custom error message", () => {
      render(<Watchlist error="Failed to fetch watchlist from server" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Unable to load watchlist")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch watchlist from server")).toBeInTheDocument();
    });

    it("handles Error object gracefully in error prop", () => {
      render(<Watchlist error={new Error("Network disconnect")} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Network disconnect")).toBeInTheDocument();
    });

    it("renders retry button and calls onRetry when clicked", () => {
      const onRetryMock = jest.fn();
      render(<Watchlist error="Connection error" onRetry={onRetryMock} />);

      const retryBtn = screen.getByRole("button", { name: "Retry loading" });
      expect(retryBtn).toBeInTheDocument();

      fireEvent.click(retryBtn);
      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });

    it("enforces error state exclusivity: does NOT render loading skeleton, empty state, or item list", () => {
      render(<Watchlist error="Fatal error" items={MOCK_ITEMS} />);

      expect(screen.queryByTestId("watchlist-skeleton")).not.toBeInTheDocument();
      expect(screen.queryByText("Your watchlist is empty")).not.toBeInTheDocument();
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.queryByRole("list", { name: "Watchlist items" })).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 4. Success State & Accessibility
  // ===========================================================================
  describe("Success State & Accessibility", () => {
    it("renders full list of watchlist items with correct markup and accessible names", () => {
      render(<Watchlist items={MOCK_ITEMS} />);

      const section = screen.getByRole("region", { name: "Watchlist" });
      expect(section).toBeInTheDocument();

      const itemsList = screen.getByRole("list", { name: "Watchlist items" });
      expect(itemsList).toBeInTheDocument();

      expect(
        screen.getByRole("link", { name: "View details for invoice inv-101 from Acme Corp" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "View details for invoice inv-102 from Global Logistics" })
      ).toBeInTheDocument();

      const liveStatus = screen.getByTestId("watchlist-status");
      expect(liveStatus).toHaveTextContent("2 invoices in watchlist");
    });

    it("enforces success state exclusivity: does NOT render loading skeletons, empty state, or error banner", () => {
      render(<Watchlist items={MOCK_ITEMS} loading={false} error={null} />);

      expect(screen.queryByTestId("watchlist-skeleton")).not.toBeInTheDocument();
      expect(screen.queryByText("Your watchlist is empty")).not.toBeInTheDocument();
      expect(screen.queryByText("Unable to load watchlist")).not.toBeInTheDocument();
    });

    it("passes axe accessibility checks with no violations", async () => {
      const { container } = render(<Watchlist items={MOCK_ITEMS} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ===========================================================================
  // 5. Primary Interactions & Keyboard Navigation
  // ===========================================================================
  describe("Primary Interactions & Keyboard Controls", () => {
    it("triggers star toggle action when clicking star button on item", () => {
      const onToggleStarMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onToggleStar={onToggleStarMock} />);

      const starBtn = screen.getByRole("button", {
        name: "Remove invoice inv-101 from watchlist",
      });
      expect(starBtn).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(starBtn);
      expect(onToggleStarMock).toHaveBeenCalledWith("inv-101");
    });

    it("triggers remove action when clicking Remove button on item", () => {
      const onRemoveItemMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onRemoveItem={onRemoveItemMock} />);

      const removeBtn = screen.getByRole("button", {
        name: "Remove Acme Corp from watchlist",
      });

      fireEvent.click(removeBtn);
      expect(onRemoveItemMock).toHaveBeenCalledWith("inv-101");
    });

    it("triggers clear all action when clicking Clear Watchlist button", () => {
      const onClearAllMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onClearAll={onClearAllMock} />);

      const clearBtn = screen.getByRole("button", {
        name: "Clear all watchlist items",
      });

      fireEvent.click(clearBtn);
      expect(onClearAllMock).toHaveBeenCalledTimes(1);
    });

    it("filters items dynamically when typing in search input", () => {
      render(<Watchlist items={MOCK_ITEMS} />);

      const searchInput = screen.getByRole("searchbox", { name: "Search watchlist" });
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Global Logistics")).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "Global" } });

      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.getByText("Global Logistics")).toBeInTheDocument();

      expect(screen.getByTestId("watchlist-status")).toHaveTextContent(
        'Showing 1 of 2 watchlist items for search "Global"'
      );
    });

    it("shows no-matches view with clear filter option when search query has zero matches", () => {
      render(<Watchlist items={MOCK_ITEMS} />);

      const searchInput = screen.getByRole("searchbox", { name: "Search watchlist" });
      fireEvent.change(searchInput, { target: { value: "NonExistentIssuer" } });

      expect(screen.getByText('No watchlist items match "NonExistentIssuer".')).toBeInTheDocument();

      const clearFilterBtn = screen.getByRole("button", { name: "Clear search filter" });
      fireEvent.click(clearFilterBtn);

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Global Logistics")).toBeInTheDocument();
    });

    it("supports tab focus navigation across controls and keyboard activation", async () => {
      const user = userEvent.setup();
      const onClearAllMock = jest.fn();
      const onRemoveItemMock = jest.fn();

      render(
        <Watchlist items={MOCK_ITEMS} onClearAll={onClearAllMock} onRemoveItem={onRemoveItemMock} />
      );

      const clearBtn = screen.getByRole("button", { name: "Clear all watchlist items" });
      const searchInput = screen.getByRole("searchbox", { name: "Search watchlist" });

      await user.tab();
      expect(clearBtn).toHaveFocus();

      await user.tab();
      expect(searchInput).toHaveFocus();
    });

    it("follows a logical tab order through all visible controls", async () => {
      const user = userEvent.setup();
      const onClearAllMock = jest.fn();
      const onToggleStarMock = jest.fn();
      const onRemoveItemMock = jest.fn();

      render(
        <Watchlist
          items={MOCK_ITEMS}
          onClearAll={onClearAllMock}
          onToggleStar={onToggleStarMock}
          onRemoveItem={onRemoveItemMock}
        />
      );

      const clearBtn = screen.getByRole("button", { name: "Clear all watchlist items" });
      const searchInput = screen.getByRole("searchbox", { name: "Search watchlist" });
      const selectAllCheckbox = screen.getByRole("checkbox", { name: "Select all watchlist items" });
      const item1Checkbox = screen.getByRole("checkbox", { name: /Select invoice inv-101 from Acme Corp/ });
      const starBtn = screen.getByRole("button", { name: /Remove invoice inv-101 from watchlist/ });
      const issuerLink = screen.getByRole("link", { name: /View details for invoice inv-101/ });
      const removeBtn = screen.getByRole("button", { name: /Remove Acme Corp from watchlist/ });

      await user.tab();
      expect(clearBtn).toHaveFocus();

      await user.tab();
      expect(searchInput).toHaveFocus();

      await user.tab();
      expect(selectAllCheckbox).toHaveFocus();

      await user.tab();
      expect(item1Checkbox).toHaveFocus();

      await user.tab();
      expect(starBtn).toHaveFocus();

      await user.tab();
      expect(issuerLink).toHaveFocus();

      await user.tab();
      expect(removeBtn).toHaveFocus();
    });

    it("activates Clear watchlist button on Enter", async () => {
      const user = userEvent.setup();
      const onClearAllMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onClearAll={onClearAllMock} />);

      const clearBtn = screen.getByRole("button", { name: "Clear all watchlist items" });
      clearBtn.focus();
      expect(clearBtn).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(onClearAllMock).toHaveBeenCalledTimes(1);
    });

    it("activates Clear watchlist button on Space", async () => {
      const user = userEvent.setup();
      const onClearAllMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onClearAll={onClearAllMock} />);

      const clearBtn = screen.getByRole("button", { name: "Clear all watchlist items" });
      clearBtn.focus();
      expect(clearBtn).toHaveFocus();

      await user.keyboard(" ");
      expect(onClearAllMock).toHaveBeenCalledTimes(1);
    });

    it("activates star toggle on Enter", async () => {
      const user = userEvent.setup();
      const onToggleStarMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onToggleStar={onToggleStarMock} />);

      const starBtn = screen.getByRole("button", { name: /Remove invoice inv-101 from watchlist/ });
      starBtn.focus();
      expect(starBtn).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(onToggleStarMock).toHaveBeenCalledWith("inv-101");
    });

    it("activates star toggle on Space", async () => {
      const user = userEvent.setup();
      const onToggleStarMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onToggleStar={onToggleStarMock} />);

      const starBtn = screen.getByRole("button", { name: /Remove invoice inv-101 from watchlist/ });
      starBtn.focus();
      expect(starBtn).toHaveFocus();

      await user.keyboard(" ");
      expect(onToggleStarMock).toHaveBeenCalledWith("inv-101");
    });

    it("activates Remove button on Enter", async () => {
      const user = userEvent.setup();
      const onRemoveItemMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onRemoveItem={onRemoveItemMock} />);

      const removeBtn = screen.getByRole("button", { name: /Remove Acme Corp from watchlist/ });
      removeBtn.focus();
      expect(removeBtn).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(onRemoveItemMock).toHaveBeenCalledWith("inv-101");
    });

    it("activates Remove button on Space", async () => {
      const user = userEvent.setup();
      const onRemoveItemMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onRemoveItem={onRemoveItemMock} />);

      const removeBtn = screen.getByRole("button", { name: /Remove Acme Corp from watchlist/ });
      removeBtn.focus();
      expect(removeBtn).toHaveFocus();

      await user.keyboard(" ");
      expect(onRemoveItemMock).toHaveBeenCalledWith("inv-101");
    });

    it("activates issuer link on Enter", async () => {
      const user = userEvent.setup();
      render(<Watchlist items={MOCK_ITEMS} />);

      const issuerLink = screen.getByRole("link", { name: /View details for invoice inv-101/ });
      issuerLink.focus();
      expect(issuerLink).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(issuerLink).toHaveAttribute("href", "/invest/inv-101");
    });

    it("shows visible focus ring on interactive controls", async () => {
      const user = userEvent.setup();
      const onClearAllMock = jest.fn();
      render(<Watchlist items={MOCK_ITEMS} onClearAll={onClearAllMock} />);

      const clearBtn = screen.getByRole("button", { name: "Clear all watchlist items" });
      await user.tab();
      expect(clearBtn).toHaveFocus();

      expect(clearBtn.className).toContain("focus-ring");
    });
  });
});
