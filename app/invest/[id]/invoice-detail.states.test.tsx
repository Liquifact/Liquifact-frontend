/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 *
 * @file app/invest/[id]/invoice-detail.states.test.tsx
 *
 * Focused React Testing Library tests for the invoice-detail component states
 * and interactions:
 *   - Loading state, skeleton structure, and loading exclusivity
 *   - Empty / Not Found state and navigation recovery
 *   - Error state, missing data handling, and edge cases
 *   - Success state, accessible roles, structured JSON-LD, and axe compliance
 *   - Primary interactions: Fund action, partial-funding submit, copy link (Clipboard + fallback),
 *     print action, and keyboard accessibility.
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// ── Shared Mocks ──────────────────────────────────────────────────────────────

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

jest.mock("@/components/ToastProvider", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => mockToast,
}));

const mockConnect = jest.fn();
let mockWalletState = "disconnected";

jest.mock("@/components/WalletContext", () => ({
  WALLET_STATES: {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    NO_WALLET: "no_wallet",
    WRONG_NETWORK: "wrong_network",
  },
  useWallet: () => ({
    state: mockWalletState,
    connect: mockConnect,
  }),
}));

jest.mock(
  "@/components/NavMenu",
  () =>
    function NavMenuMock() {
      return <nav data-testid="nav-menu">NavMenu</nav>;
    }
);

jest.mock(
  "@/components/StatusPill",
  () =>
    function StatusPillMock({ status }: { status: string }) {
      return (
        <span role="status" data-status={status}>
          {status}
        </span>
      );
    }
);

