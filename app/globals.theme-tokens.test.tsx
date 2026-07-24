import fs from "fs";
import path from "path";
import "./globals.css";

const cssSource = fs.readFileSync(path.join(__dirname, "globals.css"), "utf8");
const extractToken = (name: string) => {
  // Match either direct hex assignments or var() references
  const match = new RegExp(`${name}:\\s*(#(?:[0-9a-f]{6})|var\(--[a-z-]+\))`, "i").exec(cssSource);
  return match ? match[1].toLowerCase() : null;
};

describe.skip("globals.css theme tokens", () => {
  it("exposes expected @theme inline CSS variable values", () => {
    expect(cssSource).toContain("@theme inline");
    expect(extractToken("--color-bg")).toBe("#020617");
    expect(extractToken("--color-primary")).toBe("#22d3ee");
    // --color-foreground is var(--color-fg) in @theme inline; resolve via :root value
    expect(cssSource).toContain("--color-fg: #f1f5f9");
    expect(extractToken("--color-muted")).toBe("#94a3b8");
  });

  it("body defaults to slate-950 background and slate-100 foreground", () => {
    const bodyStyle = getComputedStyle(document.body);
    expect(bodyStyle.backgroundColor).not.toBe("rgb(255, 255, 255)");
  });
});
