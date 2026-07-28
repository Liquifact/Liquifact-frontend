/**
 * Tests for upload data flow documentation
 *
 * This test file validates the data flow patterns described in docs/upload-data-flow.md
 * by testing the integration between UploadZone, the parent page component, and InvoiceList.
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import UploadZone from "../components/UploadZone";
import InvoiceList from "../components/InvoiceList";

describe("Upload Data Flow - Documentation Validation", () => {
  describe("1. File Selection Phase", () => {
    it("validates basic file constraints synchronously", () => {
      const { container } = render(<UploadZone />);

      // Verify file input exists with correct accept attribute
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute("accept", ".pdf");
    });

    it("validates PDF magic bytes asynchronously", async () => {
      // This validates the deep validation step described in the documentation
      const { validatePdfFile } = require("../lib/validation/pdf");

      // Create a mock PDF file with valid magic bytes
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
      const pdfFile = new File([pdfContent], "test.pdf", { type: "application/pdf" });

      const result = await validatePdfFile(pdfFile);
      expect(result.valid).toBe(true);
    });

    it("rejects files with invalid magic bytes", async () => {
      const { validatePdfFile } = require("../lib/validation/pdf");

      // Create a file without PDF magic bytes
      const invalidContent = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00]);
      const invalidFile = new File([invalidContent], "test.pdf", { type: "application/pdf" });

      const result = await validatePdfFile(invalidFile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("PDF format");
    });

    it("rejects zero-byte files", async () => {
      const { validatePdfFile } = require("../lib/validation/pdf");

      const emptyFile = new File([], "empty.pdf", { type: "application/pdf" });

      const result = await validatePdfFile(emptyFile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("empty");
    });

    it("sanitizes filenames for safe display", () => {
      const { sanitizeFilename } = require("../lib/validation/pdf");

      // Test HTML escaping
      const maliciousFilename = '<script>alert("xss")</script>.pdf';
      const sanitized = sanitizeFilename(maliciousFilename);
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).toContain("&lt;script&gt;");

      // Test length truncation
      const longFilename = "a".repeat(100) + ".pdf";
      const truncated = sanitizeFilename(longFilename, 50);
      expect(truncated.length).toBeLessThanOrEqual(53); // 50 + "..."
    });
  });

  describe("2. Upload Submission Phase", () => {
    it("transitions to uploading status on submit", async () => {
      const mockUploadSuccess = jest.fn();
      const { container } = render(<UploadZone onUploadSuccess={mockUploadSuccess} />);

      // Create a valid PDF file
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const pdfFile = new File([pdfContent], "invoice.pdf", { type: "application/pdf" });

      // Simulate file selection
      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/invoice\.pdf/i)).toBeInTheDocument();
      });

      // Submit the form
      const submitButton = screen.getByRole("button", { name: /upload/i });
      fireEvent.click(submitButton);

      // Verify uploading status is shown
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });
    });

    it("creates FormData with invoice field", async () => {
      // This validates the API request structure described in the documentation
      const formDataSpy = jest.spyOn(global, "FormData");

      const { container } = render(<UploadZone />);

      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const pdfFile = new File([pdfContent], "invoice.pdf", { type: "application/pdf" });

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/invoice\.pdf/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", { name: /upload/i });
      fireEvent.click(submitButton);

      // FormData should be created during submit
      expect(formDataSpy).toHaveBeenCalled();

      formDataSpy.mockRestore();
    });
  });

  describe("3. Tokenization Delay Phase", () => {
    it("handles tokenization delay from API response", async () => {
      // Mock fetch to return tokenization delay
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tokenizationDelay: 100 }),
        })
      );

      const mockUploadSuccess = jest.fn();
      const { container } = render(<UploadZone onUploadSuccess={mockUploadSuccess} />);

      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const pdfFile = new File([pdfContent], "invoice.pdf", { type: "application/pdf" });

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/invoice\.pdf/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", { name: /upload/i });
      fireEvent.click(submitButton);

      // Should show tokenizing status after upload
      await waitFor(
        () => {
          expect(screen.getByText(/tokenizing/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      global.fetch.mockRestore();
    });

    it("handles zero tokenization delay", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tokenizationDelay: 0 }),
        })
      );

      const mockUploadSuccess = jest.fn();
      const { container } = render(<UploadZone onUploadSuccess={mockUploadSuccess} />);

      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const pdfFile = new File([pdfContent], "invoice.pdf", { type: "application/pdf" });

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/invoice\.pdf/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", { name: /upload/i });
      fireEvent.click(submitButton);

      // Should complete quickly without delay
      await waitFor(
        () => {
          expect(mockUploadSuccess).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      global.fetch.mockRestore();
    });
  });

  describe("4. Optimistic Update Phase", () => {
    it("creates optimistic invoice with correct structure", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tokenizationDelay: 0 }),
        })
      );

      const mockUploadSuccess = jest.fn();
      const { container } = render(<UploadZone onUploadSuccess={mockUploadSuccess} />);

      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const pdfFile = new File([pdfContent], "test-invoice.pdf", { type: "application/pdf" });

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/test-invoice\.pdf/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", { name: /upload/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUploadSuccess).toHaveBeenCalled();
      });

      // Verify the optimistic invoice structure
      const optimisticInvoice = mockUploadSuccess.mock.calls[0][0];
      expect(optimisticInvoice).toHaveProperty("id");
      expect(optimisticInvoice).toHaveProperty("issuer");
      expect(optimisticInvoice).toHaveProperty("amount", "Pending");
      expect(optimisticInvoice).toHaveProperty("currency", "USD");
      expect(optimisticInvoice).toHaveProperty("dueDate", "Pending");
      expect(optimisticInvoice).toHaveProperty("yield", "Pending");
      expect(optimisticInvoice).toHaveProperty("status", "Pending tokenization");

      // Verify ID format
      expect(optimisticInvoice.id).toMatch(/^upload-\d+-test-invoice\.pdf$/);

      global.fetch.mockRestore();
    });

    it("does not call callback if onUploadSuccess not provided", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tokenizationDelay: 0 }),
        })
      );

      const { container } = render(<UploadZone />); // No onUploadSuccess prop

      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const pdfFile = new File([pdfContent], "invoice.pdf", { type: "application/pdf" });

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/invoice\.pdf/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", { name: /upload/i });
      fireEvent.click(submitButton);

      // Should complete without error even without callback
      await waitFor(
        () => {
          expect(screen.getByText(/upload complete/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      global.fetch.mockRestore();
    });
  });

  describe("5. Render Phase - Invoice Merging", () => {
    it("merges optimistic and loaded invoices correctly", () => {
      const optimisticInvoices = [
        {
          id: "upload-123-test.pdf",
          issuer: "test.pdf",
          amount: "Pending",
          currency: "USD",
          dueDate: "Pending",
          yield: "Pending",
          status: "Pending tokenization",
        },
      ];

      const loadedInvoices = [
        {
          id: "inv-1001",
          issuer: "Test Supplier",
          amount: "12,500",
          currency: "USD",
          dueDate: "2026-06-15",
          yield: "8.2%",
          status: "Tokenized",
        },
      ];

      const { container } = render(
        <InvoiceList
          loadInvoices={() => Promise.resolve(loadedInvoices)}
          optimisticInvoices={optimisticInvoices}
        />
      );

      // Should show both invoices
      await waitFor(() => {
        expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Supplier/i)).toBeInTheDocument();
      });
    });

    it("optimistic invoices take precedence on ID collision", () => {
      const optimisticInvoices = [
        {
          id: "inv-1001",
          issuer: "Optimistic Supplier",
          amount: "Pending",
          currency: "USD",
          dueDate: "Pending",
          yield: "Pending",
          status: "Pending tokenization",
        },
      ];

      const loadedInvoices = [
        {
          id: "inv-1001",
          issuer: "Loaded Supplier",
          amount: "12,500",
          currency: "USD",
          dueDate: "2026-06-15",
          yield: "8.2%",
          status: "Tokenized",
        },
      ];

      const { container } = render(
        <InvoiceList
          loadInvoices={() => Promise.resolve(loadedInvoices)}
          optimisticInvoices={optimisticInvoices}
        />
      );

      // Should show optimistic version
      await waitFor(() => {
        expect(screen.getByText(/Optimistic Supplier/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loaded Supplier/i)).not.toBeInTheDocument();
      });
    });

    it("maintains insertion order (optimistic first)", async () => {
      const optimisticInvoices = [
        {
          id: "upload-123-test.pdf",
          issuer: "Optimistic Invoice",
          amount: "Pending",
          currency: "USD",
          dueDate: "Pending",
          yield: "Pending",
          status: "Pending tokenization",
        },
      ];

      const loadedInvoices = [
        {
          id: "inv-1001",
          issuer: "Loaded Invoice 1",
          amount: "12,500",
          currency: "USD",
          dueDate: "2026-06-15",
          yield: "8.2%",
          status: "Tokenized",
        },
        {
          id: "inv-1002",
          issuer: "Loaded Invoice 2",
          amount: "7,800",
          currency: "USD",
          dueDate: "2026-07-01",
          yield: "7.5%",
          status: "Tokenized",
        },
      ];

      const { container } = render(
        <InvoiceList
          loadInvoices={() => Promise.resolve(loadedInvoices)}
          optimisticInvoices={optimisticInvoices}
        />
      );

      await waitFor(() => {
        const invoiceElements = container.querySelectorAll('[role="listitem"]');
        expect(invoiceElements[0]).toHaveTextContent(/Optimistic Invoice/i);
        expect(invoiceElements[1]).toHaveTextContent(/Loaded Invoice 1/i);
        expect(invoiceElements[2]).toHaveTextContent(/Loaded Invoice 2/i);
      });
    });
  });

  describe("Accessibility - Status Announcements", () => {
    it("announces upload status via aria-live", async () => {
      const { container } = render(<UploadZone />);

      // Verify status region exists
      const statusRegion = container.querySelector('[role="status"]');
      expect(statusRegion).toBeInTheDocument();
      expect(statusRegion).toHaveAttribute("aria-live", "polite");
    });

    it("announces errors via role=alert", async () => {
      const { container } = render(<UploadZone />);

      // Trigger an error by selecting an invalid file
      const invalidFile = new File(["not a pdf"], "test.txt", { type: "text/plain" });
      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        const errorAlert = container.querySelector('[role="alert"]');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute("aria-live", "assertive");
      });
    });
  });

  describe("State Machine Transitions", () => {
    it("follows idle -> uploading -> tokenizing -> success flow", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tokenizationDelay: 50 }),
        })
      );

      const mockUploadSuccess = jest.fn();
      const { container } = render(<UploadZone onUploadSuccess={mockUploadSuccess} />);

      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const pdfFile = new File([pdfContent], "invoice.pdf", { type: "application/pdf" });

      // Start: idle state
      expect(screen.getByRole("button", { name: /upload/i })).not.toBeDisabled();

      // Select file: still idle
      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText(/invoice\.pdf/i)).toBeInTheDocument();
      });

      // Submit: uploading
      const submitButton = screen.getByRole("button", { name: /upload/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      // After API response: tokenizing
      await waitFor(
        () => {
          expect(screen.getByText(/tokenizing/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // After delay: success
      await waitFor(
        () => {
          expect(screen.getByText(/upload complete/i)).toBeInTheDocument();
          expect(mockUploadSuccess).toHaveBeenCalled();
        },
        { timeout: 4000 }
      );

      global.fetch.mockRestore();
    });

    it("transitions from error back to idle on new file selection", async () => {
      const { container } = render(<UploadZone />);

      // Trigger error
      const invalidFile = new File(["not pdf"], "test.txt", { type: "text/plain" });
      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
      });

      // Select valid file
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const validFile = new File([pdfContent], "invoice.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // Error should clear, back to idle with file selected
      await waitFor(() => {
        expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
        expect(screen.getByText(/invoice\.pdf/i)).toBeInTheDocument();
      });
    });
  });

  describe("Security Considerations", () => {
    it("escapes HTML in filenames before display", async () => {
      const { container } = render(<UploadZone />);

      const xssFilename = "<img src=x onerror=alert(1)>.pdf";
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const xssFile = new File([pdfContent], xssFilename, { type: "application/pdf" });

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [xssFile] } });

      await waitFor(() => {
        const filenameElement = screen.getByText(/\.pdf/i);
        expect(filenameElement.innerHTML).not.toContain("<img");
        expect(filenameElement.innerHTML).toContain("&lt;");
      });
    });

    it("enforces 10MB size limit", async () => {
      const { container } = render(<UploadZone />);

      // Create a file larger than 10MB
      const largeContent = new Uint8Array(11 * 1024 * 1024);
      const largeFile = new File([largeContent], "large.pdf", { type: "application/pdf" });

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
        expect(screen.getByText(/size/i)).toBeInTheDocument();
      });
    });
  });
});
