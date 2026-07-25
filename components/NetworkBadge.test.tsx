/**
 * @file components/NetworkBadge.test.tsx
 *
 * Tests for the header Stellar network badge. The badge reads the configured
 * network from `lib/config/env.js`, whose `env` singleton is evaluated once at
 * module load — so each case sets `process.env.NEXT_PUBLIC_STELLAR_NETWORK`
 * and re-imports the component in isolation via `jest.isolateModules`.
 *
 * Coverage:
 *  • testnet, mainnet (public), and unset network values
 *  • the label is text (never colour-only) and mirrored in aria-label
 *  • non-mainnet networks carry a visible non-colour marker
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
  jest.resetModules();
});

/** Set the network env var and render a freshly-evaluated NetworkBadge. */
function renderForNetwork(network?: string) {
  if (network === undefined) {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  } else {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = network;
  }

  let NetworkBadge: React.ComponentType<{ className?: string }> | undefined;
  jest.isolateModules(() => {
    NetworkBadge = require("./NetworkBadge").default;
  });
  return render(React.createElement(NetworkBadge!));
}

describe("NetworkBadge", () => {
  it('renders "Testnet" for the testnet network', () => {
    renderForNetwork("testnet");
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("Testnet");
    expect(badge).toHaveAttribute("data-network", "testnet");
  });

  it('renders "Mainnet" for the public network', () => {
    renderForNetwork("public");
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("Mainnet");
    expect(badge).toHaveAttribute("data-network", "public");
  });

  it('renders "Unknown network" when the network is unset', () => {
    renderForNetwork(undefined);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("Unknown network");
    expect(badge).toHaveAttribute("data-network", "unset");
  });

  it("conveys the network via text label and aria-label, not colour alone", () => {
    renderForNetwork("testnet");
    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "Stellar network: Testnet");
    // Visible label text matches the announced label.
    expect(badge.textContent).toContain("Testnet");
  });

  it("adds a non-colour marker for non-mainnet networks", () => {
    renderForNetwork("testnet");
    expect(screen.getByRole("status").textContent).toContain("!");
  });

  it("omits the warning marker for mainnet", () => {
    renderForNetwork("public");
    expect(screen.getByRole("status").textContent).not.toContain("!");
  });

  it("appends a user-provided className", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    let NetworkBadge: React.ComponentType<{ className?: string }> | undefined;
    jest.isolateModules(() => {
      NetworkBadge = require("./NetworkBadge").default;
    });
    render(React.createElement(NetworkBadge!, { className: "md:hidden" }));
    expect(screen.getByRole("status")).toHaveClass("md:hidden");
  });
});
