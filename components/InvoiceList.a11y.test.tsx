import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";

import InvoiceList from "./InvoiceList";

/**
 * Accessibility coverage for InvoiceList, the component that actually owns
 * the loaded / empty / error / loading states surfaced on the invoices view
 * (app/invoices/page.js). There is no "settings" view in this codebase to
 * test against, so this targets the closest real equivalent: the one view
 * in this app with all of the states the issue asks for.
 */
describe("InvoiceList accessibility", () => {
  it("has no axe violations in the loaded state", async () => {
    const loader = jest.fn().mockResolvedValue([
      {
        id: "inv-1001",
        issuer: "Test Supplier",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Tokenized",
      },
      {
        id: "inv-1002",
        issuer: "Another LLC",
        amount: "7,800",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "7.5%",
        status: "Settled",
      },
    ]);

    const { container } = render(<InvoiceList loadInvoices={loader} />);

    await waitFor(() => expect(screen.getByText("Test Supplier")).toBeInTheDocument());

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the empty state", async () => {
    const loader = jest.fn().mockResolvedValue([]);

    const { container } = render(<InvoiceList loadInvoices={loader} />);

    await waitFor(() =>
      expect(screen.getAllByText(/Upload your first invoice/i).length).toBeGreaterThan(0)
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the error state", async () => {
    const loader = jest.fn().mockRejectedValue(new Error("Network failure"));

    const { container } = render(<InvoiceList loadInvoices={loader} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the loading state", async () => {
    // A loader whose promise never resolves during the test keeps the
    // component in its initial `invoices === null` skeleton state.
    const loader = jest.fn(() => new Promise(() => {}));

    const { container } = render(<InvoiceList loadInvoices={loader} />);

    await waitFor(() =>
      expect(screen.getByLabelText(/loading investable invoices/i)).toBeInTheDocument()
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
