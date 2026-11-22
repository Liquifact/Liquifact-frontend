import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceTable from "../components/InvoiceTable";

const invoice = {
  id: "INV_0001",
  sme: "Acme Components",
  debtor: "Globex Retail",
  amount: 12500,
  currency: "USDC",
  fundedAmount: 5000,
  yieldBps: 800,
  dueDate: "2027-01-17",
  status: "open",
  onChain: false,
};

describe("InvoiceTable", () => {
  it("renders a semantic table with a detail link and status/risk badges", () => {
    render(
      <InvoiceTable
        invoices={[invoice]}
        sort="due_asc"
        onSortChange={vi.fn()}
        medians={{ medianYield: 800, medianTicketSize: 12500 }}
      />,
    );

    expect(screen.getByRole("table", { name: "Marketplace invoices" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View invoice INV_0001" })).toHaveAttribute(
      "href",
      "/marketplace/INV_0001",
    );
    expect(screen.getByLabelText("Status: Open")).toBeInTheDocument();
    expect(screen.getByLabelText(/Risk:/)).toBeInTheDocument();
  });

  it("exposes the active sort with aria-sort and sorts by keyboard", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <InvoiceTable
        invoices={[invoice]}
        sort="due_asc"
        onSortChange={onSortChange}
        medians={{ medianYield: 800, medianTicketSize: 12500 }}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Due date" }),
    ).toHaveAttribute("aria-sort", "ascending");
    const yieldHeader = screen.getByRole("columnheader", { name: "Yield" });
    expect(yieldHeader).toHaveAttribute("aria-sort", "none");

    const yieldButton = within(yieldHeader).getByRole("button", { name: "Sort by Yield" });
    yieldButton.focus();
    await user.keyboard("{Enter}");
    expect(onSortChange).toHaveBeenCalledWith("yield_desc");
  });

  it("toggles the current due-date sort direction on header activation", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <InvoiceTable
        invoices={[invoice]}
        sort="due_asc"
        onSortChange={onSortChange}
        medians={{ medianYield: 800, medianTicketSize: 12500 }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sort by Due date" }));
    expect(onSortChange).toHaveBeenCalledWith("due_desc");
  });
});
