import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

import Home from "./page";
import { getHealth } from "../lib/api/health";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("../components/WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

jest.mock("../lib/api/health", () => ({
  __esModule: true,
  getHealth: jest.fn(),
}));

jest.mock("../components/NavMenu", () => {
  return function MockNavMenu() {
    return <div data-testid="nav-menu">NavMenu</div>;
  };
});

describe("Home Page Accessibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes axe smoke test", async () => {
    const { container } = render(<Home />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has exactly one h1 containing the hero title", () => {
    render(<Home />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeTruthy();
    expect(h1.textContent).toMatch(/global invoice liquidity network/i);
  });

  it("has exactly two h2 headings (CTA cards only)", () => {
    render(<Home />);
    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s).toHaveLength(2);
  });

  it("does not have a heading for API status", () => {
    render(<Home />);
    const apiStatusHeading = screen.queryByRole("heading", { name: /api status/i });
    expect(apiStatusHeading).toBeNull();
  });

  it("CTA link for businesses has a descriptive aria-label", () => {
    render(<Home />);
    const businessLink = screen.getByRole("link", { name: /for businesses/i });
    expect(businessLink).toBeTruthy();
    expect(businessLink.getAttribute("href")).toBe("/invoices");
  });

  it("CTA link for investors has a descriptive aria-label", () => {
    render(<Home />);
    const investLink = screen.getByRole("link", { name: /for investors/i });
    expect(investLink).toBeTruthy();
    expect(investLink.getAttribute("href")).toBe("/invest");
  });

  it("h1 appears before h2 headings in DOM order", () => {
    render(<Home />);
    const headings = Array.from(document.querySelectorAll("h1, h2"));
    expect(headings[0].tagName).toBe("H1");
    expect(headings[1].tagName).toBe("H2");
    expect(headings[2].tagName).toBe("H2");
  });
});
