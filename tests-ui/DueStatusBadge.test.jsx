import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import InvoiceCard from "../components/InvoiceCard";
import DueStatusBadge from "../components/invoice/DueStatusBadge";
import { I18nProvider } from "../lib/i18n/I18nProvider";
import en from "../lib/i18n/dictionaries/en.js";
import es from "../lib/i18n/dictionaries/es.js";

const base = {
  id: "INV_9001", sme: "Acme", debtor: "Globex", amount: 10000, currency: "USDC",
  fundedAmount: 2000, yieldBps: 650, status: "open", onChain: false,
};
const NOW = Date.parse("2026-12-01T12:00:00Z");

describe("due-date countdown badge (#1504)", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("shows an overdue badge with text and icon on the invoice card", () => {
    render(<I18nProvider locale="en" dict={en}><InvoiceCard invoice={{ ...base, dueDate: "2026-11-28" }} /></I18nProvider>);
    const badge = screen.getByText("Overdue by 3 days");
    expect(badge.dataset.dueStatus).toBe("overdue");
    expect(badge.querySelector(".badge-icon").getAttribute("aria-hidden")).toBe("true");
    expect(badge.querySelector(".badge-icon").textContent).not.toBe("");
  });

  it("uses singular, 'today' and days-left wording", () => {
    const { rerender } = render(<I18nProvider locale="en" dict={en}><DueStatusBadge invoice={{ ...base, dueDate: "2026-12-02" }} /></I18nProvider>);
    expect(screen.getByText("Due in 1 day")).toBeTruthy();
    rerender(<I18nProvider locale="en" dict={en}><DueStatusBadge invoice={{ ...base, dueDate: "2026-12-01" }} /></I18nProvider>);
    expect(screen.getByText("Due today")).toBeTruthy();
    rerender(<I18nProvider locale="en" dict={en}><DueStatusBadge invoice={{ ...base, dueDate: "2027-01-01" }} /></I18nProvider>);
    expect(screen.getByText("31 days left")).toBeTruthy();
  });

  it("translates to Spanish", () => {
    render(<I18nProvider locale="es" dict={es}><DueStatusBadge invoice={{ ...base, dueDate: "2026-11-30" }} /></I18nProvider>);
    expect(screen.getByText("Vencida hace 1 día")).toBeTruthy();
  });

  it("renders no countdown for closed invoices", () => {
    const { container } = render(<InvoiceCard invoice={{ ...base, status: "settled", dueDate: "2026-11-01" }} />);
    expect(container.querySelector("[data-due-status]")).toBeNull();
  });
});
