/**
 * @file app/invest/density.test.tsx
 *
 * Unit and accessibility tests for marketplace density toggle integration (`feature/marketplace-42-density`).
 * Verifies that DensityToggle is integrated into InvestMarketplace, updates the
 * display density state ("comfortable" vs "compact"), sets `data-density` on the
 * list, applies spacing/padding, persists to localStorage, falls back on invalid values,
 * and meets WCAG standards.
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { InvestMarketplace } from "./page";
import { ToastProvider } from "@/components/ToastProvider";
import { DENSITY_STORAGE_KEY } from "@/lib/hooks/useDensity";

expect.extend(toHaveNoViolations);

jest.mock("next/navigation", () => ({
  usePathname: () => "/invest",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

function renderMarketplaceWithProviders() {
  const mockInvoices = [
    {
      id: "inv-001",
      issuer: "Acme Supplies Ltd",
      amount: "12,500",
      currency: "USD",
      dueDate: "2026-06-15",
      yield: "8.2%",
      status: "Open",
    },
    {
      id: "inv-002",
      issuer: "Bright Logistics GmbH",
      amount: "7,800",
      currency: "EUR",
      dueDate: "2026-07-01",
      yield: "7.5%",
      status: "Open",
    },
  ];

  return render(
    <ToastProvider>
      <InvestMarketplace loadInvoices={async () => mockInvoices} />
    </ToastProvider>
  );
}

describe("Marketplace Density Toggle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders DensityToggle with default comfortable state", async () => {
    renderMarketplaceWithProviders();

    const compactBtn = await screen.findByRole("button", { name: /switch to compact density/i });
    const comfortableBtn = screen.getByRole("button", { name: /switch to comfortable density/i });

    expect(compactBtn).toBeInTheDocument();
    expect(comfortableBtn).toBeInTheDocument();

    expect(comfortableBtn).toHaveAttribute("aria-pressed", "true");
    expect(compactBtn).toHaveAttribute("aria-pressed", "false");

    const list = screen.getByRole("list", { name: /investable invoices/i });
    expect(list).toHaveAttribute("data-density", "comfortable");
    expect(list.className).toContain("space-y-4");
  });

  it("toggles density to compact when Compact button is clicked", async () => {
    renderMarketplaceWithProviders();

    const compactBtn = await screen.findByRole("button", { name: /switch to compact density/i });
    const comfortableBtn = screen.getByRole("button", { name: /switch to comfortable density/i });

    fireEvent.click(compactBtn);

    expect(compactBtn).toHaveAttribute("aria-pressed", "true");
    expect(comfortableBtn).toHaveAttribute("aria-pressed", "false");

    const list = screen.getByRole("list", { name: /investable invoices/i });
    expect(list).toHaveAttribute("data-density", "compact");
    expect(list.className).toContain("space-y-2");

    expect(localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("compact");
  });

  it("restores compact density state from localStorage on mount", async () => {
    localStorage.setItem(DENSITY_STORAGE_KEY, "compact");

    renderMarketplaceWithProviders();

    const compactBtn = await screen.findByRole("button", { name: /switch to compact density/i });
    expect(compactBtn).toHaveAttribute("aria-pressed", "true");

    const list = screen.getByRole("list", { name: /investable invoices/i });
    expect(list).toHaveAttribute("data-density", "compact");
  });

  it("falls back safely to comfortable density when stored value is invalid", async () => {
    localStorage.setItem(DENSITY_STORAGE_KEY, "invalid-density-value");

    renderMarketplaceWithProviders();

    const comfortableBtn = await screen.findByRole("button", { name: /switch to comfortable density/i });
    expect(comfortableBtn).toHaveAttribute("aria-pressed", "true");

    const list = screen.getByRole("list", { name: /investable invoices/i });
    expect(list).toHaveAttribute("data-density", "comfortable");
  });

  it("passes axe accessibility checks with DensityToggle present", async () => {
    const { container } = renderMarketplaceWithProviders();
    await screen.findByRole("list", { name: /investable invoices/i });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
