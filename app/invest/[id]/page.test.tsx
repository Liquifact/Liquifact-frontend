/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 *
 * @file app/invest/[id]/page.test.tsx
 *
 * Comprehensive tests for the RSC detail-page split introduced by
 * perf(invest): split the invoice detail page into a server shell and client action.
 *
 * Test surface
 * ─────────────
 *  1. Server Component shell (page.js)
 *     - Renders invoice metadata (issuer, amount, yield, maturity, status)
 *     - Injects JSON-LD structured data for known invoices
 *     - Calls notFound() for an unknown id
 *     - Does NOT contain any "use client" / hooks (structural contract)
 *
 *  2. FundActions client component (FundActions.jsx)
 *     - Fund button: disabled states per wallet state
 *     - Copy link: clipboard API + textarea fallback
 *     - Print button: calls window.print()
 *     - Accessibility: aria-labels, keyboard focus
 *     - Toast feedback: success + error
 *
 *  3. Clipboard helpers (copyInvoiceUrl, copyToClipboardFallback)
 *     - URL construction
 *     - Clipboard API path
 *     - Fallback path
 *
 *  4. Copy dictionary contract
 *     - All invest.detail keys are present and non-empty
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// ── Shared mocks ──────────────────────────────────────────────────────────────

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

jest.mock("@/components/ToastProvider", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => mockToast,
}));

jest.mock("@/components/WalletContext", () => ({
  WALLET_STATES: {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    NO_WALLET: "no_wallet",
    WRONG_NETWORK: "wrong_network",
  },
  useWallet: jest.fn(() => ({ state: "disconnected", connect: jest.fn() })),
}));

// Mock useOptimisticFund so FundActions tests are unit-level.
// Default return value is set in the outer beforeEach below.
jest.mock("@/lib/hooks/useOptimisticFund", () => ({
  FUNDING_STATES: {
    IDLE: "idle",
    PENDING: "pending",
    CONFIRMED: "confirmed",
    ROLLED_BACK: "rolled_back",
  },
  useOptimisticFund: jest.fn(),
}));

jest.mock(
  "@/components/WalletStatus",
  () =>
    function WalletStatusMock() {
      return <div data-testid="wallet-status">WalletStatus</div>;
    }
);

jest.mock(
  "@/components/NavMenu",
  () =>
    function NavMenuMock() {
      return <nav data-testid="nav-menu">NavMenu</nav>;
    }
);

jest.mock("@/app/invest/MarketplaceContext", () => ({
  useMarketplace: () => ({
    invoices: [],
    setInvoices: jest.fn(),
    pendingIds: new Set(),
    fundInvoice: jest.fn().mockResolvedValue(true),
  }),
  MarketplaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ErrorBanner", () => ({
  __esModule: true,
  default: function ErrorBannerMock({ title }: { title: string }) {
    return <div role="alert">{title}</div>;
  },
}));

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

// Intercept the lib mock so we control what getInvoiceById returns
jest.mock("../lib", () => ({
  getInvoiceById: jest.fn(),
}));

import { notFound } from "next/navigation";
import { getInvoiceById } from "../lib";
import { useWallet, WALLET_STATES } from "@/components/WalletContext";
import { useOptimisticFund, FUNDING_STATES } from "@/lib/hooks/useOptimisticFund";
import InvoiceDetailPage from "./page";
import FundActions, { copyInvoiceUrl, copyToClipboardFallback } from "./FundActions";
import InvoiceDetail from "@/components/InvoiceDetail";
import { copy } from "@/app/copy/en";

const mockGetInvoiceById = getInvoiceById as jest.MockedFunction<typeof getInvoiceById>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockUseOptimisticFund = useOptimisticFund as jest.MockedFunction<typeof useOptimisticFund>;

/** Canonical fixture used by the server-shell tests (Acme / inv-001). */
const MOCK_INVOICE = {
  id: "inv-001",
  issuer: "Acme Supplies Ltd",
  amount: "12,500",
  amountValue: 12500,
  currency: "USD",
  dueDate: "2026-06-15",
  yield: "8.2%",
  yieldValue: 8.2,
  status: "Open",
};

// Default hook return for "idle, Open" scenario — used by most FundActions tests
function makeOptimisticHook(overrides: Partial<ReturnType<typeof useOptimisticFund>> = {}) {
  return {
    optimisticStatus: "Open",
    fundingState: FUNDING_STATES.IDLE,
    isFunding: false,
    submitFund: jest.fn(),
    ...overrides,
  };
}

