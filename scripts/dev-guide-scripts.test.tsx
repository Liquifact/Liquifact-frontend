import fs from "node:fs";
import path from "node:path";

describe("developer setup guide", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const guidePath = path.join(repoRoot, "docs/getting-started.md");
  const guide = fs.existsSync(guidePath) ? fs.readFileSync(guidePath, "utf8") : "";

  it("documents the required package scripts used by contributors", () => {
    expect(packageJson.scripts).toBeDefined();

    for (const scriptName of ["dev", "build", "lint", "test"]) {
      expect(packageJson.scripts[scriptName]).toBeDefined();
    }

    for (const scriptReference of ["npm run dev", "npm run lint", "npm test", "npm run build"]) {
      expect(guide).toContain(scriptReference);
    }
  });

  it("includes setup and troubleshooting guidance for common local issues", () => {
    expect(guide).toContain("Node.js");
    expect(guide).toContain("Troubleshooting");
    expect(guide).toContain("Playwright");
    expect(guide).toContain(".env.local");
    expect(guide).toContain("port");
  });
});
