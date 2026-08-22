/**
 * @file lib/types/invoice.test.tsx
 *
 * Contract tests for the typed invoice status enum and label/style map.
 * Ensures:
 *   • `INVOICE_STATUSES` is frozen, TitleCase, and exhaustive.
 *   • `STATUS_PILL_MAP` has an entry for every status key, plus the
 *     mandatory `Unknown` neutral fallback.
 *   • `resolveStatusPill` is deterministic and never throws on nullish /
 *     unrecognised input.
 *
 * These tests are the single authoritative description of the status
 * vocabulary; StatusPill tests build on top of them.
 */

import { INVOICE_STATUSES, STATUS_PILL_MAP, resolveStatusPill } from "./invoice";

// ─── INVOICE_STATUSES ───────────────────────────────────────────────────────

describe("INVOICE_STATUSES (typed enum)", () => {
  it("is frozen so callers cannot mutate the canonical vocabulary at runtime", () => {
    expect(Object.isFrozen(INVOICE_STATUSES)).toBe(true);
  });

  it("contains exactly the four canonical keys", () => {
    expect(Object.keys(INVOICE_STATUSES).sort()).toEqual(["FUNDED", "OPEN", "OVERDUE", "SETTLED"]);
  });

  it.each([
    ["OPEN", "Open"],
    ["FUNDED", "Funded"],
    ["SETTLED", "Settled"],
    ["OVERDUE", "Overdue"],
  ])("maps %s → %s (TitleCase value)", (key, value) => {
    expect((INVOICE_STATUSES as Record<string, string>)[key]).toBe(value);
  });

  it("does not contain any lowercase legacy values", () => {
    // The previous contract was `"available" | "funded" | "pending"`.  The
    // migration to TitleCase is part of issue #260; this assertion guards
    // against accidental reintroduction of lowercase tokens.
    const values = Object.values(INVOICE_STATUSES);
    expect(values).not.toContain("available");
    expect(values).not.toContain("funded");
    expect(values).not.toContain("pending");
    values.forEach((v) => {
      // idem: every value is TitleCase (first letter upper, no spaces)
      expect(v).toMatch(/^[A-Z][A-Za-z]+$/);
    });
  });
});

// ─── STATUS_PILL_MAP ────────────────────────────────────────────────────────

describe("STATUS_PILL_MAP (label/tyle contract)", () => {
  // Hoisted once outside the loop so the assertion runs against a stable
  // reference and we don't reallocate an array on every iteration.
  const EXPECTED_KEYS = new Set([...Object.values(INVOICE_STATUSES), "Unknown"]);

  it("is frozen so styling metadata cannot mutate at runtime", () => {
    expect(Object.isFrozen(STATUS_PILL_MAP)).toBe(true);
  });

  it("has an entry for every INVOICE_STATUSES value", () => {
    Object.values(INVOICE_STATUSES).forEach((status) => {
      expect(STATUS_PILL_MAP).toHaveProperty(status);
    });
  });

  it("always includes the mandatory `Unknown` neutral fallback", () => {
    expect(STATUS_PILL_MAP).toHaveProperty("Unknown");
  });

  it("every entry carries a non-empty `label` string", () => {
    for (const key of Object.keys(STATUS_PILL_MAP)) {
      const entry = STATUS_PILL_MAP[key];
      expect(typeof entry.label).toBe("string");
      expect(entry.label.length).toBeGreaterThan(0);
      // Labels are designed to be safe screen-reader output (no emojis,
      // no special characters that would require escaping for screen
      // readers).
      expect(entry.label).toMatch(/^[A-Za-z0-9 ]+$/);
      // Cross-check: the key we just looked up must be one of the canonical
      // vocabulary (or the literal "Unknown" fallback).
      expect(EXPECTED_KEYS.has(key)).toBe(true);
    }
  });

  it("every entry carries a non-empty `tone` class string", () => {
    Object.values(STATUS_PILL_MAP).forEach((entry) => {
      expect(typeof entry.tone).toBe("string");
      expect(entry.tone.length).toBeGreaterThan(0);
      // Tone classes always include a background colour and a text colour.
      expect(entry.tone).toMatch(/^bg-/);
      expect(entry.tone).toMatch(/\stext-/);
    });
  });

  it("`Unknown` tone uses a deliberately muted palette distinct from Funded", () => {
    // Ensures the fallback does not visually impersonate a known status.
    expect(STATUS_PILL_MAP.Unknown.tone).not.toBe(STATUS_PILL_MAP.Funded.tone);
  });
});

// ─── resolveStatusPill ─────────────────────────────────────────────────────

describe("resolveStatusPill (lookup helper)", () => {
  it("returns the canonical entry for each known status", () => {
    Object.values(INVOICE_STATUSES).forEach((status) => {
      const outcome = resolveStatusPill(status);
      expect(outcome.key).toBe(status);
      expect(outcome.label).toBe(STATUS_PILL_MAP[status].label);
      expect(outcome.tone).toBe(STATUS_PILL_MAP[status].tone);
    });
  });

  it.each([
    ["empty string", ""],
    ["plain garbage string", "garbage"],
    ["lowercase legacy 'available'", "available"],
    ["unknown title 'Pending'", "Pending"], // no longer in the enum
  ])("falls back to Unknown for %s", (_label, input) => {
    const outcome = resolveStatusPill(input);
    expect(outcome.key).toBe("Unknown");
    expect(outcome.label).toBe(STATUS_PILL_MAP.Unknown.label);
    expect(outcome.tone).toBe(STATUS_PILL_MAP.Unknown.tone);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["number", 7],
    ["boolean", true],
    ["array", []],
    ["object", {}],
  ])("never throws for non-string input (%s)", (_label, input) => {
    expect(() => resolveStatusPill(input as any)).not.toThrow();
    const outcome = resolveStatusPill(input as any);
    expect(outcome.key).toBe("Unknown");
  });

  it("is case-sensitive (does not coerce 'open' → 'Open')", () => {
    // The vocabulary is TitleCase canonical.  Lowercase is treated as an
    // unrecognised input so a stale data source does not silently match.
    const outcome = resolveStatusPill("open");
    expect(outcome.key).toBe("Unknown");
  });

  it("returns a fresh-shaped object every call (still deterministic)", () => {
    const a = resolveStatusPill("Open");
    const b = resolveStatusPill("Open");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