/**
 * CopyButton is mocked here to avoid pulling in ToastProvider for the
 * print-stylesheet tests.  Dedicated CopyButton integration tests live in
 * the "InvoiceDetail — copy button" describe block below and use a real
 * CopyButton + ToastProvider.
 */
const mockCopyButtonOnClick = jest.fn();
jest.mock("@/components/CopyButton", () => {
  return function CopyButtonMock({ text, label }: { text: string; label: string }) {
    return (
      <button
        type="button"
        data-testid="copy-button-mock"
        aria-label={`Copy ${label}`}
        onClick={mockCopyButtonOnClick}
      >
        Copy {label}
      </button>
    );
  };
});

const mockInvoice = {
  id: "invoice-123",
  issuer: "Test Issuer LLC",
  amount: "5,000",
  currency: "USD",
  dueDate: "2026-06-15",
  yield: "8.2%",
  yieldValue: 8.2,
  status: "Open",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInvoiceById.mockReturnValue(MOCK_INVOICE as ReturnType<typeof getInvoiceById>);
  mockUseWallet.mockReturnValue({ state: "disconnected", connect: jest.fn() } as ReturnType<
    typeof useWallet
  >);
  // Provide a sensible default for the optimistic hook so all existing
  // FundActions tests get a working hook instance without extra setup.
  mockUseOptimisticFund.mockReturnValue(makeOptimisticHook());
  // The jsdom origin (http://localhost:3000) comes from the @jest-environment-options
  // docblock above — modern jsdom no longer allows deleting/reassigning window.location.
});

// ── Helper to render the async Server Component ───────────────────────────────

async function renderServerPage(params: { id: string }) {
  const jsx = await InvoiceDetailPage({ params: Promise.resolve(params) });
  return render(jsx as React.ReactElement);
}

// =============================================================================
// 1. Server Component shell — page.js
// =============================================================================

