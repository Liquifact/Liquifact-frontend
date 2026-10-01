/**
 * Focused failure-recovery tests for app/invest/[id]/page.js (#1167).
 *
 * Covers success, rejection, boundary, partial-failure, and retry scenarios for
 * the deterministic `resolveInvoice` path and the page's reaction to it.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { notFound } from "next/navigation";

import InvoiceDetailPage, {
  resolveInvoice,
  InvoiceDetailResolveError,
  INVOICE_RESOLUTION,
  INVOICE_DETAIL_ERROR_CODE,
} from "./page";
import { copy } from "@/app/copy/en";
import { setReporter, resetReporter } from "@/lib/observability/reportError";
import { VALIDATION_REASONS } from "../validation";

jest.mock("../lib", () => ({
  getInvoiceById: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    const err = new Error("NEXT_NOT_FOUND");
    err.digest = "NEXT_NOT_FOUND";
    throw err;
  }),
}));

// Keep the server-component render light: the client islands are irrelevant to
// the failure-recovery contract under test.
jest.mock("./FundActions", () => ({
  __esModule: true,
  default: () => <div data-testid="fund-actions" />,
}));
jest.mock("./FocusManager", () => ({ __esModule: true, RouteFocus: () => null }));
jest.mock("./InvoiceDetailClient", () => ({ __esModule: true, default: () => null }));
jest.mock("./InvoiceDetailItems", () => ({
  __esModule: true,
  default: () => null,
  buildInvoiceDetailItems: () => [],
}));
jest.mock("./InvoiceDetailExport", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/NavMenu", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/StatusPill", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/InvoiceTimeline", () => ({ __esModule: true, default: () => null }));

const { getInvoiceById } = require("../lib");

const validInvoice = {
  id: "inv-001",
  issuer: "Acme Supplies Ltd",
  amount: "12,500",
  amountValue: 12500,
  currency: "USD",
  dueDate: "2026-06-15",
  yield: "8.2%",
  yieldValue: 8.2,
  status: "Open",
  events: [],
};

async function renderPage(id, searchParams = {}) {
  const ui = await InvoiceDetailPage({ params: { id }, searchParams });
  return render(ui);
}

describe("resolveInvoice", () => {
  it("returns the invoice for a valid id", () => {
    const result = resolveInvoice("inv-001", () => validInvoice);
    expect(result).toEqual({ status: INVOICE_RESOLUTION.OK, invoice: validInvoice });
  });

  it("returns not_found (identical reason) and never calls lookup for invalid ids", () => {
    const lookup = jest.fn();
    expect(resolveInvoice("../etc", lookup)).toEqual({
      status: INVOICE_RESOLUTION.NOT_FOUND,
      reason: VALIDATION_REASONS.INVALID_CHARSET,
    });
    expect(resolveInvoice(["a", "b"], lookup).reason).toBe(VALIDATION_REASONS.DUPLICATE_SEGMENT);
    expect(resolveInvoice("", lookup).reason).toBe(VALIDATION_REASONS.MISSING_ID);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("returns not_found when the lookup yields no record", () => {
    expect(resolveInvoice("missing", () => undefined)).toEqual({
      status: INVOICE_RESOLUTION.NOT_FOUND,
      reason: VALIDATION_REASONS.NOT_FOUND,
    });
  });

  it("returns a typed error and reports it when the lookup throws", () => {
    const reporter = jest.fn();
    setReporter(reporter);
    try {
      const result = resolveInvoice("inv-001", () => {
        throw new Error("connection string: postgres://user:hunter2@db");
      });
      expect(result).toEqual({
        status: INVOICE_RESOLUTION.ERROR,
        reason: VALIDATION_REASONS.LOOKUP_FAILED,
      });
      const [loggedError, context] = reporter.mock.calls[0];
      expect(loggedError.message).toBe("Invoice lookup failed");
      expect(JSON.stringify(context)).not.toContain("hunter2");
    } finally {
      resetReporter();
    }
  });

  it("returns a typed error and reports a malformed record", () => {
    const reporter = jest.fn();
    setReporter(reporter);
    try {
      const result = resolveInvoice("inv-001", () => ({ id: "inv-001" }));
      expect(result).toEqual({
        status: INVOICE_RESOLUTION.ERROR,
        reason: VALIDATION_REASONS.MALFORMED_RECORD,
      });
      expect(reporter).toHaveBeenCalledTimes(1);
      expect(reporter.mock.calls[0][1].reason).toBe(VALIDATION_REASONS.MALFORMED_RECORD);
    } finally {
      resetReporter();
    }
  });

  it("is idempotent: retries produce the same outcome and no partial state", () => {
    setReporter(jest.fn());
    try {
      const lookup = jest.fn(() => validInvoice);
      const first = resolveInvoice("inv-001", lookup);
      const second = resolveInvoice("inv-001", lookup);
      expect(second).toEqual(first);

      const failing = () => {
        throw new Error("boom");
      };
      const failFirst = resolveInvoice("inv-001", failing);
      const failSecond = resolveInvoice("inv-001", failing);
      expect(failSecond).toEqual(failFirst);
      expect(failSecond.status).toBe(INVOICE_RESOLUTION.ERROR);
    } finally {
      resetReporter();
    }
  });
});

describe("InvoiceDetailPage failure recovery", () => {
  let reporter;

  beforeEach(() => {
    reporter = jest.fn();
    setReporter(reporter);
    notFound.mockClear();
    getInvoiceById.mockReset();
  });

  afterEach(() => {
    resetReporter();
  });

  it("renders the invoice for a valid id", async () => {
    getInvoiceById.mockReturnValue(validInvoice);

    await renderPage("inv-001");

    expect(
      screen.getByRole("heading", { level: 1, name: copy.invest.detail.pageTitle })
    ).toBeInTheDocument();
    expect(screen.getByTestId("fund-actions")).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("calls notFound for an unknown id", async () => {
    getInvoiceById.mockReturnValue(undefined);

    await expect(renderPage("inv-404")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(reporter).not.toHaveBeenCalled();
  });

  it("calls notFound for an invalid id before touching the data layer", async () => {
    await expect(renderPage("../etc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(getInvoiceById).not.toHaveBeenCalled();
  });

  it("throws a safe typed error (never the raw message) when the lookup fails", async () => {
    getInvoiceById.mockImplementation(() => {
      throw new Error("secret db url");
    });

    let thrown;
    try {
      await renderPage("inv-001");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(InvoiceDetailResolveError);
    expect(thrown.code).toBe(INVOICE_DETAIL_ERROR_CODE);
    expect(thrown.message).toBe(copy.invest.detail.loadErrorMsg);
    expect(thrown.message).not.toContain("secret db url");
    expect(reporter).toHaveBeenCalledTimes(1);
  });

  it("fails deterministically for a malformed record", async () => {
    getInvoiceById.mockReturnValue({ id: "inv-001" });

    await expect(renderPage("inv-001")).rejects.toBeInstanceOf(InvoiceDetailResolveError);
    expect(notFound).not.toHaveBeenCalled();
    expect(reporter.mock.calls[0][1].reason).toBe(VALIDATION_REASONS.MALFORMED_RECORD);
  });
});
