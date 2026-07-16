import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import { InvoiceDetail, copyInvoiceUrl, copyToClipboardFallback } from "./page";

expect.extend(toHaveNoViolations);

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "inv-001" }),
  notFound: jest.fn(() => null),
}));

jest.mock("@/components/WalletContext", () => ({
  WALLET_STATES: {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    NO_WALLET: "no_wallet",
  },
  useWallet: () => ({
    state: "disconnected",
    connect: jest.fn(),
  }),
}));

jest.mock(
  "@/components/WalletStatus",
  () =>
    function WalletStatusMock() {
      return <div>WalletStatus</div>;
    }
);

jest.mock(
  "@/components/ErrorBanner",
  () =>
    function ErrorBannerMock() {
      return <div role="alert">Error</div>;
    }
);

jest.mock(
  "@/components/InvoiceListSkeleton",
  () =>
    function SkeletonMock() {
      return <div aria-busy="true" />;
    }
);

jest.mock("@/components/ToastProvider", () => ({
  useToast: () => mockToast,
}));

jest.mock(
  "@/components/StatusPill",
  () =>
    function StatusPillMock({ status }) {
      return <span role="status">{status}</span>;
    }
);

function createDeferredInvoice(invoice, delayMs = 0) {
  return jest.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(invoice), delayMs);
      })
  );
}

function createPendingLoader() {
  return jest.fn(() => new Promise(() => {}));
}

function createFailingLoader(delayMs = 50) {
  return jest.fn(
    () =>
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("boom")), delayMs);
      })
  );
}

async function flushTimers(delayMs = 0) {
  await act(async () => {
    jest.advanceTimersByTime(delayMs);
    await Promise.resolve();
  });
}

const mockInvoice = {
  id: "inv-001",
  issuer: "Acme Supplies Ltd",
  amount: "12,500",
  currency: "USD",
  dueDate: "2026-06-15",
  yield: "8.2%",
  yieldValue: 8.2,
  status: "Open",
};

const ORIGINAL_LOCATION = window.location;

beforeEach(() => {
  jest.useFakeTimers();
  mockToast.success.mockClear();
  mockToast.error.mockClear();

  delete window.location;
  window.location = { origin: "http://localhost:3000" };
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  window.location = ORIGINAL_LOCATION;
});

describe("InvoiceDetail - copy link", () => {
  it("renders a 'Copy link' button when invoice is loaded", async () => {
    render(<InvoiceDetail loadInvoice={createDeferredInvoice(mockInvoice, 0)} />);
    await flushTimers(0);

    expect(screen.getByRole("button", { name: /copy invoice link/i })).toBeInTheDocument();
  });

  it("does not render 'Copy link' button during loading state", () => {
    render(<InvoiceDetail loadInvoice={createPendingLoader()} />);

    expect(screen.queryByRole("button", { name: /copy invoice link/i })).not.toBeInTheDocument();
  });

  it("does not render 'Copy link' button when load fails", async () => {
    render(<InvoiceDetail loadInvoice={createFailingLoader(50)} />);
    await flushTimers(50);

    expect(screen.queryByRole("button", { name: /copy invoice link/i })).not.toBeInTheDocument();
  });

  it("copies the invoice URL to clipboard on click and shows success toast", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<InvoiceDetail loadInvoice={createDeferredInvoice(mockInvoice, 0)} />);
    await flushTimers(0);

    await act(async () => {
      screen.getByRole("button", { name: /copy invoice link/i }).click();
    });

    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/invest/inv-001");
    expect(mockToast.success).toHaveBeenCalledWith(
      "Invoice link copied to clipboard.",
      "Link copied"
    );
  });

  it("shows error toast when clipboard write fails", async () => {
    const writeText = jest.fn().mockRejectedValue(new Error("Permission denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<InvoiceDetail loadInvoice={createDeferredInvoice(mockInvoice, 0)} />);
    await flushTimers(0);

    await act(async () => {
      screen.getByRole("button", { name: /copy invoice link/i }).click();
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      "Could not copy link to clipboard.",
      "Copy failed"
    );
  });

  it("falls back when navigator.clipboard is undefined", async () => {
    Object.assign(navigator, { clipboard: undefined });
    const execCommand = jest.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    render(<InvoiceDetail loadInvoice={createDeferredInvoice(mockInvoice, 0)} />);
    await flushTimers(0);

    await act(async () => {
      screen.getByRole("button", { name: /copy invoice link/i }).click();
    });

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(mockToast.success).toHaveBeenCalledWith(
      "Invoice link copied to clipboard.",
      "Link copied"
    );
  });

  it("sets correct aria-label on copy link button for accessibility", async () => {
    render(<InvoiceDetail loadInvoice={createDeferredInvoice(mockInvoice, 0)} />);
    await flushTimers(0);

    const button = screen.getByRole("button", { name: /copy invoice link/i });
    expect(button).toHaveAttribute("aria-label", "Copy invoice link to clipboard");
  });

  it("passes axe accessibility checks when invoice is loaded", async () => {
    const loadInvoice = createDeferredInvoice(mockInvoice, 0);
    const { container } = render(<InvoiceDetail loadInvoice={loadInvoice} />);
    await flushTimers(0);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("copyInvoiceUrl", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  it("builds the correct URL from location origin and id", async () => {
    const url = await copyInvoiceUrl("inv-001");
    expect(url).toBe("http://localhost:3000/invest/inv-001");
  });

  it("calls navigator.clipboard.writeText with the correct URL", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await copyInvoiceUrl("inv-002");
    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/invest/inv-002");
  });

  it("uses fallback when navigator.clipboard is unavailable", async () => {
    Object.assign(navigator, { clipboard: undefined });
    document.execCommand = jest.fn().mockReturnValue(true);

    const url = await copyInvoiceUrl("inv-003");
    expect(url).toBe("http://localhost:3000/invest/inv-003");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });
});

describe("copyToClipboardFallback", () => {
  it("creates a temporary element, selects content, and executes copy", () => {
    const appendChild = jest.spyOn(document.body, "appendChild");
    const removeChild = jest.spyOn(document.body, "removeChild");
    const execCommand = jest.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    copyToClipboardFallback("test-url");

    expect(appendChild).toHaveBeenCalled();
    const el = appendChild.mock.calls[0][0];
    expect(el.value).toBe("test-url");
    expect(el.style.position).toBe("fixed");
    expect(el.style.opacity).toBe("0");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(removeChild).toHaveBeenCalledWith(el);

    appendChild.mockRestore();
    removeChild.mockRestore();
  });
});