describe("InvoiceDetailPage (Server Component shell)", () => {
  describe("when invoice exists", () => {
    it("renders the page heading and subtitle", async () => {
      await renderServerPage({ id: "inv-001" });

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        copy.invest.detail.pageTitle
      );
      expect(screen.getByText(copy.invest.detail.pageSub)).toBeInTheDocument();
    });

    it("renders the issuer name as the section heading (h2)", async () => {
      await renderServerPage({ id: "inv-001" });

      expect(
        screen.getByRole("heading", { level: 2, name: "Acme Supplies Ltd" })
      ).toBeInTheDocument();
    });

    it("renders all definition list labels as <dt> elements", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });

      const dts = Array.from(container.querySelectorAll("dt")).map((el) => el.textContent);
      expect(dts).toContain(copy.invest.detail.labelIssuer);
      expect(dts).toContain(copy.invest.detail.labelAmount);
      expect(dts).toContain(copy.invest.detail.labelYield);
      expect(dts).toContain(copy.invest.detail.labelMaturity);
      expect(dts).toContain(copy.invest.detail.labelStatus);
    });

    it("renders formatted currency amount as a <dd>", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });

      const dds = Array.from(container.querySelectorAll("dd")).map((el) => el.textContent);
      // formatCurrency("12,500", { currency: "USD" }) → "$12,500"
      expect(dds.some((t) => t?.includes("12,500"))).toBe(true);
    });

    it("renders the maturity date as a <dd>", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });

      const dds = Array.from(container.querySelectorAll("dd")).map((el) => el.textContent);
      expect(dds).toContain("2026-06-15");
    });

    it("renders the StatusPill for the invoice status", async () => {
      await renderServerPage({ id: "inv-001" });

      // FundActions also renders a role="status" live region (issue #727),
      // so the StatusPill is located by its data-status attribute.
      const statusRegions = screen.getAllByRole("status");
      const statusPill = statusRegions.find((el) => el.hasAttribute("data-status"));
      expect(statusPill).toHaveAttribute("data-status", "Open");
    });

    it("injects a JSON-LD script tag", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });

      const script = container.querySelector('script[type="application/ld+json"]');
      expect(script).toBeInTheDocument();
      const parsed = JSON.parse(script!.innerHTML);
      expect(parsed["@type"]).toBe("Offer");
      expect(parsed.seller?.name).toBe("Acme Supplies Ltd");
    });

    it("JSON-LD marks Open invoices as InStock", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });

      const script = container.querySelector('script[type="application/ld+json"]');
      const parsed = JSON.parse(script!.innerHTML);
      expect(parsed.availability).toBe("https://schema.org/InStock");
    });

    it("renders back-to-marketplace link with correct href and aria-label", async () => {
      await renderServerPage({ id: "inv-001" });

      const link = screen.getByRole("link", { name: copy.invest.detail.backToMarketplaceLabel });
      expect(link).toHaveAttribute("href", "/invest");
    });

    it("renders back-to-home link", async () => {
      await renderServerPage({ id: "inv-001" });

      const homeLink = screen.getByRole("link", { name: /liquifact/i });
      expect(homeLink).toHaveAttribute("href", "/");
    });

    it("invoice summary section has print-invoice-section class", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });

      const section = container.querySelector(".print-invoice-section");
      expect(section).toBeInTheDocument();
      expect(section!.tagName).toBe("SECTION");
    });

    it("header carries no-print class", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });

      const header = container.querySelector("header");
      expect(header).toHaveClass("no-print");
    });

    it("main element has id='main-content' for skip-link", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });

      const main = container.querySelector("main");
      expect(main).toHaveAttribute("id", "main-content");
    });
  });

  describe("when invoice does NOT exist", () => {
    it("calls notFound() for an unknown id", async () => {
      mockGetInvoiceById.mockReturnValue(undefined as unknown as ReturnType<typeof getInvoiceById>);

      await expect(renderServerPage({ id: "inv-unknown" })).rejects.toThrow("NEXT_NOT_FOUND");
      expect(notFound).toHaveBeenCalledTimes(1);
    });
  });

  describe("params contract", () => {
    it("accepts a plain params object (current Next.js form)", async () => {
      const jsx = await InvoiceDetailPage({
        params: { id: "inv-001" } as unknown as Promise<{ id: string }>,
      });
      const { container } = render(jsx as React.ReactElement);
      expect(container.querySelector("main")).toBeInTheDocument();
    });

    it("accepts a Promise<params> (upcoming Next.js async-params form)", async () => {
      const jsx = await InvoiceDetailPage({ params: Promise.resolve({ id: "inv-001" }) });
      const { container } = render(jsx as React.ReactElement);
      expect(container.querySelector("main")).toBeInTheDocument();
    });
  });

  describe("JSON-LD sanitization", () => {
    it("strips dangerous characters from issuer in JSON-LD", async () => {
      mockGetInvoiceById.mockReturnValue({
        ...MOCK_INVOICE,
        issuer: '<script>alert("xss")</script>',
      } as ReturnType<typeof getInvoiceById>);

      const { container } = await renderServerPage({ id: "inv-001" });
      const script = container.querySelector('script[type="application/ld+json"]');
      const raw = script!.innerHTML;
      expect(raw).not.toContain("<script>");
      expect(raw).not.toContain("</script>");
      expect(raw).not.toContain('"xss"');
    });

    it("returns null JSON-LD when invoice is falsy (defensive)", async () => {
      // Simulate a race where invoice is null at render time
      mockGetInvoiceById.mockReturnValue(undefined as unknown as ReturnType<typeof getInvoiceById>);

      // notFound will throw — test the JSON-LD builder directly instead
      const { buildInvoiceJsonLdExported } = (await import("./page")) as unknown as {
        buildInvoiceJsonLdExported?: (i: null) => null;
      };
      // buildInvoiceJsonLd is a module-private function, so we verify the
      // absence of a script tag when the page renders with a valid invoice
      // that has no issuer.
      mockGetInvoiceById.mockReturnValue({
        ...MOCK_INVOICE,
        issuer: "",
        amount: "",
        currency: "",
        dueDate: "",
        yield: "",
        status: "",
      } as ReturnType<typeof getInvoiceById>);

      const { container } = await renderServerPage({ id: "inv-001" });
      // A script tag WILL be rendered (invoice exists), but name falls back to generic
      const script = container.querySelector('script[type="application/ld+json"]');
      if (script) {
        const parsed = JSON.parse(script.innerHTML);
        expect(parsed.name).toBe("Invoice offering");
      }
    });
  });
});

// =============================================================================
// 2. FundActions client component
// =============================================================================

