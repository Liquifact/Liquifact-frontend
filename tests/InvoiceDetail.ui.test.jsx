/**
 * Component tests for InvoiceDetail.
 *
 * Uses Vitest + @testing-library/react + jsdom.
 * Run with: npm run test:ui
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InvoiceDetail from "@/app/marketplace/[id]/InvoiceDetail";

const { apiMock } = vi.hoisted(() => {
  const apiMock = {
    getInvoice: vi.fn(),
    fundInvoice: vi.fn(),
    listInvoices: vi.fn(),
    getEscrowLive: vi.fn(),
  };
  return { apiMock };
});

vi.mock("@/lib/api", () => ({
  getInvoice: apiMock.getInvoice,
  fundInvoice: apiMock.fundInvoice,
  listInvoices: apiMock.listInvoices,
  getEscrowLive: apiMock.getEscrowLive,
}));

const { seoMock, navMock } = vi.hoisted(() => ({
  seoMock: { getInvoiceForPage: vi.fn() },
  navMock: { notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) },
}));
vi.mock("@/lib/invoiceSeoData", () => seoMock);
vi.mock("next/navigation", () => navMock);

// Isolate escrow resolution from the other on-chain panels on the page (no network in tests).
vi.mock("@/components/NotificationsProvider", () => ({
  useNotifications: () => ({ follow: vi.fn(), unfollow: vi.fn(), isFollowing: () => false }),
}));
vi.mock("@/components/escrow/TokenCheck", () => ({
  default: () => null,
  useFundingTokenCheck: () => ({ loading: false, ok: true, reason: "match" }),
}));
vi.mock("@/lib/escrow/constraints", async (original) => ({ ...(await original()), loadConstraints: vi.fn(() => new Promise(() => {})) }));
vi.mock("@/components/wallet/BalanceHint", () => ({ default: () => null }));
vi.mock("@/components/escrow/FundersTable", () => ({ default: () => null }));
vi.mock("@/components/invest/ExitPanel", () => ({ default: () => null }));
vi.mock("@/app/marketplace/[id]/ActivityFeed", () => ({ default: () => null }));
vi.mock("@/components/sme/SmeActionsCard", () => ({ default: () => null }));

// Mock next/link to render simple <a> tag
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const VALID_CONTRACT = "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P";
const ALT_CONTRACT = "CA3D5KRYMCMUZKMAQTCZZRM5RUMSSS6RIYRHQD2ELHSH4ENCQA6KZ7PW";

describe("InvoiceDetail escrow resolution and ContractCard integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    apiMock.listInvoices.mockResolvedValue({ data: [] });
  });

  it("renders ContractCard when invoice is on-chain and resolves via registry", async () => {
    apiMock.getInvoice.mockResolvedValueOnce({
      data: {
        id: "INV_0001",
        sme: "Acme Components Ltd",
        debtor: "Globex Retail",
        amount: 100,
        currency: "XLM",
        fundedAmount: 0,
        yieldBps: 800,
        dueDate: "2027-01-17",
        status: "open",
        onChain: true,
      },
    });

    render(<InvoiceDetail id="INV_0001" />);

    await waitFor(() => {
      expect(screen.getByText("Acme Components Ltd")).toBeInTheDocument();
    });

    // ContractCard is rendered with the default registered contract
    expect(screen.getByText(VALID_CONTRACT)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view on stellar\.expert/i })).toBeInTheDocument();

    // Warning notice must not be shown
    expect(
      screen.queryByText(/on-chain contract not registered for this invoice/i)
    ).not.toBeInTheDocument();
  });

  it("renders ContractCard when invoice carries an explicit valid contractId", async () => {
    apiMock.getInvoice.mockResolvedValueOnce({
      data: {
        id: "INV_0099",
        sme: "Custom Escrow Corp",
        debtor: "Globex Retail",
        amount: 500,
        currency: "USDC",
        fundedAmount: 100,
        yieldBps: 700,
        dueDate: "2027-02-01",
        status: "open",
        onChain: true,
        contractId: ALT_CONTRACT,
      },
    });

    render(<InvoiceDetail id="INV_0099" />);

    await waitFor(() => {
      expect(screen.getByText("Custom Escrow Corp")).toBeInTheDocument();
    });

    expect(screen.getByText(ALT_CONTRACT)).toBeInTheDocument();
    expect(
      screen.queryByText(/on-chain contract not registered for this invoice/i)
    ).not.toBeInTheDocument();
  });

  it("shows warning notice when on-chain invoice has no resolvable contract", async () => {
    // onChain is true, but invoice id is not registered and has no contractId
    apiMock.getInvoice.mockResolvedValueOnce({
      data: {
        id: "INV_UNREGISTERED",
        sme: "Unregistered Invoice Ltd",
        debtor: "Initech Wholesale",
        amount: 1000,
        currency: "USDC",
        fundedAmount: 0,
        yieldBps: 600,
        dueDate: "2027-03-01",
        status: "open",
        onChain: true,
      },
    });

    render(<InvoiceDetail id="INV_UNREGISTERED" />);

    await waitFor(() => {
      expect(screen.getByText("Unregistered Invoice Ltd")).toBeInTheDocument();
    });

    // Warning notice must be displayed
    const warning = screen.getByRole("alert");
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent("On-chain contract not registered for this invoice");

    // ContractCard must NOT be rendered
    expect(
      screen.queryByRole("link", { name: /view on stellar\.expert/i })
    ).not.toBeInTheDocument();
  });

  it("shows warning notice when on-chain invoice has an invalid contractId", async () => {
    apiMock.getInvoice.mockResolvedValueOnce({
      data: {
        id: "INV_0001", // even though INV_0001 is in registry, explicit invalid contractId rejects
        sme: "Tampered Escrow Ltd",
        debtor: "Initech Wholesale",
        amount: 1000,
        currency: "USDC",
        fundedAmount: 0,
        yieldBps: 600,
        dueDate: "2027-03-01",
        status: "open",
        onChain: true,
        contractId: "invalid-contract-id",
      },
    });

    render(<InvoiceDetail id="INV_0001" />);

    await waitFor(() => {
      expect(screen.getByText("Tampered Escrow Ltd")).toBeInTheDocument();
    });

    // Warning notice must be displayed
    const warning = screen.getByRole("alert");
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent("On-chain contract not registered for this invoice");

    // ContractCard must NOT be rendered
    expect(
      screen.queryByRole("link", { name: /view on stellar\.expert/i })
    ).not.toBeInTheDocument();
  });

  it("does not render ContractCard or warning notice for off-chain invoices", async () => {
    apiMock.getInvoice.mockResolvedValueOnce({
      data: {
        id: "INV_0002",
        sme: "Northwind Textiles",
        debtor: "Initech Wholesale",
        amount: 25000,
        currency: "USDC",
        fundedAmount: 18000,
        yieldBps: 650,
        dueDate: "2026-12-30",
        status: "open",
        onChain: false,
      },
    });

    render(<InvoiceDetail id="INV_0002" />);

    await waitFor(() => {
      expect(screen.getByText("Northwind Textiles")).toBeInTheDocument();
    });

    // Neither ContractCard nor warning notice should be rendered
    expect(
      screen.queryByText(/deployed escrow contract/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/on-chain contract not registered for this invoice/i)
    ).not.toBeInTheDocument();
  });
});

const SERVER_INVOICE = {
  id: "INV_0002",
  sme: "Northwind Textiles",
  debtor: "Initech Wholesale",
  amount: 25000,
  currency: "USDC",
  fundedAmount: 18000,
  yieldBps: 650,
  dueDate: "2026-12-30",
  status: "open",
  onChain: false,
};

describe("InvoiceDetail server prefetch (#1522)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.listInvoices.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it("first render uses initialInvoice without a network call", () => {
    // Record whether the server data was already on screen when any request started.
    const renderedBeforeRequest = [];
    const seen = () => renderedBeforeRequest.push(document.body.textContent.includes("Northwind Textiles"));
    apiMock.getInvoice.mockImplementation(() => {
      seen();
      return new Promise(() => {});
    });
    apiMock.listInvoices.mockImplementation(() => {
      seen();
      return new Promise(() => {});
    });

    const { container } = render(<InvoiceDetail id="INV_0002" initialInvoice={SERVER_INVOICE} />);

    // Content is there synchronously: no skeleton and nothing awaited.
    expect(screen.getByRole("heading", { level: 1, name: "Northwind Textiles" })).toBeInTheDocument();
    expect(container.querySelector(".skeleton")).toBeNull();
    // Revalidation only starts after the server data has been committed.
    expect(renderedBeforeRequest.length).toBeGreaterThan(0);
    expect(renderedBeforeRequest.every(Boolean)).toBe(true);
  });

  it("revalidates after mount and shows fresher data", async () => {
    apiMock.getInvoice.mockResolvedValueOnce({ data: { ...SERVER_INVOICE, sme: "Northwind Textiles Group" }, offline: false });

    render(<InvoiceDetail id="INV_0002" initialInvoice={SERVER_INVOICE} />);

    expect(screen.getByText("Northwind Textiles")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Northwind Textiles Group")).toBeInTheDocument());
    expect(apiMock.getInvoice).toHaveBeenCalledTimes(1);
    expect(apiMock.getInvoice).toHaveBeenCalledWith("INV_0002");
  });

  it("keeps server data when background revalidation falls back offline", async () => {
    apiMock.getInvoice.mockResolvedValueOnce({ data: { ...SERVER_INVOICE, sme: "Demo Fallback Ltd" }, offline: true });

    render(<InvoiceDetail id="INV_0002" initialInvoice={SERVER_INVOICE} />);

    await waitFor(() => expect(screen.getByText(/funding is unavailable while the api is unreachable/i)).toBeInTheDocument());
    expect(screen.getByText("Northwind Textiles")).toBeInTheDocument();
    expect(screen.queryByText("Demo Fallback Ltd")).not.toBeInTheDocument();
  });

  it("applies new initial data after a router refresh", async () => {
    apiMock.getInvoice.mockReturnValue(new Promise(() => {}));

    const { rerender } = render(<InvoiceDetail id="INV_0002" initialInvoice={SERVER_INVOICE} />);
    rerender(<InvoiceDetail id="INV_0002" initialInvoice={{ ...SERVER_INVOICE, sme: "Refreshed Textiles" }} />);

    await waitFor(() => expect(screen.getByText("Refreshed Textiles")).toBeInTheDocument());
  });

  it("still loads on the client when no initial data is passed", async () => {
    apiMock.getInvoice.mockResolvedValueOnce({ data: SERVER_INVOICE, offline: false });

    const { container } = render(<InvoiceDetail id="INV_0002" />);

    expect(container.querySelector(".skeleton")).not.toBeNull();
    await waitFor(() => expect(screen.getByText("Northwind Textiles")).toBeInTheDocument());
  });
});

describe("marketplace/[id] server page (#1522)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the prefetched invoice to InvoiceDetail and shares the loader with metadata", async () => {
    const { default: InvoicePage, generateMetadata } = await import("@/app/marketplace/[id]/page.js");
    seoMock.getInvoiceForPage.mockResolvedValue(SERVER_INVOICE);
    const params = Promise.resolve({ id: "INV_0002" });

    const meta = await generateMetadata({ params });
    const tree = await InvoicePage({ params });

    expect(meta.title).toMatch(/INV_0002/);
    expect(seoMock.getInvoiceForPage).toHaveBeenCalledTimes(2);
    expect(seoMock.getInvoiceForPage).toHaveBeenNthCalledWith(1, "INV_0002");
    expect(seoMock.getInvoiceForPage).toHaveBeenNthCalledWith(2, "INV_0002");
    const detail = tree.props.children.find((child) => child?.type === InvoiceDetail);
    expect(detail.props).toMatchObject({ id: "INV_0002", initialInvoice: SERVER_INVOICE });
  });

  it("renders the not-found page for missing or cancelled invoices", async () => {
    const { default: InvoicePage } = await import("@/app/marketplace/[id]/page.js");
    seoMock.getInvoiceForPage.mockResolvedValue(null);

    await expect(InvoicePage({ params: Promise.resolve({ id: "INV_GONE" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navMock.notFound).toHaveBeenCalledTimes(1);
  });
});
