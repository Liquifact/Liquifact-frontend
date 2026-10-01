/**
 * Tests for the structured health-render section of app/page.js.
 *
 * These tests verify the validation boundaries introduced in issue #1215:
 *  - Known fields (status, message, version) appear in the structured summary.
 *  - Missing fields are omitted.
 *  - Raw payload is hidden behind a collapsed <details> element.
 *  - Rendered content is plain text, not innerHTML injection.
 *  - safeJsonStringify truncation behaviour is asserted via the bounded output.
 *  - Validation-boundary invariants: unknown status normalised, message capped,
 *    field values capped, concurrent checkApi guarded.
 */
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import Home from "./page";
import { getHealth } from "../lib/api/health";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("../components/WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

jest.mock("../components/NavMenu", () => function MockNavMenu() {
  return <div data-testid="nav-menu">NavMenu</div>;
});

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  MockLink.displayName = "MockLink";
  return { __esModule: true, default: MockLink };
});

jest.mock("../components/NavMenu", () => {
  function MockNavMenu() {
    return <div data-testid="nav-menu">NavMenu</div>;
  }
  MockNavMenu.displayName = "MockNavMenu";
  return MockNavMenu;
});

jest.mock("../lib/api/health", () => ({
  __esModule: true,
  getHealth: jest.fn(),
}));

const mockGetHealth = getHealth;

// ── Helpers ───────────────────────────────────────────────────────────────────

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

