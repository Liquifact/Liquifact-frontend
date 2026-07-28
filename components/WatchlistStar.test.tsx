import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import WatchlistStar from "./WatchlistStar";

jest.mock("@/lib/hooks/useWatchlist", () => ({
  useWatchlist: jest.fn(),
}));

const { useWatchlist } = require("@/lib/hooks/useWatchlist");

describe("WatchlistStar — keyboard operability", () => {
  const mockToggleInvoice = jest.fn();

  beforeEach(() => {
    mockToggleInvoice.mockClear();
  });

  it("renders as a button with aria-pressed and accessible label", () => {
    useWatchlist.mockReturnValue({
      watchlists: [{ id: "1", invoiceIds: ["inv-1"] }],
      addWatchlist: jest.fn(),
      toggleInvoice: mockToggleInvoice,
    });

    render(<WatchlistStar invoiceId="inv-1" />);

    const btn = screen.getByRole("button", { name: /Remove from watchlist/ });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("is reachable by keyboard via Tab", async () => {
    const user = userEvent.setup();
    useWatchlist.mockReturnValue({
      watchlists: [],
      addWatchlist: jest.fn(),
      toggleInvoice: mockToggleInvoice,
    });

    render(<WatchlistStar invoiceId="inv-1" />);
    const btn = screen.getByRole("button", { name: /Add to watchlist/ });

    btn.focus();
    expect(btn).toHaveFocus();
  });

  it("toggles invoice on Enter", async () => {
    const user = userEvent.setup();
    useWatchlist.mockReturnValue({
      watchlists: [],
      addWatchlist: jest.fn(),
      toggleInvoice: mockToggleInvoice,
    });

    render(<WatchlistStar invoiceId="inv-1" />);
    const btn = screen.getByRole("button", { name: /Add to watchlist/ });
    btn.focus();

    await user.keyboard("{Enter}");
    expect(mockToggleInvoice).toHaveBeenCalledWith(null, "inv-1");
  });

  it("toggles invoice on Space", async () => {
    const user = userEvent.setup();
    useWatchlist.mockReturnValue({
      watchlists: [],
      addWatchlist: jest.fn(),
      toggleInvoice: mockToggleInvoice,
    });

    render(<WatchlistStar invoiceId="inv-1" />);
    const btn = screen.getByRole("button", { name: /Add to watchlist/ });
    btn.focus();

    await user.keyboard(" ");
    expect(mockToggleInvoice).toHaveBeenCalledWith(null, "inv-1");
  });

  it("applies focus-ring class for visible keyboard focus", () => {
    useWatchlist.mockReturnValue({
      watchlists: [],
      addWatchlist: jest.fn(),
      toggleInvoice: mockToggleInvoice,
    });

    render(<WatchlistStar invoiceId="inv-1" />);
    const btn = screen.getByRole("button", { name: /Add to watchlist/ });

    expect(btn.className).toContain("focus-ring");
    expect(btn.className).not.toContain("focus:outline-none");
  });
});
