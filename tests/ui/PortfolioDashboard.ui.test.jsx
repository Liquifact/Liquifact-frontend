import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "./axe.js";
import PortfolioDashboard from "@/app/portfolio/PortfolioDashboard";
import { metadata as portfolioMetadata } from "@/app/portfolio/page";
import { listPositions } from "@/lib/portfolio/sources";
import { getWalletAddress } from "@/lib/stellar/freighter";

vi.mock("@/lib/portfolio/sources", () => ({
  resolveSources: vi.fn(() => []),
  listPositions: vi.fn(),
}));
vi.mock("@/lib/stellar/freighter", () => ({
  getWalletAddress: vi.fn(),
  connectFreighter: vi.fn(),
}));

const sample = {
  invoiceId: "INV_1", amount: 100, principal: 100, currency: "USDC", yieldBps: 650,
  status: "funded", dueAt: "2027-01-01", projectedPayout: 106.5, claimable: 0, source: "on-chain",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getWalletAddress).mockResolvedValue("G-investor-address");
  vi.mocked(listPositions).mockResolvedValue({ positions: [], errors: [] });
});

describe("PortfolioDashboard", () => {
  it("marks the private portfolio route as non-indexable", () => {
    expect(portfolioMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("shows the disconnected state and a connect control", async () => {
    vi.mocked(getWalletAddress).mockResolvedValue(null);
    render(<PortfolioDashboard />);
    expect(await screen.findByRole("heading", { name: "Connect your wallet" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeTruthy();
  });

  it("shows the connected empty state", async () => {
    render(<PortfolioDashboard />);
    expect(await screen.findByText(/haven't funded any invoices yet/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /browse the marketplace/i }).getAttribute("href")).toBe("/marketplace");
  });

  it("renders populated positions and their action link", async () => {
    vi.mocked(listPositions).mockResolvedValue({ positions: [sample], errors: [] });
    render(<PortfolioDashboard />);
    expect(await screen.findByRole("row", { name: /INV_1/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "View invoice INV_1" }).getAttribute("href")).toBe("/marketplace/INV_1");
    expect(screen.getByText("106.5 USDC")).toBeTruthy();
  });

  it("shows partial-source errors and still renders successful positions", async () => {
    vi.mocked(listPositions).mockResolvedValue({ positions: [sample], errors: [{ invoiceId: "INV_2", message: "RPC unavailable" }] });
    render(<PortfolioDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("INV_2: RPC unavailable");
    expect(screen.getByRole("row", { name: /INV_1/ })).toBeTruthy();
  });

  it("filters positions and keeps controls keyboard-operable", async () => {
    vi.mocked(listPositions).mockResolvedValue({ positions: [sample, { ...sample, invoiceId: "INV_2", status: "settled" }], errors: [] });
    const user = userEvent.setup();
    render(<PortfolioDashboard />);
    await screen.findByRole("row", { name: /INV_1/ });
    await user.click(screen.getByRole("button", { name: "Settled" }));
    expect(screen.getByRole("row", { name: /INV_2/ })).toBeTruthy();
    expect(screen.queryByRole("row", { name: /INV_1/ })).toBeNull();
    screen.getByRole("button", { name: "Settled" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute("aria-pressed", "true");
  });

  it("meets axe checks with positions visible", async () => {
    vi.mocked(listPositions).mockResolvedValue({ positions: [sample], errors: [] });
    const { container } = render(<PortfolioDashboard />);
    await waitFor(() => expect(screen.getByRole("row", { name: /INV_1/ })).toBeTruthy());
    expect(await axe(container)).toHaveNoViolations();
  });
});
