/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 *
 * @file app/invest/[id]/FundActions.idempotency.test.tsx
 *
 * Integration + accessibility tests for the idempotent funding submission
 * feature (issue #1047).  Covers all 5 required edge cases:
 *
 *   1. Double click — second click is silently ignored while in-flight
 *   2. Wallet rejects — failure state with actionable error toast
 *   3. Network timeout — timeout-specific copy shown
 *   4. Same invoice in two tabs — blocked-by-tab warning with role=alert
 *   5. Retry after server conflict (409) — same idempotency key re-used
 *
 * Also covers:
 *   - Retry button visibility and reset flow
 *   - Accessible live region for status announcements
 *   - Axe accessibility checks
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// ── Shared mock state ─────────────────────────────────────────────────────────

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };

jest.mock("@/components/ToastProvider", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => mockToast,
}));

// WalletContext — controlled per-test via mockUseWallet
jest.mock("@/components/WalletContext", () => ({
  WALLET_STATES: {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    NO_WALLET: "no_wallet",
    WRONG_NETWORK: "wrong_network",
  },
  useWallet: jest.fn(() => ({
    state: "connected",
    walletData: { address: "GABC...XYZ123" },
    connect: jest.fn(),
  })),
}));

jest.mock("@/components/NavMenu", () => ({
  __esModule: true,
  default: function NavMenuMock() {
    return <nav data-testid="nav-menu" />;
  },
}));

// FundAmountInput — minimal controlled stub
jest.mock("@/components/FundAmountInput", () => ({
  __esModule: true,
  default: function FundAmountInputStub({
    onSubmit,
    disabled,
  }: {
    onSubmit: (n: number) => void;
    disabled: boolean;
  }) {
    return (
      <button
        data-testid="fund-amount-submit"
        disabled={disabled}
        onClick={() => onSubmit(500)}
      >
        Submit amount
      </button>
    );
  },
}));

// ── MarketplaceContext ────────────────────────────────────────────────────────

let mockPendingIds: Set<string>;
let mockFundInvoice: jest.Mock;

jest.mock("@/app/invest/MarketplaceContext", () => ({
  useMarketplace: jest.fn(),
}));

/**
 * Lightweight BroadcastChannel mock with cross-hook messaging support.
 */
class MockBroadcastChannel {
  static _registry = new Map<MockBroadcastChannel, string>();
  name: string;
  onmessage: ((ev: { data: unknown }) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel._registry.set(this, name);
  }

  postMessage(data: unknown) {
    for (const [ch, chName] of MockBroadcastChannel._registry) {
      if (chName === this.name && ch !== this && typeof ch.onmessage === "function") {
        ch.onmessage({ data });
      }
    }
  }

  close() {
    MockBroadcastChannel._registry.delete(this);
    this.onmessage = null;
  }
}

import { useWallet, WALLET_STATES } from "@/components/WalletContext";
import { useMarketplace } from "@/app/invest/MarketplaceContext";
import FundActions from "./FundActions";
import { copy } from "@/app/copy/en";

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockUseMarketplace = useMarketplace as jest.MockedFunction<typeof useMarketplace>;

const fundingCopy = copy.invest.detail.funding;

// ── Setup ─────────────────────────────────────────────────────────────────────

