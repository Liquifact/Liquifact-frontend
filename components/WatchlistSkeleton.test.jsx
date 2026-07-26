import { render, screen } from "@testing-library/react";
import WatchlistSkeleton from "./WatchlistSkeleton";

describe("WatchlistSkeleton", () => {
  it("renders with aria-busy='true'", () => {
    render(<WatchlistSkeleton />);
    const section = screen.getByRole("region", { name: "Watchlist" });
    expect(section).toHaveAttribute("aria-busy", "true");
  });

  it("renders the default number of rows", () => {
    render(<WatchlistSkeleton />);
    const skeletons = screen.getAllByTestId("watchlist-skeleton");
    expect(skeletons).toHaveLength(3);
  });

  it("renders a custom number of rows", () => {
    render(<WatchlistSkeleton rows={5} />);
    const skeletons = screen.getAllByTestId("watchlist-skeleton");
    expect(skeletons).toHaveLength(5);
  });

  it("renders with a custom title", () => {
    render(<WatchlistSkeleton title="My Watchlist" />);
    const section = screen.getByRole("region", { name: "My Watchlist" });
    expect(section).toBeInTheDocument();
    expect(screen.getByText("My Watchlist")).toBeInTheDocument();
  });
});
