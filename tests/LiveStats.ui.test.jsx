/**
 * Component tests for LiveStats (issue #1397).
 *
 * Uses Vitest + @testing-library/react + jsdom.
 * Run with: npm run test:ui
 *
 * lib/api is mocked so every test is deterministic and offline-safe.
 * lib/stats and lib/format are the real implementations — the point of the
 * component is how it renders computed per-currency stats.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mock state ────────────────────────────────────────────────────────
const { listInvoicesMock, getHealthMock } = vi.hoisted(() => ({
  listInvoicesMock: vi.fn(),
  getHealthMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  listInvoices: listInvoicesMock,
  getHealth: getHealthMock,
}));

const { default: LiveStats } = await import("../components/LiveStats.jsx");
const { DEMO_INVOICES } = await import("../lib/demo.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

function onlineApi() {
  listInvoicesMock.mockResolvedValue({ data: DEMO_INVOICES, offline: false });
  getHealthMock.mockResolvedValue({ status: "ok" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LiveStats", () => {
  it("shows skeleton tiles while loading (aria-busy)", () => {
    listInvoicesMock.mockReturnValue(new Promise(() => {})); // never settles
    getHealthMock.mockReturnValue(new Promise(() => {}));

    render(<LiveStats />);

    const region = screen.getByRole("region", { name: /live marketplace statistics/i });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByText(/checking/i)).toHaveLength(1);
  });

  it("shows per-currency face values, never a cross-currency sum", async () => {
    onlineApi();

    render(<LiveStats />);

    const usdc = await screen.findByText(/79,500 USDC/);
    expect(usdc).toBeInTheDocument();
    expect(screen.getByText(/100 XLM/)).toBeInTheDocument();

    // The old broken tile summed XLM + USDC into "79,600".
    expect(screen.queryByText(/79,600/)).toBeNull();

    const region = screen.getByRole("region", { name: /live marketplace statistics/i });
    expect(region).toHaveAttribute("aria-busy", "false");
  });

  it("shows funded totals per currency", async () => {
    onlineApi();

    render(<LiveStats />);

    expect(await screen.findByText(/Funded:/)).toBeInTheDocument();
    expect(screen.getByText(/72,500 USDC/)).toBeInTheDocument();
  });

  it("shows weighted avg yield for the primary currency with an accessible tooltip", async () => {
    onlineApi();
    const user = userEvent.setup();

    render(<LiveStats />);

    // ~726.29 bps = 7.26% for USDC (the primary currency)
    expect(await screen.findByText("7.26%")).toBeInTheDocument();
    expect(screen.getByText(/Weighted avg yield \(USDC\)/)).toBeInTheDocument();

    const tipBtn = screen.getByRole("button", { name: /how weighted yield is calculated/i });
    expect(tipBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("tooltip")).toBeNull();

    await user.click(tipBtn);
    expect(tipBtn).toHaveAttribute("aria-expanded", "true");
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent(/face value/i);
    expect(tipBtn).toHaveAttribute("aria-describedby", "yield-tip");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the offline demo banner and still computes demo stats when the list falls back", async () => {
    listInvoicesMock.mockResolvedValue({ data: DEMO_INVOICES, offline: true });
    getHealthMock.mockResolvedValue({ status: "ok" });

    render(<LiveStats />);

    expect(
      await screen.findByText(/Showing demo data — API unreachable/)
    ).toBeInTheDocument();
    expect(screen.getByText(/79,500 USDC/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/degraded/);
  });

  it("shows an error card with Retry when both list and health fail; Retry re-fetches", async () => {
    listInvoicesMock.mockRejectedValue(new Error("boom"));
    getHealthMock.mockRejectedValue(new Error("boom"));

    const { container } = render(<LiveStats />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/unavailable/i);
    expect(screen.getByRole("status")).toHaveTextContent(/unreachable/);

    // Restore the API, then click Retry.
    onlineApi();
    const retry = screen.getByRole("button", { name: /retry/i });
    await userEvent.setup().click(retry);

    await waitFor(() => {
      expect(screen.getByText(/79,500 USDC/)).toBeInTheDocument();
    });
    expect(listInvoicesMock).toHaveBeenCalledTimes(2);
    expect(getHealthMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(/online/);
    // No error banner left behind.
    expect(container.querySelector(".notice-err")).toBeNull();
  });

  it("status line is an aria-live polite region", async () => {
    onlineApi();

    render(<LiveStats />);

    // Wait for the fetch to settle inside act() before asserting.
    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveTextContent(/online/));
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
