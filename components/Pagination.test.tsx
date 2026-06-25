import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

import Pagination from "./Pagination";

describe("Pagination", () => {
  it("keeps the count visible without making it a live region", () => {
    render(<Pagination shown={10} total={25} onLoadMore={jest.fn()} />);

    const count = screen.getByText(/showing/i);

    expect(count).toHaveTextContent("Showing 10 of 25 invoices");
    expect(count).not.toHaveAttribute("aria-live");
    expect(count).not.toHaveAttribute("aria-atomic");
  });

  it("renders the Load more button while more items are available", () => {
    render(<Pagination shown={10} total={25} onLoadMore={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: /load more invoices/i }),
    ).toBeInTheDocument();
  });

  it("hides the Load more button when all items are visible", () => {
    render(<Pagination shown={1} total={1} onLoadMore={jest.fn()} />);

    expect(screen.getByText(/showing/i)).toHaveTextContent("Showing 1 of 1 invoice");
    expect(
      screen.queryByRole("button", { name: /load more invoices/i }),
    ).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Pagination shown={10} total={25} onLoadMore={jest.fn()} />,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});
