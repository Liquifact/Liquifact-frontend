import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { InvestMarketplace } from "./page";
import { exportAsCSV, exportAsJSON } from "@/utils/export";

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/invest",
}));

jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return <nav aria-label="site navigation" />;
  }
  return { __esModule: true, default: MockNavMenu };
});

jest.mock("@/utils/export", () => ({
  exportAsCSV: jest.fn(),
  exportAsJSON: jest.fn(),
}));

function makeInvoices() {
  return [
    {
      id: "inv-001",
      issuer: "Acme Corp",
      amount: "1000",
      currency: "USD",
      dueDate: "2026-12-31",
      yield: "5.0%",
      status: "Open",
    },
    {
      id: "inv-002",
      issuer: "Globex",
      amount: "2000",
      currency: "USD",
      dueDate: "2026-11-30",
      yield: "6.0%",
      status: "Funded",
    },
    {
      id: "inv-003",
      issuer: "Initech",
      amount: "3000",
      currency: "EUR",
      dueDate: "2026-10-31",
      yield: "7.0%",
      status: "Open",
    }
  ];
}

function createResolvedLoader(invoices) {
  return jest.fn(() => Promise.resolve(invoices));
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("InvestMarketplace — export integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports all invoices as CSV when no filters are applied", async () => {
    const user = userEvent.setup();
    const invoices = makeInvoices();
    render(<InvestMarketplace loadInvoices={createResolvedLoader(invoices)} />);
    await settle();

    const exportBtn = screen.getByRole("button", { name: "Export marketplace view as CSV" });
    await user.click(exportBtn);

    expect(exportAsCSV).toHaveBeenCalledTimes(1);
    
    // The first argument should be the mapped invoices
    const exportedData = exportAsCSV.mock.calls[0][0];
    expect(exportedData).toHaveLength(3);
    expect(exportedData[0].issuer).toBe("Acme Corp");
    
    // The second argument should be the filename
    expect(exportAsCSV.mock.calls[0][1]).toMatch(/^marketplace-\d+\.csv$/);
  });

  it("respects search query filters when exporting as JSON", async () => {
    const user = userEvent.setup();
    const invoices = makeInvoices();
    render(<InvestMarketplace loadInvoices={createResolvedLoader(invoices)} />);
    await settle();

    // Type into search
    const searchInput = screen.getByPlaceholderText(/Search invoices/i);
    await user.type(searchInput, "globex");
    
    // Wait for debounce
    await act(async () => {
      await new Promise(r => setTimeout(r, 400));
    });

    const exportBtn = screen.getByRole("button", { name: "Export marketplace view as JSON" });
    await user.click(exportBtn);

    expect(exportAsJSON).toHaveBeenCalledTimes(1);
    const exportedData = exportAsJSON.mock.calls[0][0];
    
    // Should only export Globex
    expect(exportedData).toHaveLength(1);
    expect(exportedData[0].issuer).toBe("Globex");
  });

  it("exports an empty array when filters exclude all invoices", async () => {
    const user = userEvent.setup();
    const invoices = makeInvoices();
    render(<InvestMarketplace loadInvoices={createResolvedLoader(invoices)} />);
    await settle();

    // Type into search something that matches nothing
    const searchInput = screen.getByPlaceholderText(/Search invoices/i);
    await user.type(searchInput, "nonexistent");
    
    // Wait for debounce
    await act(async () => {
      await new Promise(r => setTimeout(r, 400));
    });

    const exportBtn = screen.getByRole("button", { name: "Export marketplace view as CSV" });
    await user.click(exportBtn);

    expect(exportAsCSV).toHaveBeenCalledTimes(1);
    const exportedData = exportAsCSV.mock.calls[0][0];
    
    // Should export empty array
    expect(exportedData).toHaveLength(0);
  });
});
