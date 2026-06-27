import React, { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "./Pagination";

// ── Single-announcer contract ─────────────────────────────────────────────
// The count <p> must NOT be a live region. app/invest/page.js owns the single
// role="status" announcer. Two aria-live regions firing the same change would
// cause screen-readers to read the count twice.

describe("Pagination – single-announcer contract", () => {
  it("count paragraph does NOT have aria-live", () => {
    const { container } = render(
      <Pagination shown={5} total={10} onLoadMore={() => {}} />
    );
    const p = container.querySelector("#pagination-count");
    expect(p).not.toBeNull();
    expect(p).not.toHaveAttribute("aria-live");
  });

  it("count paragraph does NOT have aria-atomic", () => {
    const { container } = render(
      <Pagination shown={5} total={10} onLoadMore={() => {}} />
    );
    const p = container.querySelector("#pagination-count");
    expect(p).not.toHaveAttribute("aria-atomic");
  });

  it("count paragraph has aria-hidden so AT ignores it", () => {
    const { container } = render(
      <Pagination shown={5} total={10} onLoadMore={() => {}} />
    );
    const p = container.querySelector("#pagination-count");
    expect(p).toHaveAttribute("aria-hidden", "true");
  });

  it("there are zero aria-live elements inside Pagination", () => {
    const { container } = render(
      <Pagination shown={5} total={10} onLoadMore={() => {}} />
    );
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(0);
  });
});

// ── Visible count text ────────────────────────────────────────────────────

describe("Pagination – visible count text", () => {
  it("shows the shown and total numbers", () => {
    const { container } = render(
      <Pagination shown={5} total={20} onLoadMore={() => {}} />
    );
    expect(container.querySelector("#pagination-count").textContent).toMatch(/5/);
    expect(container.querySelector("#pagination-count").textContent).toMatch(/20/);
  });

  it("uses plural invoices when total > 1", () => {
    const { container } = render(
      <Pagination shown={3} total={3} onLoadMore={() => {}} />
    );
    expect(container.querySelector("#pagination-count").textContent).toMatch(/invoices/);
  });

  it("uses singular invoice when total === 1", () => {
    const { container } = render(
      <Pagination shown={1} total={1} onLoadMore={() => {}} />
    );
    const text = container.querySelector("#pagination-count").textContent;
    expect(text).toMatch(/invoice/);
    expect(text).not.toMatch(/invoices/);
  });
});

// ── Load more button ──────────────────────────────────────────────────────

describe("Pagination – Load more button", () => {
  it("is visible when shown < total", () => {
    render(<Pagination shown={5} total={10} onLoadMore={() => {}} />);
    expect(screen.getByRole("button", { name: /load more invoices/i })).toBeInTheDocument();
  });

  it("is hidden when shown === total", () => {
    render(<Pagination shown={10} total={10} onLoadMore={() => {}} />);
    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
  });

  it("is hidden when total === 0", () => {
    render(<Pagination shown={0} total={0} onLoadMore={() => {}} />);
    expect(screen.queryByRole("button", { name: /load more invoices/i })).not.toBeInTheDocument();
  });

  it("calls onLoadMore when clicked", () => {
    const onLoadMore = jest.fn();
    render(<Pagination shown={3} total={10} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole("button", { name: /load more invoices/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});

// ── Focus restoration via forwarded ref ───────────────────────────────────

describe("Pagination – forwarded ref", () => {
  it("attaches the ref to the Load more button", () => {
    const ref = createRef();
    render(<Pagination ref={ref} shown={5} total={10} onLoadMore={() => {}} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current.tagName).toBe("BUTTON");
  });

  it("ref is null when button is not rendered", () => {
    const ref = createRef();
    render(<Pagination ref={ref} shown={10} total={10} onLoadMore={() => {}} />);
    expect(ref.current).toBeNull();
  });
});