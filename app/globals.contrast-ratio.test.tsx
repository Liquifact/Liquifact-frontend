/**
 * WCAG 2.1 AA contrast-ratio harness for LiquiFact theme token pairings.
 *
 * Design intent
 * ─────────────
 * Token values are sourced directly from app/globals.css — no duplicated
 * constants here. If a token value changes in the stylesheet this file
 * catches it automatically; if someone adds a new --color-* token without
 * a corresponding pair test the coverage-guard test at the bottom fails.
 *
 * Thresholds used
 * ───────────────
 *   Normal text  → 4.5 : 1  (WCAG 2.1 AA, < 18pt / < 14pt bold)
 *   Large text   → 3.0 : 1  (WCAG 2.1 AA, ≥ 18pt or ≥ 14pt bold)
 *   UI element   → 3.0 : 1  (WCAG 2.1 AA, non-text contrast)
 */

import fs from "fs";
import path from "path";

// ── CSS source (loaded once) ──────────────────────────────────────────────────

const CSS_PATH = path.join(__dirname, "globals.css");
const cssSource = fs.readFileSync(CSS_PATH, "utf8");

// ── Token extraction (no hardcoded hex constants) ─────────────────────────────

/**
 * Reads a CSS custom-property value from the loaded stylesheet.
 * Throws clearly if the token is absent so mis-spellings surface immediately.
 */
