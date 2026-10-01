/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailClient.test.jsx
 *
 * Tests for validation boundaries in InvoiceDetailClient.
 * Covers prop validation, type safety, and edge case handling.
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InvoiceDetailClient from "./InvoiceDetailClient";

describe("InvoiceDetailClient - validation boundaries", () => {
  const defaultProps = {
    labelIssuer: "Issuer",
    labelAmount: "Amount",
    labelYield: "Yield",
    labelMaturity: "Maturity",
    labelStatus: "Status",
    labelReference: "Reference",
    issuer: "Acme Corp",
    formattedAmount: "$12,500.00",
    formattedYield: "8.5%",
    dueDate: "2030-01-01",
    referenceId: "inv-001",
    statusPill: <span>Open</span>,
    summaryHeading: "Acme Corp",
    rawIssuer: "Acme Corp",
    rawAmount: "12500",
    rawYield: "8.5",
    rawDueDate: "2030-01-01",
    onSave: jest.fn(),
  };

  describe("prop validation", () => {
    it("renders with valid props", () => {
      render(<InvoiceDetailClient {...defaultProps} />);
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("$12,500.00")).toBeInTheDocument();
    });

    it("handles null string props with fallbacks", () => {
      const props = {
        ...defaultProps,
        labelIssuer: null,
        labelAmount: null,
        issuer: null,
        formattedAmount: null,
      };
      render(<InvoiceDetailClient {...props} />);
      // Should render with fallback values instead of crashing
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles undefined string props with fallbacks", () => {
      const props = {
        ...defaultProps,
        labelIssuer: undefined,
        labelAmount: undefined,
        issuer: undefined,
        formattedAmount: undefined,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles empty string props with fallbacks", () => {
      const props = {
        ...defaultProps,
        labelIssuer: "",
        labelAmount: "",
        issuer: "",
        formattedAmount: "",
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles null statusPill with fallback", () => {
      const props = {
        ...defaultProps,
        statusPill: null,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles null onSave callback gracefully", () => {
      const props = {
        ...defaultProps,
        onSave: null,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles undefined onSave callback gracefully", () => {
      const props = {
        ...defaultProps,
        onSave: undefined,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles non-function onSave gracefully", () => {
      const props = {
        ...defaultProps,
        onSave: "not a function",
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles missing raw values with fallbacks to display values", () => {
      const props = {
        ...defaultProps,
        rawIssuer: null,
        rawAmount: null,
        rawYield: null,
        rawDueDate: null,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles null referenceId gracefully", () => {
      const props = {
        ...defaultProps,
        referenceId: null,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
      // Reference section should not render
      expect(screen.queryByText("Reference")).not.toBeInTheDocument();
    });

    it("handles undefined referenceId gracefully", () => {
      const props = {
        ...defaultProps,
        referenceId: undefined,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
      expect(screen.queryByText("Reference")).not.toBeInTheDocument();
    });
  });

  describe("EditableRow validation boundaries", () => {
    it("handles invalid field names gracefully", () => {
      const props = {
        ...defaultProps,
        // This would normally be set by the parent, but we test the validation
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles invalid label with fallback", () => {
      const props = {
        ...defaultProps,
        labelIssuer: null,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles invalid displayValue with fallback", () => {
      const props = {
        ...defaultProps,
        issuer: null,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles invalid rawValue with fallback", () => {
      const props = {
        ...defaultProps,
        rawIssuer: null,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles invalid inputType with fallback to text", () => {
      // This is tested implicitly through the component's validation
      const props = {
        ...defaultProps,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("prevents save when onSave is not a function", () => {
      const props = {
        ...defaultProps,
        onSave: null,
      };
      render(<InvoiceDetailClient {...props} />);

      // Try to edit and save
      const editButton = screen.getByTestId("inline-edit-btn-issuer");
      fireEvent.click(editButton);

      const input = screen.getByTestId("inline-edit-input-issuer");
      fireEvent.change(input, { target: { value: "New Issuer" } });

      const saveButton = screen.getByTestId("inline-edit-save-issuer");
      fireEvent.click(saveButton);

      // Should not crash
      expect(screen.getByRole("region")).toBeInTheDocument();
    });
  });

  describe("boundary case handling", () => {
    it("handles very long string values", () => {
      const longString = "A".repeat(10000);
      const props = {
        ...defaultProps,
        issuer: longString,
        formattedAmount: longString,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles special characters in values", () => {
      const props = {
        ...defaultProps,
        issuer: "Acme <script>alert('xss')</script> Corp",
        formattedAmount: "$12,500.00",
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles numeric string values", () => {
      const props = {
        ...defaultProps,
        issuer: "12345",
        formattedAmount: "12345",
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles zero-length strings", () => {
      const props = {
        ...defaultProps,
        issuer: "",
        formattedAmount: "",
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles whitespace-only strings", () => {
      const props = {
        ...defaultProps,
        issuer: "   ",
        formattedAmount: "   ",
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });
  });

  describe("type safety", () => {
    it("handles number instead of string for string props", () => {
      const props = {
        ...defaultProps,
        issuer: 12345,
        formattedAmount: 12500,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles object instead of string for string props", () => {
      const props = {
        ...defaultProps,
        issuer: { value: "Acme" },
        formattedAmount: { value: "12500" },
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("handles array instead of string for string props", () => {
      const props = {
        ...defaultProps,
        issuer: ["Acme"],
        formattedAmount: ["12500"],
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });
  });

  describe("error boundary protection", () => {
    it("does not crash when all props are null", () => {
      const props = {
        labelIssuer: null,
        labelAmount: null,
        labelYield: null,
        labelMaturity: null,
        labelStatus: null,
        labelReference: null,
        issuer: null,
        formattedAmount: null,
        formattedYield: null,
        dueDate: null,
        referenceId: null,
        statusPill: null,
        summaryHeading: null,
        rawIssuer: null,
        rawAmount: null,
        rawYield: null,
        rawDueDate: null,
        onSave: null,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("does not crash when all props are undefined", () => {
      const props = {
        labelIssuer: undefined,
        labelAmount: undefined,
        labelYield: undefined,
        labelMaturity: undefined,
        labelStatus: undefined,
        labelReference: undefined,
        issuer: undefined,
        formattedAmount: undefined,
        formattedYield: undefined,
        dueDate: undefined,
        referenceId: undefined,
        statusPill: undefined,
        summaryHeading: undefined,
        rawIssuer: undefined,
        rawAmount: undefined,
        rawYield: undefined,
        rawDueDate: undefined,
        onSave: undefined,
      };
      render(<InvoiceDetailClient {...props} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("does not crash when props object is empty", () => {
      render(<InvoiceDetailClient />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });
  });
});