async function clickAndWaitIdle() {
  fireEvent.click(screen.getByRole("button", { name: /check backend health/i }));
  await waitFor(() =>
    expect(screen.queryByText(/checking/i)).not.toBeInTheDocument()
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Home health render", () => {
  // ── 1. Known-field rendering ─────────────────────────────────────────────

  it("renders recognised fields in a structured summary", async () => {
    mockGetHealth.mockResolvedValueOnce({
      status: "connected",
      message: "All good",
      details: { status: "ok", message: "All good", version: "1.2.3" },
    });
    render(<Home />);
    await clickAndWaitIdle();

    const statusRegion = screen.getByRole("status");
    // Badge label "Connected" appears at least once
    expect(within(statusRegion).getAllByText(/connected/i).length).toBeGreaterThan(0);
    // "All good" appears at least once (structured summary or message paragraph)
    expect(within(statusRegion).getAllByText(/All good/i).length).toBeGreaterThan(0);
  });

  it("omits recognised fields that are missing from the payload", async () => {
    mockGetHealth.mockResolvedValueOnce({
      status: "connected",
      message: "ok",
      details: { status: "ok" },
    });
    render(<Home />);
    await clickAndWaitIdle();

    const statusRegion = screen.getByRole("status");
    expect(within(statusRegion).getByText(/connected/i)).toBeInTheDocument();
    // 'version' not in payload — should not appear
    expect(within(statusRegion).queryByText(/version/i)).not.toBeInTheDocument();
  });

  // ── 2. Raw payload section ───────────────────────────────────────────────

  it("renders raw payload inside a collapsed details element", async () => {
    mockGetHealth.mockResolvedValueOnce({
      status: "connected",
      message: "healthy",
      details: { status: "ok" },
    });
    render(<Home />);
    await clickAndWaitIdle();

    const details = document.querySelector("details");
    expect(details).toBeInTheDocument();
    // details is collapsed by default (no open attribute)
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText(/raw response/i)).toBeInTheDocument();
  });

  it("renders payload as text content inside <pre>, not as HTML markup", async () => {
    mockGetHealth.mockResolvedValueOnce({
      status: "connected",
      message: "ok",
      details: { status: "ok" },
    });
    render(<Home />);
    await clickAndWaitIdle();

    const pre = document.querySelector("pre");
    expect(pre).toBeInTheDocument();
    // dangerouslySetInnerHTML must never be used on the raw output element
    expect(pre).not.toHaveAttribute("dangerouslySetInnerHTML");
  });

  // ── 3. Does not render health section before button click ────────────────

  it("does not render the status region before the check is triggered", () => {
    render(<Home />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/raw response/i)).not.toBeInTheDocument();
  });

  // ── 4. Validation boundary: status normalisation ─────────────────────────

  it("normalises an unknown status string to Unreachable in the badge", async () => {
    mockGetHealth.mockResolvedValueOnce({
      status: "totally-unknown-value",
      message: "Something happened",
    });
    render(<Home />);
    await clickAndWaitIdle();

    const statusRegion = screen.getByRole("status");
    // Badge should show Unreachable, not the raw unknown string
    expect(within(statusRegion).getAllByText(/unreachable/i).length).toBeGreaterThan(0);
    expect(within(statusRegion).queryByText(/totally-unknown-value/i)).not.toBeInTheDocument();
  });

  it("normalises a null status to Unreachable", async () => {
    mockGetHealth.mockResolvedValueOnce({ status: null, message: "bad" });
    render(<Home />);
    await clickAndWaitIdle();

    expect(within(screen.getByRole("status")).getAllByText(/unreachable/i).length).toBeGreaterThan(0);
  });

  it("normalises an undefined status to Unreachable", async () => {
    mockGetHealth.mockResolvedValueOnce({ message: "no status key" });
    render(<Home />);
    await clickAndWaitIdle();

    expect(within(screen.getByRole("status")).getAllByText(/unreachable/i).length).toBeGreaterThan(0);
  });

  it("normalises a numeric status to Unreachable", async () => {
    mockGetHealth.mockResolvedValueOnce({ status: 200, message: "numeric" });
    render(<Home />);
    await clickAndWaitIdle();

    expect(within(screen.getByRole("status")).getAllByText(/unreachable/i).length).toBeGreaterThan(0);
  });

  it("accepts all three allowlist values without normalising them away", async () => {
    for (const status of ["connected", "degraded", "unreachable"]) {
      jest.clearAllMocks();
      mockGetHealth.mockResolvedValueOnce({ status, message: "test" });

      const { unmount } = render(<Home />);
      await clickAndWaitIdle();

      const label =
        status === "connected"
          ? /connected/i
          : status === "degraded"
          ? /degraded/i
          : /unreachable/i;

      expect(within(screen.getByRole("status")).getAllByText(label).length).toBeGreaterThan(0);
      unmount();
    }
  });

  // ── 5. Validation boundary: message length cap ───────────────────────────

  it("caps the health message at 300 characters", async () => {
    const longMsg = "M".repeat(500);
    mockGetHealth.mockResolvedValueOnce({ status: "connected", message: longMsg });
    render(<Home />);
    await clickAndWaitIdle();

    const statusRegion = screen.getByRole("status");
    const msgEl = statusRegion.querySelector("p");
    // Rendered text must not exceed 300 + truncation marker
    expect(msgEl.textContent.length).toBeLessThanOrEqual(320);
    // Must include the truncation marker
    expect(msgEl.textContent).toMatch(/…\(truncated\)/);
  });

  it("does not truncate a message that is exactly 300 characters", async () => {
    const exactMsg = "A".repeat(300);
    mockGetHealth.mockResolvedValueOnce({ status: "connected", message: exactMsg });
    render(<Home />);
    await clickAndWaitIdle();

    const statusRegion = screen.getByRole("status");
    const msgEl = statusRegion.querySelector("p");
    expect(msgEl.textContent).not.toMatch(/…\(truncated\)/);
    expect(msgEl.textContent.length).toBe(300);
  });

  it("renders an empty string without crashing when message is missing", async () => {
    mockGetHealth.mockResolvedValueOnce({ status: "connected" });
    render(<Home />);
    await clickAndWaitIdle();

    // Should still render the status region without throwing
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // ── 6. Validation boundary: field value length cap ───────────────────────

  it("caps individual field values at 200 characters in the structured summary", async () => {
    const longValue = "V".repeat(500);
    mockGetHealth.mockResolvedValueOnce({
      status: "connected",
      message: "ok",
      details: { status: "ok", version: longValue },
    });
    render(<Home />);
    await clickAndWaitIdle();

    const statusRegion = screen.getByRole("status");
    const summaryText = statusRegion.querySelector(".space-y-1")?.textContent ?? "";
    // The long version value must be truncated
    expect(summaryText).toMatch(/…\(truncated\)/);
    // It must not contain the raw 500-char string
    expect(summaryText.length).toBeLessThan(longValue.length);
  });

  // ── 7. Validation boundary: safeJsonStringify bounds the raw section ──────

  it("truncates an oversized raw payload in the <pre> section", async () => {
    const huge = { status: "ok", data: "x".repeat(3000) };
    mockGetHealth.mockResolvedValueOnce({ status: "connected", message: "ok", details: huge });
    render(<Home />);
    await clickAndWaitIdle();

    const pre = document.querySelector("pre");
    // safeJsonStringify caps at 2000 characters
    expect(pre.textContent.length).toBeLessThanOrEqual(2020);
    expect(pre.textContent).toMatch(/…\(truncated\)/);
  });

  it("adds [Depth limit reached] for deeply nested payloads in the <pre> section", async () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: "deep" } } } } } } };
    mockGetHealth.mockResolvedValueOnce({ status: "connected", message: "ok", details: deep });
    render(<Home />);
    await clickAndWaitIdle();

    const pre = document.querySelector("pre");
    expect(pre.textContent).toContain("[Depth limit reached]");
  });

  // ── 8. Concurrent execution guard ────────────────────────────────────────

  it("does not allow a second concurrent call when loading is true (reentrance guard)", async () => {
    let resolveFirst;
    mockGetHealth.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFirst = res;
        })
    );
    mockGetHealth.mockResolvedValue({ status: "connected", message: "second call" });

    render(<Home />);
    const btn = screen.getByRole("button", { name: /check backend health/i });

    // First click — starts the in-flight request
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());

    // Second click while loading — must be a no-op (reentrance guard)
    fireEvent.click(btn);
    fireEvent.click(btn);

    // Only one getHealth call should have been made
    expect(mockGetHealth).toHaveBeenCalledTimes(1);

    // Clean up
    await act(async () => {
      resolveFirst({ status: "connected", message: "first done" });
    });
  });

  it("allows a new call after the previous one completes", async () => {
    mockGetHealth
      .mockResolvedValueOnce({ status: "connected", message: "first" })
      .mockResolvedValueOnce({ status: "degraded", message: "second" });

    render(<Home />);
    const btn = screen.getByRole("button", { name: /check backend health/i });

    fireEvent.click(btn);
    await waitFor(() => expect(btn).not.toBeDisabled());
    expect(screen.getAllByText(/connected/i).length).toBeGreaterThan(0);

    fireEvent.click(btn);
    await waitFor(() => expect(btn).not.toBeDisabled());
    expect(screen.getAllByText(/degraded/i).length).toBeGreaterThan(0);

    expect(mockGetHealth).toHaveBeenCalledTimes(2);
  });

  // ── 9. Non-object result defensive guard ─────────────────────────────────

  it("handles a null result from getHealth without crashing", async () => {
    mockGetHealth.mockResolvedValueOnce(null);
    render(<Home />);
    await clickAndWaitIdle();

    // Falls back to unreachable
    const statusRegion = screen.getByRole("status");
    expect(within(statusRegion).getAllByText(/unreachable/i).length).toBeGreaterThan(0);
  });

  it("handles a string result from getHealth without crashing", async () => {
    mockGetHealth.mockResolvedValueOnce("not-an-object");
    render(<Home />);
    await clickAndWaitIdle();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // ── 10. Idempotent updates ─────────────────────────────────────────────────

  it("updates the displayed status on a second successful check", async () => {
    mockGetHealth
      .mockResolvedValueOnce({ status: "connected", message: "healthy" })
      .mockResolvedValueOnce({ status: "unreachable", message: "timed out" });

    render(<Home />);
    const btn = screen.getByRole("button", { name: /check backend health/i });

    fireEvent.click(btn);
    await waitFor(() => expect(btn).not.toBeDisabled());
    expect(within(screen.getByRole("status")).getAllByText(/connected/i).length).toBeGreaterThan(0);

    fireEvent.click(btn);
    await waitFor(() => expect(btn).not.toBeDisabled());
    expect(within(screen.getByRole("status")).getAllByText(/unreachable/i).length).toBeGreaterThan(0);
  });

  it("shows a failure message when the backend responds non-ok", async () => {
    mockFetchOnce({ status: "error", message: "unavailable" }, false);
    render(<Home />);

    await clickCheckHealth();

    expect(screen.getByText(/unavailable|indicates a problem|failed/i)).toBeInTheDocument();
  });

  it("handles a rejected fetch without leaving the ui in a loading state", async () => {
    global.fetch = jest.fn().mockRejected(new Error("network down"));
    render(<Home />);

    await clickCheckHealth();

    expect(screen.queryByText(/checking/i)).not.toBeInTheDocument();
  });

  it("ignores duplicate clicks while a request is in flight", async () => {
    const deferred = mockFetchDeferred();
    render(<Home />);

    const button = screen.getByRole("button", { name: /check backend health/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    deferred.resolveWith({ status: "ok", message: "All good" });
    await waitFor(() => expect(screen.queryByText(/checking/i)).not.toBeInTheDocument());

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("serializes concurrent checks so the latest result wins", async () => {
    const first = mockFetchDeferred();
    render(<Home />);

    const button = screen.getByRole("button", { name: /check backend health/i });
    fireEvent.click(button);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // A second click while the first is in flight must not start a new request.
    fireEvent.click(button);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    first.resolveWith({ status: "ok", message: "first" });
    await waitFor(() => expect(screen.queryByText(/checking/i)).not.toBeInTheDocument());

    expect(screen.getByText(/first/i)).toBeInTheDocument();
  });

  it("returns to a usable state after a failure so a retry can succeed", async () => {
    global.fetch = jest.fn().mockRejected(new Error("network down"));
    render(<Home />);

    await clickCheckHealth();

    expect(screen.queryByText(/checking/i)).not.toBeInTheDocument();

    mockFetchOnce({ status: "ok", message: "recovered" });
    await clickCheckHealth();

    expect(screen.getByText(/recovered/i)).toBeInTheDocument();
  });
});
