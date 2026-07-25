import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { InvestMarketplace } from "./page";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/ToastProvider";

expect.extend(toHaveNoViolations);

// Mock next/navigation hooks to prevent Next.js router errors
jest.mock("next/navigation", () => ({
  usePathname: () => "/invest",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

describe("InvestMarketplace - Coming Soon Filters A11y", () => {
  const mockLoadInvoices = jest.fn(() => Promise.resolve([]));

  it("should render the filters wrapped in a fieldset with coming soon semantics", () => {
    render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={mockLoadInvoices} />
        </WalletProvider>
      </ToastProvider>
    );

    // Check for the fieldset acting as the accessible wrapper
    const fieldset = screen.getByRole("group", { name: /Marketplace Filters/i });
    expect(fieldset).toBeInTheDocument();

    // Ensure aria-disabled is present and set to true
    expect(fieldset).toHaveAttribute("aria-disabled", "true");

    // Ensure aria-describedby connects the fieldset to the Soon badge
    const descriptionId = fieldset.getAttribute("aria-describedby");
    expect(descriptionId).toBe("filters-coming-soon");

    // Ensure the description element actually exists and has the correct text
    const descriptionElement = document.getElementById(descriptionId);
    expect(descriptionElement).toBeInTheDocument();
    expect(descriptionElement).toHaveTextContent(/Soon:/i);
  });

  it("should have no accessibility violations with the coming soon semantics applied", async () => {
    const { container } = render(
      <ToastProvider>
        <WalletProvider>
          <InvestMarketplace loadInvoices={mockLoadInvoices} />
        </WalletProvider>
      </ToastProvider>
    );

    // Run jest-axe to ensure our 'coming soon' opacity and wrapper do not violate contrast or structural rules
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
