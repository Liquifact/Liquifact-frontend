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

describe("invoice-detail theming guide", () => {
  let css;
  let guide;
  let readme;
  let darkTheme;
  let lightTheme;

  beforeAll(() => {
    css = readFile("app", "globals.css");
    guide = readFile("docs", "invoice-detail-theming.md");
    readme = readFile("README.md");

    darkTheme = css.match(
      /:root,\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];
    lightTheme = css.match(
      /\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];
  });

  it("is linked from the documentation index", () => {
    // The theming guide should be discoverable from the README or docs index.
    // Multiple theming guides are listed under the Architecture section.
    expect(readme).toContain(
      "docs/invoice-detail-theming.md"
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

  it("documents the invoice-detail CSS hooks from globals.css", () => {
    const hooks = [
      "invoice-detail-section",
      "invoice-detail-dt",
      "invoice-detail-dd",
      "invoice-detail-action-btn",
      "invoice-detail-disclaimer",
    ];

    hooks.forEach((hook) => {
      expect(guide).toContain(hook);
      expect(css).toContain(hook);
    });
  });

  it("documents the current Tailwind mappings and fixed utilities", () => {
    [
      "--color-foreground: var(--color-fg)",
      "--color-muted: var(--color-muted)",
      "--color-primary: var(--color-primary)",
      "--color-focus-ring: var(--color-focus-ring)",
      "--font-sans: var(--font-geist-sans)",
      "--font-mono: var(--font-geist-mono)",
    ].forEach((mapping) => expect(css).toContain(mapping));

    // Fixed utilities used in invoice-detail components (documented as
    // known limitations — not recommended for new code).
    [
      "bg-slate-950",
      "text-slate-100",
      "text-slate-500",
      "border-slate-700",
      "bg-slate-800/50",
      "bg-cyan-600",
      "text-cyan-400",
    ].forEach((utility) => expect(guide).toContain(utility));
  });
});