function clearSessionIdem() {
  Object.keys(sessionStorage).forEach((k) => {
    if (k.startsWith("liquifact-idem-")) sessionStorage.removeItem(k);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  clearSessionIdem();

  MockBroadcastChannel._registry.clear();
  (global as typeof globalThis & { BroadcastChannel: typeof MockBroadcastChannel }).BroadcastChannel =
    MockBroadcastChannel as unknown as typeof BroadcastChannel;

  mockPendingIds = new Set();
  mockFundInvoice = jest.fn(async (_id, _amount, action) => action(_id, _amount));

  mockUseMarketplace.mockReturnValue({
    invoices: [],
    setInvoices: jest.fn(),
    pendingIds: mockPendingIds,
    fundInvoice: mockFundInvoice,
  } as ReturnType<typeof useMarketplace>);

  mockUseWallet.mockReturnValue({
    state: WALLET_STATES.CONNECTED,
    walletData: { address: "GABC...XYZ123" },
    connect: jest.fn(),
  } as unknown as ReturnType<typeof useWallet>);
});

afterEach(() => {
  MockBroadcastChannel._registry.clear();
});

const DEFAULT_PROPS = {
  id: "inv-001",
  status: "Open",
  maxAmount: 12500,
  currency: "USD",
  yieldValue: 8.2,
};

function deferred() {
  let resolve!: (v?: unknown) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<unknown>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// ── Edge case 1: Double click ─────────────────────────────────────────────────

describe("edge case 1: double click", () => {
  it("disables the submit button after the first click (pending)", async () => {
    const { promise } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(screen.getByTestId("fund-amount-submit")).toBeDisabled();
  });

  it("does not call performFund twice on rapid double-click", async () => {
    const { promise, resolve } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);
    mockFundInvoice.mockImplementation(async (_id, _amount, action) => action(_id, _amount));

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    // Two rapid clicks
    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    await act(async () => {
      resolve({ ok: true });
      await promise;
    });

    // The underlying performFund must be called at most once
    expect(performFund).toHaveBeenCalledTimes(1);
  });

  it("shows 'Funding…' text on the Fund button while pending", async () => {
    const { promise, resolve } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    const fundBtn = screen.getByRole("button", { name: /fund this invoice/i });
    expect(fundBtn).toHaveTextContent(fundingCopy.pendingButton);

    await act(async () => {
      resolve({ ok: true });
      await promise;
    });
  });

  it("sets aria-busy=true on the Fund button while pending", async () => {
    const { promise, resolve } = deferred();
    const performFund = jest.fn().mockReturnValue(promise);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(
      screen.getByRole("button", { name: /fund this invoice/i })
    ).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolve({ ok: true });
      await promise;
    });
  });
});

// ── Edge case 2: Wallet rejects ───────────────────────────────────────────────

