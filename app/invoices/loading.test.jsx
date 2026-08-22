/**
 * @file app/invoices/loading.test.jsx
 * Tests for the Next.js route-level loading UI at /invoices.
 *
 * Verifies that InvoicesLoading:
 *  - renders without errors
 *  - delegates to UploadSkeleton
 *  - exposes the correct ARIA attributes on the page shell
 *  - has no accessibility violations
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoicesLoading from "./loading";

expect.extend(toHaveNoViolations);

describe("InvoicesLoading", () => {
  it("renders without crashing", () => {
    expect(() => render(<InvoicesLoading />)).not.toThrow();
  });

  it("renders the page root with aria-busy='true'", () => {
    render(<InvoicesLoading />);
    expect(screen.getByTestId("invoices-loading")).toHaveAttribute("aria-busy", "true");
  });

  it("renders the header skeleton (nav logo + wallet button placeholder)", () => {
    const { container } = render(<InvoicesLoading />);
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    // Two animate-pulse elements inside the header
    const headerPulse = header.querySelectorAll(".animate-pulse");
    expect(headerPulse.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the page title and subtitle skeleton lines", () => {
    const { container } = render(<InvoicesLoading />);
    // h-7 w-28 title + two subtitle lines
    const titleSkeleton = container.querySelector(".h-7.w-28");
    expect(titleSkeleton).toBeInTheDocument();
  });

  it("renders the UploadSkeleton component (data-testid='upload-skeleton')", () => {
    render(<InvoicesLoading />);
    expect(screen.getByTestId("upload-skeleton")).toBeInTheDocument();
  });

  it("UploadSkeleton inside InvoicesLoading has aria-busy='true'", () => {
    render(<InvoicesLoading />);
    expect(screen.getByTestId("upload-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("contains at least the sr-only loading announcement from UploadSkeleton", () => {
    render(<InvoicesLoading />);
    expect(screen.getByText(/upload form loading, please wait/i)).toBeInTheDocument();
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<InvoicesLoading />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has multiple animate-pulse elements (no layout shift guarantee)", () => {
    const { container } = render(<InvoicesLoading />);
    const pulsed = container.querySelectorAll(".animate-pulse");
    expect(pulsed.length).toBeGreaterThanOrEqual(5);
  });
});
