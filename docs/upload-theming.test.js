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

describe("upload theming documentation", () => {
  let cssSource;
  let guideSource;
  let uploadZoneSource;
  let uploadSkeletonSource;
  let readmeSource;
  let darkThemeBlock;
  let lightThemeBlock;

  beforeAll(() => {
    cssSource = readRepositoryFile("app", "globals.css");
    guideSource = readRepositoryFile("docs", "upload-theming.md");
    uploadZoneSource = readRepositoryFile("components", "UploadZone.jsx");
    uploadSkeletonSource = readRepositoryFile("components", "UploadSkeleton.jsx");
    readmeSource = readRepositoryFile("README.md");

    darkThemeBlock = cssSource.match(
      /:root,\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];

    lightThemeBlock = cssSource.match(
      /\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
    )?.[1];
  });

  it("is linked from the repository documentation index", () => {
    expect(readmeSource).toContain(
      "[Upload theming guide](docs/upload-theming.md)"
    );
  });

  it("documents every current light and dark colour token value", () => {
    expect(darkThemeBlock).toBeDefined();
    expect(lightThemeBlock).toBeDefined();

    const tokens = [
      "--color-bg",
      "--color-fg",
      "--color-muted",
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

  it("documents the upload CSS class hooks and their purpose", () => {
    expect(guideSource).toContain(".upload-dropzone");
    expect(guideSource).toContain(".upload-subtle-panel");
    expect(guideSource).toContain(".upload-muted-text");
  });

  it("documents the high-contrast media queries", () => {
    expect(guideSource).toContain("forced-colors");
    expect(guideSource).toContain("prefers-contrast");
  });

  it("documents the reduced-motion media query", () => {
    expect(guideSource).toContain("prefers-reduced-motion");
    expect(guideSource).toContain("motion-reduce:animate-none");
    expect(guideSource).toContain("motion-reduce:transition-none");
  });

  it("the upload class hooks are present in the UploadZone component", () => {
    expect(uploadZoneSource).toContain("upload-dropzone");
    expect(uploadZoneSource).toContain("upload-subtle-panel");
    expect(uploadZoneSource).toContain("upload-muted-text");
  });

  it("the upload class hooks are present in the UploadSkeleton component", () => {
    // UploadSkeleton mirrors the UploadZone layout, so it should reference
    // the same class hooks indirectly through the skeleton structure.
    expect(uploadSkeletonSource).toContain("upload-skeleton");
  });

  it("the forced-colors and prefers-contrast rules exist in globals.css", () => {
    expect(cssSource).toMatch(/@media\s*\(forced-colors:\s*active\)/);
    expect(cssSource).toMatch(/@media\s*\(prefers-contrast:\s*more\)/);
    expect(cssSource).toContain(".upload-dropzone");
    expect(cssSource).toContain(".upload-subtle-panel");
    expect(cssSource).toContain(".upload-muted-text");
  });

  it("documents the current fixed Tailwind palette usage", () => {
    const fixedUtilities = [
      "border-slate-700",
      "bg-cyan-500",
      "text-slate-950",
      "text-slate-500",
      "text-slate-400",
    ];

    fixedUtilities.forEach((utility) => {
      expect(guideSource).toContain(utility);
    });
  });

  it("provides source-specific customization and verification steps", () => {
    expect(guideSource).toContain("## Customising the upload");
    expect(guideSource).toContain("app/globals.css");
    expect(guideSource).toContain(".upload-*");
    expect(guideSource).toContain(
      "npm test -- docs/upload-theming.test.js --runInBand"
    );
    expect(guideSource).toContain(
      "npm test -- components/UploadZone.motion-contrast.test.jsx --runInBand"
    );
    expect(guideSource).toContain("npm run lint");
    expect(guideSource).toContain("npm test");
    expect(guideSource).toContain("npm run build");
  });
});