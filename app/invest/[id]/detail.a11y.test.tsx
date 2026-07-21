import React from "react";
import { axe, toHaveNoViolations } from "jest-axe";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InvoiceDetail } from "./page";

expect.extend(toHaveNoViolations);

jest.mock("next/navigation", () => {
  return {
    useParams: () => ({ id: "invoice-123" }),
    notFound: jest.fn(() => null),
  };
});

jest.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock("@/components/WalletContext", () => {
  return {
    WALLET_STATES: {
      DISCONNECTED: "disconnected",
      CONNECTING: "connecting",
      NO_WALLET: "no_wallet",
    },
    useWallet: () => ({
      state: "disconnected",
      connect: jest.fn(),
    }),
  };
});

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

describe("InvoiceDetail accessibility", () => {
  it("renders invoice facts as a definition list and is axe-clean", async () => {
    const invoice = {
      id: "invoice-123",
      issuer: "Test Issuer LLC",
      amount: "5,000",
      currency: "USD",
      dueDate: "2026-12-31",
      yield: "8.2%",
      status: "Open",
    };

    const loadInvoice = jest.fn(async () => invoice);

    const { container } = render(<InvoiceDetail loadInvoice={loadInvoice} />);

    // Wait for the async invoice load. The issuer appears in both the heading
    // and the definition list, so anchor on a value that is unique to the dl.
    const yieldValue = await screen.findByText("8.2%");
    expect(yieldValue).toBeInTheDocument();

    // Definition list structure (term/value pairs)
    expect(screen.getByText("Issuer").tagName).toBe("DT");
    expect(screen.getByText("Amount").tagName).toBe("DT");
    expect(screen.getByText("Estimated yield").tagName).toBe("DT");
    expect(screen.getByText("Maturity date").tagName).toBe("DT");

    expect(screen.getByText("$5,000").tagName).toBe("DD");
    expect(screen.getByText("8.2%").tagName).toBe("DD");
    expect(screen.getByText("2026-12-31").tagName).toBe("DD");

    const results = await axe(container, {
      // Keep default rules; ensure definition list doesn't introduce violations.
    });

    expect(results).toHaveNoViolations();
  });
});
