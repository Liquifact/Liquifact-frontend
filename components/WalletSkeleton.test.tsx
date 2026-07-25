/**
 * @file components/WalletSkeleton.test.tsx
 *
 * Unit and accessibility tests for the WalletSkeleton component.
 *
 * Coverage goals:
 *   - Renders all structural skeleton shapes
 *   - aria-hidden="true" — AT skips the decorative pulse shapes
 *   - aria-busy="true" — signals in-progress region to AT
 *   - sr-only loading text is present in the DOM
 *   - data-testid is "wallet-skeleton" by default and overridable
 *   - Optional className is forwarded to the wrapper
 *   - No accessibility violations (jest-axe)
 *   - Matches snapshot for regression detection
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import "jest-axe/extend-expect";
import WalletSkeleton from "./WalletSkeleton";
import { copy } from "../app/copy/en";

expect.extend(toHaveNoViolations);

// ── helpers ──────────────────────────────────────────────────────────────────

function renderSkeleton(props: React.ComponentProps<typeof WalletSkeleton> = {}) {
  return render(<WalletSkeleton {...props} />);
}

// ── rendering ────────────────────────────────────────────────────────────────

describe("WalletSkeleton — rendering", () => {
  it("renders the skeleton wrapper", () => {
    renderSkeleton();
    expect(screen.getByTestId("wallet-skeleton")).toBeInTheDocument();
  });

  it("renders three animate-pulse shapes (dot, primary line, secondary line, button)", () => {
    const { container } = renderSkeleton();
    const pulseShapes = container.querySelectorAll(".animate-pulse");
    // dot + primary text + secondary text + button = 4 shapes
    expect(pulseShapes.length).toBe(4);
  });

  it("renders status dot with correct dimensions", () => {
    const { container } = renderSkeleton();
    const dot = container.querySelector(".h-2.w-2.rounded-full");
    expect(dot).toBeInTheDocument();
  });

  it("renders primary text line", () => {
    const { container } = renderSkeleton();
    const primaryLine = container.querySelector(".h-3.w-24");
    expect(primaryLine).toBeInTheDocument();
  });

  it("renders secondary text line", () => {
    const { container } = renderSkeleton();
    const secondaryLine = container.querySelector(".h-2\\.5.w-40");
    expect(secondaryLine).toBeInTheDocument();
  });

  it("renders button pill with correct dimensions", () => {
    const { container } = renderSkeleton();
    const buttonPill = container.querySelector(".h-9.w-32.rounded-full");
    expect(buttonPill).toBeInTheDocument();
  });

  it("wrapper uses flex layout matching WalletStatus outer row", () => {
    renderSkeleton();
    const wrapper = screen.getByTestId("wallet-skeleton");
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("items-center");
    expect(wrapper).toHaveClass("gap-4");
  });
});

// ── accessibility ─────────────────────────────────────────────────────────────

describe("WalletSkeleton — accessibility", () => {
  it("has aria-hidden=true so screen readers skip decorative shapes", () => {
    renderSkeleton();
    expect(screen.getByTestId("wallet-skeleton")).toHaveAttribute("aria-hidden", "true");
  });

  it("has aria-busy=true to signal an updating region", () => {
    renderSkeleton();
    expect(screen.getByTestId("wallet-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("contains a sr-only loading text matching copy.wallet.skeletonLabel", () => {
    const { container } = renderSkeleton();
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).toBeInTheDocument();
    expect(srOnly).toHaveTextContent(copy.wallet.skeletonLabel);
  });

  it("copy.wallet.skeletonLabel is a non-empty string", () => {
    expect(typeof copy.wallet.skeletonLabel).toBe("string");
    expect(copy.wallet.skeletonLabel.length).toBeGreaterThan(0);
  });

  it("passes jest-axe accessibility audit", async () => {
    const { container } = renderSkeleton();
    // aria-hidden=true on a container with aria-busy is acceptable:
    // the skeleton is purely decorative; AT jump to the real WalletStatus.
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── props forwarding ──────────────────────────────────────────────────────────

describe("WalletSkeleton — props", () => {
  it("uses 'wallet-skeleton' as the default data-testid", () => {
    renderSkeleton();
    expect(screen.getByTestId("wallet-skeleton")).toBeInTheDocument();
  });

  it("accepts a custom data-testid override", () => {
    renderSkeleton({ "data-testid": "my-skeleton" });
    expect(screen.getByTestId("my-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-skeleton")).not.toBeInTheDocument();
  });

  it("forwards an optional className to the wrapper", () => {
    renderSkeleton({ className: "mt-4 opacity-50" });
    const wrapper = screen.getByTestId("wallet-skeleton");
    expect(wrapper).toHaveClass("mt-4");
    expect(wrapper).toHaveClass("opacity-50");
    // Core layout classes must survive
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("items-center");
    expect(wrapper).toHaveClass("gap-4");
  });

  it("forwards arbitrary extra props to the wrapper div", () => {
    renderSkeleton({ id: "wallet-loading" });
    expect(screen.getByTestId("wallet-skeleton")).toHaveAttribute("id", "wallet-loading");
  });
});

// ── snapshot ──────────────────────────────────────────────────────────────────

describe("WalletSkeleton — snapshot", () => {
  it("matches the stable markup snapshot", () => {
    const { container } = renderSkeleton();
    expect(container.firstChild).toMatchSnapshot();
  });
});
