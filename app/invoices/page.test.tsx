import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import InvoicesPage from "./page";

jest.mock("next/navigation", () => ({
  usePathname: () => "/invoices",
}));

jest.mock("../../components/WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

describe.skip("InvoicesPage", () => {
  it("renders the heading and subtext from copy.invoices", () => {
    render(<InvoicesPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/invoice/i);
    const subtext = screen.getByText(/Upload and tokenize/i);
    expect(subtext).toBeInTheDocument();
  });

  it("renders the shared header as the only banner landmark", () => {
    render(<InvoicesPage />);
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(document.querySelectorAll("header")).toHaveLength(1);
  });

  it("renders shared navigation links and keeps the home link focusable", () => {
    render(<InvoicesPage />);

    const navigation = screen.getByRole("navigation", { name: /main navigation/i });
    const homeLink = screen.getByRole("link", { name: /^home$/i });

    expect(navigation).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
    expect(homeLink.className).toMatch(/focus-ring/);
    expect(screen.getByRole("link", { name: /^invoices$/i })).toHaveAttribute("href", "/invoices");
    expect(screen.getByRole("link", { name: /^invest$/i })).toHaveAttribute("href", "/invest");
  });

  it("does not render the old static connect wallet button from the bespoke header", () => {
    render(<InvoicesPage />);
    // Check that only the dynamically mocked lazy wrapper button exists, not a duplicate static one
    expect(screen.getAllByRole("button", { name: /connect wallet/i })).toHaveLength(1);
  });

  it("renders the UploadZone form and input/button by id", () => {
    render(<InvoicesPage />);
    expect(screen.getByLabelText(/drop pdf invoice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select pdf invoice file/i)).toBeInTheDocument();
    expect(document.getElementById("invoice-file-input")).toBeInTheDocument();
    expect(document.getElementById("invoice-upload-btn")).toBeInTheDocument();
  });
});
