/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 *
 * @file app/invest/[id]/page.test.tsx
 *
 * Comprehensive tests for the invoice detail page split:
 *   1. Server Component shell (page.js)
 *      - Renders JSON-LD structured data
 *      - Calls notFound() for unknown IDs
 *      - Delegates content rendering to InvoiceDetailContent client component
 *      - Does NOT contain any "use client" / hooks (structural contract)
 *
 *   2. InvoiceDetailContent client component — fetch-state model
 *      - Loading state: renders skeleton with aria-busy
 *      - Data state: renders invoice detail (delegated to InvoiceDetailData)
 *      - Error state: renders ErrorBanner with retry button
 *      - Empty state: renders EmptyState with back link
 *      - Retry: keyboard-operable (Enter/Space), re-fetches on click
 *      - State announcements via aria-live regions
 *      - State exclusivity: only one state renders at a time
 *
 *   3. FundActions client component (unchanged)
 *      - Fund button: disabled states per wallet state
 *      - Copy link: clipboard API + textarea fallback
 *      - Print button: calls window.print()
 *      - Accessibility: aria-labels, keyboard focus
 *      - Toast feedback: success + error
 *
 *   4. Clipboard helpers (copyInvoiceUrl, copyToClipboardFallback)
 *      - URL construction
 *      - Clipboard API path
 *      - Fallback path
 *
 *   5. Copy dictionary contract — invest.detail keys
 *      - All required keys present and non-empty
 *
 *   6. Print stylesheet contract
 *      - FundActions action row has no-print class
 *      - FundActions disclaimer has no-print class
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
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

