import { render, screen, cleanup } from "@testing-library/react";
import assert from "node:assert/strict";
import { afterEach, describe, expect, it } from "vitest";
import FundingProgress from "../components/FundingProgress.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

afterEach(cleanup);

describe("FundingProgress", () => {
  it.each([
    [0, 25000, 0, "0% funded, 0 of 25,000 USDC"],
    [18000, 25000, 72, "72% funded, 18,000 of 25,000 USDC"],
    [25000, 25000, 100, "100% funded, 25,000 of 25,000 USDC"],
    [120, 100, 100, "100% funded, 120 of 100 USDC"],
    [500, 0, 0, "0% funded, 500 of 0 USDC"],
  ])("exposes %s of %s with value %s", (funded, target, percent, valueText) => {
    render(<FundingProgress funded={funded} target={target} currency="USDC" />);
    const progress = screen.getByRole("progressbar");

    assert.equal(progress.getAttribute("aria-valuemin"), "0");
    assert.equal(progress.getAttribute("aria-valuemax"), "100");
    assert.equal(progress.getAttribute("aria-valuenow"), String(percent));
    assert.equal(progress.getAttribute("aria-valuetext"), valueText);
  });

  it("renders the value as an optional visible label", () => {
    render(<FundingProgress funded={18000} target={25000} currency="USDC" showLabel />);
    assert.ok(screen.getByText("72% funded, 18,000 of 25,000 USDC"));
  });
});

describe("StatusBadge", () => {
  it.each([
    ["open", "Open"],
    ["funded", "Funded"],
    ["settled", "Settled"],
    ["withdrawn", "Withdrawn"],
    [3, "Withdrawn"],
    ["cancelled", "Cancelled"],
    ["future-state", "Unknown"],
  ])("renders %s as %s with a hidden icon", (status, label) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByLabelText(`Status: ${label}`);

    assert.ok(badge.textContent.includes(label));
    assert.ok(badge.querySelector("[aria-hidden='true']"));
  });

  it("announces a live status update politely", () => {
    render(<StatusBadge status="funded" live />);
    assert.equal(screen.getByRole("status", { name: "Status: Funded" }).getAttribute("aria-live"), "polite");
  });

  it("uses the shared badge primitive for on-chain state", () => {
    render(<StatusBadge kind="chain" />);
    assert.ok(screen.getByLabelText("Status: On-chain").textContent.includes("On-chain"));
  });
});