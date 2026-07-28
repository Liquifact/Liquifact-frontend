import React from "react";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import UploadView from "./UploadView";

// Mock the child components to simplify testing the state transitions
jest.mock("./UploadZone", () => {
  return function MockUploadZone({ onUploadSuccess }) {
    return (
      <div data-testid="upload-zone">
        <button
          onClick={() =>
            onUploadSuccess({ id: "inv-opt-1", issuer: "Optimistic", amount: "100" })
          }
        >
          Mock Upload Success
        </button>
      </div>
    );
  };
});

jest.mock("./InvoiceList", () => {
  return function MockInvoiceList({ invoices, optimisticInvoices }) {
    return (
      <div data-testid="invoice-list">
        <span>Invoices: {invoices.length}</span>
        <span>Optimistic: {optimisticInvoices.length}</span>
      </div>
    );
  };
});

jest.mock("./InvoiceListSkeleton", () => {
  return function MockInvoiceListSkeleton() {
    return <div data-testid="invoice-list-skeleton">Loading...</div>;
  };
});

jest.mock("./ErrorBanner", () => {
  return function MockErrorBanner({ description, onAction }) {
    return (
      <div data-testid="error-banner">
        <span>{description}</span>
        <button onClick={onAction}>Retry</button>
      </div>
    );
  };
});

describe("UploadView state transitions", () => {
  it("renders loading state initially", async () => {
    const loadInvoices = jest.fn(() => new Promise(() => {})); // Never resolves
    render(<UploadView loadInvoices={loadInvoices} />);

    // Check loading skeleton
    expect(screen.getByTestId("invoice-list-skeleton")).toBeInTheDocument();
    
    // Check aria-live region for loading text
    expect(screen.getByRole("status")).toHaveTextContent(/Loading invoices/i);
  });

  it("transitions to error state on fetch failure", async () => {
    const loadInvoices = jest.fn(() => Promise.reject(new Error("Failed")));
    render(<UploadView loadInvoices={loadInvoices} />);

    await waitFor(() => {
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    });

    // Check aria-live region for error text
    expect(screen.getByRole("status")).toHaveTextContent(/Unable to load invoices/i);
    expect(screen.queryByTestId("invoice-list-skeleton")).not.toBeInTheDocument();
  });

  it("transitions to success state with empty list", async () => {
    const loadInvoices = jest.fn(() => Promise.resolve([]));
    render(<UploadView loadInvoices={loadInvoices} />);

    await waitFor(() => {
      expect(screen.getByTestId("invoice-list")).toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveTextContent(/No invoices yet/i);
    expect(screen.getByText("Invoices: 0")).toBeInTheDocument();
  });

  it("transitions to success state with populated list", async () => {
    const loadInvoices = jest.fn(() =>
      Promise.resolve([{ id: "1", issuer: "A" }])
    );
    render(<UploadView loadInvoices={loadInvoices} />);

    await waitFor(() => {
      expect(screen.getByTestId("invoice-list")).toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveTextContent(/1 invoice available/i);
    expect(screen.getByText("Invoices: 1")).toBeInTheDocument();
  });

  it("handles retry from error state", async () => {
    let reject = true;
    const loadInvoices = jest.fn(() => {
      if (reject) {
        reject = false;
        return Promise.reject(new Error("Failed"));
      }
      return Promise.resolve([{ id: "1", issuer: "A" }]);
    });

    render(<UploadView loadInvoices={loadInvoices} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByText("Retry"));

    // Should go back to loading temporarily
    expect(screen.getByTestId("invoice-list-skeleton")).toBeInTheDocument();

    // Then to success state
    await waitFor(() => {
      expect(screen.getByTestId("invoice-list")).toBeInTheDocument();
    });
    
    expect(screen.getByText("Invoices: 1")).toBeInTheDocument();
    expect(loadInvoices).toHaveBeenCalledTimes(2);
  });

  it("aborts in-flight request on unmount", async () => {
    const loadInvoices = jest.fn(() => new Promise(() => {}));
    const { unmount } = render(<UploadView loadInvoices={loadInvoices} />);
    
    unmount();
    
    // The abort signal should have been called
    expect(loadInvoices).toHaveBeenCalled();
    const callArg = loadInvoices.mock.calls[0][0];
    expect(callArg.signal.aborted).toBe(true);
  });

  it("updates state on optimistic upload success", async () => {
    const loadInvoices = jest.fn(() => Promise.resolve([{ id: "1", issuer: "A" }]));
    render(<UploadView loadInvoices={loadInvoices} />);

    await waitFor(() => {
      expect(screen.getByTestId("invoice-list")).toBeInTheDocument();
    });

    // Trigger optimistic upload
    fireEvent.click(screen.getByText("Mock Upload Success"));

    await waitFor(() => {
      expect(screen.getByText("Optimistic: 1")).toBeInTheDocument();
    });

    // Status should update to 2 invoices (1 loaded + 1 optimistic)
    expect(screen.getByRole("status")).toHaveTextContent(/2 invoices available/i);
  });
});
