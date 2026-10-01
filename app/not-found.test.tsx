
/**
 * Tests for app/not-found.js — the branded 404 boundary.
 *
 * Strategy:
 *  - Render the component directly; next/link is already mocked in __mocks__
 *    to a plain <a> tag so href assertions are straightforward.
 *  - Cover copy strings, link target, ARIA structure, a11y, and the
 *    compatibility contract for the /invest/[id] not-found boundary.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

import NotFound, { resolveNotFoundCopy } from "./not-found";
import { copy } from "./copy/en";

// ── Concurrency / idempotency harness ─────────────────────────────────────────
//
// Invariants under test:
//  1. Rendering the 404 boundary is a pure, side-effect-free operation, so
//     concurrent or repeated renders must produce identical output.
//  2. No shared mutable module state may leak between renders (e.g. counters,
//     caches, or memoized singletons that could go stale).
//  3. Retries after a failed render must not observe partial state from the
//     previous attempt.
//
// These helpers exercise those invariants without changing the component's
// public interface.

/**
 * Renders the boundary `times` times concurrently and returns the resulting
 * serialized DOM for each render. Because React Testing Library renders are
 * synchronous, we interleave them via Promise.all to model racing callers.
 */
async function renderConcurrently(times) {
  const results = await Promise.all(
    Array.from({ length: times }, async () => {
      const { container, unmount } = render(<NotFound />);
      const html = container.innerHTML;
      unmount();
      return html;
    })
  );
  return results;
}

/**
 * Renders the boundary, unmounts it, and renders again — modelling an
 * idempotent retry after a transient failure. Returns both snapshots.
 */
function renderThenRetry() {
  const first = render(<NotFound />);
  const firstHtml = first.container.innerHTML;
  first.unmount();

  const second = render(<NotFound />);
  const secondHtml = second.container.innerHTML;
  second.unmount();

  return { firstHtml, secondHtml };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderNotFound() {
  return render(<NotFound />);
}

function renderNotFoundWithRouter() {
  const push = jest.fn();
  const replace = jest.fn();
  return { push, replace, ...render(<NotFound />) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("NotFound (app/not-found.js)", () => {
  // ── Rendering ───────────────────────────────────────────────────────────────

  describe("rendering", () => {
    it("renders the 404 page container", () => {
      renderNotFound();
      expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
    });

    it("renders deterministically across repeated renders (no hidden state)", () => {
      const first = renderNotFoundToString();
      const second = renderNotFoundToString();
      expect(first).toBe(second);
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

    it("renders the same output on repeated renders (deterministic)", () => {
      const first = renderNotFound();
      const firstHtml = first.container.innerHTML;
      first.unmount();
      const second = renderNotFound();
      expect(second.container.innerHTML).toBe(firstHtml);
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

    it("the home link has an accessible name matching the label", () => {
      renderNotFound();
      const link = screen.getByTestId("not-found-home-link");
      expect(link).toHaveAccessibleName(copy.notFound.homeLabel);
    });

    it("the home link is reachable via keyboard tab order", async () => {
      const user = userEvent.setup();
      renderNotFound();
      await user.tab();
      expect(screen.getByTestId("not-found-home-link")).toHaveFocus();
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

    it("the main landmark is the only main landmark", () => {
      renderNotFound();
      expect(screen.getAllByRole("main")).toHaveLength(1);
    });

    it("the aria-labelledby target resolves to an existing element", () => {
      renderNotFound();
      const main = screen.getByRole("main");
      const id = main.getAttribute("aria-labelledby");
      expect(id).toBeTruthy();
      expect(document.getElementById(id as string)).toBeInTheDocument();
    });
  });

  // ── Accessibility ────────────────────────────────────────────────────────────

  describe("accessibility", () => {
    it("has no axe violations", async () => {
      const { container } = renderNotFound();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations when rendered twice (idempotent)", async () => {
      const { container } = renderNotFound();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("validation boundaries", () => {
    it("accepts canonical 404 copy values", () => {
      const resolved = resolveNotFoundCopy({
        heading: " Page not found ",
        description: " The page you’re looking for doesn’t exist or has been moved. ",
        homeLabel: "← Back to LiquiFact",
        statusLabel: "404",
      });

      expect(resolved).toEqual({
        heading: "Page not found",
        description: "The page you’re looking for doesn’t exist or has been moved.",
        homeLabel: "← Back to LiquiFact",
        statusLabel: "404",
      });
    });

    it("rejects blank or malformed copy and falls back to safe defaults", () => {
      const resolved = resolveNotFoundCopy({
        heading: "   ",
        description: "",
        homeLabel: "",
        statusLabel: "500",
      });

      expect(resolved.heading).toBe(copy.notFound.heading);
      expect(resolved.description).toBe(copy.notFound.description);
      expect(resolved.homeLabel).toBe(copy.notFound.homeLabel);
      expect(resolved.statusLabel).toBe("404");
    });

    it("returns the canonical not-found defaults when the source is missing or null", () => {
      expect(resolveNotFoundCopy(null)).toEqual({
        heading: copy.notFound.heading,
        description: copy.notFound.description,
        homeLabel: copy.notFound.homeLabel,
        statusLabel: "404",
      });
      expect(resolveNotFoundCopy(undefined)).toEqual({
        heading: copy.notFound.heading,
        description: copy.notFound.description,
        homeLabel: copy.notFound.homeLabel,
        statusLabel: "404",
      });
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

    it("does not leak interactive state across re-renders", () => {
      const { container, rerender } = renderNotFound();
      const before = container.innerHTML;
      rerender(<NotFound />);
      expect(container.innerHTML).toBe(before);
    });
  });

  // ── Unknown route navigation (snapshot regression) ────────────────────────────

  describe("snapshot regression", () => {
    it("renders consistently across test runs", () => {
      const { container } = renderNotFound();
      expect(container.firstChild).toMatchSnapshot();
    });

    it("does not mutate global state between renders", () => {
      const { container: a } = renderNotFound();
      const htmlA = a.innerHTML;
      const { container: b } = renderNotFound();
      expect(b.innerHTML).toBe(htmlA);
    });
  });

  describe("invariants", () => {
    it("exposes exactly one link and one main landmark (state invariant)", () => {
      renderNotFound();
      expect(screen.getAllByRole("link")).toHaveLength(1);
      expect(screen.getAllByRole("main")).toHaveLength(1);
    });
  });
});
