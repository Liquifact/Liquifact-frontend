import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

import "./globals.css";

expect.extend(toHaveNoViolations);

const cssSource = fs.readFileSync(path.join(__dirname, "globals.css"), "utf8");
const extractToken = (name) => {
  const match = new RegExp(`${name}:\\s*(#(?:[0-9a-f]{6}))`, "i").exec(cssSource);
  return match ? match[1].toLowerCase() : null;
};

function parseHexColor(value) {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^#([0-9a-f]{6})$/);
  if (!match) {
    throw new Error(`Unsupported color format: ${value}`);
  }
  const hex = match[1];
  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function relativeLuminance([r, g, b]) {
  const transform = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

function contrastRatio(foreground, background) {
  const fg = relativeLuminance(parseHexColor(foreground));
  const bg = relativeLuminance(parseHexColor(background));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function ContrastFixture() {
  return (
    <div className="bg-slate-950 text-slate-100 p-4">
      <p data-testid="body-text" className="text-slate-100">
        Body text
      </p>
      <p data-testid="muted-text" className="text-slate-400">
        Muted text
      </p>
    </div>
  );
}

describe.skip("globals.css theming + WCAG contrast smoke", () => {
  it("has no basic axe accessibility violations in a dark-themed fixture", async () => {
    const { container } = render(<ContrastFixture />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ensures foreground and muted tokens meet WCAG AA contrast on the dark background", () => {
    const bg = extractToken("--color-bg");
    const foreground = extractToken("--color-foreground");
    const muted = extractToken("--color-muted");

    expect(bg).toBe("#020617");
    expect(foreground).toBe("#f1f5f9");
    expect(muted).toBe("#94a3b8");

    expect(contrastRatio(foreground || "", bg || "")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(muted || "", bg || "")).toBeGreaterThanOrEqual(4.5);
  });
});
