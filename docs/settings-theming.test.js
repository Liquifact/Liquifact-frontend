import fs from "fs";
import path from "path";

const ROOT_DIR = path.resolve(__dirname, "..");

const readFile = (...segments) =>
  fs.readFileSync(path.join(ROOT_DIR, ...segments), "utf8");

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractValue = (block, token) => {
  const match = block.match(
    new RegExp(`${escapeRegExp(token)}\\s*:\\s*([^;]+);`)
  );

  if (!match) {
    throw new Error(`Missing ${token} in theme source.`);
  }

  return match[1].trim();
};

describe("settings theming guide", () => {
  let css;
  let guide;
  let readme;
  let darkTheme;
  let lightTheme;
  let comfortableDensity;
  let compactDensity;

  beforeAll(() => {
    css = readFile("app", "globals.css");
    guide = readFile("docs", "settings-theming.md");
    readme = readFile("README.md");

    darkTheme = css.match(
      /:root,\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];
    lightTheme = css.match(
      /\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];

    comfortableDensity = css.match(
      /:root,\s*\[data-density="comfortable"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];
    compactDensity = css.match(
      /\[data-density="compact"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];
  });

  it("is linked from the documentation index", () => {
    expect(readme).toContain(
      "[Settings theming guide](docs/settings-theming.md)"
    );
  });

  it("matches the current light and dark palette tokens", () => {
    expect(darkTheme).toBeDefined();
    expect(lightTheme).toBeDefined();

    const tokens = [
      "--color-bg",
      "--color-fg",
      "--color-muted",
      "--color-surface",
      "--color-border",
      "--color-primary",
      "--color-focus-ring",
    ];

    tokens.forEach((token) => {
      const darkValue = extractValue(darkTheme, token);
      const lightValue = extractValue(lightTheme, token);

      expect(guide).toContain(token);
      expect(guide).toContain(darkValue);
      expect(guide).toContain(lightValue);
    });
  });

  it("documents the current settings density tokens", () => {
    expect(comfortableDensity).toBeDefined();
    expect(compactDensity).toBeDefined();

    const tokens = [
      "--settings-section-padding",
      "--settings-section-gap",
      "--settings-list-gap",
    ];

    tokens.forEach((token) => {
      const comfortableValue = extractValue(comfortableDensity, token);
      const compactValue = extractValue(compactDensity, token);

      expect(guide).toContain(token);
      expect(guide).toContain(comfortableValue);
      expect(guide).toContain(compactValue);
    });
  });

  it("documents the high-contrast mode coverage", () => {
    expect(guide).toContain("forced-colors: active");
    expect(guide).toContain("prefers-contrast: more");
    expect(guide).toContain("forced-color-adjust: none");
  });

  it("documents the Tailwind mappings", () => {
    [
      "--color-foreground: var(--color-fg)",
      "--color-bg: var(--color-bg)",
    ].forEach((mapping) => expect(css).toContain(mapping));
  });
});