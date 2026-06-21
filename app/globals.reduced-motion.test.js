import fs from "node:fs";
import path from "node:path";

describe("reduced motion global styles", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

  it("honors prefers-reduced-motion for loading animations", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/\.animate-spin,\s*\.animate-pulse\s*{/);
    expect(css).toMatch(/animation:\s*none\s*!important/);
  });

  it("minimizes transitions and repeated animations globally", () => {
    expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(css).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });
});
