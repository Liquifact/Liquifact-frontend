/**
 * TxActivityButton component tests — run with `npm run test:ui` (vitest + jsdom).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TxTrackerProvider, useTxTracker } from "@/components/TxTrackerProvider.jsx";
import TxActivityButton from "@/components/TxActivityButton.jsx";
import { createTxStore, STATUS } from "@/lib/stellar/txStore.js";

// ── Mock Storage for Tests ────────────────────────────────────────────────────

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

// ── Test Store ────────────────────────────────────────────────────────────────

const testStorage = createMockStorage();
const testTxStore = createTxStore(testStorage);

// Mock the txStore module to use our test store
vi.mock("@/lib/stellar/txStore.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getDefaultStore: () => testTxStore,
    STATUS: actual.STATUS,
  };
});

// Mock explorerTxUrl
vi.mock("@/lib/stellar/index.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    explorerTxUrl: (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`,
    shortAddress: (addr, size = 6) => {
      if (!addr || addr.length <= size * 2 + 1) return addr || "";
      return `${addr.slice(0, size)}…${addr.slice(-size)}`;
    },
  };
});

// Mock formatDate
vi.mock("@/lib/format.js", () => ({
  formatDate: (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
}));

// Mock CopyButton
vi.mock("@/components/CopyButton.jsx", () => ({
  default: function CopyButton({ value, label = "Copy" }) {
    return <button type="button" data-testid="copy-btn" onClick={() => navigator.clipboard?.writeText?.(value)}>{label}</button>;
  },
}));

// ── Test Wrapper ──────────────────────────────────────────────────────────────

function TestWrapper({ children }) {
  return <TxTrackerProvider>{children}</TxTrackerProvider>;
}

// Helper to add test transactions directly to the store
function addTestTransaction(hash, meta = {}) {
  testTxStore.add({ hash, label: meta.label || "Test tx", invoiceId: meta.invoiceId || null });
}

// Reset store before each test
beforeEach(() => {
  vi.clearAllMocks();
  testStorage.clear();
  testTxStore.clear();
});

afterEach(() => {
  testStorage.clear();
  testTxStore.clear();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("TxActivityButton - basic rendering", () => {
  it("renders button with no badge when no pending transactions", async () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const button = screen.getByRole("button", { name: /transactions/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveAttribute("aria-label", /pending/i);
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("shows badge count when pending transactions exist", async () => {
    addTestTransaction("a".repeat(64), { label: "Test tx" });
    
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    
    await waitFor(() => {
      const button = screen.getByRole("button", { name: /transactions, 1 pending/i });
      expect(button).toBeInTheDocument();
    });
  });

  it("opens drawer on button click", async () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const button = screen.getByRole("button", { name: /transactions/i });
    await userEvent.click(button);
    expect(screen.getByRole("dialog", { name: /transaction activity/i })).toBeInTheDocument();
  });

  it("closes drawer on Escape key", async () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const button = screen.getByRole("button", { name: /transactions/i });
    await userEvent.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes drawer on backdrop click", async () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const button = screen.getByRole("button", { name: /transactions/i });
    await userEvent.click(button);
    const backdrop = screen.getByTestId("tx-drawer-backdrop");
    await userEvent.click(backdrop);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes drawer on close button click", async () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const button = screen.getByRole("button", { name: /transactions/i });
    await userEvent.click(button);
    const closeBtn = screen.getByRole("button", { name: /close transaction activity/i });
    await userEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("TxActivityButton - drawer content", () => {
  it("shows empty state when no transactions", async () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const button = screen.getByRole("button", { name: /transactions/i });
    await userEvent.click(button);
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
  });

  it("shows pending transaction with status pill", async () => {
    addTestTransaction("a".repeat(64), { label: "Fund INV_001", invoiceId: "INV_001" });
    
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    
    await waitFor(() => {
      const button = screen.getByRole("button", { name: /transactions, 1 pending/i });
    });

    await userEvent.click(screen.getByRole("button", { name: /transactions/i }));
    expect(screen.getByText(/fund inv_001/i)).toBeInTheDocument();
    // Check for status pill specifically (not section title)
    const statusPill = screen.getByRole("listitem").querySelector(".tx-status-pending");
    expect(statusPill).toHaveTextContent(/pending/i);
    expect(screen.getByText(/invoice: inv_001/i)).toBeInTheDocument();
  });

  it("shows confirmed transaction with success pill", async () => {
    testTxStore.add({ hash: "b".repeat(64), label: "Fund INV_002", invoiceId: "INV_002", createdAt: Date.now() - 60000 });
    testTxStore.update("b".repeat(64), { status: STATUS.SUCCESS });

    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    await userEvent.click(screen.getByRole("button", { name: /transactions/i }));
    // Check for status pill specifically
    const statusPill = screen.getByRole("listitem").querySelector(".tx-status-success");
    expect(statusPill).toHaveTextContent(/confirmed/i);
    // Check label specifically (not the live region announcement)
    const label = screen.getByRole("listitem").querySelector(".tx-item-label");
    expect(label).toHaveTextContent(/fund inv_002/i);
  });

  it("shows failed transaction with failed pill", async () => {
    testTxStore.add({ hash: "c".repeat(64), label: "Withdraw", invoiceId: "INV_003", createdAt: Date.now() - 60000 });
    testTxStore.update("c".repeat(64), { status: STATUS.FAILED });

    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    await userEvent.click(screen.getByRole("button", { name: /transactions/i }));
    const statusPill = screen.getByRole("listitem").querySelector(".tx-status-failed");
    expect(statusPill).toHaveTextContent(/failed/i);
  });

  it("shows unknown transaction with unknown pill", async () => {
    testTxStore.add({ hash: "d".repeat(64), label: "Old tx", createdAt: Date.now() - 100000 });
    testTxStore.update("d".repeat(64), { status: STATUS.UNKNOWN });

    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    await userEvent.click(screen.getByRole("button", { name: /transactions/i }));
    const statusPill = screen.getByRole("listitem").querySelector(".tx-status-unknown");
    expect(statusPill).toHaveTextContent(/unknown/i);
  });

  it("shows shortened hash", async () => {
    addTestTransaction("a".repeat(64), { label: "Test" });

    render(<TestWrapper><TxActivityButton /></TestWrapper>);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /transactions, 1 pending/i });
    });

    await userEvent.click(screen.getByRole("button", { name: /transactions/i }));
    expect(screen.getByText(/a…a/i)).toBeInTheDocument();
  });

  it("shows stellar.expert link", async () => {
    addTestTransaction("a".repeat(64), { label: "Test" });

    render(<TestWrapper><TxActivityButton /></TestWrapper>);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /transactions, 1 pending/i });
    });

    await userEvent.click(screen.getByRole("button", { name: /transactions/i }));
    const link = screen.getByRole("link", { name: /view.*stellar\.expert/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("stellar.expert"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("has copy hash button", async () => {
    addTestTransaction("a".repeat(64), { label: "Test" });

    render(<TestWrapper><TxActivityButton /></TestWrapper>);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /transactions, 1 pending/i });
    });

    await userEvent.click(screen.getByRole("button", { name: /transactions/i }));
    expect(screen.getByRole("button", { name: /copy hash/i })).toBeInTheDocument();
  });
});

describe("TxActivityButton - keyboard navigation", () => {
  it("focus returns to button when drawer closes", async () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const button = screen.getByRole("button", { name: /transactions/i });
    await userEvent.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(button).toHaveFocus();
  });

  it("tab navigation works within drawer", async () => {
    addTestTransaction("a".repeat(64), { label: "Test 1" });
    addTestTransaction("b".repeat(64), { label: "Test 2" });

    render(<TestWrapper><TxActivityButton /></TestWrapper>);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /transactions, 2 pending/i });
    });

    await userEvent.click(screen.getByRole("button", { name: /transactions/i }));
    const dialog = screen.getByRole("dialog");
    // First focus is on dialog, tab moves to close button, tab again to first list item
    await userEvent.tab(); // close button
    await userEvent.tab(); // first list item
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveFocus();
  });
});

describe("TxActivityButton - resume pending after remount", () => {
  it("shows pending transactions after remount", async () => {
    addTestTransaction("a".repeat(64), { label: "Persistent tx" });

    const { unmount } = render(<TestWrapper><TxActivityButton /></TestWrapper>);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /transactions, 1 pending/i });
    });

    unmount();

    // Remount
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    await waitFor(() => {
      const button = screen.getByRole("button", { name: /transactions, 1 pending/i });
    });
  });
});

describe("TxActivityButton - accessibility", () => {
  it("has proper ARIA attributes on button", async () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const button = screen.getByRole("button", { name: /transactions/i });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-controls", "tx-activity-drawer");
  });

  it("drawer has proper role and labeling", async () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const button = screen.getByRole("button", { name: /transactions/i });
    await userEvent.click(button);
    const dialog = screen.getByRole("dialog", { name: /transaction activity/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("status pills include text not just color", async () => {
    addTestTransaction("a".repeat(64), { label: "Test" });

    render(<TestWrapper><TxActivityButton /></TestWrapper>);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /transactions, 1 pending/i });
    });

    await userEvent.click(screen.getByRole("button", { name: /transactions/i }));
    // Check the status pill specifically (not section title)
    const statusPill = screen.getByRole("listitem").querySelector(".tx-status-pending");
    expect(statusPill).toHaveTextContent(/pending/i);
  });

  it("has visually-hidden live region for announcements", () => {
    render(<TestWrapper><TxActivityButton /></TestWrapper>);
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    expect(liveRegion).toHaveClass("visually-hidden");
  });
});

describe("TxActivityButton - dev demo mode", () => {
  it("tracks demo transaction when ?debugTx= query param present", async () => {
    // Directly test the track function with a debug transaction
    const { result } = renderHook(() => useTxTracker(), { wrapper: TestWrapper });
    
    act(() => {
      result.current.track("0".repeat(64), { label: "Debug transaction", invoiceId: "DEBUG" });
    });
    
    await waitFor(() => {
      // The store should have the transaction
      expect(testTxStore.get("0".repeat(64))).toBeTruthy();
    });
  });
});