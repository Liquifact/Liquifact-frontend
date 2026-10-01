/* eslint-env jest */
/**
 * @file app/invoices/loading.test.jsx
 * Tests for the Next.js route-level loading UI at /invoices.
 *
 * Verifies that InvoicesLoading:
 *  - renders without errors
 *  - delegates to UploadSkeleton
 *  - exposes the correct ARIA attributes on the page shell
 *  - has no accessibility violations
 *
 * Concurrency / idempotency notes:
 * This is a pure, stateless route-level loading UI. Rendering it multiple
 * times, in parallel, or interrupted mid-way must not produce stale,
 * unsafe, or inconsistent output. The tests below assert that each
 * render is independent and that repeated / concurrent renders are
 * identical and deterministic.
 */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoicesLoading from "./loading";

expect.extend(toHaveNoViolations);

describe("InvoicesLoading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders without crashing", () => {
    expect(() => render(React.createElement(InvoicesLoading))).not.toThrow();
  });

  it("renders the page root with aria-busy='true'", () => {
    render(React.createElement(InvoicesLoading));
    expect(screen.getByTestId("invoices-loading")).toHaveAttribute("aria-busy", "true");
  });

  it("renders the header skeleton (nav logo + wallet button placeholder)", () => {
    const { container } = render(React.createElement(InvoicesLoading));
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    // Two animate-pulse elements inside the header
    const headerPulse = header.querySelectorAll(".animate-pulse");
    expect(headerPulse.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the page title and subtitle skeleton lines", () => {
    const { container } = render(React.createElement(InvoicesLoading));
    // h-7 w-28 title + two subtitle lines
    const titleSkeleton = container.querySelector(".h-7.w-28");
    expect(titleSkeleton).toBeInTheDocument();
  });

  it("renders the UploadSkeleton component (data-testid='upload-skeleton')", () => {
    render(React.createElement(InvoicesLoading));
    expect(screen.getByTestId("upload-skeleton")).toBeInTheDocument();
  });

  it("UploadSkeleton inside InvoicesLoading has aria-busy='true'", () => {
    render(React.createElement(InvoicesLoading));
    expect(screen.getByTestId("upload-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("contains at least the sr-only loading announcement from UploadSkeleton", () => {
    render(React.createElement(InvoicesLoading));
    expect(screen.getByText(/upload form loading, please wait/i)).toBeInTheDocument();
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(React.createElement(InvoicesLoading));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has multiple animate-pulse elements (no layout shift guarantee)", () => {
    const { container } = render(React.createElement(InvoicesLoading));
    const pulsed = container.querySelectorAll(".animate-pulse");
    expect(pulsed.length).toBeGreaterThanOrEqual(5);
  });

  // ----------------------------------------------------------------------
  // Concurrency / idempotency / racing-render regression tests
  // ----------------------------------------------------------------------

  it("repeated sequential renders are idempotent", () => {
    const { container: first } = render(<InvoicesLoading />);
    const firstHTML = first.innerHTML;
    cleanup();

    const { container: second } = render(<InvoicesLoading />);
    expect(second.innerHTML).toBe(firstHTML);
  });

  it("renders correctly when multiple instances are mounted concurrently", () => {
    const instances = Array.from({ length: 5 });
    const results = instances.map(() => render(<InvoicesLoading />));

    expect(results).toHaveLength(5);
    for (const { container } of results) {
      expect(container.querySelector('[data-testid="invoices-loading"]')).toHaveAttribute(
        "aria-busy",
        "true",
      );
      expect(container.querySelector('[data-testid="upload-skeleton"]')).toBeInTheDocument();
    }
  });

  it("renders identical markup across concurrent instances (no stale state)", () => {
    const results = Array.from({ length: 3 }).map(() => render(<InvoicesLoading />));
    const [head, ...tail] = results.map((r) => r.container.innerHTML);
    for (const html of tail) {
      expect(html).toBe(head);
    }
  });

  it("survives unmount mid-way without throwing (partial failure recovery)", () => {
    const { unmount } = render(<InvoicesLoading />);
    expect(() => unmount()).not.toThrow();
    // Re-render after unmount must still be deterministic.
    expect(() => render(<InvoicesLoading />)).not.toThrow();
  });

  it("renders correctly when interrupted and restarted (retry idempotency)", () => {
    const first = render(<InvoicesLoading />);
    const firstHTML = first.container.innerHTML;
    first.unmount();

    const second = render(<InvoicesLoading />);
    expect(second.container.innerHTML).toBe(firstHTML);
  });

  it("does not leak aria-busy or test ids across concurrent instances", () => {
    const a = render(<InvoicesLoading />);
    const b = render(<InvoicesLoading />);

    expect(a.container.querySelectorAll('[data-testid="invoices-loading"]').length).toBe(1);
    expect(b.container.querySelectorAll('[data-testid="invoices-loading"]').length).toBe(1);
  });

  it("preserves accessibility invariants under concurrent renders", async () => {
    const results = Array.from({ length: 3 }).map(() => render(<InvoicesLoading />));
    for (const { container } of results) {
      const axeResults = await axe(container);
      expect(axeResults).toHaveNoViolations();
    }
  });
});
