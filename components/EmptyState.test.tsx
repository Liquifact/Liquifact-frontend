/**
 * @file EmptyState.test.tsx
 *
 * Comprehensive tests for the EmptyState component and InvoiceEmptyIllustration.
 *
 * Areas covered
 * ─────────────
 * 1. Renders title always
 * 2. Description is optional — rendered when provided, absent when omitted
 * 3. Icon slot renders when provided
 * 4. Action slot renders and is focusable
 * 5. Custom className is forwarded to the root element
 * 6. InvoiceEmptyIllustration — renders as aria-hidden, not focusable
 * 7. No icon or action — minimal render
 * 8. Integration: EmptyState with InvoiceEmptyIllustration CTA link
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import EmptyState, { InvoiceEmptyIllustration } from "./EmptyState";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderEmptyState(props: Partial<React.ComponentProps<typeof EmptyState>> = {}) {
  const defaults = { title: "Nothing here" };
  return render(<EmptyState {...defaults} {...props} />);
}

// ─── 1. Title ─────────────────────────────────────────────────────────────────

describe("EmptyState – title", () => {
  it("renders the title text in a heading", () => {
    renderEmptyState({ title: "No invoices yet" });
    expect(screen.getByRole("heading", { level: 3, name: "No invoices yet" })).toBeInTheDocument();
  });

  it("uses an h3 element for the heading", () => {
    const { container } = renderEmptyState({ title: "Empty" });
    expect(container.querySelector("h3")).toHaveTextContent("Empty");
  });
});

// ─── 2. Description ──────────────────────────────────────────────────────────

describe("EmptyState – description", () => {
  it("renders description text when provided", () => {
    renderEmptyState({ description: "Upload your first invoice." });
    expect(screen.getByText("Upload your first invoice.")).toBeInTheDocument();
  });

  it("does not render a description element when omitted", () => {
    renderEmptyState();
    // Only the heading should be present; no second paragraph
    expect(screen.queryByText(/upload/i)).not.toBeInTheDocument();
  });

  it("renders description inside a <p> element", () => {
    const { container } = renderEmptyState({ description: "Some description" });
    const p = container.querySelector("p");
    expect(p).toHaveTextContent("Some description");
  });
});

// ─── 3. Icon slot ─────────────────────────────────────────────────────────────

describe("EmptyState – icon slot", () => {
  it("renders provided icon content", () => {
    renderEmptyState({
      icon: <span data-testid="mock-icon">icon</span>,
    });
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  it("does not render icon wrapper when icon is omitted", () => {
    const { container } = renderEmptyState();
    // The icon wrapper uses `rounded-full`; should not be present when no icon
    expect(container.querySelector(".rounded-full")).not.toBeInTheDocument();
  });

  it("wraps the icon in a decorative container", () => {
    const { getByTestId } = render(
      <EmptyState title="x" icon={<svg data-testid="svg-icon" aria-hidden="true" />} />
    );
    // The SVG should be present
    expect(getByTestId("svg-icon")).toBeInTheDocument();
    // The SVG should be inside a div (icon well)
    expect(getByTestId("svg-icon").closest("div")).not.toBeNull();
  });
});

// ─── 4. Action slot ──────────────────────────────────────────────────────────

describe("EmptyState – action slot", () => {
  it("renders the action element", () => {
    renderEmptyState({
      action: <button type="button">Upload now</button>,
    });
    expect(screen.getByRole("button", { name: "Upload now" })).toBeInTheDocument();
  });

  it("action link is focusable (tabIndex not -1)", () => {
    renderEmptyState({
      action: (
        <a href="#upload" id="empty-state-cta">
          Upload your first invoice
        </a>
      ),
    });
    const link = screen.getByRole("link", { name: "Upload your first invoice" });
    expect(link).toBeInTheDocument();
    expect(link).not.toHaveAttribute("tabindex", "-1");
  });

  it("does not render action wrapper when action is omitted", () => {
    const { container } = renderEmptyState({ action: undefined });
    // Expect no extra div wrapping an action
    const divs = container.querySelectorAll("div");
    // Root div + optional inner divs — none should contain a button or link
    expect(container.querySelector("button")).not.toBeInTheDocument();
    expect(container.querySelector("a")).not.toBeInTheDocument();
  });

  it("renders the action inside a wrapper div", () => {
    renderEmptyState({
      action: (
        <button type="button" data-testid="cta">
          Go
        </button>
      ),
    });
    const btn = screen.getByTestId("cta");
    expect(btn.closest("div")).not.toBeNull();
  });
});

// ─── 5. className forwarding ──────────────────────────────────────────────────

describe("EmptyState – className prop", () => {
  it("applies a custom className to the root element", () => {
    const { container } = renderEmptyState({ className: "my-custom-class" });
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  it("keeps default classes alongside the custom className", () => {
    const { container } = renderEmptyState({ className: "extra" });
    expect(container.firstChild).toHaveClass("rounded-3xl");
    expect(container.firstChild).toHaveClass("extra");
  });

  it("does not break when className is omitted", () => {
    const { container } = renderEmptyState();
    expect(container.firstChild).toHaveClass("rounded-3xl");
  });
});

// ─── 6. InvoiceEmptyIllustration ─────────────────────────────────────────────

describe("InvoiceEmptyIllustration", () => {
  it("renders an SVG element", () => {
    const { container } = render(<InvoiceEmptyIllustration />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it('has aria-hidden="true" so screen readers skip it', () => {
    const { container } = render(<InvoiceEmptyIllustration />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it('has focusable="false" so it is not tab-reachable in IE/Edge legacy', () => {
    const { container } = render(<InvoiceEmptyIllustration />);
    expect(container.querySelector("svg")).toHaveAttribute("focusable", "false");
  });

  it("does not carry a visible role that would expose it to AT", () => {
    render(<InvoiceEmptyIllustration />);
    // Should not be queryable as img or graphics-document
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders with explicit width and height so it does not cause layout shift", () => {
    const { container } = render(<InvoiceEmptyIllustration />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width");
    expect(svg).toHaveAttribute("height");
  });
});

// ─── 7. Minimal render (no icon, no description, no action) ──────────────────

describe("EmptyState – minimal render", () => {
  it("renders only the title when only title is provided", () => {
    const { container } = render(<EmptyState title="Minimal" />);
    expect(screen.getByRole("heading", { level: 3, name: "Minimal" })).toBeInTheDocument();
    expect(container.querySelector("a")).not.toBeInTheDocument();
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });
});

// ─── 8. Integration: EmptyState with InvoiceEmptyIllustration ────────────────

describe("EmptyState – InvoiceList integration scenario", () => {
  it("renders the illustration, title, description, and upload CTA together", () => {
    render(
      <EmptyState
        icon={<InvoiceEmptyIllustration />}
        title="No invoices yet"
        description="Upload your first invoice to get started. It will appear here once tokenized."
        action={
          <a href="#invoice-upload-btn" className="focus-ring">
            Upload your first invoice
          </a>
        }
      />
    );

    // Heading
    expect(screen.getByRole("heading", { level: 3, name: "No invoices yet" })).toBeInTheDocument();

    // Description
    expect(screen.getByText(/Upload your first invoice to get started/i)).toBeInTheDocument();

    // CTA link
    const cta = screen.getByRole("link", { name: "Upload your first invoice" });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "#invoice-upload-btn");

    // Illustration is present but AT-hidden
    const svg = document.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("CTA link has visible focus style class", () => {
    render(
      <EmptyState
        title="No invoices yet"
        action={
          <a href="#invoice-upload-btn" className="focus-ring">
            Upload your first invoice
          </a>
        }
      />
    );
    const cta = screen.getByRole("link", { name: "Upload your first invoice" });
    expect(cta.className).toMatch(/focus-ring/);
  });

  it("illustration SVG is not interactive (no role=button or role=link)", () => {
    render(<InvoiceEmptyIllustration />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
