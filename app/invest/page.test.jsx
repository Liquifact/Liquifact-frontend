import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import {
  getInvoiceLoadAnnouncement,
  InvestMarketplace,
} from "./page";

jest.mock("./exportUtils", () => ({
  exportToCSV: jest.fn(),
  exportToJSON: jest.fn(),
}));

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  return {
    __esModule: true,
    default: MockLink,
  };
});

function createDeferredLoader(invoices, delayMs = 0) {
  return jest.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(invoices), delayMs);
      }),
  );
}

function createPendingLoader() {
  return jest.fn(() => new Promise(() => {}));
}

async function flushTimers(delayMs = 0) {
  await act(async () => {
    jest.advanceTimersByTime(delayMs);
    await Promise.resolve();
  });
}

describe("InvestMarketplace", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("keeps the skeleton busy state while invoices are still loading", () => {
    render(<InvestMarketplace loadInvoices={createPendingLoader()} />);

    const skeleton = screen.getByRole("list", {
      name: /loading investable invoices/i,
    });

    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("announces the loaded invoice count exactly once after the list resolves", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme Supplies Ltd",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Open",
      },
      {
        id: "inv-002",
        issuer: "Bright Logistics GmbH",
        amount: "7,800",
        currency: "EUR",
        dueDate: "2026-07-01",
        yield: "7.5%",
        status: "Open",
      },
      {
        id: "inv-003",
        issuer: "Sunrise Exports Pte",
        amount: "22,000",
        currency: "USD",
        dueDate: "2026-05-30",
        yield: "9.1%",
        status: "Open",
      },
    ];

    const loadInvoices = createDeferredLoader(invoices, 100);
    const { rerender } = render(<InvestMarketplace loadInvoices={loadInvoices} />);

    expect(screen.getByRole("list", { name: /loading investable invoices/i })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    await flushTimers(100);

    expect(screen.getByRole("status")).toHaveTextContent(
      "3 investable invoices loaded",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(loadInvoices).toHaveBeenCalledTimes(1);

    rerender(<InvestMarketplace loadInvoices={loadInvoices} />);

    expect(loadInvoices).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "3 investable invoices loaded",
    );
  });

  it("announces the empty marketplace state when no invoices load", async () => {
    const loadInvoices = createDeferredLoader([], 100);

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    await flushTimers(100);

    expect(screen.getByRole("status")).toHaveTextContent(
      "No invoices available",
    );
    expect(
      screen.getByText(/No investable invoices\. Connect wallet to see the marketplace\./i),
    ).toBeInTheDocument();
  });

  it("announces load errors through an alert and live region", async () => {
    const loadInvoices = jest.fn(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("boom")), 50);
        }),
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    await flushTimers(50);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Unable to load investable invoices.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load investable invoices right now.",
    );
  });

  it("renders export buttons with correct labels after invoices load", async () => {
    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Open",
      },
    ];

    const loadInvoices = createDeferredLoader(invoices, 100);
    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    await flushTimers(100);

    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export json/i })).toBeInTheDocument();
  });

  it("disables export buttons while invoices are loading", () => {
    render(<InvestMarketplace loadInvoices={createPendingLoader()} />);

    expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export json/i })).toBeDisabled();
  });

  it("disables export buttons when no invoices are available", async () => {
    const loadInvoices = createDeferredLoader([], 100);
    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    await flushTimers(100);

    expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export json/i })).toBeDisabled();
  });

  it("calls exportToCSV with loaded invoices when CSV button is clicked", async () => {
    const { exportToCSV: csvMock } = require("./exportUtils");

    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Open",
      },
    ];

    const loadInvoices = createDeferredLoader(invoices, 100);
    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    await flushTimers(100);

    const csvButton = screen.getByRole("button", { name: /export csv/i });
    csvButton.click();

    expect(csvMock).toHaveBeenCalledWith(invoices);
  });

  it("calls exportToJSON with loaded invoices when JSON button is clicked", async () => {
    const { exportToJSON: jsonMock } = require("./exportUtils");

    const invoices = [
      {
        id: "inv-001",
        issuer: "Acme",
        amount: "12,500",
        currency: "USD",
        dueDate: "2026-06-15",
        yield: "8.2%",
        status: "Open",
      },
    ];

    const loadInvoices = createDeferredLoader(invoices, 100);
    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    await flushTimers(100);

    const jsonButton = screen.getByRole("button", { name: /export json/i });
    jsonButton.click();

    expect(jsonMock).toHaveBeenCalledWith(invoices);
  });
});

describe("getInvoiceLoadAnnouncement", () => {
  it("returns the expected announcement for loaded and empty states", () => {
    expect(getInvoiceLoadAnnouncement([])).toBe("No invoices available");
    expect(getInvoiceLoadAnnouncement([{ id: "1" }, { id: "2" }])).toBe(
      "2 investable invoices loaded",
    );
  });
});
