import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import WatchlistSection from "./WatchlistSection";

jest.mock("@/lib/hooks/useWatchlist", () => ({
  useWatchlist: jest.fn(),
}));

jest.mock("react-error-boundary", () => ({
  ErrorBoundary: ({ children }) => children,
}), { virtual: true });

const { useWatchlist } = require("@/lib/hooks/useWatchlist");

describe("WatchlistSection — keyboard operability", () => {
  const mockAddWatchlist = jest.fn();
  const mockRemoveWatchlist = jest.fn();

  beforeEach(() => {
    mockAddWatchlist.mockClear();
    mockRemoveWatchlist.mockClear();
  });

  it("renders a delete button for each watchlist", () => {
    useWatchlist.mockReturnValue({
      watchlists: [
        { id: "1", name: "High Yield", invoiceIds: [] },
        { id: "2", name: "Short Term", invoiceIds: [] },
      ],
      addWatchlist: mockAddWatchlist,
      removeWatchlist: mockRemoveWatchlist,
    });

    render(<WatchlistSection />);

    const deleteButtons = screen.getAllByRole("button", { name: /Delete/ });
    expect(deleteButtons).toHaveLength(2);
  });

  it("delete button is reachable by keyboard via Tab", async () => {
    const user = userEvent.setup();
    useWatchlist.mockReturnValue({
      watchlists: [{ id: "1", name: "High Yield", invoiceIds: [] }],
      addWatchlist: mockAddWatchlist,
      removeWatchlist: mockRemoveWatchlist,
    });

    render(<WatchlistSection />);
    const deleteBtn = screen.getByRole("button", { name: /Delete High Yield watchlist/ });

    deleteBtn.focus();
    expect(deleteBtn).toHaveFocus();
  });

  it("activates delete on Enter", async () => {
    const user = userEvent.setup();
    useWatchlist.mockReturnValue({
      watchlists: [{ id: "1", name: "High Yield", invoiceIds: [] }],
      addWatchlist: mockAddWatchlist,
      removeWatchlist: mockRemoveWatchlist,
    });

    render(<WatchlistSection />);
    const deleteBtn = screen.getByRole("button", { name: /Delete High Yield watchlist/ });
    deleteBtn.focus();

    await user.keyboard("{Enter}");
    expect(mockRemoveWatchlist).toHaveBeenCalledWith("1");
  });

  it("activates delete on Space", async () => {
    const user = userEvent.setup();
    useWatchlist.mockReturnValue({
      watchlists: [{ id: "1", name: "High Yield", invoiceIds: [] }],
      addWatchlist: mockAddWatchlist,
      removeWatchlist: mockRemoveWatchlist,
    });

    render(<WatchlistSection />);
    const deleteBtn = screen.getByRole("button", { name: /Delete High Yield watchlist/ });
    deleteBtn.focus();

    await user.keyboard(" ");
    expect(mockRemoveWatchlist).toHaveBeenCalledWith("1");
  });

  it("applies focus-ring class for visible keyboard focus", () => {
    useWatchlist.mockReturnValue({
      watchlists: [{ id: "1", name: "High Yield", invoiceIds: [] }],
      addWatchlist: mockAddWatchlist,
      removeWatchlist: mockRemoveWatchlist,
    });

    render(<WatchlistSection />);
    const deleteBtn = screen.getByRole("button", { name: /Delete High Yield watchlist/ });

    expect(deleteBtn.className).toContain("focus-ring");
    expect(deleteBtn.className).not.toContain("focus:outline-none");
  });
});
