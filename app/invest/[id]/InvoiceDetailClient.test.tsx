/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailClient.test.tsx
 *
 * Comprehensive tests for `app/invest/[id]/InvoiceDetailClient.jsx`.
 *
 * Coverage targets
 * ─────────────────
 * 1. Renders the invoice metadata (issuer, amount, yield, maturity, status)
 * 2. Renders DensityToggle inside the section
 * 3. section has aria-labelledby pointing to the heading
 * 4. Heading text matches summaryHeading prop
 * 5. Default density is "comfortable" — section has p-6 and dl has gap-4
 * 6. After clicking Compact, section has p-4 and dl has gap-2
 * 7. After clicking Comfortable, spacing reverts
 * 8. data-density attribute reflects the current density on the section
 * 9. Restores stored density from localStorage on mount
 * 10. statusPill node is rendered inside the Status dd
 * 11. No axe violations in comfortable mode
 * 12. No axe violations in compact mode
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceDetailClient from "./InvoiceDetailClient";
import { DENSITY_STORAGE_KEY } from "@/lib/hooks/useDensity";

expect.extend(toHaveNoViolations);

jest.mock("@/components/CopyButton", () => {
  return function CopyButtonMock({ label }: { label: string }) {
    return (
      <button type="button" aria-label={`Copy ${label}`}>
        Copy
      </button>
    );
  };
});

// ── Shared props ───────────────────────────────────────────────────────────

const defaultProps = {
  summaryHeading: "Acme Corp",
  labelIssuer: "Issuer",
  labelAmount: "Amount",
  labelYield: "Estimated yield",
  labelMaturity: "Maturity date",
  labelStatus: "Status",
  issuer: "Acme Corp",
  formattedAmount: "$50,000.00",
  formattedYield: "5.25%",
  dueDate: "2025-12-31",
  statusPill: <span data-testid="status-pill">Open</span>,
};

function clearStorage() {
  window.localStorage.clear();
}

beforeEach(clearStorage);

// ── 1. Invoice metadata ────────────────────────────────────────────────────

describe("InvoiceDetailClient — metadata rendering", () => {
  it("renders the issuer label and value", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    expect(screen.getByText("Issuer")).toBeInTheDocument();
    expect(screen.getAllByText("Acme Corp").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the amount label and formatted value", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("$50,000.00")).toBeInTheDocument();
  });

  it("renders the yield label and value", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    expect(screen.getByText("Estimated yield")).toBeInTheDocument();
    expect(screen.getByText("5.25%")).toBeInTheDocument();
  });

  it("renders the maturity label and date", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    expect(screen.getByText("Maturity date")).toBeInTheDocument();
    expect(screen.getByText("2025-12-31")).toBeInTheDocument();
  });

  it("renders the status label and statusPill node", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByTestId("status-pill")).toBeInTheDocument();
  });

  it("renders the Reference row with CopyButton when referenceId is provided", () => {
    render(
      <InvoiceDetailClient
        {...defaultProps}
        labelReference="Reference"
        referenceId="inv-001"
      />
    );
    expect(screen.getByText("Reference")).toBeInTheDocument();
    expect(screen.getByText("inv-001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy reference id/i })).toBeInTheDocument();
  });

  it("omits the Reference row when referenceId is absent", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    expect(screen.queryByText("Reference")).not.toBeInTheDocument();
  });
});

// ── 2. DensityToggle integration ───────────────────────────────────────────

describe("InvoiceDetailClient — DensityToggle integration", () => {
  it("renders DensityToggle inside the section", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    // DensityToggle renders a group with the density label
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("renders Compact and Comfortable toggle buttons", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    const dataAttrs = buttons.map((b) => b.getAttribute("data-density")).filter(Boolean);
    expect(dataAttrs).toContain("compact");
    expect(dataAttrs).toContain("comfortable");
  });
});

// ── 3-4. Section heading and aria ─────────────────────────────────────────

describe("InvoiceDetailClient — aria structure", () => {
  it("section has aria-labelledby='invoice-summary-heading'", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const section = screen.getByRole("region");
    expect(section).toHaveAttribute("aria-labelledby", "invoice-summary-heading");
  });

  it("heading has id='invoice-summary-heading'", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const heading = screen.getByRole("heading", { name: "Acme Corp" });
    expect(heading).toHaveAttribute("id", "invoice-summary-heading");
  });

  it("heading text matches the summaryHeading prop", () => {
    render(<InvoiceDetailClient {...defaultProps} summaryHeading="Beta Ltd" />);
    expect(screen.getByRole("heading", { name: "Beta Ltd" })).toBeInTheDocument();
  });
});

// ── 5. Default density spacing ─────────────────────────────────────────────

describe("InvoiceDetailClient — spacing variants", () => {
  it("section has p-6 and dl has gap-4 in default (comfortable) mode", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const section = document.querySelector("section");
    expect(section?.className).toContain("p-6");

    const dl = document.querySelector("dl");
    expect(dl?.className).toContain("gap-4");
  });

  // ── 6. Compact spacing after toggle ─────────────────────────────────────
  it("section has p-4 and dl has gap-2 after switching to compact", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);

    // Find and click the Compact button
    const compactBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("data-density") === "compact"
    );
    expect(compactBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(compactBtn!);
    });

    const section = document.querySelector("section");
    expect(section?.className).toContain("p-4");

    const dl = document.querySelector("dl");
    expect(dl?.className).toContain("gap-2");
  });

  // ── 7. Reverts to comfortable ────────────────────────────────────────────
  it("section reverts to p-6 and dl to gap-4 when switching back to comfortable", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);

    const compactBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("data-density") === "compact"
    );
    const comfortableBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("data-density") === "comfortable"
    );
    expect(compactBtn).toBeDefined();
    expect(comfortableBtn).toBeDefined();

    await act(async () => { fireEvent.click(compactBtn!); });
    await act(async () => { fireEvent.click(comfortableBtn!); });

    const section = document.querySelector("section");
    expect(section?.className).toContain("p-6");

    const dl = document.querySelector("dl");
    expect(dl?.className).toContain("gap-4");
  });

  // ── 8. data-density attribute ────────────────────────────────────────────
  it("section has data-density='comfortable' in default mode", () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const section = document.querySelector("section");
    expect(section).toHaveAttribute("data-density", "comfortable");
  });

  it("section has data-density='compact' after switching to compact", async () => {
    render(<InvoiceDetailClient {...defaultProps} />);
    const compactBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("data-density") === "compact"
    );
    await act(async () => {
      fireEvent.click(compactBtn!);
    });

    const section = document.querySelector("section");
    expect(section).toHaveAttribute("data-density", "compact");
  });

  // ── 9. Restores from storage ─────────────────────────────────────────────
  it("restores 'compact' spacing when localStorage contains 'compact'", async () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "compact");
    render(<InvoiceDetailClient {...defaultProps} />);

    await waitFor(() => {
      const section = document.querySelector("section");
      expect(section?.className).toContain("p-4");
    });
  });

  it("uses comfortable spacing when localStorage contains invalid value", async () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "invalid");
    render(<InvoiceDetailClient {...defaultProps} />);

    await waitFor(() => {
      const section = document.querySelector("section");
      expect(section?.className).toContain("p-6");
    });
  });
});

// ── 11-12. Accessibility ───────────────────────────────────────────────────

describe("InvoiceDetailClient — accessibility", () => {
  it("has no axe violations in comfortable mode", async () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations in compact mode", async () => {
    const { container } = render(<InvoiceDetailClient {...defaultProps} />);
    const compactBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("data-density") === "compact"
    );
    await act(async () => { fireEvent.click(compactBtn!); });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
