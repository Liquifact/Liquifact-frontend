import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, afterEach } from "vitest";
import EscrowRules from "@/components/escrow/EscrowRules";

const XLM = 10000000n;

const base = {
  minContributionFloor: 10n * XLM,
  maxPerInvestorCap: 400n * XLM,
  remainingCapacity: 700n * XLM,
  fundingDeadline: 1_900_000_000,
  paused: false,
  legalHold: false,
  status: 0,
  contribution: 0n,
  errors: [],
};

afterEach(cleanup);

describe("EscrowRules", () => {
  it("renders min/max/remaining/deadline rows", () => {
    render(<EscrowRules constraints={base} currency="XLM" />);
    expect(screen.getByText("Min contribution")).toBeTruthy();
    expect(screen.getByText("10 XLM")).toBeTruthy();
    expect(screen.getByText("400 XLM")).toBeTruthy();
    expect(screen.getByText("700 XLM")).toBeTruthy();
    expect(screen.getByText(/Funding deadline/)).toBeTruthy();
    expect(screen.getByText(/UTC \(in /)).toBeTruthy();
    expect(screen.getByText("Open for funding")).toBeTruthy();
  });

  it("shows 'No cap' and 'No deadline' when unset", () => {
    render(<EscrowRules constraints={{ ...base, maxPerInvestorCap: null, fundingDeadline: null }} />);
    expect(screen.getByText("No cap")).toBeTruthy();
    expect(screen.getByText("No deadline")).toBeTruthy();
  });

  it("shows Paused and Legal hold flags when active", () => {
    render(<EscrowRules constraints={{ ...base, paused: true, legalHold: true }} />);
    expect(screen.getByText("Paused")).toBeTruthy();
    expect(screen.getByText("Legal hold")).toBeTruthy();
    expect(screen.queryByText("Open for funding")).toBeNull();
  });

  it("notes partial reads when errors are present", () => {
    render(<EscrowRules constraints={{ ...base, errors: [{ method: "x", message: "y" }] }} />);
    expect(screen.getByRole("status").textContent).toMatch(/could not be read/);
  });
});
