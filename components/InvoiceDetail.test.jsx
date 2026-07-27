import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceDetail from "./InvoiceDetail";
import { formatCurrency, formatPercent } from "../lib/format/currency";
import { formatInvoiceDate as formatDate } from "../lib/format/date";

expect.extend(toHaveNoViolations);

// Mock the child components so we can focus on InvoiceDetail's logic
jest.mock("./StatusPill", () => function MockStatusPill({ status }) {
  return <div data-testid="status-pill">{status}</div>;
});

jest.mock("./ErrorBanner", () => function MockErrorBanner({ title, message, children, onDismiss }) {
  return (
    <div data-testid="error-banner">
      <h4>{title}</h4>
      <p>{message}</p>
      {onDismiss && <button data-testid="dismiss-button" onClick={onDismiss}>Dismiss</button>}
      {children}
    </div>
  );
});

jest.mock("./Button", () => function MockButton({ children, onClick, isLoading }) {
  return (
    <button data-testid="mock-button" onClick={onClick} disabled={isLoading}>
      {isLoading ? "Loading..." : children}
    </button>
  );
});

jest.mock("./CopyButton", () => function MockCopyButton({ label }) {
  return (
    <button type="button" data-testid="copy-button-mock" aria-label={`Copy ${label}`}>
      Copy {label}
    </button>
  );
});

describe("InvoiceDetail", () => {
  const mockInvoice = {
    id: "inv-123",
    issuer: "Test Issuer",
    amountValue: 1000,
    currency: "USD",
    yieldValue: 5,
    dueDate: "2024-12-31",
    status: "pending",
  };

  const mockLoadInvoice = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a loading skeleton initially", async () => {
    // Return an unresolved promise to keep it in the loading state
    mockLoadInvoice.mockReturnValue(new Promise(() => {}));
    
    render(<InvoiceDetail id="inv-123" loadInvoice={mockLoadInvoice} />);
    
    expect(screen.getByTestId("invoice-detail-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-detail-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("renders invoice details when loadInvoice resolves", async () => {
    mockLoadInvoice.mockResolvedValue(mockInvoice);
    
    render(<InvoiceDetail id="inv-123" loadInvoice={mockLoadInvoice} />);
    
    // Wait for the skeleton to disappear and the content to appear
    await waitFor(() => {
      expect(screen.queryByTestId("invoice-detail-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Issuer");
    expect(screen.getByText("Invoice #inv-123")).toBeInTheDocument();
    
    // Check formatting
    expect(screen.getByText(formatCurrency(1000, { currency: "USD" }))).toBeInTheDocument();
    expect(screen.getByText(formatPercent(5))).toBeInTheDocument();
    expect(screen.getByText(formatDate("2024-12-31"))).toBeInTheDocument();
    expect(screen.getByText("Reference")).toBeInTheDocument();
    expect(screen.getByTestId("copy-button-mock")).toBeInTheDocument();
    expect(screen.getByTestId("status-pill")).toHaveTextContent("pending");
  });

  it("renders an error banner when loadInvoice fails", async () => {
    mockLoadInvoice.mockRejectedValue(new Error("Network Error"));
    
    render(<InvoiceDetail id="inv-123" loadInvoice={mockLoadInvoice} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId("invoice-detail-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    expect(screen.getByText("Could not load invoice details")).toBeInTheDocument();
    expect(screen.getByText("Network Error")).toBeInTheDocument();
  });

  it("dismiss clears the error state", async () => {
    mockLoadInvoice.mockRejectedValue(new Error("Network Error"));
    
    render(<InvoiceDetail id="inv-123" loadInvoice={mockLoadInvoice} />);
    
    await waitFor(() => {
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    });

    const dismissButton = screen.getByTestId("dismiss-button");
    fireEvent.click(dismissButton);

    expect(screen.queryByTestId("error-banner")).not.toBeInTheDocument();
  });

  it("retry recovers from the error state", async () => {
    mockLoadInvoice.mockRejectedValueOnce(new Error("Network Error"));
    
    render(<InvoiceDetail id="inv-123" loadInvoice={mockLoadInvoice} />);
    
    await waitFor(() => {
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    });

    // Setup success for the retry
    mockLoadInvoice.mockResolvedValueOnce(mockInvoice);

    const retryButton = screen.getByTestId("mock-button");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByTestId("error-banner")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Issuer");
    expect(mockLoadInvoice).toHaveBeenCalledTimes(2);
  });

  it("has no accessibility violations in the loaded state", async () => {
    mockLoadInvoice.mockResolvedValue(mockInvoice);
    const { container } = render(<InvoiceDetail id="inv-123" loadInvoice={mockLoadInvoice} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId("invoice-detail-skeleton")).not.toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});


