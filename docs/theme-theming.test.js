import fs from "fs";
import path from "path";

const ROOT_DIR = path.resolve(__dirname, "..");

const readRepositoryFile = (...segments) =>
  fs.readFileSync(path.join(ROOT_DIR, ...segments), "utf8");

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractDeclaration = (block, token) => {
  const match = block.match(
    new RegExp(`${escapeRegExp(token)}\\s*:\\s*([^;]+);`)
  );

  if (!match) {
    throw new Error(`Could not find ${token} in the expected theme block.`);
  }

  return match[1].trim();
};

describe("theme theming documentation", () => {
  let cssSource;
  let guideSource;
  let layoutSource;
  let modalSource;
  let readmeSource;
  let themeInputsSource;
  let toggleSource;
  let darkThemeBlock;
  let lightThemeBlock;

  beforeAll(() => {
    cssSource = readRepositoryFile("app", "globals.css");
    guideSource = readRepositoryFile("docs", "theme-theming.md");
    layoutSource = readRepositoryFile("app", "layout.js");
    modalSource = readRepositoryFile("components", "ThemeOptionsModal.jsx");
    readmeSource = readRepositoryFile("README.md");
    themeInputsSource = readRepositoryFile("components", "ThemeInputs.jsx");
    toggleSource = readRepositoryFile("components", "ThemeToggle.jsx");

    darkThemeBlock = cssSource.match(
      /:root,\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];

    lightThemeBlock = cssSource.match(
      /\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];
  });

  it("is linked from the repository documentation index", () => {
    expect(readmeSource).toContain(
      "[Theme theming guide](docs/theme-theming.md)"
    );
  });

  it("documents every current light and dark colour token value", () => {
    expect(darkThemeBlock).toBeDefined();
    expect(lightThemeBlock).toBeDefined();

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
      const darkValue = extractDeclaration(darkThemeBlock, token);
      const lightValue = extractDeclaration(lightThemeBlock, token);

      expect(guideSource).toContain(token);
      expect(guideSource).toContain(darkValue);
      expect(guideSource).toContain(lightValue);
    });
  });

  it("documents the current preference storage and effective theme flow", () => {
    expect(toggleSource).toContain('["light", "dark", "system"]');
    expect(toggleSource).toContain(
      'export const THEME_STORAGE_KEY = "liquifact-theme"'
    );
    expect(layoutSource).toContain(
      "document.documentElement.setAttribute('data-theme', effective)"
    );

    expect(guideSource).toContain("`light`, `dark`, and `system`");
    expect(guideSource).toContain("`liquifact-theme`");
    expect(guideSource).toContain("`prefers-color-scheme`");
    expect(guideSource).toContain("`data-theme`");
  });

  it("documents the current Tailwind token mappings", () => {
    const mappings = [
      "--color-bg: var(--color-bg)",
      "--color-foreground: var(--color-fg)",
      "--color-muted: var(--color-muted)",
      "--color-primary: var(--color-primary)",
      "--color-focus-ring: var(--color-focus-ring)",
      "--font-sans: var(--font-geist-sans)",
      "--font-mono: var(--font-geist-mono)",
    ];

    mappings.forEach((mapping) => {
      expect(cssSource).toContain(mapping);
    });

    [
      "bg-bg",
      "text-foreground",
      "text-muted",
      "text-primary",
      "outline-focus-ring",
      "font-sans",
      "font-mono",
    ].forEach((utility) => {
      expect(guideSource).toContain(utility);
    });
  });

  it("records the fixed-utility limitation of the current theme controls", () => {
    expect(toggleSource).toContain("text-slate-300");
    expect(modalSource).toContain("bg-slate-900");
    expect(modalSource).toContain("text-cyan-300");
    expect(themeInputsSource).toContain("border-slate-700");

    [
      "bg-slate-900",
      "text-slate-100",
      "border-slate-700",
      "text-cyan-300",
    ].forEach((utility) => {
      expect(guideSource).toContain(utility);
    });
  });

  it("provides source-specific customization and verification steps", () => {
    expect(guideSource).toContain("## Customizing the theme");
    expect(guideSource).toContain("app/globals.css");
    expect(guideSource).toContain("ThemeToggle.jsx");
    expect(guideSource).toContain("app/layout.js");
    expect(guideSource).toContain(
      "npm test -- docs/theme-theming.test.js --runInBand"
    );
    expect(guideSource).toContain("npm run lint");
    expect(guideSource).toContain("npm test -- --runInBand");
    expect(guideSource).toContain("npm run build");
  });
});
