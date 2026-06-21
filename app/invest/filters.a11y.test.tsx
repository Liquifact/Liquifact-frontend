import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { InvestMarketplace } from "./page";

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  return {
    __esModule: true,
    default: MockLink,
  };
});

const FILTER_LABELS = [
  "Yield Range",
  "Currency",
  "Maturity Date",
  "Sort: Best Yield",
  "Clear Filters",
];

function renderMarketplace() {
  return render(<InvestMarketplace loadInvoices={() => Promise.resolve([])} />);
}

describe("InvestMarketplace filter accessibility", () => {
  it("keeps coming-soon filters discoverable with accessible descriptions", () => {
    renderMarketplace();

    for (const label of FILTER_LABELS) {
      const control = screen.getByRole("button", { name: label });

      expect(control).not.toBeDisabled();
      expect(control).toHaveAttribute("aria-disabled", "true");
      expect(control).toHaveAccessibleDescription(
        /soon.*marketplace filters are preview controls and are coming soon/i,
      );
    }
  });

  it("keeps every visual Soon badge associated with a control", () => {
    renderMarketplace();

    expect(screen.getAllByText("Soon")).toHaveLength(FILTER_LABELS.length);

    for (const label of FILTER_LABELS) {
      const control = screen.getByRole("button", { name: label });
      const descriptionIds = control
        .getAttribute("aria-describedby")
        ?.split(/\s+/)
        .filter(Boolean);

      expect(descriptionIds).toHaveLength(2);
      expect(descriptionIds?.[0]).toMatch(/-status$/);
      expect(descriptionIds?.[1]).toBe("invest-filter-preview-note");
    }
  });

  it("has no automated accessibility violations", async () => {
    const { container } = renderMarketplace();

    await expect(axe(container)).resolves.toHaveNoViolations();
  });
});
