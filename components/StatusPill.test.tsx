/**
 * @file components/StatusPill.test.tsx
 *
 * Unit + a11y tests for the shared StatusPill badge.  These tests are the
 * definition of the pill contract — `InvoiceCard` and the detail page only
 * test their own wiring into StatusPill and trust this suite for label /
 * tone / fallback semantics.
 *
 * Areas covered
 * ─────────────
 * 1. Each known status renders the expected visible label and tone classes
 * 2. `data-status` attribute on the rendered span uses canonical keys
 * 3. Unknown / nullish / empty inputs fall back to the neutral `Unknown` pill
 * 4. The pill is a `<span>` (purely presentational, no interactive role)
 * 5. `aria-label` exposes the same word as the visible label (no colour-only
 *    signal — satisfies the a11y contract documented in COMPONENTS.md)
 * 6. Determinism / no-mutation of props across many calls
 * 7. Class merging: tone classes are always present, user `className` is
 *    appended when supplied
 *
 * Target coverage: ≥ 95% branch coverage for StatusPill.jsx.
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import StatusPill from "./StatusPill";
import { INVOICE_STATUSES, STATUS_PILL_MAP, resolveStatusPill } from "@/lib/types/invoice";

// ─── 1. Known statuses — label, tone, and data-status attribute ─────────────

describe.each([
  [INVOICE_STATUSES.OPEN, "Open", "bg-cyan-900/40"],
  [INVOICE_STATUSES.FUNDED, "Funded", "bg-slate-700/40"],
  [INVOICE_STATUSES.SETTLED, "Settled", "bg-emerald-900/30"],
  [INVOICE_STATUSES.OVERDUE, "Overdue by maturity", "bg-amber-900/40"],
])("StatusPill — known status %s", (status, expectedLabel, expectedTonePrefix) => {
  it(`renders the visible label "${expectedLabel}"`, () => {
    render(<StatusPill status={status} />);
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(expectedLabel);
  });

  it(`exposes the same word via aria-label`, () => {
    render(<StatusPill status={status} />);
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toHaveAttribute("aria-label", `Status: ${expectedLabel}`);
  });

  it(`uses data-status="${status}" so tests / styling hooks can target it`, () => {
    render(<StatusPill status={status} />);
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toHaveAttribute("data-status", status);
  });

  it(`includes the tone background colour for "${status}"`, () => {
    render(<StatusPill status={status} />);
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toHaveClass(expectedTonePrefix);
  });

  it(`text colour matches the tone mapping for "${status}"`, () => {
    render(<StatusPill status={status} />);
    const badge = screen.getByRole("status", { hidden: true });
    // The tone table is the source of truth — re-import and check the
    // expected text-* utility is among the applied classes.
    const expectedToneClass = STATUS_PILL_MAP[status].tone.split(/\s+/);
    expectedToneClass.forEach((cls) => expect(badge).toHaveClass(cls));
  });
});

// ─── 2. Unknown / nullish / empty fallback ───────────────────────────────────

describe.each([
  ["empty string", ""],
  ["plain garbage string", "garbage-status"],
  ["lowercase legacy 'available'", "available"],
  ["whitespace-only", "   "],
  ["null", null],
  ["undefined", undefined],
  ["number 0", 0],
  ["number 7", 7],
  ["boolean true", true],
  ["object {}", {}],
  ["array []", []],
])("StatusPill — neutral fallback for %s", (_label, input) => {
  it("renders without throwing", () => {
    expect(() => render(<StatusPill status={input as any} />)).not.toThrow();
  });

  it('renders a role="status" span (empty input does NOT hide the pill)', () => {
    render(<StatusPill status={input as any} />);
    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
  });

  it('falls back to the "Unknown" label', () => {
    render(<StatusPill status={input as any} />);
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("Unknown");
  });

  it('sets data-status="Unknown" so the fallback is observable from outside', () => {
    render(<StatusPill status={input as any} />);
    expect(screen.getByRole("status", { hidden: true })).toHaveAttribute("data-status", "Unknown");
  });

  it("uses the neutral Unknown tone classes", () => {
    render(<StatusPill status={input as any} />);
    const badge = screen.getByRole("status", { hidden: true });
    STATUS_PILL_MAP.Unknown.tone.split(/\s+/).forEach((cls) => expect(badge).toHaveClass(cls));
  });
});

// ─── 3. Element shape ───────────────────────────────────────────────────────

describe("StatusPill — element shape", () => {
  it("renders as a <span>, never a <button>", () => {
    render(<StatusPill status="Open" />);
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge.tagName).toBe("SPAN");
  });

  it("does not advertise itself as a button to assistive tech", () => {
    render(<StatusPill status="Open" />);
    expect(screen.queryByRole("button", { name: /Status:/i })).not.toBeInTheDocument();
  });

  it("always includes the canonical pill shape classes", () => {
    render(<StatusPill status="Open" />);
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toHaveClass("inline-flex");
    expect(badge).toHaveClass("items-center");
    expect(badge).toHaveClass("rounded-full");
    expect(badge).toHaveClass("px-2.5");
    expect(badge).toHaveClass("py-0.5");
    expect(badge).toHaveClass("text-xs");
    expect(badge).toHaveClass("font-medium");
  });
});

// ─── 4. className merging ────────────────────────────────────────────────────

describe("StatusPill — className merging", () => {
  it("appends the user-provided className to the tone classes", () => {
    render(<StatusPill status="Open" className="ml-2" />);
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toHaveClass("ml-2");
    // Tone classes still present alongside.
    expect(badge).toHaveClass("bg-cyan-900/40");
  });

  it("omits an empty className entirely (no whitespace artefacts)", () => {
    const { container } = render(<StatusPill status="Open" />);
    const badge = container.querySelector('[data-status="Open"]');
    expect(badge?.className).not.toMatch(/\s{2,}/);
  });

  it("renders without a className prop (default empty string)", () => {
    expect(() => render(<StatusPill status="Funded" />)).not.toThrow();
  });
});

// ─── 5. Determinism ─────────────────────────────────────────────────────────

describe("StatusPill — determinism & purity", () => {
  it("renders identically across 100 invocations with the same inputs", () => {
    const firstHtml = render(<StatusPill status="Open" />).container.innerHTML;
    for (let i = 0; i < 100; i++) {
      expect(render(<StatusPill status="Open" />).container.innerHTML).toEqual(firstHtml);
    }
  });

  it("resolveStatusPill is deterministic for the same input", () => {
    const a = resolveStatusPill("Open");
    const b = resolveStatusPill("Open");
    expect(a).toEqual(b);
  });

  it("resolveStatusPill always returns a frozen-shape object", () => {
    const outcome = resolveStatusPill(undefined);
    expect(outcome.key).toBe("Unknown");
    expect(typeof outcome.label).toBe("string");
    expect(outcome.label.length).toBeGreaterThan(0);
    expect(typeof outcome.tone).toBe("string");
    expect(outcome.tone.length).toBeGreaterThan(0);
  });
});

// ─── 6. Accessibility — colour is never load-bearing ────────────────────────

describe("StatusPill — accessibility", () => {
  it("visible text and aria-label always indicate the same status word", () => {
    render(<StatusPill status="Overdue" />);
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toHaveTextContent("Overdue by maturity");
    expect(badge.getAttribute("aria-label")).toMatch(/Overdue/i);
  });

  it('the unknown fallback\'s visible text and aria-label say "Unknown"', () => {
    render(<StatusPill status="nonsense" />);
    const badge = screen.getByRole("status", { hidden: true });
    expect(badge).toHaveTextContent("Unknown");
    expect(badge.getAttribute("aria-label")).toBe("Status: Unknown");
  });

  it('the pill exposes role="status" so screen readers announce state changes', () => {
    render(<StatusPill status="Settled" />);
    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
  });
});
