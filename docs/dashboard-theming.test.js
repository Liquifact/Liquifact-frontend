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

describe("dashboard theming guide", () => {
  let css;
  let guide;
  let readme;
  let darkTheme;
  let lightTheme;

  beforeAll(() => {
    css = readFile("app", "globals.css");
    guide = readFile("docs", "dashboard-theming.md");
    readme = readFile("README.md");

    darkTheme = css.match(
      /:root,\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];
    lightTheme = css.match(
      /\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];
  });

  it("is linked from the documentation index", () => {
    expect(readme).toContain(
      "[Dashboard theming guide](docs/dashboard-theming.md)"
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

  it("matches the current marketplace card tokens", () => {
    const tokens = [
      "--market-card-padding",
      "--market-card-gap",
      "--market-card-title-font-size",
      "--market-card-title-font-weight",
      "--market-card-title-line-height",
      "--market-card-meta-font-size",
      "--market-card-meta-line-height",
      "--market-card-meta-letter-spacing",
    ];

    tokens.forEach((token) => {
      const darkValue = extractValue(darkTheme, token);
      const lightValue = extractValue(lightTheme, token);

      expect(lightValue).toBe(darkValue);
      expect(guide).toContain(token);
      expect(guide).toContain(darkValue);
    });
  });

  it("documents the current Tailwind mappings and dashboard limitation", () => {
    [
      "--color-foreground: var(--color-fg)",
      "--color-muted: var(--color-muted)",
      "--color-primary: var(--color-primary)",
      "--color-focus-ring: var(--color-focus-ring)",
      "--font-sans: var(--font-geist-sans)",
      "--font-mono: var(--font-geist-mono)",
    ].forEach((mapping) => expect(css).toContain(mapping));

    [
      "bg-slate-950",
      "text-slate-100",
      "bg-slate-900/50",
      "text-slate-400",
    ].forEach((utility) => expect(guide).toContain(utility));
  });
});