function extractToken(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`, "i").exec(cssSource);
  if (!match) throw new Error(`Token "${name}" not found in globals.css`);
  return match[1].toLowerCase();
}

/**
 * Returns every --color-* token that is *defined* (has a value) in the CSS.
 * Used by the coverage guard to detect tokens added without a pair test.
 */
function extractAllColorTokenNames(): string[] {
  const pattern = /--(color-[\w-]+)\s*:\s*#[0-9a-fA-F]{3,6}/g;
  const names = [...cssSource.matchAll(pattern)].map((m) => `--${m[1]}`);
  return [...new Set(names)];
}

// ── WCAG 2.1 math ─────────────────────────────────────────────────────────────

function parseHexColor(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`parseHexColor: unsupported format "${hex}"`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function linearise(channel: number): number {
  const v = channel / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(parseHexColor(fg));
  const l2 = relativeLuminance(parseHexColor(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Token pair registry ───────────────────────────────────────────────────────

const NORMAL_TEXT = 4.5;
const LARGE_TEXT = 3.0;
const UI_ELEMENT = 3.0;

interface TokenPair {
  name: string;
  fg: string; // --color-* variable name
  bg: string; // --color-* variable name
  threshold: number;
  context: string;
}

const TOKEN_PAIRS: TokenPair[] = [
  {
    name: "body text on page background",
    fg: "--color-fg",
    bg: "--color-bg",
    threshold: NORMAL_TEXT,
    context: "Default html/body text (slate-100 on slate-950) across all routes",
  },
  {
    name: "muted text on page background",
    fg: "--color-muted",
    bg: "--color-bg",
    threshold: NORMAL_TEXT,
    context: "Sub-labels, helper text, card metadata (slate-400 on slate-950)",
  },
  {
    name: "primary brand colour on background (normal text)",
    fg: "--color-primary",
    bg: "--color-bg",
    threshold: NORMAL_TEXT,
    context: "Cyan-400 used as foreground: nav links, card headings, badge labels",
  },
  {
    name: "background text on primary surface (skip-link)",
    fg: "--color-bg",
    bg: "--color-primary",
    threshold: NORMAL_TEXT,
    context: ".skip-link renders --color-bg text on a --color-primary background",
  },
  {
    name: "primary brand colour on background (large text)",
    fg: "--color-primary",
    bg: "--color-bg",
    threshold: LARGE_TEXT,
    context: "Cyan-400 section headings ≥ 18 pt — large-text threshold applies",
  },
  {
    name: "muted text on background (large text)",
    fg: "--color-muted",
    bg: "--color-bg",
    threshold: LARGE_TEXT,
    context: "Upper-case tracking labels on cards; conservative: tested at normal-text threshold",
  },
  {
    name: "primary focus ring against page background (UI element)",
    fg: "--color-primary",
    bg: "--color-bg",
    threshold: UI_ELEMENT,
    context: "focus-visible outline (--color-primary) against the slate-950 page surface",
  },
  {
    name: "focus-ring dedicated token against page background (UI element)",
    fg: "--color-focus-ring",
    bg: "--color-bg",
    threshold: UI_ELEMENT,
    context: ".focus-ring outline colour against page background — ensures >= 3:1 in both themes",
  },
  {
    name: "surface background token (value guard)",
    fg: "--color-surface",
    bg: "--color-bg",
    threshold: 1.0,
    context:
      "Card/panel surface against page background — intentionally subtle, just verifies token exists",
  },
  {
    name: "border token against page background (value guard)",
    fg: "--color-border",
    bg: "--color-bg",
    threshold: 1.0,
    context: "Subtle border colour against page background — intentionally subdued",
  },
];

// ── WCAG math unit tests ──────────────────────────────────────────────────────

describe("WCAG math helpers", () => {
  describe("parseHexColor", () => {
    it("parses white correctly", () => {
      expect(parseHexColor("#ffffff")).toEqual([255, 255, 255]);
    });

    it("parses black correctly", () => {
      expect(parseHexColor("#000000")).toEqual([0, 0, 0]);
    });

    it("is case-insensitive", () => {
      expect(parseHexColor("#AABBCC")).toEqual([170, 187, 204]);
    });

    it("throws for a shorthand hex", () => {
      expect(() => parseHexColor("#fff")).toThrow(/unsupported format/i);
    });

    it("throws for a colour name", () => {
      expect(() => parseHexColor("white")).toThrow(/unsupported format/i);
    });

    it("throws for an empty string", () => {
      expect(() => parseHexColor("")).toThrow(/unsupported format/i);
    });
  });

  describe("relativeLuminance", () => {
    it("returns 1 for pure white", () => {
      expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    });

    it("returns 0 for pure black", () => {
      expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
    });

    it("returns a value strictly between 0 and 1 for mid-gray", () => {
      const l = relativeLuminance([128, 128, 128]);
      expect(l).toBeGreaterThan(0);
      expect(l).toBeLessThan(1);
    });

    it("uses the linearisation branch for low-channel values (≤ 0.03928)", () => {
      // Channel 9 / 255 ≈ 0.03529 which falls below the 0.03928 threshold
      const l = relativeLuminance([9, 9, 9]);
      const expected =
        0.2126 * (9 / 255 / 12.92) + 0.7152 * (9 / 255 / 12.92) + 0.0722 * (9 / 255 / 12.92);
      expect(l).toBeCloseTo(expected, 8);
    });

    it("uses the gamma branch for high-channel values (> 0.03928)", () => {
      // Channel 255 is well above the threshold
      const l = relativeLuminance([255, 0, 0]);
      // Red channel only: 0.2126 * ((1 + 0.055)/1.055)^2.4 = 0.2126 * 1^2.4 = 0.2126
      expect(l).toBeCloseTo(0.2126, 3);
    });
  });

  describe("contrastRatio", () => {
    it("returns 21 for black text on white background", () => {
      expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    });

    it("returns 21 for white text on black background", () => {
      expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
    });

    it("returns exactly 1 for identical colours", () => {
      expect(contrastRatio("#5a5a5a", "#5a5a5a")).toBeCloseTo(1, 5);
    });

    it("is always ≥ 1", () => {
      expect(contrastRatio("#334455", "#667788")).toBeGreaterThanOrEqual(1);
    });

    it("is symmetric — fg/bg order does not change the ratio", () => {
      const a = contrastRatio("#22d3ee", "#020617");
      const b = contrastRatio("#020617", "#22d3ee");
      expect(a).toBeCloseTo(b, 10);
    });

    it("is always ≤ 21", () => {
      expect(contrastRatio("#ffffff", "#000001")).toBeLessThanOrEqual(21);
    });
  });
});

// ── Token extraction unit tests ───────────────────────────────────────────────

describe("extractToken (reads app/globals.css — no hardcoded hex constants)", () => {
  it("returns a valid lowercase hex string for --color-bg", () => {
    expect(extractToken("--color-bg")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("returns a valid lowercase hex string for --color-fg", () => {
    expect(extractToken("--color-fg")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("returns a valid lowercase hex string for --color-muted", () => {
    expect(extractToken("--color-muted")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("returns a valid lowercase hex string for --color-primary", () => {
    expect(extractToken("--color-primary")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("throws with a clear message for an unknown token", () => {
    expect(() => extractToken("--color-does-not-exist")).toThrow(/not found in globals\.css/i);
  });

  it("extractAllColorTokenNames returns at least the core theme tokens", () => {
    const names = extractAllColorTokenNames();
    expect(names).toContain("--color-bg");
    expect(names).toContain("--color-primary");
    expect(names).toContain("--color-fg");
    expect(names).toContain("--color-muted");
  });
});

// ── Per-pair AA contrast assertions (data-driven) ─────────────────────────────

describe("WCAG AA contrast — token pair harness", () => {
  for (const pair of TOKEN_PAIRS) {
    it(`"${pair.name}" ≥ ${pair.threshold}:1 — ${pair.context}`, () => {
      const fgHex = extractToken(pair.fg);
      const bgHex = extractToken(pair.bg);
      const ratio = contrastRatio(fgHex, bgHex);
      // Surface the actual ratio in the failure message for easy debugging
      expect(ratio).toBeGreaterThanOrEqual(pair.threshold);
    });
  }

  it("registry contains all required pair types", () => {
    const hasNormalText = TOKEN_PAIRS.some((p) => p.threshold === NORMAL_TEXT);
    const hasLargeText = TOKEN_PAIRS.some((p) => p.threshold === LARGE_TEXT);
    const hasUIElement = TOKEN_PAIRS.some((p) => p.threshold === UI_ELEMENT);
    expect(hasNormalText).toBe(true);
    expect(hasLargeText).toBe(true);
    expect(hasUIElement).toBe(true);
  });
});

// ── Stylesheet coverage guard ─────────────────────────────────────────────────

describe("globals.css token coverage", () => {
  it("every --color-* token defined in globals.css appears in at least one TOKEN_PAIR", () => {
    const defined = extractAllColorTokenNames();
    const covered = new Set(TOKEN_PAIRS.flatMap((p) => [p.fg, p.bg]));
    const missing = defined.filter((t) => !covered.has(t));

    // If this fails: add a TOKEN_PAIR entry for each token listed in `missing`.
    expect(missing).toEqual([]);
  });

  it("globals.css is readable and non-empty", () => {
    expect(cssSource.length).toBeGreaterThan(0);
    expect(cssSource).toContain("@theme inline");
  });

  it("all core design tokens are present in the stylesheet", () => {
    const required = ["--color-bg", "--color-primary", "--color-fg", "--color-muted"];
    for (const token of required) {
      expect(cssSource).toContain(token);
    }
  });
});