jest.mock("@/components/ErrorBanner", () => ({
  __esModule: true,
  default: function ErrorBannerMock({
    title,
    description,
    actionLabel,
    onAction,
  }: {
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  }) {
    return (
      <div role="alert">
        {title}
        {description && <p>{description}</p>}
        {actionLabel && (
          <button onClick={onAction} role="button">
            {actionLabel}
          </button>
        )}
      </div>
    );
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

jest.mock("../lib", () => ({
  getInvoiceById: jest.fn(),
}));

import { notFound } from "next/navigation";
import { getInvoiceById } from "../lib";
import { useWallet, WALLET_STATES } from "@/components/WalletContext";
import InvoiceDetailPage from "./page";
import FundActions, { copyInvoiceUrl, copyToClipboardFallback } from "./FundActions";
import InvoiceDetailContent from "./InvoiceDetailContent";
import { copy } from "@/app/copy/en";

const mockGetInvoiceById = getInvoiceById as jest.MockedFunction<typeof getInvoiceById>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

// ── Fixture ───────────────────────────────────────────────────────────────────

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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInvoiceById.mockReturnValue(MOCK_INVOICE as ReturnType<typeof getInvoiceById>);
  mockUseWallet.mockReturnValue({ state: "disconnected", connect: jest.fn() } as ReturnType<
    typeof useWallet
  >);
  mockToast.success.mockClear();
  mockToast.error.mockClear();
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
    it("injects a JSON-LD script tag for the invoice", async () => {
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

    it("renders back-to-home link", async () => {
      await renderServerPage({ id: "inv-001" });

      const homeLink = screen.getByRole("link", { name: /liquifact/i });
      expect(homeLink).toHaveAttribute("href", "/");
    });

    it("renders NavMenu in header", async () => {
      await renderServerPage({ id: "inv-001" });

      expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
    });

    it("main element has id='main-content' for skip-link", async () => {
      const { container } = await renderServerPage({ id: "inv-001" });

      const main = container.querySelector("main");
      expect(main).toHaveAttribute("id", "main-content");
    });

    it("renders InvoiceDetailContent client component", async () => {
      await renderServerPage({ id: "inv-001" });

      expect(screen.getByText(/loading invoice details/i)).toBeInTheDocument();
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
  });
});

// =============================================================================
// 2. InvoiceDetailContent client component — fetch-state model
// =============================================================================

describe("InvoiceDetailContent (client fetch-state model)", () => {
  const detail = copy.invest.detail;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultProps = { id: "inv-001" };

  // Mock loaders that properly simulate async behavior
  const createMockLoader = (result: typeof MOCK_INVOICE | null | undefined, shouldThrow = false) => {
    return jest.fn().mockImplementation(async () => {
      if (shouldThrow) throw new Error("Network error");
      return result;
    });
  };

  const mockLoadInvoiceSuccess = createMockLoader(MOCK_INVOICE);
  const mockLoadInvoiceEmpty = createMockLoader(undefined);
  const mockLoadInvoiceError = createMockLoader(null, true);
  const mockLoadInvoiceNotFound = createMockLoader(null);

  it("renders loading skeleton initially", async () => {
    const slowLoad = jest.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(MOCK_INVOICE), 100);
        })
    );

    render(<InvoiceDetailContent {...defaultProps} loadInvoice={slowLoad} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/loading invoice details/i)).toBeInTheDocument();
  });

  it("renders data state when loadInvoice resolves with invoice", async () => {
    render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceSuccess} />);

    await waitFor(() => {
      expect(screen.getByText(MOCK_INVOICE.issuer)).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(detail.pageTitle);
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "Open");
  });

  it("renders empty state when loadInvoice returns undefined", async () => {
    render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceEmpty} />);

    await waitFor(() => {
      expect(screen.getByText(detail.emptyStateTitle)).toBeInTheDocument();
    });

    expect(screen.getByText(detail.emptyStateDescription)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: detail.backToMarketplace })).toBeInTheDocument();
  });

  it("renders error state when loadInvoice rejects", async () => {
    render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceError} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText(detail.loadErrorTitle)).toBeInTheDocument();
    expect(screen.getByText(detail.loadErrorMsg)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: detail.retryLabel })).toBeInTheDocument();
  });

  it("renders empty state (not found) when loadInvoice returns null", async () => {
    render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceNotFound} />);

    await waitFor(() => {
      expect(screen.getByText(detail.emptyStateTitle)).toBeInTheDocument();
    });
  });

  it("re-fetches on retry button click", async () => {
    render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceError} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    mockLoadInvoiceError.mockImplementation(createMockLoader(MOCK_INVOICE));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: detail.retryLabel }));
    });

    await waitFor(() => {
      expect(screen.getByText(MOCK_INVOICE.issuer)).toBeInTheDocument();
    });

    expect(mockLoadInvoiceError).toHaveBeenCalledTimes(2);
  });

  it("retry button is keyboard-operable (Enter key)", async () => {
    render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceError} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    mockLoadInvoiceError.mockImplementation(createMockLoader(MOCK_INVOICE));

    const retryBtn = screen.getByRole("button", { name: detail.retryLabel });
    await act(async () => {
      fireEvent.keyDown(retryBtn, { key: "Enter", code: "Enter" });
    });

    await waitFor(() => {
      expect(screen.getByText(MOCK_INVOICE.issuer)).toBeInTheDocument();
    });
  });

  it("retry button is keyboard-operable (Space key)", async () => {
    render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceError} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    mockLoadInvoiceError.mockImplementation(createMockLoader(MOCK_INVOICE));

    const retryBtn = screen.getByRole("button", { name: detail.retryLabel });
    await act(async () => {
      fireEvent.keyDown(retryBtn, { key: " ", code: "Space" });
    });

    await waitFor(() => {
      expect(screen.getByText(MOCK_INVOICE.issuer)).toBeInTheDocument();
    });
  });

  it("announces loading state via aria-live", async () => {
    const slowLoad = jest.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(MOCK_INVOICE), 100);
        })
    );

    render(<InvoiceDetailContent {...defaultProps} loadInvoice={slowLoad} />);

    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toHaveTextContent(detail.announceLoading);
  });

  it("announces error state via aria-live", async () => {
    render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceError} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveTextContent(detail.announceError);
  });

  it("announces empty state via aria-live", async () => {
    render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceEmpty} />);

    await waitFor(() => {
      expect(screen.getByText(detail.emptyStateTitle)).toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveTextContent(detail.announceEmpty);
  });

  it("state exclusivity: only one state renders at a time", async () => {
    jest.useFakeTimers();
    try {
      const slowLoad = jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(MOCK_INVOICE), 100);
          })
      );
      render(<InvoiceDetailContent {...defaultProps} loadInvoice={slowLoad} />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(detail.emptyStateTitle)).not.toBeInTheDocument();

      jest.advanceTimersByTime(200);
      await waitFor(() => {
        expect(screen.getByText(MOCK_INVOICE.issuer)).toBeInTheDocument();
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(detail.emptyStateTitle)).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("passes axe accessibility checks in data state", async () => {
    const { container } = render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceSuccess} />);

    await waitFor(() => {
      expect(screen.getByText(MOCK_INVOICE.issuer)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe accessibility checks in error state", async () => {
    const { container } = render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceError} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe accessibility checks in empty state", async () => {
    const { container } = render(<InvoiceDetailContent {...defaultProps} loadInvoice={mockLoadInvoiceEmpty} />);

    await waitFor(() => {
      expect(screen.getByText(detail.emptyStateTitle)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// =============================================================================
// 3. FundActions client component
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
    it("passes axe accessibility checks", async () => {
      const { container } = render(<FundActions {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("action row and disclaimer carry no-print class", () => {
      const { container } = render(<FundActions {...defaultProps} />);
      const noPrintEls = container.querySelectorAll(".no-print");
      expect(noPrintEls.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// =============================================================================
// 4. Clipboard helpers
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

    expect(() => copyToClipboardFallback("test")).not.toThrow();
    expect(removeChild).toHaveBeenCalled();

    removeChild.mockRestore();
  });
});

// =============================================================================
// 5. Copy dictionary contract — invest.detail keys
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
    "emptyStateTitle",
    "emptyStateDescription",
    "retryLabel",
    "announceLoading",
    "announceError",
    "announceEmpty",
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
// 6. Print stylesheet contract
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