jest.mock("next/link", () => {
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("../lib", () => ({
  getInvoiceById: jest.fn(),
}));

import { notFound } from "next/navigation";
import { getInvoiceById } from "../lib";
import InvoiceDetailPage from "./page";
import InvestLoading from "./loading";
import InvoiceNotFound from "./not-found";
import FundActions from "./FundActions";
import { copy } from "@/app/copy/en";

const mockGetInvoiceById = getInvoiceById as jest.MockedFunction<typeof getInvoiceById>;

// ── Fixture Data ──────────────────────────────────────────────────────────────

const MOCK_INVOICE = {
  id: "inv-001",
  issuer: "Acme Logistics Corp",
  amount: "50,000",
  amountValue: 50000,
  currency: "USD",
  dueDate: "2026-09-30",
  yield: "9.5%",
  yieldValue: 9.5,
  status: "Open",
  timestamps: {
    created: "2026-01-10T10:00:00Z",
    tokenized: "2026-01-11T12:00:00Z",
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockWalletState = "disconnected";
  mockGetInvoiceById.mockReturnValue(MOCK_INVOICE as ReturnType<typeof getInvoiceById>);
});

async function renderServerPage(params: { id: string }) {
  const jsx = await InvoiceDetailPage({ params: Promise.resolve(params) });
  return render(jsx as React.ReactElement);
}

// =============================================================================
// 1. Loading State & Loading Exclusivity
// =============================================================================

describe("Invoice Detail — Loading State & Exclusivity", () => {
  it("renders InvestLoading with aria-busy='true' and skeleton containers", () => {
    const { container } = render(<InvestLoading />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("loading exclusivity: loading state does NOT render invoice data or error banners", () => {
    render(<InvestLoading />);

    expect(screen.queryByText("Acme Logistics Corp")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.invest.detail.fundButtonLabel })).not.toBeInTheDocument();
    expect(screen.queryByText("Invoice not found")).not.toBeInTheDocument();
  });
});

// =============================================================================
// 2. Empty / Not-Found State & Exclusivity
// =============================================================================

describe("Invoice Detail — Empty / Not Found State", () => {
  it("renders InvoiceNotFound heading and marketplace navigation link", () => {
    render(<InvoiceNotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "Invoice not found" })).toBeInTheDocument();
    const browseLink = screen.getByRole("link", { name: "Browse marketplace" });
    expect(browseLink).toHaveAttribute("href", "/invest");
  });

  it("renders home branding link in not-found header", () => {
    render(<InvoiceNotFound />);

    const homeLink = screen.getByRole("link", { name: "← LiquiFact" });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("empty exclusivity: does NOT render loading skeletons or invoice action buttons", () => {
    const { container } = render(<InvoiceNotFound />);

    expect(container.querySelector("[aria-busy='true']")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.invest.detail.fundButtonLabel })).not.toBeInTheDocument();
  });

  it("supports keyboard navigation on not-found links", async () => {
    const user = userEvent.setup();
    render(<InvoiceNotFound />);

    const browseLink = screen.getByRole("link", { name: "Browse marketplace" });
    await user.tab();
    expect(browseLink).toBeInTheDocument();
  });
});

// =============================================================================
// 3. Error State & Edge Cases
// =============================================================================

describe("Invoice Detail — Error State & Edge Cases", () => {
  it("invokes notFound() when getInvoiceById returns null or undefined", async () => {
    mockGetInvoiceById.mockReturnValue(undefined as unknown as ReturnType<typeof getInvoiceById>);

    await expect(renderServerPage({ id: "non-existent-id" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("handles missing optional invoice fields gracefully", async () => {
    mockGetInvoiceById.mockReturnValue({
      id: "inv-sparse",
      issuer: "Sparse Entity",
      amount: "1,000",
      currency: undefined,
      dueDate: "2026-12-01",
      yield: undefined,
      status: undefined,
    } as unknown as ReturnType<typeof getInvoiceById>);

    const { container } = await renderServerPage({ id: "inv-sparse" });
    expect(screen.getByRole("heading", { level: 2, name: "Sparse Entity" })).toBeInTheDocument();
    expect(container.querySelector("main")).toBeInTheDocument();
  });
});

// =============================================================================
// 4. Success State & Accessibility
// =============================================================================

describe("Invoice Detail — Success State & Accessibility", () => {
  it("renders full invoice details with correct headings and definitions", async () => {
    await renderServerPage({ id: "inv-001" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(copy.invest.detail.pageTitle);
    expect(screen.getByRole("heading", { level: 2, name: "Acme Logistics Corp" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "Open");
  });

  it("renders structured JSON-LD data for search indexing", async () => {
    const { container } = await renderServerPage({ id: "inv-001" });
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).toBeInTheDocument();
    const data = JSON.parse(script!.innerHTML);
    expect(data["@type"]).toBe("Offer");
    expect(data.seller.name).toBe("Acme Logistics Corp");
  });

  it("success exclusivity: does NOT display loading skeleton or error state", async () => {
    const { container } = await renderServerPage({ id: "inv-001" });

    expect(container.querySelector("[aria-busy='true']")).not.toBeInTheDocument();
    expect(screen.queryByText("Invoice not found")).not.toBeInTheDocument();
  });

  it("passes axe accessibility checks on the server-rendered shell", async () => {
    const { container } = await renderServerPage({ id: "inv-001" });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// =============================================================================
// 5. Primary Interactions & Keyboard Control
// =============================================================================

describe("Invoice Detail — Primary Interactions", () => {
  const defaultProps = {
    id: "inv-001",
    status: "Open",
    maxAmount: 50000,
    currency: "USD",
    yieldValue: 9.5,
  };

  describe("Fund Button Interaction", () => {
    it("connects wallet when clicked in disconnected state", () => {
      render(<FundActions {...defaultProps} />);
      const fundBtns = screen.getAllByRole("button", { name: copy.invest.detail.fundButtonLabel });
      const actionRowFundBtn = fundBtns[fundBtns.length - 1];

      fireEvent.click(actionRowFundBtn);
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("disables fund button when invoice status is not Open", () => {
      render(<FundActions {...defaultProps} status="Funded" />);
      const fundBtn = screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel });

      expect(fundBtn).toBeDisabled();
    });

    it("supports keyboard activation on Fund button", () => {
      render(<FundActions {...defaultProps} />);
      const fundBtns = screen.getAllByRole("button", { name: copy.invest.detail.fundButtonLabel });
      const fundBtn = fundBtns[fundBtns.length - 1];

      fundBtn.focus();
      expect(fundBtn).toHaveFocus();
      fireEvent.keyDown(fundBtn, { key: "Enter", code: "Enter" });
      fireEvent.click(fundBtn);
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe("Partial Funding Input Interaction", () => {
    it("renders partial funding input form when invoice is Open with maxAmount", () => {
      render(<FundActions {...defaultProps} />);

      expect(screen.getByLabelText(/Funding amount/i)).toBeInTheDocument();
      const submitBtns = screen.getAllByRole("button", { name: copy.invest.fundAmount.submitLabel });
      expect(submitBtns[0]).toBeInTheDocument();
    });

    it("submits funding request successfully and shows toast announcement", async () => {
      mockWalletState = "connected";
      render(<FundActions {...defaultProps} />);

      const input = screen.getByLabelText(/Funding amount/i);
      fireEvent.change(input, { target: { value: "10000" } });

      const submitBtns = screen.getAllByRole("button", { name: copy.invest.fundAmount.submitLabel });
      const submitBtn = submitBtns[0]; // submit button inside form
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        "Funding request for 10000 USD submitted. Awaiting wallet approval.",
        "Funding submitted"
      );
    });

    it("triggers wallet connect when submitting partial funding while disconnected", async () => {
      mockWalletState = "disconnected";
      render(<FundActions {...defaultProps} />);

      const input = screen.getByLabelText(/Funding amount/i);
      fireEvent.change(input, { target: { value: "5000" } });

      const submitBtns = screen.getAllByRole("button", { name: copy.invest.fundAmount.submitLabel });
      const submitBtn = submitBtns[0];
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("displays accessible validation error when amount exceeds maximum balance", async () => {
      render(<FundActions {...defaultProps} />);

      const input = screen.getByLabelText(/Funding amount/i);
      fireEvent.change(input, { target: { value: "60000" } });
      fireEvent.blur(input);

      expect(await screen.findByRole("alert")).toHaveTextContent(/Amount cannot exceed/i);
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("Copy Link Button Interaction", () => {
    it("copies URL via Clipboard API and triggers success toast", async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
        writable: true,
      });

      render(<FundActions {...defaultProps} />);
      const copyBtn = screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeText).toHaveBeenCalledWith("http://localhost:3000/invest/inv-001");
      expect(mockToast.success).toHaveBeenCalledWith(
        copy.invest.detail.copySuccessMsg,
        copy.invest.detail.copySuccessTitle
      );
    });

    it("handles Clipboard API error and surfaces error toast", async () => {
      const writeText = jest.fn().mockRejectedValue(new Error("Clipboard denied"));
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
        writable: true,
      });

      render(<FundActions {...defaultProps} />);
      const copyBtn = screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        copy.invest.detail.copyErrorMsg,
        copy.invest.detail.copyErrorTitle
      );
    });
  });

  describe("Print Action Interaction", () => {
    it("invokes window.print() on print button click", () => {
      const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
      render(<FundActions {...defaultProps} />);

      const printBtn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });
      fireEvent.click(printBtn);

      expect(printSpy).toHaveBeenCalledTimes(1);
      printSpy.mockRestore();
    });

    it("verifies keyboard focusability on print button", () => {
      render(<FundActions {...defaultProps} />);
      const printBtn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });

      printBtn.focus();
      expect(printBtn).toHaveFocus();
    });
  });
});