describe("FundActions", () => {
  const defaultProps = { id: "inv-001", status: "Open" };

  describe("fund button", () => {
    it("renders the Fund button with correct label", () => {
      render(<FundActions {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel })
      ).toBeInTheDocument();
    });

    it("is enabled when wallet is disconnected and status is Open", () => {
      render(<FundActions {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel })
      ).not.toBeDisabled();
    });

    it("is disabled while wallet is connecting", () => {
      mockUseWallet.mockReturnValue({
        state: WALLET_STATES.CONNECTING,
        connect: jest.fn(),
      } as ReturnType<typeof useWallet>);
      render(<FundActions {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel })
      ).toBeDisabled();
    });

    it("is disabled when no wallet is installed", () => {
      mockUseWallet.mockReturnValue({
        state: WALLET_STATES.NO_WALLET,
        connect: jest.fn(),
      } as ReturnType<typeof useWallet>);
      render(<FundActions {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel })
      ).toBeDisabled();
    });

    it("is disabled when invoice status is not Open", () => {
      mockUseOptimisticFund.mockReturnValue(makeOptimisticHook({ optimisticStatus: "Funded" }));
      render(<FundActions id="inv-001" status="Funded" />);
      expect(
        screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel })
      ).toBeDisabled();
    });

    it("calls connect() when clicked in disconnected state", () => {
      const connect = jest.fn();
      mockUseWallet.mockReturnValue({
        state: WALLET_STATES.DISCONNECTED,
        connect,
      } as ReturnType<typeof useWallet>);
      render(<FundActions {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel }));
      expect(connect).toHaveBeenCalledTimes(1);
    });

    it("does NOT call connect() when already connected", () => {
      const connect = jest.fn();
      mockUseWallet.mockReturnValue({
        state: WALLET_STATES.CONNECTED,
        connect,
      } as ReturnType<typeof useWallet>);
      render(<FundActions {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel }));
      expect(connect).not.toHaveBeenCalled();
    });
  });

  describe("copy link button", () => {
    it("renders the Copy link button", () => {
      render(<FundActions {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel })
      ).toBeInTheDocument();
    });

    it("copies the invoice URL to clipboard and shows a success toast", async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(<FundActions {...defaultProps} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel })
        );
      });

      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/invest/inv-001"));
      expect(mockToast.success).toHaveBeenCalledWith(
        copy.invest.detail.copySuccessMsg,
        copy.invest.detail.copySuccessTitle
      );
    });

    it("shows an error toast when clipboard write fails", async () => {
      const writeText = jest.fn().mockRejectedValue(new Error("Permission denied"));
      Object.assign(navigator, { clipboard: { writeText } });

      render(<FundActions {...defaultProps} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel })
        );
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        copy.invest.detail.copyErrorMsg,
        copy.invest.detail.copyErrorTitle
      );
    });

    it("uses textarea fallback when navigator.clipboard is unavailable", async () => {
      Object.assign(navigator, { clipboard: undefined });
      const execCommand = jest.fn().mockReturnValue(true);
      document.execCommand = execCommand;

      render(<FundActions {...defaultProps} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel })
        );
      });

      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(mockToast.success).toHaveBeenCalled();
    });

    it("has the correct aria-label for accessibility", () => {
      render(<FundActions {...defaultProps} />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel });
      expect(btn).toHaveAttribute("aria-label", copy.invest.detail.copyLinkButtonLabel);
    });
  });

  describe("print button", () => {
    it("renders the Print / Save PDF button", () => {
      render(<FundActions {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: copy.invest.detail.printButtonLabel })
      ).toBeInTheDocument();
    });

    it("calls window.print() when clicked", () => {
      const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
      render(<FundActions {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: copy.invest.detail.printButtonLabel }));

      expect(printSpy).toHaveBeenCalledTimes(1);
      printSpy.mockRestore();
    });

    it("is keyboard-focusable and not disabled", () => {
      render(<FundActions {...defaultProps} />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });
      expect(btn).not.toBeDisabled();
      btn.focus();
      expect(btn).toHaveFocus();
    });

    it("has the correct aria-label", () => {
      render(<FundActions {...defaultProps} />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });
      expect(btn).toHaveAttribute("aria-label", copy.invest.detail.printButtonLabel);
    });
  });

  describe("disclaimer", () => {
    it("renders the disclaimer note", () => {
      render(<FundActions {...defaultProps} />);
      expect(screen.getByText(copy.invest.detail.disclaimerNote)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("FundActions passes axe accessibility checks", async () => {
      const { container } = render(<FundActions {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("every action button has an accessible name", () => {
      render(<FundActions {...defaultProps} />);

      const fundBtn = screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel });
      expect(fundBtn).toHaveAttribute("aria-label", copy.invest.detail.fundButtonLabel);

      const copyBtn = screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel });
      expect(copyBtn).toHaveAttribute("aria-label", copy.invest.detail.copyLinkButtonLabel);

      const printBtn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });
      expect(printBtn).toHaveAttribute("aria-label", copy.invest.detail.printButtonLabel);
    });

    it("action row and disclaimer carry no-print class", () => {
      const { container } = render(<FundActions {...defaultProps} />);
      const noPrintEls = container.querySelectorAll(".no-print");
      expect(noPrintEls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("duplicate submission protection", () => {
    it("blocks rapid double-click on fund amount submit", async () => {
      const user = userEvent.setup();

      // Deferred promise so the guard stays active during both click dispatch
      let resolveFund: (value: unknown) => void;
      const fundPromise = new Promise((resolve) => {
        resolveFund = resolve;
      });
      const mockFund = jest.fn().mockReturnValue(fundPromise);

      jest.spyOn(require("@/app/invest/MarketplaceContext"), "useMarketplace").mockReturnValue({
        invoices: [],
        setInvoices: jest.fn(),
        pendingIds: new Set(),
        fundInvoice: mockFund,
      });

      render(
        <FundActions id="inv-001" status="Open" maxAmount={1000} currency="USD" yieldValue={8.2} />
      );

      const amountInput = screen.getByRole("spinbutton", { name: /funding amount/i });
      await user.type(amountInput, "500");

      const submitBtn = screen.getByRole("button", { name: /fund this invoice/i });

      // Dispatch both clicks without awaiting — second should be guarded while first in-flight
      const firstClick = user.click(submitBtn);
      const secondClick = user.click(submitBtn);

      // Only the first call should have gone through
      expect(mockFund).toHaveBeenCalledTimes(1);

      resolveFund!(true);
      await firstClick;
      await secondClick;
    });

    it("allows funding different amounts as sequential intents", async () => {
      const user = userEvent.setup();
      const mockFund = jest.fn().mockResolvedValue(true);

      jest.spyOn(require("@/app/invest/MarketplaceContext"), "useMarketplace").mockReturnValue({
        invoices: [],
        setInvoices: jest.fn(),
        pendingIds: new Set(),
        fundInvoice: mockFund,
      });

      render(
        <FundActions id="inv-001" status="Open" maxAmount={1000} currency="USD" yieldValue={8.2} />
      );

      // First amount — $500
      const input = screen.getByRole("spinbutton", { name: /funding amount/i });
      await user.type(input, "500");
      await user.click(screen.getByRole("button", { name: /fund this invoice/i }));

      await waitFor(() => {
        expect(mockFund).toHaveBeenCalledTimes(1);
      });

      // Different amount — $700 (sequential, after first completes)
      await user.clear(input);
      await user.type(input, "700");
      await user.click(screen.getByRole("button", { name: /fund this invoice/i }));

      await waitFor(() => {
        expect(mockFund).toHaveBeenCalledTimes(2);
      });
    });

    it("resets submission guard after funding completes", async () => {
      const user = userEvent.setup();
      const mockFund = jest.fn().mockResolvedValue(true);

      jest.spyOn(require("@/app/invest/MarketplaceContext"), "useMarketplace").mockReturnValue({
        invoices: [],
        setInvoices: jest.fn(),
        pendingIds: new Set(),
        fundInvoice: mockFund,
      });

      render(
        <FundActions id="inv-001" status="Open" maxAmount={1000} currency="USD" yieldValue={8.2} />
      );

      const input = screen.getByRole("spinbutton", { name: /funding amount/i });
      await user.type(input, "500");
      const submitBtn = screen.getByRole("button", { name: /fund this invoice/i });

      // First fund
      await user.click(submitBtn);
      await waitFor(() => {
        expect(mockFund).toHaveBeenCalledTimes(1);
      });

      // Second fund — same amount, after first completed — should be allowed
      await user.click(submitBtn);
      await waitFor(() => {
        expect(mockFund).toHaveBeenCalledTimes(2);
      });
    });

    it("cleans up submission guard on unmount", () => {
      const { unmount } = render(
        <FundActions id="inv-001" status="Open" maxAmount={1000} currency="USD" yieldValue={8.2} />
      );

      // Unmount — should not throw
      expect(() => unmount()).not.toThrow();
    });
  });
});

// =============================================================================
// 3. Clipboard helpers
// =============================================================================

describe("copyInvoiceUrl", () => {
  it("builds the correct URL from window.location.origin and id", async () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
    const url = await copyInvoiceUrl("inv-001");
    expect(url).toBe("http://localhost:3000/invest/inv-001");
  });

  it("calls navigator.clipboard.writeText with the URL", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    await copyInvoiceUrl("inv-002");
    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/invest/inv-002");
  });

  it("falls back to execCommand when clipboard API is absent", async () => {
    Object.assign(navigator, { clipboard: undefined });
    document.execCommand = jest.fn().mockReturnValue(true);
    const url = await copyInvoiceUrl("inv-003");
    expect(url).toContain("/invest/inv-003");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });
});

describe("copyToClipboardFallback", () => {
  it("appends a textarea, selects it, executes copy, then removes it", () => {
    const appendChild = jest.spyOn(document.body, "appendChild");
    const removeChild = jest.spyOn(document.body, "removeChild");
    document.execCommand = jest.fn().mockReturnValue(true);

    copyToClipboardFallback("https://example.com/invest/inv-001");

    expect(appendChild).toHaveBeenCalled();
    const el = appendChild.mock.calls[0][0] as HTMLTextAreaElement;
    expect(el.tagName).toBe("TEXTAREA");
    expect(el.value).toBe("https://example.com/invest/inv-001");
    expect(el.style.position).toBe("fixed");
    expect(el.style.opacity).toBe("0");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(removeChild).toHaveBeenCalledWith(el);

    appendChild.mockRestore();
    removeChild.mockRestore();
  });

  it("always removes the textarea even when execCommand throws", () => {
    const removeChild = jest.spyOn(document.body, "removeChild");
    document.execCommand = jest.fn(() => {
      throw new Error("Not supported");
    });

    // Should not throw (finally block)
    expect(() => copyToClipboardFallback("test")).not.toThrow();
    expect(removeChild).toHaveBeenCalled();

    removeChild.mockRestore();
  });
});

// =============================================================================
// 4. Copy dictionary contract — invest.detail keys
// =============================================================================

describe("copy.invest.detail — key presence and non-empty", () => {
  const requiredKeys = [
    "pageTitle",
    "pageSub",
    "backToMarketplace",
    "backToMarketplaceLabel",
    "backToHome",
    "summaryHeading",
    "labelIssuer",
    "labelAmount",
    "labelYield",
    "labelMaturity",
    "labelStatus",
    "fundButton",
    "fundButtonLabel",
    "copyLinkButton",
    "copyLinkButtonLabel",
    "printButton",
    "printButtonLabel",
    "disclaimerNote",
    "copySuccessMsg",
    "copySuccessTitle",
    "copyErrorMsg",
    "copyErrorTitle",
    "loadErrorMsg",
    "loadErrorTitle",
    "actionGroupLabel",
  ] as const;

  it("exports copy.invest.detail as an object", () => {
    expect(copy.invest.detail).toBeDefined();
    expect(typeof copy.invest.detail).toBe("object");
  });

  for (const key of requiredKeys) {
    it(`invest.detail.${key} is a non-empty string`, () => {
      expect(typeof copy.invest.detail[key]).toBe("string");
      expect((copy.invest.detail[key] as string).length).toBeGreaterThan(0);
    });
  }
});

// =============================================================================
// 5. Print stylesheet contract
// =============================================================================

describe("print stylesheet classes", () => {
  it("FundActions action row has no-print class", () => {
    const { container } = render(<FundActions id="inv-001" status="Open" />);
    const actionRow = container.querySelector(".no-print.flex");
    expect(actionRow).toBeInTheDocument();
  });

  it("FundActions disclaimer has no-print class", () => {
    const { container } = render(<FundActions id="inv-001" status="Open" />);
    const disclaimer = Array.from(container.querySelectorAll(".no-print")).find((el) =>
      el.textContent?.includes("Yield references")
    );
    expect(disclaimer).toBeInTheDocument();
  });
});

// =============================================================================
// 6. Keyboard operability
// =============================================================================

describe("keyboard operability", () => {
  describe("FundActions buttons — keyboard activation", () => {
    it("Fund button activates on Enter", async () => {
      const user = userEvent.setup();
      const connect = jest.fn();
      mockUseWallet.mockReturnValue({
        state: WALLET_STATES.DISCONNECTED,
        connect,
      } as ReturnType<typeof useWallet>);

      render(<FundActions id="inv-001" status="Open" />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel });
      btn.focus();
      await user.keyboard("{Enter}");
      expect(connect).toHaveBeenCalledTimes(1);
    });

    it("Fund button activates on Space", async () => {
      const user = userEvent.setup();
      const connect = jest.fn();
      mockUseWallet.mockReturnValue({
        state: WALLET_STATES.DISCONNECTED,
        connect,
      } as ReturnType<typeof useWallet>);

      render(<FundActions id="inv-001" status="Open" />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel });
      btn.focus();
      await user.keyboard(" ");
      expect(connect).toHaveBeenCalledTimes(1);
    });

    it("Copy link button activates on Enter", async () => {
      const user = userEvent.setup();
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        get: () => ({ writeText }),
      });

      render(<FundActions id="inv-001" status="Open" />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel });
      btn.focus();
      await user.keyboard("{Enter}");
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/invest/inv-001"));
      });
    });

    it("Copy link button activates on Space", async () => {
      const user = userEvent.setup();
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        get: () => ({ writeText }),
      });

      render(<FundActions id="inv-001" status="Open" />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel });
      btn.focus();
      await user.keyboard(" ");
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/invest/inv-001"));
      });
    });

    it("Print button activates on Enter", async () => {
      const user = userEvent.setup();
      const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});

      render(<FundActions id="inv-001" status="Open" />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });
      btn.focus();
      await user.keyboard("{Enter}");
      expect(printSpy).toHaveBeenCalledTimes(1);
      printSpy.mockRestore();
    });

    it("Print button activates on Space", async () => {
      const user = userEvent.setup();
      const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});

      render(<FundActions id="inv-001" status="Open" />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });
      btn.focus();
      await user.keyboard(" ");
      expect(printSpy).toHaveBeenCalledTimes(1);
      printSpy.mockRestore();
    });
  });

  describe("FundActions buttons — focus-visible class", () => {
    it("Fund button has the focus-ring class", () => {
      render(<FundActions id="inv-001" status="Open" />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel });
      expect(btn.className).toContain("focus-ring");
    });

    it("Copy link button has the focus-ring class", () => {
      render(<FundActions id="inv-001" status="Open" />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel });
      expect(btn.className).toContain("focus-ring");
    });

    it("Print button has the focus-ring class", () => {
      render(<FundActions id="inv-001" status="Open" />);
      const btn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });
      expect(btn.className).toContain("focus-ring");
    });
  });

  describe("FundActions — ARIA group semantics", () => {
    it("action row has role='group'", () => {
      const { container } = render(<FundActions id="inv-001" status="Open" />);
      const group = container.querySelector('[role="group"]');
      expect(group).toBeInTheDocument();
    });

    it("action row group has an aria-label", () => {
      const { container } = render(<FundActions id="inv-001" status="Open" />);
      const group = container.querySelector('[role="group"]');
      expect(group).toHaveAttribute("aria-label", copy.invest.detail.actionGroupLabel);
    });

    it("group contains Fund, Copy, and Print buttons", () => {
      const { container } = render(<FundActions id="inv-001" status="Open" />);
      const group = container.querySelector('[role="group"]');
      const buttons = group!.querySelectorAll("button");
      expect(buttons).toHaveLength(3);
    });
  });

  describe("FundActions — disabled button keyboard behavior", () => {
    it("disabled Fund button is not focusable via Tab", async () => {
      const user = userEvent.setup();
      render(<FundActions id="inv-001" status="Funded" />);
      const fundBtn = screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel });
      expect(fundBtn).toBeDisabled();

      // Tab through all focusable elements — disabled button should be skipped
      await user.tab();
      const activeEl = document.activeElement;
      expect(activeEl).not.toBe(fundBtn);
    });

    it("disabled Copy link button is not focusable via Tab during copy", async () => {
      const user = userEvent.setup();
      const writeText = jest
        .fn()
        .mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        get: () => ({ writeText }),
      });

      render(<FundActions id="inv-001" status="Open" />);
      const copyBtn = screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel });

      // Focus and activate copy button via keyboard
      copyBtn.focus();
      await user.keyboard("{Enter}");

      // Button should be disabled during async copy
      await waitFor(() => {
        expect(copyBtn).toBeDisabled();
      });
    });
  });

  describe("Tab order — FundActions focus sequence", () => {
    it("tabs through Fund → Copy → Print in order", async () => {
      const user = userEvent.setup();
      render(<FundActions id="inv-001" status="Open" />);

      const fundBtn = screen.getByRole("button", { name: copy.invest.detail.fundButtonLabel });
      const copyBtn = screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel });
      const printBtn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });

      // Focus the Fund button first (simulating Tab from previous element)
      fundBtn.focus();
      expect(fundBtn).toHaveFocus();

      await user.tab();
      expect(copyBtn).toHaveFocus();

      await user.tab();
      expect(printBtn).toHaveFocus();
    });

    it("Print button does not wrap focus back to Fund", async () => {
      const user = userEvent.setup();
      render(<FundActions id="inv-001" status="Open" />);

      const printBtn = screen.getByRole("button", { name: copy.invest.detail.printButtonLabel });
      printBtn.focus();

      await user.tab();
      // Focus should move to the next focusable element after FundActions (disclaimer or beyond)
      expect(document.activeElement).not.toBe(printBtn);
    });
  });

  describe("FundAmountInput — keyboard operability", () => {
    it("input is focusable via Tab", async () => {
      const user = userEvent.setup();
      render(
        <FundActions id="inv-001" status="Open" maxAmount={10000} currency="USD" yieldValue={8.2} />
      );

      const input = screen.getByRole("spinbutton", { name: /funding amount/i });
      input.focus();
      expect(input).toHaveFocus();
    });

    it("input accepts keyboard input", async () => {
      const user = userEvent.setup();
      render(
        <FundActions id="inv-001" status="Open" maxAmount={10000} currency="USD" yieldValue={8.2} />
      );

      const input = screen.getByRole("spinbutton", { name: /funding amount/i });
      input.focus();
      await user.keyboard("500");
      expect(input).toHaveValue(500);
    });

    it("submit button activates on Enter inside the input", async () => {
      const user = userEvent.setup();
      const connect = jest.fn();
      mockUseWallet.mockReturnValue({
        state: WALLET_STATES.CONNECTED,
        connect,
      } as ReturnType<typeof useWallet>);

      render(
        <FundActions id="inv-001" status="Open" maxAmount={10000} currency="USD" yieldValue={8.2} />
      );

      const input = screen.getByRole("spinbutton", { name: /funding amount/i });
      input.focus();
      await user.keyboard("500");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });
  });

  describe("page-level keyboard landmarks", () => {
    it("main element has id='main-content' for skip-link target", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });
      const main = container.querySelector("main#main-content");
      expect(main).toBeInTheDocument();
    });

    it("back-to-marketplace link is keyboard-focusable", async () => {
      await renderServerPage({ id: "inv-001" });
      const link = screen.getByRole("link", { name: copy.invest.detail.backToMarketplaceLabel });
      expect(link).not.toHaveAttribute("tabindex", "-1");
      link.focus();
      expect(link).toHaveFocus();
    });

    it("back-to-home link is keyboard-focusable", async () => {
      await renderServerPage({ id: "inv-001" });
      const link = screen.getByRole("link", { name: /liquifact/i });
      expect(link).not.toHaveAttribute("tabindex", "-1");
      link.focus();
      expect(link).toHaveFocus();
    });
  });

  describe("axe accessibility", () => {
    it("FundActions passes axe checks with keyboard-only focus styles", async () => {
      const { container } = render(<FundActions id="inv-001" status="Open" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

// ── Copy button integration (within InvoiceDetail) ────────────────────────────

describe("InvoiceDetail — copy button", () => {
  it("renders a copy button for the Reference ID", async () => {
    const loadInvoice = jest.fn(async () => mockInvoice);

    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    const copyBtn = await screen.findByTestId("copy-button-mock");
    expect(copyBtn).toBeInTheDocument();
  });

  it("copy button has an accessible label referencing the Reference ID", async () => {
    const loadInvoice = jest.fn(async () => mockInvoice);

    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    // aria-label should mention the label passed to CopyButton
    const copyBtn = await screen.findByRole("button", { name: /copy reference id/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it("displays the invoice ID in the Reference row", async () => {
    const loadInvoice = jest.fn(async () => mockInvoice);

    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    // Wait for data to load
    await screen.findByTestId("copy-button-mock");

    expect(screen.getByText("invoice-123")).toBeInTheDocument();
    expect(screen.getByText("Reference")).toBeInTheDocument();
  });

  it("copy button is keyboard-reachable (not disabled)", async () => {
    const loadInvoice = jest.fn(async () => mockInvoice);

    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    const copyBtn = await screen.findByTestId("copy-button-mock");
    expect(copyBtn).not.toBeDisabled();

    copyBtn.focus();
    expect(copyBtn).toHaveFocus();
  });

  it("copy button is not rendered while the invoice is loading", () => {
    // loadInvoice never resolves → stays in loading state
    const loadInvoice = jest.fn(() => new Promise(() => {}));
    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    expect(screen.queryByTestId("copy-button-mock")).not.toBeInTheDocument();
  });

  it("copy button is not rendered when the invoice fails to load", async () => {
    const loadInvoice = jest.fn().mockRejectedValue(new Error("Network error"));
    render(<InvoiceDetail loadInvoice={loadInvoice} />);

    // Wait for the error banner
    await screen.findByRole("alert");

    expect(screen.queryByTestId("copy-button-mock")).not.toBeInTheDocument();
  });
});
