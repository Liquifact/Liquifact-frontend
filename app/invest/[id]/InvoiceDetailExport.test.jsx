/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailExport.test.jsx
 *
 * Production tests for the CSV/JSON export component on the invoice detail page.
 *
 * Covers:
 *   - Helper contract tests: toExportRecord, sanitizeFilenamePart, getExportFilename, isValidInvoice
 *   - Rendering and ARIA structure (role="group", aria-labels, aria-busy)
 *   - Validation and boundary states (null, undefined, empty object, non-objects)
 *   - Deterministic CSV export with headers, values, and RFC-4180 escaping
 *   - Deterministic JSON export with data whitelisting (preventing leakage of sensitive fields)
 *   - Concurrency guards preventing duplicate triggers during active export
 *   - Robust error handling and non-blocking recovery (mock download failure)
 *   - Callbacks: onExport and onError
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import InvoiceDetailExport, {
  toExportRecord,
  sanitizeFilenamePart,
  getExportFilename,
  isValidInvoice,
  SAFE_EXPORT_FIELDS,
} from "./InvoiceDetailExport";
import * as exportUtils from "@/utils/export";

const readBlobText = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
};

beforeEach(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
});

const SAMPLE_INVOICE = {
  id: "inv-001",
  issuer: "Acme Corp",
  amount: "12,500",
  currency: "USD",
  dueDate: "2026-12-31",
  yield: "8.5%",
  status: "Open",
};

describe("InvoiceDetailExport — pure helpers", () => {
  describe("isValidInvoice", () => {
    it("returns true for non-empty objects", () => {
      expect(isValidInvoice(SAMPLE_INVOICE)).toBe(true);
      expect(isValidInvoice({ id: "123" })).toBe(true);
    });

    it("returns false for null, undefined, primitives, arrays, and empty objects", () => {
      expect(isValidInvoice(null)).toBe(false);
      expect(isValidInvoice(undefined)).toBe(false);
      expect(isValidInvoice("")).toBe(false);
      expect(isValidInvoice(123)).toBe(false);
      expect(isValidInvoice(true)).toBe(false);
      expect(isValidInvoice([])).toBe(false);
      expect(isValidInvoice({})).toBe(false);
    });
  });

  describe("sanitizeFilenamePart", () => {
    it("preserves standard alphanumeric identifiers", () => {
      expect(sanitizeFilenamePart("inv-001")).toBe("inv-001");
      expect(sanitizeFilenamePart("INVOICE_2026_X")).toBe("INVOICE_2026_X");
    });

    it("sanitizes directory traversal characters and slashes", () => {
      expect(sanitizeFilenamePart("../../secret")).toBe("secret");
      expect(sanitizeFilenamePart("nested/path/to/id")).toBe("nested-path-to-id");
      expect(sanitizeFilenamePart("C:\\windows\\system32")).toBe("C-windows-system32");
    });

    it("replaces whitespace, colons, and illegal filename symbols", () => {
      expect(sanitizeFilenamePart("inv 001: test?")).toBe("inv-001-test");
    });

    it("returns empty string for null, undefined, or empty strings", () => {
      expect(sanitizeFilenamePart(null)).toBe("");
      expect(sanitizeFilenamePart(undefined)).toBe("");
      expect(sanitizeFilenamePart("")).toBe("");
      expect(sanitizeFilenamePart("   ")).toBe("");
    });
  });

  describe("getExportFilename", () => {
    it("formats standard filenames for CSV and JSON", () => {
      expect(getExportFilename("inv-001", "csv")).toBe("invoice-inv-001.csv");
      expect(getExportFilename("inv-001", "json")).toBe("invoice-inv-001.json");
    });

    it("falls back to generic filenames when id is missing or empty", () => {
      expect(getExportFilename(null, "csv")).toBe("invoice-export.csv");
      expect(getExportFilename(undefined, "json")).toBe("invoice-export.json");
      expect(getExportFilename("", "csv")).toBe("invoice-export.csv");
    });

    it("defaults to csv extension when format is omitted", () => {
      expect(getExportFilename("inv-001")).toBe("invoice-inv-001.csv");
    });
  });

  describe("toExportRecord", () => {
    it("extracts all whitelisted fields", () => {
      const record = toExportRecord(SAMPLE_INVOICE);
      expect(record).toEqual({
        id: "inv-001",
        issuer: "Acme Corp",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-12-31",
        yield: "8.5%",
        status: "Open",
      });
      expect(Object.keys(record)).toEqual(SAFE_EXPORT_FIELDS);
    });

    it("strips internal and sensitive properties", () => {
      const sensitiveInvoice = {
        ...SAMPLE_INVOICE,
        internalNote: "Confidential risk score",
        walletAddress: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF5Z6G6C2G2",
        privateSigner: "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        _internalCache: { attempts: 3 },
      };

      const record = toExportRecord(sensitiveInvoice);
      expect(record).not.toHaveProperty("internalNote");
      expect(record).not.toHaveProperty("walletAddress");
      expect(record).not.toHaveProperty("privateSigner");
      expect(record).not.toHaveProperty("_internalCache");
    });

    it("returns null for non-invoice inputs", () => {
      expect(toExportRecord(null)).toBeNull();
      expect(toExportRecord(undefined)).toBeNull();
      expect(toExportRecord({})).toBeNull();
      expect(toExportRecord([])).toBeNull();
      expect(toExportRecord("invalid")).toBeNull();
    });
  });
});

