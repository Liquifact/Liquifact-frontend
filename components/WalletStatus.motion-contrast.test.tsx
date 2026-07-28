import fs from "fs";
import path from "path";
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import WalletStatus from "./WalletStatus";
import WalletSkeleton from "./WalletSkeleton";
import { WalletContext, WALLET_STATES } from "./WalletProvider";
import { ToastProvider } from "./ToastProvider";

expect.extend(toHaveNoViolations);

const cssSource = fs.readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");

function extractMediaBlock(source: string, featureFragment: string): string {
  const startPattern = new RegExp(
    `@media\\s*\\([^)]*${featureFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^)]*\\)\\s*\\{`,
    "g"
  );
  const match = startPattern.exec(source);
  if (!match) {
    throw new Error(`Missing media query: ${featureFragment}`);
  }

  let depth = 1;
  let index = match.index + match[0].length;
  while (index < source.length && depth > 0) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    index += 1;
  }

  return source.slice(match.index, index);
}

function expectRule(block: string, selector: string, declarations: string[]) {
  const selectorPattern = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\}`,
    "m"
  );
  const match = selectorPattern.exec(block);
  expect(match).toBeTruthy();
  const body = match?.[1] ?? "";
  for (const declaration of declarations) {
    expect(body).toContain(declaration);
  }
}

function renderWithState(state: string, overrides: Record<string, unknown> = {}) {
  const contextValue = {
    state,
    walletData:
      state === WALLET_STATES.CONNECTED
        ? { address: "GABC...XYZ123", network: "testnet", balance: "1,234.56 XLM" }
        : null,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };

  return render(
    <ToastProvider>
      <WalletContext.Provider value={contextValue}>
        <WalletStatus />
      </WalletContext.Provider>
    </ToastProvider>
  );
}

describe("globals.css — wallet accessibility overrides", () => {
  it("defines prefers-reduced-motion overrides for wallet selectors", () => {
    const block = extractMediaBlock(cssSource, "prefers-reduced-motion: reduce");
    expectRule(block, ".wallet-status-dot", ["transition: none"]);
    expectRule(block, ".wallet-copy-btn", ["transition: none"]);
  });

  it("defines forced-colors overrides for wallet selectors", () => {
    const block = extractMediaBlock(cssSource, "forced-colors: active");
    expectRule(block, ".wallet-status-dot", ["forced-color-adjust: none"]);
    expectRule(block, ".wallet-address-text", ["color: CanvasText", "forced-color-adjust: none"]);
    expectRule(block, ".wallet-balance-text", ["color: GrayText", "forced-color-adjust: none"]);
    expectRule(block, ".wallet-helper-text", ["color: CanvasText", "forced-color-adjust: none"]);
    expectRule(block, ".wallet-skeleton-text-primary", [
      "border: 1px solid CanvasText",
      "background-color: Canvas",
    ]);
  });

  it("defines prefers-contrast overrides for wallet selectors", () => {
    const block = extractMediaBlock(cssSource, "prefers-contrast: more");
    expectRule(block, ".wallet-address-text", ["color: #f1f5f9"]);
    expectRule(block, ".wallet-balance-text", ["color: #cbd5e1"]);
    expectRule(block, ".wallet-helper-text", ["color: #cbd5e1"]);
    expectRule(block, ".wallet-skeleton-text-primary", ["background-color: #475569"]);
    expectRule(block, ".wallet-skeleton-text-secondary", ["background-color: #334155"]);
    expectRule(block, ".wallet-skeleton-btn", ["background-color: #475569"]);
  });
});

describe("WalletSkeleton — accessibility hooks and classes", () => {
  it("carries motion-reduce and hook class on the status dot", () => {
    const { container } = render(<WalletSkeleton />);
    const dot = container.querySelector(".wallet-status-dot");
    expect(dot).toBeInTheDocument();
    expect(dot?.className).toContain("motion-reduce:animate-none");
    expect(dot?.className).toContain("animate-pulse");
  });

  it("carries motion-reduce and hook class on the primary text shape", () => {
    const { container } = render(<WalletSkeleton />);
    const shape = container.querySelector(".wallet-skeleton-text-primary");
    expect(shape).toBeInTheDocument();
    expect(shape?.className).toContain("motion-reduce:animate-none");
    expect(shape?.className).toContain("animate-pulse");
  });

  it("carries motion-reduce and hook class on the secondary text shape", () => {
    const { container } = render(<WalletSkeleton />);
    const shape = container.querySelector(".wallet-skeleton-text-secondary");
    expect(shape).toBeInTheDocument();
    expect(shape?.className).toContain("motion-reduce:animate-none");
    expect(shape?.className).toContain("animate-pulse");
  });

  it("carries motion-reduce and hook class on the action button shape", () => {
    const { container } = render(<WalletSkeleton />);
    const shape = container.querySelector(".wallet-skeleton-btn");
    expect(shape).toBeInTheDocument();
    expect(shape?.className).toContain("motion-reduce:animate-none");
    expect(shape?.className).toContain("animate-pulse");
  });

  it("passes axe verification", async () => {
    const { container } = render(<WalletSkeleton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("exposes the loading label outside the aria-hidden skeleton", () => {
    const { getByText } = render(<WalletSkeleton />);
    expect(getByText(/loading/i)).toHaveClass("sr-only");
  });
});

describe("WalletStatus — accessibility hooks and classes", () => {
  it("carries motion-reduce and hook class on the status dot when CONNECTING", () => {
    const { container } = renderWithState(WALLET_STATES.CONNECTING);
    const dot = container.querySelector(".wallet-status-dot");
    expect(dot).toBeInTheDocument();
    expect(dot?.className).toContain("motion-reduce:animate-none");
    expect(dot?.className).toContain("motion-reduce:transition-none");
    expect(dot?.className).toContain("animate-pulse");
  });

  it("carries wallet-helper-text hook when CONNECTING", () => {
    renderWithState(WALLET_STATES.CONNECTING);
    const helperText = screen.getByText("Connecting wallet...");
    expect(helperText.className).toContain("wallet-helper-text");
  });

  it("carries hooks and motion-reduce classes when CONNECTED", () => {
    const { container } = renderWithState(WALLET_STATES.CONNECTED);

    const dot = container.querySelector(".wallet-status-dot");
    expect(dot).toBeInTheDocument();
    expect(dot?.className).toContain("motion-reduce:transition-none");

    const address = container.querySelector(".wallet-address-text");
    expect(address).toBeInTheDocument();
    expect(address).toHaveTextContent("GABC...XYZ123");

    const balance = container.querySelector(".wallet-balance-text");
    expect(balance).toBeInTheDocument();
    expect(balance).toHaveTextContent("1.23K XLM");

    const copyBtn = container.querySelector(".wallet-copy-btn");
    expect(copyBtn).toBeInTheDocument();
    expect(copyBtn?.className).toContain("motion-reduce:transition-none");
  });

  it("passes axe verification in connected state", async () => {
    const { container } = renderWithState(WALLET_STATES.CONNECTED);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
