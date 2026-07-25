/**
 * @file components/InvoiceListSkeleton.test.jsx
 * Keeps the skeleton test suite green after the column-width sync refactor.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceListSkeleton from "./InvoiceListSkeleton";

expect.extend(toHaveNoViolations);

describe("InvoiceListSkeleton", () => {
  it("renders the default number of rows (3)", () => {
    render(<InvoiceListSkeleton />);
    const rows = document.querySelectorAll(".animate-pulse");
    expect(rows).toHaveLength(3);
  });

  it("renders a custom number of rows", () => {
    render(<InvoiceListSkeleton rows={5} />);
    const rows = document.querySelectorAll(".animate-pulse");
    expect(rows).toHaveLength(5);
  });

  it("has an sr-only loading message for screen readers", () => {
    render(<InvoiceListSkeleton />);
    expect(screen.getByText(/loading invoices, please wait/i)).toBeInTheDocument();
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<InvoiceListSkeleton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has aria-busy true", () => {
    render(<InvoiceListSkeleton />);
    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
  });

  it("has descriptive aria-label", () => {
    render(<InvoiceListSkeleton />);
    expect(screen.getByRole("list")).toHaveAttribute("aria-label", "Loading investable invoices");
  });

  it("each row has animate-pulse class", () => {
    render(<InvoiceListSkeleton rows={2} />);
    const items = document.querySelectorAll("li");
    expect(items).toHaveLength(2);
    items.forEach((item) => {
      expect(item.className).toContain("animate-pulse");
    });
  });

  it("renders the correct number of skeleton rows", () => {
    render(<InvoiceListSkeleton rows={4} />);
    expect(document.querySelectorAll("li")).toHaveLength(4);
  });
});
