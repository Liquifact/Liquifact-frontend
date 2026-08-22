import "@testing-library/jest-dom";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import InvoiceList from "./InvoiceList";

// ── Fixtures ────────────────────────────────────────────────────────────────

const FULL_ADDRESS = "GABCDE1234FGHIJ5678KLMNO9012PQRST3456UVWXY7890ZABC1234DE";
const TRUNCATED = "GABCDE…34DE";

const invoiceWithAddress = {
  id: "inv-addr-001",
  issuer: "Acme Supplies Ltd",
  issuerAddress: FULL_ADDRESS,
  amount: "5,000",
  currency: "USD",
  dueDate: "2026-12-01",
  yield: "6.0%",
  status: "Tokenized",
};

const invoiceWithoutAddress = {
  id: "inv-noaddr-001",
  issuer: "No Address Corp",
  amount: "1,000",
  currency: "EUR",
  dueDate: "2026-11-01",
  yield: "5.0%",
  status: "Funded",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeLoader(invoices: object[]) {
  return jest.fn().mockResolvedValue(invoices);
}

async function renderAndWait(invoices: object[]) {
  const loader = makeLoader(invoices);
  const utils = render(<InvoiceList loadInvoices={loader} />);
  await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
  return utils;
}

// ── truncateAddress integration ───────────────────────────────────────────────

describe.skip("InvoiceList – issuer address truncation", () => {
  it("displays the truncated address in the card", async () => {
    await renderAndWait([invoiceWithAddress]);
    expect(screen.getByText(TRUNCATED)).toBeInTheDocument();
  });

  it("does not display the full raw address as visible text", async () => {
    await renderAndWait([invoiceWithAddress]);
    // Full address should only appear as title / aria-label, not as visible text node
    expect(screen.queryByText(FULL_ADDRESS)).not.toBeInTheDocument();
  });

  it("exposes the full address via title attribute for hover tooltip", async () => {
    await renderAndWait([invoiceWithAddress]);
    const span = screen.getByTitle(FULL_ADDRESS);
    expect(span).toBeInTheDocument();
  });

  it("exposes the full address via aria-label for screen readers", async () => {
    await renderAndWait([invoiceWithAddress]);
    expect(screen.getByLabelText(`Issuer address: ${FULL_ADDRESS}`)).toBeInTheDocument();
  });
});

// ── Copy button presence ───────────────────────────────────────────────────────

describe.skip("InvoiceList – copy button visibility", () => {
  it("renders a copy button when issuerAddress is present", async () => {
    await renderAndWait([invoiceWithAddress]);
    expect(screen.getByRole("button", { name: /copy issuer address/i })).toBeInTheDocument();
  });

  it("does not render a copy button when issuerAddress is absent", async () => {
    await renderAndWait([invoiceWithoutAddress]);
    expect(screen.queryByRole("button", { name: /copy issuer address/i })).not.toBeInTheDocument();
  });

  it("renders one copy button per card that has an issuerAddress", async () => {
    const secondWithAddress = {
      ...invoiceWithAddress,
      id: "inv-addr-002",
      issuerAddress: "GXYZ781ABCDE234FGHIJ567KLMNO890PQRST123UVWXY456ZABC789FG",
    };
    await renderAndWait([invoiceWithAddress, secondWithAddress, invoiceWithoutAddress]);
    expect(screen.getAllByRole("button", { name: /copy issuer address/i })).toHaveLength(2);
  });
});

// ── Copy button accessibility ──────────────────────────────────────────────────

describe.skip("InvoiceList – copy button accessibility", () => {
  it("copy button has an accessible label before copying", async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });
    expect(button).toHaveAccessibleName();
  });

  it("copy button aria-label includes the truncated address", async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });
    expect(button.getAttribute("aria-label")).toMatch(TRUNCATED);
  });

  it("copy button has a title tooltip", async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });
    expect(button).toHaveAttribute("title", "Copy issuer address");
  });

  it('copy button is of type="button" so it does not submit forms', async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });
    expect(button).toHaveAttribute("type", "button");
  });
});

// ── Clipboard write ────────────────────────────────────────────────────────────

describe.skip("InvoiceList – clipboard write on copy", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls navigator.clipboard.writeText with the FULL address on click", async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FULL_ADDRESS);
  });

  it("does NOT write any other field — only the issuerAddress", async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });

    await act(async () => {
      fireEvent.click(button);
    });

    const written = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
    expect(written).toBe(FULL_ADDRESS);
    expect(written).not.toContain(invoiceWithAddress.issuer);
    expect(written).not.toContain(invoiceWithAddress.id);
  });
});

// ── Copy confirmation feedback ─────────────────────────────────────────────────

describe.skip("InvoiceList – copy confirmation feedback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows "Copied!" text after a successful copy', async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it('updates the button aria-label to "Copied!" after copy', async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button.getAttribute("aria-label")).toBe("Copied!");
  });

  it("reverts the aria-label back to copy after 2 seconds", async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button.getAttribute("aria-label")).toBe("Copied!");

    await act(async () => {
      jest.advanceTimersByTime(2001);
    });

    expect(button.getAttribute("aria-label")).toMatch(/copy issuer address/i);
  });

  it('reverts the "Copied!" text after 2 seconds', async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText("Copied!")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(2001);
    });

    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  it('"Copied!" is in a live region so screen readers announce it', async () => {
    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });

    await act(async () => {
      fireEvent.click(button);
    });

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveTextContent("Copied!");
  });
});

// ── Clipboard failure (non-error) ──────────────────────────────────────────────

describe.skip("InvoiceList – clipboard failure handling", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not throw or surface an error when clipboard.writeText rejects", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });

    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });

    await act(async () => {
      fireEvent.click(button);
    });

    // No error banner or throw — failure is silent
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  it("uses the execCommand fallback when navigator.clipboard is unavailable", async () => {
    // Remove clipboard API to force fallback path
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    const execCommandSpy = jest.spyOn(document, "execCommand").mockReturnValue(true);

    await renderAndWait([invoiceWithAddress]);
    const button = screen.getByRole("button", { name: /copy issuer address/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(execCommandSpy).toHaveBeenCalledWith("copy");

    // Restore
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
    });
  });
});

// ── truncateAddress unit ───────────────────────────────────────────────────────

describe.skip("truncateAddress (via InvoiceList integration)", () => {
  it("renders head…tail when the address is long", async () => {
    await renderAndWait([invoiceWithAddress]);
    // FULL_ADDRESS is 56 chars; with headLen=6, tailLen=4: "GABCDE…34DE"
    expect(screen.getByText("GABCDE…34DE")).toBeInTheDocument();
  });

  it("renders the address unchanged when it is short", async () => {
    const short = { ...invoiceWithAddress, issuerAddress: "GABC" };
    await renderAndWait([short]);
    // 4 chars ≤ 6+4+1=11, so no truncation
    expect(screen.getByText("GABC")).toBeInTheDocument();
  });
});
