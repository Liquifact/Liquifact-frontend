import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RiskBadge from "../components/RiskBadge";

describe("RiskBadge component", () => {
  it("renders text and accessible name for Elevated risk", () => {
    const factors = [
      { id: "due_date", label: "Time to due date", points: 35, detail: "Due in 6 days with 20% funded" },
      { id: "on_chain", label: "On-chain backing", points: 10, detail: "Off-chain listing" },
    ];

    render(<RiskBadge band="Elevated" score={65} factors={factors} />);

    const badge = screen.getByRole("status", { name: "Risk: Elevated" });
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain("Elevated");
    expect(badge.textContent).toContain("65");
    expect(badge.className).toContain("badge-risk-elevated");
    expect(badge.getAttribute("title")).toContain("Why?");
    expect(badge.getAttribute("title")).toContain("Time to due date");
  });

  it("renders distinct icons for each risk band", () => {
    const bands = ["Low", "Moderate", "Elevated", "High"];

    for (const band of bands) {
      const { container, unmount } = render(<RiskBadge band={band} score={20} />);
      const badge = screen.getByRole("status", { name: `Risk: ${band}` });
      expect(badge).not.toBeNull();
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      unmount();
    }
  });

  it("returns null when band is not provided", () => {
    const { container } = render(<RiskBadge band={null} />);
    expect(container.firstChild).toBeNull();
  });
});
