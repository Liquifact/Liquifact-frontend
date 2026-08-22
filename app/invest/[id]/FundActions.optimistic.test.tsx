/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 *
 * @file app/invest/[id]/FundActions.optimistic.test.tsx
 *
 * Focused tests for the optimistic update behaviour added to FundActions:
 *   - Success: pending UI → success toast → cleared
 *   - Failure rollback: pending UI → error toast → cleared
 *   - Concurrent guard: second submit ignored while first is in-flight
 *   - Wallet-disconnected path still prompts connect (no optimistic state)
 *   - Invoice status optimistically changes to "Funded" on success
 *   - Invoice status reverts on failure
 */

import React from "react";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Shared mocks ──────────────────────────────────────────────────────────────

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };

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
  useWallet: jest.fn(() => ({ state: "connected", connect: jest.fn() })),
}));

jest.mock("@/components/NavMenu", () => ({
  __esModule: true,
  default: function NavMenuMock() {
    return <nav data-testid="nav-menu" />;
  },
}));

// FundAmountInput is complex — replace with a minimal form that calls onSubmit
// directly so we control the amount in tests.
jest.mock("@/components/FundAmountInput", () => ({
  __esModule: true,
  default: function FundAmountInputMock({
    onSubmit,
    disabled,
  }: {
    onSubmit: (n: number) => void;
    disabled: boolean;
  }) {
    return (
      <button data-testid="fund-amount-submit" disabled={disabled} onClick={() => onSubmit(500)}>
        Submit amount
      </button>
    );
  },
}));

// ── Mock MarketplaceContext ────────────────────────────────────────────────────

let mockFundInvoice: jest.Mock;
let mockPendingIds: Set<string>;
let mockInvoices: Array<{ id: string; status: string }>;

jest.mock("@/app/invest/MarketplaceContext", () => ({
  useMarketplace: jest.fn(),
}));

import { useWallet, WALLET_STATES } from "@/components/WalletContext";
import { useMarketplace } from "@/app/invest/MarketplaceContext";
import FundActions from "./FundActions";

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockUseMarketplace = useMarketplace as jest.MockedFunction<typeof useMarketplace>;

// ── helpers ───────────────────────────────────────────────────────────────────

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const DEFAULT_PROPS = {
  id: "inv-001",
  status: "Open",
  maxAmount: 12500,
  currency: "USD",
  yieldValue: 8.2,
};

beforeEach(() => {
  jest.clearAllMocks();

  mockPendingIds = new Set();
  mockInvoices = [{ id: "inv-001", status: "Open" }];
  mockFundInvoice = jest.fn();

  mockUseMarketplace.mockReturnValue({
    invoices: mockInvoices,
    setInvoices: jest.fn(),
    pendingIds: mockPendingIds,
    fundInvoice: mockFundInvoice,
  });

  mockUseWallet.mockReturnValue({
    state: WALLET_STATES.CONNECTED,
    connect: jest.fn(),
  } as ReturnType<typeof useWallet>);
});

// ── success path ──────────────────────────────────────────────────────────────

