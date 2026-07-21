import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { InvoiceDetail } from "./page";

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "invoice-123" }),
  notFound: jest.fn(() => null),
}));

jest.mock("next/link", () => {
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("@/components/ToastProvider", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock("@/components/WalletContext", () => ({
  WALLET_STATES: {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    NO_WALLET: "no_wallet",
  },
  useWallet: () => ({ state: "disconnected", connect: jest.fn() }),
}));

jest.mock("@/components/WalletStatusLazy", () => {
  return function WalletStatusLazyMock() {
    return <div>WalletStatus</div>;
  };
});

jest.mock("@/components/ErrorBanner", () => {
  return function ErrorBannerMock() {
    return <div role="alert">Error</div>;
  };
});

jest.mock("@/components/InvoiceListSkeleton", () => {
  return function SkeletonMock() {
    return <div aria-busy="true" />;
  };
});

jest.mock("@/components/StatusPill", () => {
  return function StatusPillMock({ status }: { status: string }) {
    return <span>{status}</span>;
  };
});

const mockInvoice = {
  id: "invoice-123",
  issuer: "Test Issuer LLC",
  amount: "5,000",
  currency: "USD",
  dueDate: "2026-12-31",
  yield: "8.2",
  status: "Open",
};

describe("InvoiceDetail — print stylesheet", () => {
  it("renders a Print / Save PDF button that calls window.print()", async () => {
    const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
    const loadInvoice = jest.fn(async () => mockInvoice);

    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    const printButton = await screen.findByRole("button", {
      name: /print or save this invoice as pdf/i,
    });

    expect(printButton).toBeInTheDocument();
    expect(printButton).not.toBeDisabled();

    fireEvent.click(printButton);
    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });

  it("print button is keyboard-reachable (not disabled, has accessible label)", async () => {
    const loadInvoice = jest.fn(async () => mockInvoice);

    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    const printButton = await screen.findByRole("button", {
      name: /print or save this invoice as pdf/i,
    });

    expect(printButton).toHaveAttribute("aria-label");
    expect(printButton.getAttribute("aria-label")).toMatch(/print/i);
    expect(printButton).not.toHaveAttribute("disabled");

    // Simulate keyboard activation
    printButton.focus();
    expect(printButton).toHaveFocus();
  });

  it("nav header and back-link carry the no-print class to hide chrome when printing", async () => {
    const loadInvoice = jest.fn(async () => mockInvoice);

    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    // Wait for the invoice to load
    await screen.findByRole("button", { name: /print or save this invoice as pdf/i });

    const header = document.querySelector("header");
    expect(header).toHaveClass("no-print");

    const backLink = screen.getByRole("link", { name: /back to marketplace/i });
    expect(backLink).toHaveClass("no-print");
  });

  it("invoice summary section has the print-invoice-section class for print styling", async () => {
    const loadInvoice = jest.fn(async () => mockInvoice);

    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    // Wait for invoice to load, then check the section's CSS class
    await screen.findByRole("button", { name: /print or save this invoice as pdf/i });

    const section = document.querySelector(".print-invoice-section");
    expect(section).toBeInTheDocument();
    expect(section!.tagName).toBe("SECTION");
  });
});