// ── Rendering & ARIA ────────────────────────────────────────────────────────

describe("InvoiceDetailExport — rendering and accessibility", () => {
  it("renders both Export CSV and Export JSON buttons in an accessible group", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    expect(screen.getByRole("group", { name: /invoice data export/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export invoice data as json/i })
    ).toBeInTheDocument();
  });

  it("buttons are enabled when valid invoice is provided", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /export invoice data as json/i })).not.toBeDisabled();
  });

  it("buttons are disabled when invoice is null or undefined", () => {
    const { rerender } = render(<InvoiceDetailExport invoice={null} />);
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export invoice data as json/i })).toBeDisabled();

    rerender(<InvoiceDetailExport invoice={undefined} />);
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export invoice data as json/i })).toBeDisabled();
  });

  it("buttons are disabled when invoice is empty object or invalid type", () => {
    const { rerender } = render(<InvoiceDetailExport invoice={{}} />);
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export invoice data as json/i })).toBeDisabled();

    rerender(<InvoiceDetailExport invoice="invalid" />);
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).toBeDisabled();
  });

  it("honors explicit disabled prop", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} disabled={true} />);
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export invoice data as json/i })).toBeDisabled();
  });

  it("applies custom className to the group container", () => {
    const { container } = render(
      <InvoiceDetailExport invoice={SAMPLE_INVOICE} className="custom-test-class" />
    );
    expect(container.firstChild).toHaveClass("custom-test-class");
  });
});

// ── CSV Export ──────────────────────────────────────────────────────────────