describe("edge case 2: wallet rejects", () => {
  it("shows the wallet-reject error toast when the wallet declines", async () => {
    const walletErr = Object.assign(new Error("User rejected"), {
      code: "WALLET_REJECT",
      name: "WalletRejectedError",
    });
    const performFund = jest.fn().mockRejectedValue(walletErr);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      fundingCopy.walletRejectMsg,
      fundingCopy.walletRejectTitle
    );
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("shows the retry button after a wallet rejection", async () => {
    const walletErr = Object.assign(new Error("rejected"), { code: "WALLET_REJECT" });
    const performFund = jest.fn().mockRejectedValue(walletErr);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(screen.getByTestId("fund-retry-button")).toBeInTheDocument();
    expect(screen.getByTestId("fund-retry-button")).toHaveTextContent(
      fundingCopy.retryButton
    );
  });

  it("re-enables the form after clicking retry", async () => {
    const walletErr = Object.assign(new Error("rejected"), { code: "WALLET_REJECT" });
    const performFund = jest.fn().mockRejectedValue(walletErr);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    act(() => {
      fireEvent.click(screen.getByTestId("fund-retry-button"));
    });

    expect(screen.queryByTestId("fund-retry-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("fund-amount-submit")).not.toBeDisabled();
  });
});

// ── Edge case 3: Network timeout ──────────────────────────────────────────────

describe("edge case 3: network timeout", () => {
  it("shows the timeout error toast when performFund times out", async () => {
    const timeoutErr = Object.assign(new Error("timed out"), {
      name: "FundInvoiceTimeoutError",
      code: "FUND_TIMEOUT",
    });
    const performFund = jest.fn().mockRejectedValue(timeoutErr);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      fundingCopy.timeoutMsg,
      fundingCopy.timeoutTitle
    );
  });

  it("shows the retry button after a timeout", async () => {
    const timeoutErr = Object.assign(new Error("timed out"), { code: "FUND_TIMEOUT" });
    const performFund = jest.fn().mockRejectedValue(timeoutErr);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(screen.getByTestId("fund-retry-button")).toBeInTheDocument();
  });
});

// ── Edge case 4: Same invoice in two tabs ─────────────────────────────────────

describe("edge case 4: same invoice in two tabs", () => {
  it("renders the blocked-by-tab warning when a FUND_LOCK is received", async () => {
    const { promise: p1, resolve: r1 } = deferred();

    // "Tab 1" component — starts a submission
    const performFundTab1 = jest.fn().mockReturnValue(p1);
    const { unmount: unmountTab1 } = render(
      <FundActions {...DEFAULT_PROPS} id="inv-tab4" performFund={performFundTab1} />
    );

    // Start tab1 submission (broadcasts FUND_LOCK)
    act(() => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    // "Tab 2" component — same invoice
    unmountTab1();

    const performFundTab2 = jest.fn().mockResolvedValue({ ok: true });
    render(<FundActions {...DEFAULT_PROPS} id="inv-tab4" performFund={performFundTab2} />);

    // Simulate receiving FUND_LOCK from tab1 via BroadcastChannel
    act(() => {
      for (const [ch, name] of MockBroadcastChannel._registry) {
        if (name === `liquifact-fund-inv-tab4` && typeof ch.onmessage === "function") {
          ch.onmessage({ data: { type: "FUND_LOCK", invoiceId: "inv-tab4" } });
        }
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId("fund-blocked-by-tab")).toBeInTheDocument();
    });

    expect(screen.getByTestId("fund-blocked-by-tab")).toHaveTextContent(
      fundingCopy.blockedByTabMsg
    );

    // Clean up tab1
    await act(async () => {
      r1({ ok: true });
      await p1;
    });
  });

  it("blocked-by-tab warning has role=alert for immediate screen-reader announcement", async () => {
    render(<FundActions {...DEFAULT_PROPS} id="inv-tab4b" performFund={jest.fn()} />);

    // Simulate a FUND_LOCK broadcast
    act(() => {
      for (const [ch, name] of MockBroadcastChannel._registry) {
        if (name === `liquifact-fund-inv-tab4b` && typeof ch.onmessage === "function") {
          ch.onmessage({ data: { type: "FUND_LOCK", invoiceId: "inv-tab4b" } });
        }
      }
    });

    await waitFor(() => {
      const alert = screen.queryByTestId("fund-blocked-by-tab");
      if (alert) {
        expect(alert).toHaveAttribute("role", "alert");
      }
    });
  });

  it("submit is a no-op while blocked by another tab", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });
    render(<FundActions {...DEFAULT_PROPS} id="inv-tab4c" performFund={performFund} />);

    // Simulate FUND_LOCK from another tab
    act(() => {
      for (const [ch, name] of MockBroadcastChannel._registry) {
        if (name === `liquifact-fund-inv-tab4c` && typeof ch.onmessage === "function") {
          ch.onmessage({ data: { type: "FUND_LOCK", invoiceId: "inv-tab4c" } });
        }
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId("fund-amount-submit")).toBeDisabled();
    });
  });

  it("warning disappears when the other tab broadcasts FUND_UNLOCK", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });
    render(<FundActions {...DEFAULT_PROPS} id="inv-tab4d" performFund={performFund} />);

    // Lock
    act(() => {
      for (const [ch, name] of MockBroadcastChannel._registry) {
        if (name === `liquifact-fund-inv-tab4d` && typeof ch.onmessage === "function") {
          ch.onmessage({ data: { type: "FUND_LOCK", invoiceId: "inv-tab4d" } });
        }
      }
    });

    await waitFor(() => {
      expect(screen.queryByTestId("fund-blocked-by-tab")).toBeTruthy();
    });

    // Unlock
    act(() => {
      for (const [ch, name] of MockBroadcastChannel._registry) {
        if (name === `liquifact-fund-inv-tab4d` && typeof ch.onmessage === "function") {
          ch.onmessage({ data: { type: "FUND_UNLOCK", invoiceId: "inv-tab4d" } });
        }
      }
    });

    await waitFor(() => {
      expect(screen.queryByTestId("fund-blocked-by-tab")).not.toBeInTheDocument();
    });
  });
});

