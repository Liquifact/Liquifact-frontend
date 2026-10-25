/**
 * Component tests for OnboardingChecklist.
 *
 * Uses Vitest + @testing-library/react + jsdom.
 * Run with: npm run test:ui
 *
 * Strategy: mock all external I/O (Freighter, Horizon, Friendbot) and
 * lib/stellar/networks so that every test is deterministic and offline.
 *
 * vi.mock factories are hoisted to the top of the file by Vitest, so all
 * mock state is created with vi.hoisted() to ensure it is initialised
 * before the factory runs.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mock state (must be above vi.mock calls) ──────────────────────────
const {
  freighterMock,
  horizonMock,
  friendbotMock,
} = vi.hoisted(() => {
  const freighterMock = {
    hasFreighter: vi.fn(() => false),
    isConnected: vi.fn(async () => false),
    getPublicKey: vi.fn(async () => null),
    getNetworkName: vi.fn(async () => null),
    requestAccess: vi.fn(async () => null),
  };
  const horizonMock = {
    getAccountState: vi.fn(async () => ({
      exists: false,
      xlmBalance: 0,
      trustlines: [],
    })),
  };
  const friendbotMock = {
    fundWithFriendbot: vi.fn(async () => ({
      status: "success",
      message: "Account funded with 10,000 XLM.",
    })),
  };
  return { freighterMock, horizonMock, friendbotMock };
});

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/stellar/networks", () => ({
  CONFIGURED_NETWORK: "testnet",
  getNetwork: (n) => ({
    name: n,
    horizonUrl: "https://horizon-testnet.stellar.org",
    friendbotUrl: "https://friendbot.stellar.org",
  }),
}));

vi.mock("@/lib/stellar/freighter", () => freighterMock);
vi.mock("@/lib/stellar/horizon", () => horizonMock);
vi.mock("@/lib/stellar/friendbot", () => friendbotMock);

// Import component AFTER mocks are set up
const { default: OnboardingChecklist } = await import(
  "../app/get-started/OnboardingChecklist.jsx"
);

// ── Helpers ────────────────────────────────────────────────────────────────────

function resetToNewVisitor() {
  freighterMock.hasFreighter.mockReturnValue(false);
  freighterMock.isConnected.mockResolvedValue(false);
  freighterMock.getPublicKey.mockResolvedValue(null);
  freighterMock.getNetworkName.mockResolvedValue(null);
  freighterMock.requestAccess.mockResolvedValue(null);
  horizonMock.getAccountState.mockResolvedValue({
    exists: false,
    xlmBalance: 0,
    trustlines: [],
  });
  friendbotMock.fundWithFriendbot.mockResolvedValue({
    status: "success",
    message: "Account funded with 10,000 XLM.",
  });
}

function setFullyReady() {
  freighterMock.hasFreighter.mockReturnValue(true);
  freighterMock.isConnected.mockResolvedValue(true);
  freighterMock.getPublicKey.mockResolvedValue(
    "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
  );
  freighterMock.getNetworkName.mockResolvedValue("testnet");
  horizonMock.getAccountState.mockResolvedValue({
    exists: true,
    xlmBalance: 10000,
    trustlines: ["USDC"],
  });
}

function setConnectedUnfunded() {
  freighterMock.hasFreighter.mockReturnValue(true);
  freighterMock.isConnected.mockResolvedValue(true);
  freighterMock.getPublicKey.mockResolvedValue(
    "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
  );
  freighterMock.getNetworkName.mockResolvedValue("testnet");
  horizonMock.getAccountState.mockResolvedValue({
    exists: false,
    xlmBalance: 0,
    trustlines: [],
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetToNewVisitor();
});

// ── Progress count ────────────────────────────────────────────────────────────

describe("progress count", () => {
  it("shows 0 of 5 for a brand-new visitor", async () => {
    resetToNewVisitor();
    render(<OnboardingChecklist />);
    await waitFor(() =>
      expect(screen.getByText(/0 of 5 complete/i)).toBeInTheDocument(),
    );
  });

  it("shows 5 of 5 when fully ready", async () => {
    setFullyReady();
    render(<OnboardingChecklist />);
    await waitFor(() =>
      expect(screen.getByText(/5 of 5 complete/i)).toBeInTheDocument(),
    );
  });

  it("shows all-done banner when fully ready", async () => {
    setFullyReady();
    render(<OnboardingChecklist />);
    await waitFor(() =>
      expect(screen.getByText(/you're all set/i)).toBeInTheDocument(),
    );
  });
});

// ── Action buttons ────────────────────────────────────────────────────────────

describe("action buttons", () => {
  it("shows 'Get Freighter' link when extension is absent", async () => {
    resetToNewVisitor();
    render(<OnboardingChecklist />);
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /get freighter/i }),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'Connect' button when extension present but not connected", async () => {
    freighterMock.hasFreighter.mockReturnValue(true);
    freighterMock.isConnected.mockResolvedValue(false);
    render(<OnboardingChecklist />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /connect/i }),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'Fund with Friendbot' button when account does not exist on testnet", async () => {
    setConnectedUnfunded();
    render(<OnboardingChecklist />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /fund with friendbot/i }),
      ).toBeInTheDocument(),
    );
  });

  it("Friendbot button is absent on mainnet (fund step is n/a)", async () => {
    freighterMock.hasFreighter.mockReturnValue(true);
    freighterMock.isConnected.mockResolvedValue(true);
    freighterMock.getPublicKey.mockResolvedValue(
      "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
    );
    freighterMock.getNetworkName.mockResolvedValue("mainnet");
    horizonMock.getAccountState.mockResolvedValue({
      exists: true,
      xlmBalance: 5,
      trustlines: [],
    });
    render(<OnboardingChecklist />);
    // Wait for the checklist to fully render
    await waitFor(() =>
      expect(screen.getByText(/of 5 complete/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /fund with friendbot/i }),
    ).not.toBeInTheDocument();
  });
});

// ── Connect wallet action ─────────────────────────────────────────────────────

describe("connect wallet action", () => {
  it("calls requestAccess when Connect is clicked", async () => {
    freighterMock.hasFreighter.mockReturnValue(true);
    freighterMock.isConnected.mockResolvedValue(false);
    freighterMock.requestAccess.mockResolvedValue(
      "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
    );
    freighterMock.getNetworkName.mockResolvedValue("testnet");
    horizonMock.getAccountState.mockResolvedValue({
      exists: false,
      xlmBalance: 0,
      trustlines: [],
    });

    render(<OnboardingChecklist />);
    const btn = await screen.findByRole("button", { name: /connect/i });
    await userEvent.click(btn);
    expect(freighterMock.requestAccess).toHaveBeenCalledOnce();
  });

  it("shows a warning notice when access is not granted", async () => {
    freighterMock.hasFreighter.mockReturnValue(true);
    freighterMock.isConnected.mockResolvedValue(false);
    freighterMock.requestAccess.mockResolvedValue(null); // user dismissed

    render(<OnboardingChecklist />);
    const btn = await screen.findByRole("button", { name: /connect/i });
    await userEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByText(/not granted/i)).toBeInTheDocument(),
    );
  });
});

// ── Friendbot action ──────────────────────────────────────────────────────────

describe("Friendbot action", () => {
  it("calls fundWithFriendbot with the connected public key and 'testnet'", async () => {
    setConnectedUnfunded();
    render(<OnboardingChecklist />);
    const btn = await screen.findByRole("button", {
      name: /fund with friendbot/i,
    });
    await userEvent.click(btn);
    expect(friendbotMock.fundWithFriendbot).toHaveBeenCalledWith(
      "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
      "testnet",
    );
  });

  it("shows success notice and re-evaluates after successful funding", async () => {
    setConnectedUnfunded();
    friendbotMock.fundWithFriendbot.mockResolvedValue({
      status: "success",
      message: "Account funded with 10,000 XLM.",
    });
    horizonMock.getAccountState
      .mockResolvedValueOnce({ exists: false, xlmBalance: 0, trustlines: [] })
      .mockResolvedValue({ exists: true, xlmBalance: 10000, trustlines: [] });

    render(<OnboardingChecklist />);
    const btn = await screen.findByRole("button", {
      name: /fund with friendbot/i,
    });
    await userEvent.click(btn);
    await waitFor(() =>
      expect(
        screen.getByText(/funded with 10,000 XLM/i),
      ).toBeInTheDocument(),
    );
    // Fund button should disappear after re-evaluation
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /fund with friendbot/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows success notice for already_funded (treated as done)", async () => {
    setConnectedUnfunded();
    friendbotMock.fundWithFriendbot.mockResolvedValue({
      status: "already_funded",
      message: "This account is already funded.",
    });
    horizonMock.getAccountState
      .mockResolvedValueOnce({ exists: false, xlmBalance: 0, trustlines: [] })
      .mockResolvedValue({ exists: true, xlmBalance: 10000, trustlines: [] });

    render(<OnboardingChecklist />);
    const btn = await screen.findByRole("button", {
      name: /fund with friendbot/i,
    });
    await userEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByText(/already funded/i)).toBeInTheDocument(),
    );
  });

  it("shows error notice when Friendbot returns an error", async () => {
    setConnectedUnfunded();
    friendbotMock.fundWithFriendbot.mockResolvedValue({
      status: "error",
      message: "Rate-limited by Friendbot. Please wait a moment and try again.",
    });
    render(<OnboardingChecklist />);
    const btn = await screen.findByRole("button", {
      name: /fund with friendbot/i,
    });
    await userEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByText(/rate-limited/i)).toBeInTheDocument(),
    );
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

describe("accessibility", () => {
  it("progress count is in an aria-live region", async () => {
    resetToNewVisitor();
    render(<OnboardingChecklist />);
    await waitFor(() => screen.getByText(/0 of 5 complete/i));
    const liveEl = screen.getByText(/0 of 5 complete/i);
    expect(liveEl).toHaveAttribute("aria-live", "polite");
  });

  it("notice region has role=status and aria-live=polite", async () => {
    freighterMock.hasFreighter.mockReturnValue(true);
    freighterMock.isConnected.mockResolvedValue(false);
    freighterMock.requestAccess.mockResolvedValue(null);

    render(<OnboardingChecklist />);
    const btn = await screen.findByRole("button", { name: /connect/i });
    await userEvent.click(btn);
    const notice = await screen.findByRole("status");
    expect(notice).toHaveAttribute("aria-live", "polite");
  });
});
