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
    throw new Error(`Missing ${token} in source block.`);
  }

  return match[1].trim();
};

describe("wallet theming guide", () => {
  let css;
  let guide;
  let statusSource;
  let skeletonSource;

  beforeAll(() => {
    css = readFile("app", "globals.css");
    guide = readFile("docs", "wallet-theming.md");
    statusSource = readFile("components", "WalletStatus.jsx");
    skeletonSource = readFile("components", "WalletSkeleton.jsx");
  });

  it("is linked from the repository documentation index", () => {
    expect(readFile("README.md")).toContain(
      "[Wallet theming guide](docs/wallet-theming.md)"
    );
  });

  it("documents the wallet density tokens with both values", () => {
    const comfortable = css.match(
      /:root,[\s\S]*?\[data-density="comfortable"\][\s\S]*?\{([\s\S]*?)\n\}/
    )?.[1] || css.match(/:root,[\s\S]*?\{([\s\S]*?)\n\}/)?.[1];
    const compact = css.match(
      /\[data-density="compact"\][\s\S]*?\{([\s\S]*?)\n\}/
    )?.[1];

    expect(comfortable).toBeDefined();
    expect(compact).toBeDefined();

    [
      "--wallet-panel-padding",
      "--wallet-panel-gap",
      "--wallet-meta-font-size",
      "--wallet-address-font-size",
    ].forEach((token) => {
      const comfortableValue = extractValue(comfortable, token);
      const compactValue = extractValue(compact, token);

      expect(guide).toContain(token);
      expect(guide).toContain(comfortableValue);
      expect(guide).toContain(compactValue);
    });
  });

  it("documents the wallet colour and density token sources", () => {
    expect(guide).toContain("components/WalletStatus.jsx");
    expect(guide).toContain("components/WalletSkeleton.jsx");
    expect(guide).toContain("components/DensityToggle.jsx");
    expect(guide).toContain("app/globals.css");
    expect(guide).toContain("data-theme");
    expect(guide).toContain("data-density");
    expect(guide).toContain("--color-focus-ring");
  });

  it("documents the fixed-utility colour usage of the wallet", () => {
    expect(statusSource).toContain("bg-green-500");
    expect(statusSource).toContain("bg-yellow-500");
    expect(statusSource).toContain("bg-red-500");
    expect(statusSource).toContain("bg-slate-600");
    expect(statusSource).toContain("text-slate-300");
    expect(statusSource).toContain("text-slate-400");
    expect(statusSource).toContain("text-slate-500");
    expect(skeletonSource).toContain("bg-slate-700");

    [
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-slate-600",
      "text-slate-300",
      "text-slate-400",
      "text-slate-500",
    ].forEach((utility) => expect(guide).toContain(utility));
  });

  it("documents the forced-colours wallet handling", () => {
    ["CanvasText", "GrayText", "forced-color-adjust"].forEach((token) => {
      expect(css).toContain(token);
    });

    expect(guide).toContain("forced-colors");
    expect(guide).toContain("prefers-contrast");
  });

  it("provides customisation and verification steps", () => {
    expect(guide).toContain("## Customising the wallet");
    expect(guide).toContain(
      "npm test -- docs/wallet-theming.test.js --runInBand"
    );
    expect(guide).toContain("npm run lint");
    expect(guide).toContain("npm run build");
  });
});