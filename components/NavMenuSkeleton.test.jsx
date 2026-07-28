import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import NavMenuSkeleton from "./NavMenuSkeleton";

describe("NavMenuSkeleton", () => {
  it("renders a single header element", () => {
    const { container } = render(<NavMenuSkeleton />);
    expect(container.querySelectorAll("header")).toHaveLength(1);
  });

  it("is hidden from assistive tech (purely decorative placeholder)", () => {
    const { container } = render(<NavMenuSkeleton />);
    expect(container.querySelector("header")).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes a busy state", () => {
    const { container } = render(<NavMenuSkeleton />);
    expect(container.querySelector("header")).toHaveAttribute("aria-busy", "true");
  });

  it("exposes no accessible roles or text (nothing for screen readers to announce)", () => {
    const { container } = render(<NavMenuSkeleton />);
    expect(container.querySelectorAll("a, button, [role]").length).toBe(0);
    expect(container.textContent).toBe("");
  });

  it("renders placeholder blocks with animate-pulse", () => {
    const { container } = render(<NavMenuSkeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("mirrors the wallet placeholder footprint (h-12 w-80) used by WalletStatusLazy", () => {
    const { container } = render(<NavMenuSkeleton />);
    const walletPlaceholders = container.querySelectorAll(".h-12.w-80");
    // One in the desktop row, one in the mobile row — matches NavMenu's
    // two WalletStatusLazy mount points (desktop nav + md:hidden div).
    expect(walletPlaceholders.length).toBe(2);
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<NavMenuSkeleton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
