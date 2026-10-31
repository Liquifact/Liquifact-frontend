import { WalletProvider } from "@/components/wallet/WalletProvider";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "./axe.js";
import SiteHeader from "@/components/SiteHeader";

let mockPathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname }));
// The theme toggle and notification bell have their own suites; keep this one focused on navigation.
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("@/components/NotificationBell", () => ({ default: () => null }));
vi.mock("@/components/TxActivityButton", () => ({ default: () => null }));

function renderHeader() {
  return render(
    <>
      <WalletProvider><SiteHeader /></WalletProvider>
      <main id="main" tabIndex={-1}>
        <button type="button">Page action</button>
      </main>
    </>
  );
}

const menuButton = () => screen.getByRole("button", { name: /menu/i });
const navLinks = () => screen.getByRole("navigation", { name: "Main" }).querySelectorAll("a");

beforeEach(() => {
  mockPathname = "/";
});

describe("SiteHeader", () => {
  it("exposes a labelled nav landmark and a named brand link", () => {
    renderHeader();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "LiquiFact home" }).getAttribute("href")).toBe("/");
  });

  it("toggles the button label and aria-expanded", async () => {
    const user = userEvent.setup();
    renderHeader();
    const btn = screen.getByRole("button", { name: "Open menu" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(btn.querySelector('[aria-hidden="true"]')).toBeTruthy();
    await user.click(btn);
    expect(btn.getAttribute("aria-label")).toBe("Close menu");
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    await user.click(btn);
    expect(btn.getAttribute("aria-label")).toBe("Open menu");
  });

  it("focuses the first link when opened", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(menuButton());
    expect(document.activeElement).toBe(navLinks()[0]);
  });

  it("opens with the keyboard (Enter and Space)", async () => {
    const user = userEvent.setup();
    renderHeader();
    menuButton().focus();
    await user.keyboard("{Enter}");
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    await user.keyboard("{Escape}");
    await user.keyboard(" ");
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
  });

  it("closes on Escape and returns focus to the button", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(menuButton());
    await user.keyboard("{Escape}");
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menuButton());
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(menuButton());
    await user.click(screen.getByRole("button", { name: "Page action" }));
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("stays open when clicking inside the menu", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(menuButton());
    await user.pointer({ keys: "[MouseLeft>]", target: screen.getByRole("navigation", { name: "Main" }) });
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
  });

  it("closes when tabbing past the last link", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(menuButton());
    const links = navLinks();
    links[links.length - 1].focus();
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /connect wallet/i }));
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    await user.tab();
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("stays open when Shift+Tab moves from the first link to the button", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(menuButton());
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(menuButton());
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
  });

  it("closes on route change", async () => {
    const user = userEvent.setup();
    const { rerender } = renderHeader();
    await user.click(menuButton());
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    mockPathname = "/marketplace";
    rerender(
      <>
        <WalletProvider><SiteHeader /></WalletProvider>
        <main id="main" tabIndex={-1} />
      </>
    );
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("locks body scroll only while open", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(menuButton());
    expect(document.body.classList.contains("menu-open")).toBe(true);
    await user.keyboard("{Escape}");
    expect(document.body.classList.contains("menu-open")).toBe(false);
  });

  it("marks only the exact or nested route as current", () => {
    mockPathname = "/marketplace/INV_1";
    renderHeader();
    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.textContent)).toEqual(["Marketplace"]);
  });

  it("has no axe violations when closed or open", async () => {
    const user = userEvent.setup();
    const { container } = renderHeader();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(menuButton());
    expect(await axe(container)).toHaveNoViolations();
  });
});
