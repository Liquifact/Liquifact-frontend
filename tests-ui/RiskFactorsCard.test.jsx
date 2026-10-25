import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RiskFactorsCard from "../components/RiskFactorsCard";

describe("RiskFactorsCard component", () => {
  it("renders risk factors table, points, and methodology note", () => {
    const risk = {
      score: 65,
      band: "Elevated",
      factors: [
        { id: "due_date", label: "Time to due date", points: 35, detail: "Due in 6 days with 20% funded" },
        { id: "on_chain", label: "On-chain backing", points: -15, detail: "Smart contract verified" },
        { id: "yield_outlier", label: "Yield outlier", points: 25, detail: "Yield exceeds 2x market median" },
      ],
    };

    render(<RiskFactorsCard risk={risk} />);

    // Heading and score
    expect(screen.getByRole("heading", { name: "Risk factors" })).not.toBeNull();
    expect(screen.getByText(/Deterministic score:/)).not.toBeNull();
    expect(screen.getAllByText("65").length).toBeGreaterThanOrEqual(1);

    // Risk badge with accessible name
    expect(screen.getByRole("status", { name: "Risk: Elevated" })).not.toBeNull();

    // Table of factors
    expect(screen.getByRole("table", { name: "Risk factor breakdown" })).not.toBeNull();
    expect(screen.getByText("Time to due date")).not.toBeNull();
    expect(screen.getByText("+35 pts")).not.toBeNull();
    expect(screen.getByText("Due in 6 days with 20% funded")).not.toBeNull();

    expect(screen.getByText("On-chain backing")).not.toBeNull();
    expect(screen.getByText("-15 pts")).not.toBeNull();
    expect(screen.getByText("Smart contract verified")).not.toBeNull();

    expect(screen.getByText("Yield outlier")).not.toBeNull();
    expect(screen.getByText("+25 pts")).not.toBeNull();

    // Methodology note
    const methodology = screen.getByText(/Indicative only, not credit advice/i);
    expect(methodology).not.toBeNull();
  });

  it("returns null when risk has no band (e.g. settled invoices)", () => {
    const { container } = render(<RiskFactorsCard risk={{ score: null, band: null, factors: [] }} />);
    expect(container.firstChild).toBeNull();
  });
});
