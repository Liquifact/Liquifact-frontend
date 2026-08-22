/**
 * @file Pagination.announce.test.tsx
 * Tests for issue #276 – pagination page-change announcements via a
 * polite ARIA live region.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import Pagination from "./Pagination";

// Helper: render in page mode with sensible defaults
function renderPageMode(props: {
  page: number;
  totalPages: number;
  pageSize: number;
  shown: number;
  total: number;
  onLoadMore?: () => void;
}) {
  return render(
    <Pagination
      shown={props.shown}
      total={props.total}
      onLoadMore={props.onLoadMore ?? (() => {})}
      page={props.page}
      totalPages={props.totalPages}
      pageSize={props.pageSize}
    />
  );
}

// Helper: render in load-more mode (no page props)
function renderLoadMoreMode(shown = 3, total = 10) {
  return render(<Pagination shown={shown} total={total} onLoadMore={() => {}} />);
}

describe("Pagination – page-change announcement (issue #276)", () => {
  describe("live region presence", () => {
    it("renders exactly one polite status region in page mode", () => {
      renderPageMode({ page: 1, totalPages: 3, pageSize: 5, shown: 5, total: 15 });
      const regions = screen.getAllByRole("status");
      expect(regions).toHaveLength(1);
      expect(regions[0]).toHaveAttribute("aria-live", "polite");
    });

    it("does NOT render a polite status region in load-more mode", () => {
      renderLoadMoreMode();
      expect(screen.queryByTestId("pagination-announce")).not.toBeInTheDocument();
    });
  });

  describe("initial render – no announcement", () => {
    it("live region is empty on first render", () => {
      renderPageMode({ page: 1, totalPages: 3, pageSize: 5, shown: 5, total: 15 });
      expect(screen.getByTestId("pagination-announce")).toHaveTextContent("");
    });
  });

  describe("page changes – announcement fires", () => {
    it("announces correct message when page changes", () => {
      const { rerender } = renderPageMode({
        page: 1,
        totalPages: 3,
        pageSize: 5,
        shown: 5,
        total: 15,
      });

      act(() => {
        rerender(
          <Pagination
            shown={10}
            total={15}
            onLoadMore={() => {}}
            page={2}
            totalPages={3}
            pageSize={5}
          />
        );
      });

      expect(screen.getByTestId("pagination-announce")).toHaveTextContent(
        "Page 2 of 3, showing items 6–10"
      );
    });

    it("announces the correct item range on the last (partial) page", () => {
      const { rerender } = renderPageMode({
        page: 1,
        totalPages: 3,
        pageSize: 5,
        shown: 5,
        total: 13,
      });

      act(() => {
        rerender(
          <Pagination
            shown={13}
            total={13}
            onLoadMore={() => {}}
            page={3}
            totalPages={3}
            pageSize={5}
          />
        );
      });

      expect(screen.getByTestId("pagination-announce")).toHaveTextContent(
        "Page 3 of 3, showing items 11–13"
      );
    });

    it("updates the announcement on each subsequent page change", () => {
      const { rerender } = renderPageMode({
        page: 1,
        totalPages: 4,
        pageSize: 5,
        shown: 5,
        total: 20,
      });

      // page 1 → 2
      act(() => {
        rerender(
          <Pagination
            shown={10}
            total={20}
            onLoadMore={() => {}}
            page={2}
            totalPages={4}
            pageSize={5}
          />
        );
      });
      expect(screen.getByTestId("pagination-announce")).toHaveTextContent(
        "Page 2 of 4, showing items 6–10"
      );

      // page 2 → 3
      act(() => {
        rerender(
          <Pagination
            shown={15}
            total={20}
            onLoadMore={() => {}}
            page={3}
            totalPages={4}
            pageSize={5}
          />
        );
      });
      expect(screen.getByTestId("pagination-announce")).toHaveTextContent(
        "Page 3 of 4, showing items 11–15"
      );
    });
  });

  describe("no announcement for same-page re-renders", () => {
    it("does not change announcement when page prop stays the same", () => {
      const { rerender } = renderPageMode({
        page: 2,
        totalPages: 3,
        pageSize: 5,
        shown: 10,
        total: 15,
      });

      // Trigger the initial announcement by first going to page 2
      // (actually page was set to 2 from the start so prevPage starts at 2)
      const before = screen.getByTestId("pagination-announce").textContent;

      act(() => {
        // Re-render with same page — only shown/total change, not page
        rerender(
          <Pagination
            shown={10}
            total={15}
            onLoadMore={() => {}}
            page={2}
            totalPages={3}
            pageSize={5}
          />
        );
      });

      expect(screen.getByTestId("pagination-announce").textContent).toBe(before);
    });
  });

  describe("no duplicate announcements with marketplace list announcer", () => {
    it("load-more mode has no competing live region from Pagination", () => {
      // Simulate the invest page setup: it has its own role="status" region.
      const { container } = render(
        <div>
          {/* Invest page's own announcer */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            5 investable invoices loaded
          </div>
          {/* Pagination in load-more mode (no page props) */}
          <Pagination shown={5} total={10} onLoadMore={() => {}} />
        </div>
      );

      // Only the invest page's own status region should be present
      const regions = container.querySelectorAll('[role="status"]');
      expect(regions).toHaveLength(1);
      expect(regions[0]).toHaveTextContent("5 investable invoices loaded");
    });
  });

  describe("component still renders correctly", () => {
    it("shows count text in page mode", () => {
      renderPageMode({ page: 1, totalPages: 2, pageSize: 5, shown: 5, total: 10 });
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("shows Load more button when shown < total", () => {
      renderPageMode({ page: 1, totalPages: 2, pageSize: 5, shown: 5, total: 10 });
      expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
    });

    it("hides Load more button when all items are visible", () => {
      renderPageMode({ page: 2, totalPages: 2, pageSize: 5, shown: 10, total: 10 });
      expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
    });

    it("renders correctly in load-more mode without page props", () => {
      renderLoadMoreMode(3, 10);
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
    });
  });
});
