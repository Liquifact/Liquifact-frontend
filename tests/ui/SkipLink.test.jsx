import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "./axe.js";
import SkipLink from "@/components/SkipLink";

function renderPage() {
  return render(
    <>
      <SkipLink />
      <a href="/">Logo</a>
      <main id="main" tabIndex={-1}>
        <h1>Content</h1>
      </main>
    </>
  );
}

describe("SkipLink", () => {
  it("is the first focusable element and targets #main", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.tab();
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(document.activeElement).toBe(link);
    expect(link.getAttribute("href")).toBe("#main");
  });

  it("moves focus to <main> when activated with Enter", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("has no axe violations", async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