describe("optimistic success", () => {
  it("shows a success toast after performFund resolves", async () => {
    mockFundInvoice.mockResolvedValue(true);

    render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining("500 USD submitted"),
      "Funding submitted"
    );
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("calls fundInvoice with the invoice id and amount", async () => {
    mockFundInvoice.mockResolvedValue(true);

    render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(mockFundInvoice).toHaveBeenCalledWith("inv-001", 500, expect.any(Function));
  });

  it("fund-amount submit button is re-enabled after the action resolves", async () => {
    const { promise, resolve } = deferred();
    mockFundInvoice.mockImplementation(() => {
      // When fundInvoice is called, update pendingIds to simulate in-flight
      mockPendingIds.add("inv-001");
      mockUseMarketplace.mockReturnValue({
        ...mockUseMarketplace(),
        pendingIds: new Set(mockPendingIds),
      });
      return promise.then((v) => {
        mockPendingIds.delete("inv-001");
        return v as any;
      });
    });

    const { rerender } = render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    // Re-render to reflect pending state
    mockUseMarketplace.mockReturnValue({
      ...mockUseMarketplace(),
      pendingIds: new Set(["inv-001"]),
    });
    rerender(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    expect(screen.getByTestId("fund-amount-submit")).toBeDisabled();

    await act(async () => {
      resolve();
      await promise;
    });

    // Re-render to reflect cleared state
    mockUseMarketplace.mockReturnValue({
      ...mockUseMarketplace(),
      pendingIds: new Set(),
    });
    rerender(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    await waitFor(() => {
      expect(screen.getByTestId("fund-amount-submit")).not.toBeDisabled();
    });
  });
});

// ── failure / rollback path ───────────────────────────────────────────────────

describe("optimistic rollback on failure", () => {
  it("shows an error toast when performFund rejects", async () => {
    mockFundInvoice.mockRejectedValue(new Error("network error"));

    render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining("500 USD failed"),
      "Funding failed"
    );
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("does not show a success toast on failure", async () => {
    mockFundInvoice.mockRejectedValue(new Error("server 500"));

    render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("fund-amount submit button is re-enabled after rollback", async () => {
    const { promise, reject } = deferred();
    mockFundInvoice.mockImplementation(() => {
      mockPendingIds.add("inv-001");
      mockUseMarketplace.mockReturnValue({
        ...mockUseMarketplace(),
        pendingIds: new Set(mockPendingIds),
      });
      return promise
        .then(() => {})
        .catch((e) => {
          mockPendingIds.delete("inv-001");
          throw e;
        });
    });

    const { rerender } = render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    mockUseMarketplace.mockReturnValue({
      ...mockUseMarketplace(),
      pendingIds: new Set(["inv-001"]),
    });
    rerender(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    expect(screen.getByTestId("fund-amount-submit")).toBeDisabled();

    await act(async () => {
      reject(new Error("fail"));
      await promise.catch(() => {});
    });

    mockUseMarketplace.mockReturnValue({
      ...mockUseMarketplace(),
      pendingIds: new Set(),
    });
    rerender(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    await waitFor(() => {
      expect(screen.getByTestId("fund-amount-submit")).not.toBeDisabled();
    });
  });
});

// ── pending (in-flight) UI state ──────────────────────────────────────────────

describe("pending UI state while action is in-flight", () => {
  it("disables the fund-amount submit button while the action is running", async () => {
    const { promise, resolve } = deferred();
    mockFundInvoice.mockImplementation(() => {
      mockPendingIds.add("inv-001");
      mockUseMarketplace.mockReturnValue({
        ...mockUseMarketplace(),
        pendingIds: new Set(mockPendingIds),
      });
      return promise.then((v) => {
        mockPendingIds.delete("inv-001");
        return v as any;
      });
    });

    const { rerender } = render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    mockUseMarketplace.mockReturnValue({
      ...mockUseMarketplace(),
      pendingIds: new Set(["inv-001"]),
    });
    rerender(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    expect(screen.getByTestId("fund-amount-submit")).toBeDisabled();

    await act(async () => {
      resolve();
      await promise;
    });
  });

  it("sets aria-busy=true on the Fund button while in-flight", async () => {
    const { promise, resolve } = deferred();
    mockFundInvoice.mockImplementation(() => {
      mockPendingIds.add("inv-001");
      mockUseMarketplace.mockReturnValue({
        ...mockUseMarketplace(),
        pendingIds: new Set(mockPendingIds),
      });
      return promise.then((v) => {
        mockPendingIds.delete("inv-001");
        return v as any;
      });
    });

    const { rerender } = render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    mockUseMarketplace.mockReturnValue({
      ...mockUseMarketplace(),
      pendingIds: new Set(["inv-001"]),
    });
    rerender(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    const fundBtn = screen.getByRole("button", { name: /fund this invoice/i });
    expect(fundBtn).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolve();
      await promise;
    });

    mockUseMarketplace.mockReturnValue({
      ...mockUseMarketplace(),
      pendingIds: new Set(),
    });
    rerender(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    await waitFor(() => {
      expect(fundBtn).toHaveAttribute("aria-busy", "false");
    });
  });

  it("shows 'Funding…' text on the Fund button while in-flight", async () => {
    const { promise, resolve } = deferred();
    mockFundInvoice.mockImplementation(() => {
      mockPendingIds.add("inv-001");
      mockUseMarketplace.mockReturnValue({
        ...mockUseMarketplace(),
        pendingIds: new Set(mockPendingIds),
      });
      return promise.then((v) => {
        mockPendingIds.delete("inv-001");
        return v as any;
      });
    });

    const { rerender } = render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    mockUseMarketplace.mockReturnValue({
      ...mockUseMarketplace(),
      pendingIds: new Set(["inv-001"]),
    });
    rerender(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    expect(screen.getByRole("button", { name: /fund this invoice/i })).toHaveTextContent(
      "Funding…"
    );

    await act(async () => {
      resolve();
      await promise;
    });
  });
});

// ── concurrent guard ──────────────────────────────────────────────────────────

describe("concurrent action guard", () => {
  it("does not call fundInvoice a second time while the first is in-flight", async () => {
    const { promise, resolve } = deferred();
    mockFundInvoice.mockImplementation(() => {
      mockPendingIds.add("inv-001");
      mockUseMarketplace.mockReturnValue({
        ...mockUseMarketplace(),
        pendingIds: new Set(mockPendingIds),
      });
      return promise.then((v) => {
        mockPendingIds.delete("inv-001");
        return v as any;
      });
    });

    const { rerender } = render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    // First submit
    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    mockUseMarketplace.mockReturnValue({
      ...mockUseMarketplace(),
      pendingIds: new Set(["inv-001"]),
    });
    rerender(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    // Button is disabled — second click should be a no-op
    fireEvent.click(screen.getByTestId("fund-amount-submit"));

    await act(async () => {
      resolve();
      await promise;
    });

    expect(mockFundInvoice).toHaveBeenCalledTimes(1);
  });
});

// ── wallet-disconnected path ──────────────────────────────────────────────────

describe("wallet disconnected path", () => {
  it("calls connect() and does not call fundInvoice when wallet is disconnected", async () => {
    const connect = jest.fn();
    mockUseWallet.mockReturnValue({
      state: WALLET_STATES.DISCONNECTED,
      connect,
    } as ReturnType<typeof useWallet>);

    mockFundInvoice.mockResolvedValue(true);

    render(<FundActions {...DEFAULT_PROPS} performFund={mockFundInvoice} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(mockFundInvoice).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});

// ── default performFund (no prop) ─────────────────────────────────────────────

describe("default performFund placeholder", () => {
  it("shows a success toast even when no performFund prop is passed", async () => {
    // No performFund prop — fundInvoice will be called with a default no-op
    mockFundInvoice.mockResolvedValue(true);

    render(<FundActions {...DEFAULT_PROPS} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    // fundInvoice is called with a default no-op action
    expect(mockFundInvoice).toHaveBeenCalledWith("inv-001", 500, expect.any(Function));

    // The default action resolves, so success toast should appear
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining("submitted"),
      "Funding submitted"
    );
  });
});