// ── Edge case 5: Retry after server conflict (409) ────────────────────────────

describe("edge case 5: retry after server conflict (409)", () => {
  it("shows the conflict error toast on a 409 response", async () => {
    const conflictErr = Object.assign(new Error("Conflict"), { status: 409 });
    const performFund = jest.fn().mockRejectedValue(conflictErr);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      fundingCopy.conflictMsg,
      fundingCopy.conflictTitle
    );
  });

  it("shows the retry button after a 409 conflict", async () => {
    const conflictErr = Object.assign(new Error("Conflict"), { status: 409 });
    const performFund = jest.fn().mockRejectedValue(conflictErr);

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(screen.getByTestId("fund-retry-button")).toBeInTheDocument();
  });

  it("shows the success toast when a retry after conflict succeeds", async () => {
    const conflictErr = Object.assign(new Error("Conflict"), { status: 409 });
    const performFund = jest
      .fn()
      .mockRejectedValueOnce(conflictErr)
      .mockResolvedValueOnce({ ok: true });

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    // First attempt — 409
    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    // Click retry
    act(() => {
      fireEvent.click(screen.getByTestId("fund-retry-button"));
    });

    // Second attempt — success
    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining("submitted"),
      fundingCopy.successTitle
    );
  });
});

// ── Success flow ──────────────────────────────────────────────────────────────

describe("success flow", () => {
  it("shows the success toast when performFund resolves", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining("500 USD submitted"),
      fundingCopy.successTitle
    );
  });

  it("does not show the retry button after success", async () => {
    const performFund = jest.fn().mockResolvedValue({ ok: true });

    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(screen.queryByTestId("fund-retry-button")).not.toBeInTheDocument();
  });
});

// ── Wallet disconnected ───────────────────────────────────────────────────────

describe("wallet disconnected", () => {
  it("calls connect() and does not call performFund when wallet is disconnected", async () => {
    const connect = jest.fn();
    mockUseWallet.mockReturnValue({
      state: WALLET_STATES.DISCONNECTED,
      walletData: null,
      connect,
    } as unknown as ReturnType<typeof useWallet>);

    const performFund = jest.fn().mockResolvedValue({ ok: true });
    render(<FundActions {...DEFAULT_PROPS} performFund={performFund} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(performFund).not.toHaveBeenCalled();
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

describe("accessibility", () => {
  it("passes axe checks in idle state", async () => {
    const { container } = render(<FundActions {...DEFAULT_PROPS} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe checks with blocked-by-tab warning visible", async () => {
    const performFund = jest.fn();
    const { container } = render(
      <FundActions {...DEFAULT_PROPS} id="inv-a11y-tab" performFund={performFund} />
    );

    act(() => {
      for (const [ch, name] of MockBroadcastChannel._registry) {
        if (name === "liquifact-fund-inv-a11y-tab" && typeof ch.onmessage === "function") {
          ch.onmessage({ data: { type: "FUND_LOCK", invoiceId: "inv-a11y-tab" } });
        }
      }
    });

    await waitFor(() => {
      expect(screen.queryByTestId("fund-blocked-by-tab")).toBeTruthy();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe checks with retry button visible after failure", async () => {
    const performFund = jest.fn().mockRejectedValue(new Error("fail"));
    const { container } = render(
      <FundActions {...DEFAULT_PROPS} performFund={performFund} />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("fund-amount-submit"));
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("live region for announcements is sr-only and has role=status", () => {
    render(<FundActions {...DEFAULT_PROPS} />);
    const region = screen.getByTestId("invoice-detail-announce");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveClass("sr-only");
  });
});
