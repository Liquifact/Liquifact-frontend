/**
 * @file components/NetworkMismatchBanner.test.jsx
 *
 * Component, integration, and accessibility tests for NetworkMismatchBanner.
 *
 * All 5 mandated edge cases are covered:
 *  1. wallet disconnected  → bannerBodyDisconnected message
 *  2. unknown network      → bannerBodyUnknown message
 *  3. network changes while modal open (status changes dynamically)
 *  4. testnet invoice      → correct invoiceNetwork label shown
 *  5. user switches accounts → banner updates when status changes
 *
 * Plus: a11y (role=alert, aria-live, aria-label), ok/checking renders nothing,
 * icon is aria-hidden, and the live region is announced via the liveRegion util.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import NetworkMismatchBanner from "./NetworkMismatchBanner";

expect.extend(toHaveNoViolations);

// ── Mock the liveRegion announce utility ──────────────────────────────────────
jest.mock("@/lib/a11y/liveRegion", () => ({
  announce: jest.fn(),
}));
const { announce } = require("@/lib/a11y/liveRegion");

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_INVOICE_NETWORK = "testnet";

function renderBanner(props = {}) {
  const defaults = {
    status: "mismatch",
    walletNetwork: "public",
    invoiceNetwork: DEFAULT_INVOICE_NETWORK,
  };
  return render(<NetworkMismatchBanner {...defaults} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NetworkMismatchBanner", () => {
  // ── Renders nothing for non-blocking statuses ──────────────────────────────
  describe("renders nothing when status is ok or checking", () => {
    it("renders nothing when status=ok", () => {
      const { container } = renderBanner({ status: "ok", walletNetwork: "testnet" });
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when status=checking", () => {
      const { container } = renderBanner({ status: "checking", walletNetwork: null });
      expect(container.firstChild).toBeNull();
    });
  });

  // ── Edge case 1: wallet disconnected ──────────────────────────────────────
  describe("edge case 1: wallet disconnected", () => {
    it("renders the banner with disconnected message when status=disconnected", () => {
      renderBanner({ status: "disconnected", walletNetwork: null });
      expect(screen.getByTestId("network-mismatch-banner")).toBeInTheDocument();
      expect(screen.getByTestId("network-mismatch-title")).toHaveTextContent("Wrong network");
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent(
        /Connect your wallet to Testnet/i
      );
    });

    it("does NOT mention wallet network label when disconnected (walletNetwork is null)", () => {
      renderBanner({ status: "disconnected", walletNetwork: null });
      // The message body should only reference invoiceNetwork, not walletNetwork
      const body = screen.getByTestId("network-mismatch-body");
      expect(body).not.toHaveTextContent(/Public/i);
    });
  });

  // ── Edge case 2: unknown network ──────────────────────────────────────────
  describe("edge case 2: unknown network", () => {
    it("renders bannerBodyUnknown message when status=unknown", () => {
      renderBanner({ status: "unknown", walletNetwork: null });
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent(
        /could not be read/i
      );
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent(/Testnet/i);
    });
  });

  // ── Edge case 3: network changes while modal open ─────────────────────────
  describe("edge case 3: network changes dynamically", () => {
    it("transitions from ok (hidden) to mismatch (visible) when network changes", () => {
      const { rerender, container } = renderBanner({
        status: "ok",
        walletNetwork: "testnet",
      });
      // Initially hidden.
      expect(container.firstChild).toBeNull();

      // Network changes — user switches wallet to public while page is open.
      rerender(
        <NetworkMismatchBanner
          status="mismatch"
          walletNetwork="public"
          invoiceNetwork="testnet"
        />
      );
      expect(screen.getByTestId("network-mismatch-banner")).toBeInTheDocument();
    });

    it("disappears when status returns to ok", () => {
      const { rerender } = renderBanner({ status: "mismatch", walletNetwork: "public" });
      expect(screen.getByTestId("network-mismatch-banner")).toBeInTheDocument();

      rerender(
        <NetworkMismatchBanner status="ok" walletNetwork="testnet" invoiceNetwork="testnet" />
      );
      expect(screen.queryByTestId("network-mismatch-banner")).not.toBeInTheDocument();
    });

    it("transitions from mismatch to disconnected banner message when wallet disconnects", () => {
      const { rerender } = renderBanner({ status: "mismatch", walletNetwork: "public" });
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent(/Your wallet is on/i);

      rerender(
        <NetworkMismatchBanner
          status="disconnected"
          walletNetwork={null}
          invoiceNetwork="testnet"
        />
      );
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent(/Connect your wallet/i);
    });
  });

  // ── Edge case 4: testnet invoice ──────────────────────────────────────────
  describe("edge case 4: testnet invoice", () => {
    it("displays invoiceNetwork=testnet as 'Testnet' in the message", () => {
      renderBanner({
        status: "mismatch",
        walletNetwork: "public",
        invoiceNetwork: "testnet",
      });
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent(/Testnet/);
    });

    it("displays walletNetwork=public as 'Public' in the mismatch message", () => {
      renderBanner({
        status: "mismatch",
        walletNetwork: "public",
        invoiceNetwork: "testnet",
      });
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent(/Public/);
    });
  });

  // ── Edge case 5: user switches accounts ───────────────────────────────────
  describe("edge case 5: user switches accounts", () => {
    it("updates the banner message when walletNetwork changes due to account switch", () => {
      const { rerender } = renderBanner({
        status: "mismatch",
        walletNetwork: "public",
        invoiceNetwork: "testnet",
      });
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent(/Public/);

      // After account switch, new account is on a different network.
      rerender(
        <NetworkMismatchBanner
          status="unknown"
          walletNetwork={null}
          invoiceNetwork="testnet"
        />
      );
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent(/could not be read/i);
    });
  });

  // ── Accessibility ──────────────────────────────────────────────────────────
  describe("accessibility", () => {
    it("has role=alert on the banner element", () => {
      renderBanner({ status: "mismatch", walletNetwork: "public" });
      const banner = screen.getByTestId("network-mismatch-banner");
      expect(banner).toHaveAttribute("role", "alert");
    });

    it("has aria-live=assertive on the banner element", () => {
      renderBanner({ status: "mismatch", walletNetwork: "public" });
      const banner = screen.getByTestId("network-mismatch-banner");
      expect(banner).toHaveAttribute("aria-live", "assertive");
    });

    it("has a descriptive aria-label on the banner element", () => {
      renderBanner({ status: "mismatch", walletNetwork: "public" });
      const banner = screen.getByTestId("network-mismatch-banner");
      expect(banner).toHaveAttribute("aria-label", "Network mismatch warning");
    });

    it("has aria-hidden on the warning icon SVG", () => {
      renderBanner({ status: "mismatch", walletNetwork: "public" });
      const banner = screen.getByTestId("network-mismatch-banner");
      const svg = banner.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("passes axe accessibility audit for mismatch status", async () => {
      const { container } = renderBanner({ status: "mismatch", walletNetwork: "public" });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe accessibility audit for disconnected status", async () => {
      const { container } = renderBanner({ status: "disconnected", walletNetwork: null });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe accessibility audit for unknown status", async () => {
      const { container } = renderBanner({ status: "unknown", walletNetwork: null });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ── Live region announcements ──────────────────────────────────────────────
  describe("live region announcement", () => {
    it("calls announce when status becomes mismatch", () => {
      renderBanner({ status: "mismatch", walletNetwork: "public" });
      expect(announce).toHaveBeenCalledWith(
        expect.stringContaining("Testnet")
      );
    });

    it("calls announce when status is disconnected", () => {
      renderBanner({ status: "disconnected", walletNetwork: null });
      expect(announce).toHaveBeenCalledWith(expect.stringContaining("Testnet"));
    });

    it("calls announce when status is unknown", () => {
      renderBanner({ status: "unknown", walletNetwork: null });
      expect(announce).toHaveBeenCalledWith(expect.stringContaining("Testnet"));
    });

    it("does NOT call announce when status=ok", () => {
      renderBanner({ status: "ok", walletNetwork: "testnet" });
      expect(announce).not.toHaveBeenCalled();
    });

    it("does NOT call announce when status=checking", () => {
      renderBanner({ status: "checking", walletNetwork: null });
      expect(announce).not.toHaveBeenCalled();
    });

    it("does NOT call announce again when same status is re-rendered (no spam)", () => {
      const { rerender } = renderBanner({ status: "mismatch", walletNetwork: "public" });
      expect(announce).toHaveBeenCalledTimes(1);

      // Re-render with same status.
      rerender(
        <NetworkMismatchBanner status="mismatch" walletNetwork="public" invoiceNetwork="testnet" />
      );
      // announce should not fire again for the same status.
      expect(announce).toHaveBeenCalledTimes(1);
    });
  });

  // ── Message content ────────────────────────────────────────────────────────
  describe("message content", () => {
    it("renders mismatch body with both network names in strong tags", () => {
      renderBanner({ status: "mismatch", walletNetwork: "public", invoiceNetwork: "testnet" });
      const body = screen.getByTestId("network-mismatch-body");
      const strongs = body.querySelectorAll("strong");
      const texts = Array.from(strongs).map((s) => s.textContent);
      expect(texts).toContain("Public");
      expect(texts).toContain("Testnet");
    });

    it("capitalises network names for display", () => {
      renderBanner({
        status: "mismatch",
        walletNetwork: "public",
        invoiceNetwork: "testnet",
      });
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent("Public");
      expect(screen.getByTestId("network-mismatch-body")).toHaveTextContent("Testnet");
    });
  });
});
