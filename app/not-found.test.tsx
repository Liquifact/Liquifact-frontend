/**
 * Tests for app/not-found.js — the branded 404 boundary.
 *
 * Strategy:
 *  - Render the component directly; next/link is already mocked in __mocks__
 *    to a plain <a> tag so href assertions are straightforward.
 *  - Cover copy strings, link target, ARIA structure, and a11y.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import React from "react";

import NotFound from "./not-found";
import { copy } from "./copy/en";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderNotFound() {
  return render(<NotFound />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("NotFound (app/not-found.js)", () => {
  // ── Rendering ───────────────────────────────────────────────────────────────

  describe("rendering", () => {
    it("renders the 404 page container", () => {
      renderNotFound();
      expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
    });

    it("renders the h1 heading with the correct copy", () => {
      renderNotFound();
      expect(
        screen.getByRole("heading", { level: 1, name: copy.notFound.heading })
      ).toBeInTheDocument();
    });

    it("renders the description copy", () => {
      renderNotFound();
      expect(screen.getByText(copy.notFound.description)).toBeInTheDocument();
    });

    it("renders the decorative status label text", () => {
      renderNotFound();
      // aria-hidden means it won't be in the accessibility tree, but it is in the DOM
      const badge = document.querySelector("[aria-hidden='true']");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(copy.notFound.statusLabel);
    });

    it("renders only one h1 on the page", () => {
      renderNotFound();
      const headings = screen.getAllByRole("heading", { level: 1 });
      expect(headings).toHaveLength(1);
    });
  });

  // ── Home link ────────────────────────────────────────────────────────────────

  describe("home link", () => {
    it("renders a home link with the correct label", () => {
      renderNotFound();
      const link = screen.getByTestId("not-found-home-link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent(copy.notFound.homeLabel);
    });

    it("the home link points to /", () => {
      renderNotFound();
      expect(screen.getByTestId("not-found-home-link")).toHaveAttribute("href", "/");
    });

    it("the home link is keyboard focusable (no tabIndex=-1)", () => {
      renderNotFound();
      const link = screen.getByTestId("not-found-home-link");
      expect(link).not.toHaveAttribute("tabindex", "-1");
    });

    it("the home link is the sole link on the page", () => {
      renderNotFound();
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute("href", "/");
    });

    it("has a focus-ring class for consistent keyboard styling", () => {
      renderNotFound();
      const link = screen.getByTestId("not-found-home-link");
      expect(link.className).toContain("focus-ring");
    });
  });

  // ── ARIA / landmarks ─────────────────────────────────────────────────────────

  describe("ARIA and landmarks", () => {
    it("renders a main landmark", () => {
      renderNotFound();
      expect(screen.getByRole("main")).toBeInTheDocument();
    });

    it("the main landmark has aria-labelledby pointing to the h1", () => {
      renderNotFound();
      const main = screen.getByRole("main");
      expect(main).toHaveAttribute("aria-labelledby", "not-found-heading");
    });

    it("the main landmark id matches the h1 aria-labelledby", () => {
      renderNotFound();
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveAttribute("id", "not-found-heading");
    });

    it("the decorative status badge is hidden from assistive tech", () => {
      renderNotFound();
      const badge = document.querySelector("[aria-hidden='true']");
      expect(badge).toHaveAttribute("aria-hidden", "true");
    });
  });

  // ── Accessibility ────────────────────────────────────────────────────────────

  describe("accessibility", () => {
    it("has no axe violations", async () => {
      const { container } = renderNotFound();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ── Dark theme / styling ──────────────────────────────────────────────────────

  describe("theme / styling", () => {
    it("applies the dark slate-950 background to the page wrapper", () => {
      renderNotFound();
      const page = screen.getByTestId("not-found-page");
      expect(page.className).toContain("bg-slate-950");
    });

    it("applies text-slate-50 to the page wrapper", () => {
      renderNotFound();
      const page = screen.getByTestId("not-found-page");
      expect(page.className).toContain("text-slate-50");
    });

    it("the status label uses the cyan brand colour class", () => {
      renderNotFound();
      const badge = document.querySelector("[aria-hidden='true']");
      expect(badge?.className).toContain("text-cyan-500");
    });
  });

  // ── Unknown route navigation (snapshot regression) ────────────────────────────

  describe("snapshot regression", () => {
    it("renders consistently across test runs", () => {
      const { container } = renderNotFound();
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
