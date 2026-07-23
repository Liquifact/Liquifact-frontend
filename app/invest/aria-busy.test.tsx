import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { InvestMarketplace } from "./page";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/ToastProvider";

jest.mock("next/navigation", () => ({
  usePathname: () => "/invest",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
}));

function renderMarketplace(loadInvoices: () => Promise<unknown>) {
  return render(
    <ToastProvider>
      <WalletProvider>
        <InvestMarketplace loadInvoices={loadInvoices} />
      </WalletProvider>
    </ToastProvider>
  );
}

describe("InvestMarketplace loading semantics", () => {
  it("marks the results region busy until invoices resolve", async () => {
    let resolveInvoices!: (value: unknown) => void;
    const loadInvoices = jest.fn(() => new Promise((resolve) => (resolveInvoices = resolve)));

    renderMarketplace(loadInvoices);

    const results = screen.getByRole("region", { name: "Investable invoices" });
    expect(results).toHaveAttribute("aria-busy", "true");

    await act(async () => resolveInvoices([]));

    await waitFor(() => expect(results).toHaveAttribute("aria-busy", "false"));
  });

  it("clears the busy state when loading fails", async () => {
    let rejectInvoices!: (reason?: unknown) => void;
    const loadInvoices = jest.fn(() => new Promise((_, reject) => (rejectInvoices = reject)));

    renderMarketplace(loadInvoices);

    const results = screen.getByRole("region", { name: "Investable invoices" });
    expect(results).toHaveAttribute("aria-busy", "true");

    await act(async () => rejectInvoices(new Error("network failure")));

    await waitFor(() => expect(results).toHaveAttribute("aria-busy", "false"));
  });
});
