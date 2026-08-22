import fs from "fs";
import path from "path";

describe.skip("Design Token Documentation Alignment", () => {
  let cssSource: string;
  let docSource: string;

  beforeAll(() => {
    // Read the source of globals.css and design-tokens.md relative to current file path
    const cssPath = path.join(__dirname, "globals.css");
    const docPath = path.join(__dirname, "../docs/design-tokens.md");

    cssSource = fs.readFileSync(cssPath, "utf8");
    docSource = fs.readFileSync(docPath, "utf8");
  });

  const extractThemeVariables = (source: string): string[] => {
    // Extract everything within `@theme inline { ... }` or `@theme { ... }`
    const themeBlockMatch = /@theme\s+(?:inline\s+)?{([^}]+)}/g.exec(source);
    if (!themeBlockMatch) return [];

    const themeContent = themeBlockMatch[1];
    // Find all variable names starting with -- defined on the left side of a colon
    const matches: string[] = [];
    const regex = /^\s*(--[a-zA-Z0-9-]+)\s*:/gm;
    let match;
    while ((match = regex.exec(themeContent)) !== null) {
      matches.push(match[1]);
    }
    return Array.from(new Set(matches));
  };

  it("should contain a valid theme block in globals.css", () => {
    expect(cssSource).toContain("@theme");
  });

  it("should contain a valid design-tokens.md documentation file", () => {
    expect(docSource.length).toBeGreaterThan(0);
    expect(docSource).toContain("# Design Token Reference");
  });

  it("should ensure all custom @theme CSS variables from globals.css are documented", () => {
    const cssVariables = extractThemeVariables(cssSource);
    expect(cssVariables.length).toBeGreaterThan(0);

    cssVariables.forEach((variable) => {
      // Assert that the exact variable name (e.g. --color-bg) exists in the documentation markdown
      expect(docSource).toContain(variable);
    });
  });

  it("should ensure documented color values match the actual css variable values", () => {
    // Extract exact values from globals.css and assert they match what is documented
    const colorBgMatch = cssSource.match(/--color-bg:\s*([^;/*\s]+)/);
    const colorPrimaryMatch = cssSource.match(/--color-primary:\s*([^;/*\s]+)/);
    const colorForegroundMatch = cssSource.match(/--color-foreground:\s*([^;/*\s]+)/);
    const colorMutedMatch = cssSource.match(/--color-muted:\s*([^;/*\s]+)/);

    expect(colorBgMatch).not.toBeNull();
    expect(colorPrimaryMatch).not.toBeNull();
    expect(colorForegroundMatch).not.toBeNull();
    expect(colorMutedMatch).not.toBeNull();

    const bgVal = colorBgMatch![1].trim();
    const primaryVal = colorPrimaryMatch![1].trim();
    const foregroundVal = colorForegroundMatch![1].trim();
    const mutedVal = colorMutedMatch![1].trim();

    expect(docSource).toContain(bgVal);
    expect(docSource).toContain(primaryVal);
    expect(docSource).toContain(foregroundVal);
    expect(docSource).toContain(mutedVal);
  });

  it("should ensure documented typography font families are described", () => {
    expect(docSource).toContain("--font-sans");
    expect(docSource).toContain("--font-mono");
    expect(docSource).toContain("Geist Sans");
    expect(docSource).toContain("Geist Mono");
  });

  it("should ensure standard design tokens (spacing, radii, sizes) are documented in tables", () => {
    // Spacing
    expect(docSource).toContain("Spacing Tokens");
    expect(docSource).toContain("0.125rem");
    expect(docSource).toContain("1.0rem");
    expect(docSource).toContain("3.0rem");

    // Radii
    expect(docSource).toContain("Border Radius Tokens");
    expect(docSource).toContain("rounded-sm");
    expect(docSource).toContain("rounded-md");
    expect(docSource).toContain("rounded-lg");
    expect(docSource).toContain("rounded-full");

    // Typography Sizes
    expect(docSource).toContain("Font Sizes");
    expect(docSource).toContain("text-xs");
    expect(docSource).toContain("text-sm");
    expect(docSource).toContain("text-base");
    expect(docSource).toContain("text-4xl");
  });

  it("should document accessibility contrast pairings", () => {
    expect(docSource).toContain("Accessibility & Contrast Pairings");
    expect(docSource).toContain("18.2:1");
    expect(docSource).toContain("11.1:1");
    expect(docSource).toContain("7.8:1");
    expect(docSource).toContain("1.6:1");
    expect(docSource).toContain("DO NOT USE");
  });
});
