/**
 * @jest-environment jsdom
 *
 * @file app/invest/[id]/InvoiceDetailExport.a11y.test.jsx
 *
 * Accessibility-specific tests for InvoiceDetailExport.
 *
 * These tests verify the accessibility contract documented in
 * docs/invoice-detail-a11y.md, including:
 * - ARIA attributes
 * - Focus management
 * - Keyboard navigation
 * - Button group structure
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceDetailExport from "./InvoiceDetailExport";

expect.extend(toHaveNoViolations);

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

describe("InvoiceDetailExport — ARIA structure", () => {
  it("buttons are inside a group with accessible label", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    const group = screen.getByRole("group", { name: /invoice data export/i });
    expect(group).toBeInTheDocument();
  });

  it("CSV export button has descriptive aria-label", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });
    expect(csvBtn).toBeInTheDocument();
  });

  it("JSON export button has descriptive aria-label", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    const jsonBtn = screen.getByRole("button", { name: /export invoice data as json/i });
    expect(jsonBtn).toBeInTheDocument();
  });

  it("buttons are disabled when invoice is null", () => {
    render(<InvoiceDetailExport invoice={null} />);
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });
    const jsonBtn = screen.getByRole("button", { name: /export invoice data as json/i });
    expect(csvBtn).toBeDisabled();
    expect(jsonBtn).toBeDisabled();
  });

  it("buttons are enabled when invoice is provided", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });
    const jsonBtn = screen.getByRole("button", { name: /export invoice data as json/i });
    expect(csvBtn).not.toBeDisabled();
    expect(jsonBtn).not.toBeDisabled();
  });
});

describe("InvoiceDetailExport — Focus management", () => {
  it("CSV button is focusable", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });
    await user.click(csvBtn);
    expect(csvBtn).toHaveFocus();
  });

  it("JSON button is focusable", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    
    const jsonBtn = screen.getByRole("button", { name: /export invoice data as json/i });
    await user.click(jsonBtn);
    expect(jsonBtn).toHaveFocus();
  });

  it("Tab moves between CSV and JSON buttons", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });
    csvBtn.focus();
    
    await user.tab();
    const jsonBtn = screen.getByRole("button", { name: /export invoice data as json/i });
    expect(jsonBtn).toHaveFocus();
  });
});

describe("InvoiceDetailExport — Keyboard navigation", () => {
  it("Space activates CSV export", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });
    csvBtn.focus();
    await user.keyboard(" ");
    
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("Enter activates CSV export", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });
    csvBtn.focus();
    await user.keyboard("{Enter}");
    
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("Space activates JSON export", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    
    const jsonBtn = screen.getByRole("button", { name: /export invoice data as json/i });
    jsonBtn.focus();
    await user.keyboard(" ");
    
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("Enter activates JSON export", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    
    const jsonBtn = screen.getByRole("button", { name: /export invoice data as json/i });
    jsonBtn.focus();
    await user.keyboard("{Enter}");
    
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("disabled buttons do not respond to keyboard events", async () => {
    const user = userEvent.setup();
    render(<InvoiceDetailExport invoice={null} />);
    
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });
    csvBtn.focus();
    await user.keyboard(" ");
    
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("InvoiceDetailExport — Focus ring", () => {
  it("CSV button has focus ring styles", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    const csvBtn = screen.getByRole("button", { name: /export invoice data as csv/i });
    expect(csvBtn).toHaveClass("focus:ring-2");
    expect(csvBtn).toHaveClass("focus:ring-cyan-500");
  });

  it("JSON button has focus ring styles", () => {
    render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    const jsonBtn = screen.getByRole("button", { name: /export invoice data as json/i });
    expect(jsonBtn).toHaveClass("focus:ring-2");
    expect(jsonBtn).toHaveClass("focus:ring-cyan-500");
  });
});

describe("InvoiceDetailExport — axe violations", () => {
  it("has no axe violations when invoice is provided", async () => {
    const { container } = render(<InvoiceDetailExport invoice={SAMPLE_INVOICE} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations when invoice is null", async () => {
    const { container } = render(<InvoiceDetailExport invoice={null} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("InvoiceDetailExport — Edge cases", () => {
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
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    render(<InvoiceDetailExport invoice={null} />);
    fireEvent.click(screen.getByRole("button", { name: /export invoice data as csv/i }));

    expect(clickSpy).not.toHaveBeenCalled();
  });
});
