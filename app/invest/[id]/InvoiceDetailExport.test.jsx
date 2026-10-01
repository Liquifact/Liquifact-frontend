import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InvoiceDetailExport, { validateInvoiceExport } from "./InvoiceDetailExport";
import { exportAsCSV, exportAsJSON } from "@/utils/export";

jest.mock("@/utils/export", () => ({
  exportAsCSV: jest.fn(),
  exportAsJSON: jest.fn(),
}));

describe("InvoiceDetailExport validation boundaries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validInvoice = {
    id: "inv-123",
    issuer: "Tech Corp",
    amount: 1000.5,
    currency: "USD",
    dueDate: "2024-12-31T00:00:00.000Z",
    yield: 5.5,
    status: "pending",
  };

  describe("validateInvoiceExport", () => {
    it("accepts valid invoice", () => {
      const result = validateInvoiceExport(validInvoice);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.safeInvoice).toEqual(validInvoice);
    });

    it("rejects null or undefined invoice", () => {
      expect(validateInvoiceExport(null).isValid).toBe(false);
      expect(validateInvoiceExport(undefined).isValid).toBe(false);
    });

    it("rejects missing required fields", () => {
      const { id, ...missingId } = validInvoice;
      expect(validateInvoiceExport(missingId).isValid).toBe(false);

      const { issuer, ...missingIssuer } = validInvoice;
      expect(validateInvoiceExport(missingIssuer).isValid).toBe(false);
    });

    it("rejects invalid types (e.g. negative amount, excessive amount)", () => {
      expect(validateInvoiceExport({ ...validInvoice, amount: -50 }).isValid).toBe(false);
      expect(validateInvoiceExport({ ...validInvoice, amount: Number.MAX_SAFE_INTEGER + 1 }).isValid).toBe(false);
      expect(validateInvoiceExport({ ...validInvoice, amount: "not_a_number" }).isValid).toBe(false);
    });

    it("rejects boundary edge cases for length", () => {
      expect(validateInvoiceExport({ ...validInvoice, id: "a".repeat(256) }).isValid).toBe(false);
      expect(validateInvoiceExport({ ...validInvoice, issuer: "a".repeat(1001) }).isValid).toBe(false);
      expect(validateInvoiceExport({ ...validInvoice, currency: "TOOLONGCODE" }).isValid).toBe(false);
      expect(validateInvoiceExport({ ...validInvoice, status: "s".repeat(101) }).isValid).toBe(false);
    });

    it("validates and formats currency, dates and strings", () => {
      const result = validateInvoiceExport({
        ...validInvoice,
        currency: " eur ",
        issuer: "  Trim Me  ",
        dueDate: "2024-12-31",
      });
      expect(result.isValid).toBe(true);
      expect(result.safeInvoice.currency).toBe("EUR");
      expect(result.safeInvoice.issuer).toBe("Trim Me");
      expect(result.safeInvoice.dueDate).toBe(new Date("2024-12-31").toISOString());
    });
  });

  describe("Component Rendering & Interactions", () => {
    it("renders disabled buttons for invalid invoice", () => {
      render(<InvoiceDetailExport invoice={{ ...validInvoice, amount: -1 }} />);
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("renders enabled buttons for valid invoice", () => {
      render(<InvoiceDetailExport invoice={validInvoice} />);
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });

    it("calls exportAsCSV on CSV button click", async () => {
      render(<InvoiceDetailExport invoice={validInvoice} />);
      const csvBtn = screen.getByRole("button", { name: /Export CSV/i });
      fireEvent.click(csvBtn);

      await waitFor(() => {
        expect(exportAsCSV).toHaveBeenCalledTimes(1);
        expect(exportAsCSV).toHaveBeenCalledWith([validInvoice], "invoice-inv-123.csv");
      });
    });

    it("calls exportAsJSON on JSON button click", async () => {
      render(<InvoiceDetailExport invoice={validInvoice} />);
      const jsonBtn = screen.getByRole("button", { name: /Export JSON/i });
      fireEvent.click(jsonBtn);

      await waitFor(() => {
        expect(exportAsJSON).toHaveBeenCalledTimes(1);
        expect(exportAsJSON).toHaveBeenCalledWith([validInvoice], "invoice-inv-123.json");
      });
    });

    it("prevents duplicate submissions while exporting", async () => {
      render(<InvoiceDetailExport invoice={validInvoice} />);
      const csvBtn = screen.getByRole("button", { name: /Export CSV/i });
      
      fireEvent.click(csvBtn);
      fireEvent.click(csvBtn);
      fireEvent.click(csvBtn);

      await waitFor(() => {
        expect(exportAsCSV).toHaveBeenCalledTimes(1);
      });
    });
  });
});
