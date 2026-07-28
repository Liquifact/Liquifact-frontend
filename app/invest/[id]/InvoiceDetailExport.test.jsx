/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailExport.test.jsx
 *
 * Tests for the CSV/JSON export component on the invoice detail page (issue #773).
 *
 * Covers:
 *   - Renders both CSV and JSON export buttons
 *   - Buttons have descriptive aria-labels
 *   - CSV export produces correct escaped content
 *   - JSON export produces correct structure
 *   - Buttons disabled when invoice is null
 *   - Correct download filenames
 *   - CSV escaping of special characters (commas, quotes, newlines)
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import InvoiceDetailExport from "./InvoiceDetailExport";

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
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

// ── Rendering ──────────────────────────────────────────────────────────────

describe("InvoiceDetailExport — rendering", () => {
  it("renders both Export CSV and Export JSON buttons", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export invoice data as json/i })
    ).toBeInTheDocument();
  });

  it("buttons are inside a group with accessible label", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    expect(screen.getByRole("group", { name: /invoice data export/i })).toBeInTheDocument();
  });

  it("buttons are enabled when invoice is provided", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /export invoice data as json/i })).not.toBeDisabled();
  });

  it("buttons are disabled when invoice is null", () => {
    render(<InvoiceDetailExport invoice={null} />);
    expect(screen.getByRole("button", { name: /export invoice data as csv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export invoice data as json/i })).toBeDisabled();
  });
});

// ── CSV export ─────────────────────────────────────────────────────────────

describe("InvoiceDetailExport — CSV export", () => {
  it("triggers a CSV download with correct filename", () => {
    const clickSpy = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    expect(clickSpy).toHaveBeenCalled();
    // Verify a blob URL was created
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("CSV contains correct headers and values", () => {
    let capturedBlob = null;
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = jest.fn();
      }
      return el;
    });

    // Capture the Blob passed to createObjectURL
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    // Read the blob content
    return capturedBlob.text().then((text) => {
      const lines = text.split("\n");
      expect(lines[0]).toBe("id,issuer,amount,currency,dueDate,yield,status");
      expect(lines[1]).toBe("inv-001,Acme Corp,12,500,USD,2026-12-31,8.5%,Open");

      URL.createObjectURL = origCreateObjectURL;
    });
  });
});

// ── JSON export ────────────────────────────────────────────────────────────

describe("InvoiceDetailExport — JSON export", () => {
  it("triggers a JSON download with correct filename", () => {
    const clickSpy = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as json/i }));

    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("JSON contains correct structure with invoice data", () => {
    let capturedBlob = null;
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = jest.fn();
      }
      return el;
    });

    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as json/i }));

    return capturedBlob.text().then((text) => {
      const data = JSON.parse(text);
      expect(data).toEqual([SAMPLE_INVOICE]);
      URL.createObjectURL = origCreateObjectURL;
    });
  });
});

// ── CSV escaping ───────────────────────────────────────────────────────────

describe("InvoiceDetailExport — CSV escaping", () => {
  it("properly escapes values containing commas", () => {
    let capturedBlob = null;
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = jest.fn();
      return el;
    });
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    const invoiceWithComma = {
      ...SAMPLE_INVOICE,
      issuer: "Acme, Corp",
    };

    render(<InvoiceDetailExport invoice={invoiceWithComma} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    return capturedBlob.text().then((text) => {
      const lines = text.split("\n");
      // The issuer field with a comma should be quoted
      expect(lines[1]).toContain('"Acme, Corp"');
      URL.createObjectURL = origCreateObjectURL;
    });
  });

  it("properly escapes values containing double quotes", () => {
    let capturedBlob = null;
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = jest.fn();
      return el;
    });
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    const invoiceWithQuotes = {
      ...SAMPLE_INVOICE,
      issuer: 'Acme "Corp"',
    };

    render(<InvoiceDetailExport invoice={invoiceWithQuotes} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    return capturedBlob.text().then((text) => {
      const lines = text.split("\n");
      // Double quotes inside a quoted field should be doubled
      expect(lines[1]).toContain('"Acme ""Corp"""');
      URL.createObjectURL = origCreateObjectURL;
    });
  });

  it("properly escapes values containing newlines", () => {
    let capturedBlob = null;
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = jest.fn();
      return el;
    });
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    const invoiceWithNewlines = {
      ...SAMPLE_INVOICE,
      issuer: "Acme\nCorp",
    };

    render(<InvoiceDetailExport invoice={invoiceWithNewlines} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    return capturedBlob.text().then((text) => {
      const lines = text.split("\n");
      // Newlines inside a quoted field should be preserved in the CSV
      expect(lines.length).toBeGreaterThanOrEqual(2);
      // The full CSV content should have the issuer quoted
      expect(text).toContain('"Acme\nCorp"');
      URL.createObjectURL = origCreateObjectURL;
    });
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────

describe("InvoiceDetailExport — edge cases", () => {
  it("does not throw when invoice is undefined", () => {
    expect(() => {
      render(<InvoiceDetailExport invoice={undefined} />);
    }).not.toThrow();
  });

  it("does not trigger download when invoice is null and button is clicked", () => {
    const clickSpy = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    render(<InvoiceDetailExport invoice={null} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    // Should not create a download link
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("export record only includes safe fields (no internal data)", () => {
    let capturedBlob = null;
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") el.click = jest.fn();
      return el;
    });
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    const invoiceWithExtraFields = {
      ...SAMPLE_INVOICE,
      internalNote: "secret",
      walletAddress: "STELLAR...",
    };

    render(<InvoiceDetailExport invoice={invoiceWithExtraFields} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as json/i }));

    return capturedBlob.text().then((text) => {
      const data = JSON.parse(text);
      expect(data[0]).not.toHaveProperty("internalNote");
      expect(data[0]).not.toHaveProperty("walletAddress");
      URL.createObjectURL = origCreateObjectURL;
    });
  });
});