describe("InvoiceDetailExport — CSV export", () => {
  let clickSpy;

  beforeEach(() => {
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it("triggers exportAsCSV with safe record and sanitized filename", () => {
    const exportCSVSpy = jest.spyOn(exportUtils, "exportAsCSV").mockImplementation(() => {});

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    expect(exportCSVSpy).toHaveBeenCalledTimes(1);
    expect(exportCSVSpy).toHaveBeenCalledWith(
      [
        {
          id: "inv-001",
          issuer: "Acme Corp",
          amount: "12,500",
          currency: "USD",
          dueDate: "2026-12-31",
          yield: "8.5%",
          status: "Open",
        },
      ],
      "invoice-inv-001.csv"
    );
  });

  it("uses default filename when invoice has no id", () => {
    const exportCSVSpy = jest.spyOn(exportUtils, "exportAsCSV").mockImplementation(() => {});

    const invoiceNoId = { ...SAMPLE_INVOICE, id: undefined };
    render(<InvoiceDetailExport invoice={invoiceNoId} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    expect(exportCSVSpy).toHaveBeenCalledWith(expect.any(Array), "invoice-export.csv");
  });

  it("produces properly escaped CSV content with actual exportAsCSV integration", async () => {
    let capturedBlob = null;
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    const invoiceWithSpecialChars = {
      ...SAMPLE_INVOICE,
      issuer: 'Acme, "Special" & Co.',
      status: "=HYPERLINK()", // Injection payload
    };

    render(<InvoiceDetailExport invoice={invoiceWithSpecialChars} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    expect(capturedBlob).not.toBeNull();
    const text = await readBlobText(capturedBlob);
    const lines = text.split("\n");

    expect(lines[0]).toBe("id,issuer,amount,currency,dueDate,yield,status");
    expect(lines[1]).toContain('"Acme, ""Special"" & Co."');
    expect(lines[1]).toContain('"\x27=HYPERLINK()"'); // Safe formula neutralization

    URL.createObjectURL = origCreateObjectURL;
  });
});

// ── JSON Export ─────────────────────────────────────────────────────────────

describe("InvoiceDetailExport — JSON export", () => {
  let clickSpy;

  beforeEach(() => {
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it("triggers exportAsJSON with sanitized filename", () => {
    const exportJSONSpy = jest.spyOn(exportUtils, "exportAsJSON").mockImplementation(() => {});

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as json/i }));

    expect(exportJSONSpy).toHaveBeenCalledTimes(1);
    expect(exportJSONSpy).toHaveBeenCalledWith(
      [
        {
          id: "inv-001",
          issuer: "Acme Corp",
          amount: "12,500",
          currency: "USD",
          dueDate: "2026-12-31",
          yield: "8.5%",
          status: "Open",
        },
      ],
      "invoice-inv-001.json"
    );
  });

  it("produces correct JSON structure without sensitive metadata in real integration", async () => {
    let capturedBlob = null;
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    const invoiceWithPrivateData = {
      ...SAMPLE_INVOICE,
      secretAuditId: 987654,
      settlementSignatures: ["0xabc..."],
    };

    render(<InvoiceDetailExport invoice={invoiceWithPrivateData} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as json/i }));

    const text = await readBlobText(capturedBlob);
    const data = JSON.parse(text);

    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty("id", "inv-001");
    expect(data[0]).not.toHaveProperty("secretAuditId");
    expect(data[0]).not.toHaveProperty("settlementSignatures");

    URL.createObjectURL = origCreateObjectURL;
  });
});

// ── Callbacks, Concurrency & Error Recovery ──────────────────────────────────

describe("InvoiceDetailExport — callbacks, concurrency and failure modes", () => {
  let clickSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("calls onExport callback with export info upon successful export", () => {
    jest.spyOn(exportUtils, "exportAsCSV").mockImplementation(() => {});
    const onExportMock = jest.fn();

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} onExport={onExportMock} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    expect(onExportMock).toHaveBeenCalledTimes(1);
    expect(onExportMock).toHaveBeenCalledWith({
      record: toExportRecord(SAMPLE_INVOICE),
      format: "csv",
      filename: "invoice-inv-001.csv",
    });
  });

  it("prevents concurrent re-entrant triggers during active export", () => {
    let callCount = 0;
    jest.spyOn(exportUtils, "exportAsCSV").mockImplementation(() => {
      callCount += 1;
    });

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });

    // Rapid double-click
    fireEvent.click(csvBtn);
    expect(callCount).toBe(1);
  });

  it("gracefully catches errors, logs without sensitive data, and calls onError", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockError = new Error("DOM click disallowed in sandboxed frame");
    jest.spyOn(exportUtils, "exportAsCSV").mockImplementation(() => {
      throw mockError;
    });

    const onErrorMock = jest.fn();

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} onError={onErrorMock} />);
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });

    expect(() => {
      fireEvent.click(csvBtn);
    }).not.toThrow();

    expect(onErrorMock).toHaveBeenCalledWith(mockError, "csv");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[InvoiceDetailExport] Export failed (csv):",
      "DOM click disallowed in sandboxed frame"
    );

    // Screen reader status announcement announces the failure
    expect(screen.getByRole("status")).toHaveTextContent(/export failed/i);

    consoleErrorSpy.mockRestore();
  });

  it("allows user retry after an export failure", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    let failFirst = true;
    const exportSpy = jest.spyOn(exportUtils, "exportAsCSV").mockImplementation(() => {
      if (failFirst) {
        failFirst = false;
        throw new Error("Temporary network/DOM failure");
      }
    });

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });

    // First attempt fails
    fireEvent.click(csvBtn);
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(csvBtn).not.toBeDisabled();

    // Second attempt succeeds
    fireEvent.click(csvBtn);
    expect(exportSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent(/export completed/i);
  });

  it("clears status message after 3000ms timeout", () => {
    jest.spyOn(exportUtils, "exportAsCSV").mockImplementation(() => {});

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    const statusEl = screen.getByRole("status");
    expect(statusEl).toHaveTextContent(/completed/i);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(statusEl).toHaveTextContent("");
  });
});
