import fs from "node:fs";
import path from "node:path";

describe("pull request checklist template", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const templatePath = path.join(repoRoot, ".github", "pull_request_template.md");
  const template = fs.readFileSync(templatePath, "utf8");

  it("keeps the contributor checklist focused on review readiness", () => {
    for (const requiredText of [
      "Tests were added or updated",
      "95% coverage",
      "Accessibility was verified",
      "Documentation was updated",
      "`npm run lint`, `npm test`, and `npm run build`",
    ]) {
      expect(template).toContain(requiredText);
    }
  });

  it("links contributors to testing, accessibility, and workflow docs", () => {
    for (const requiredLink of [
      "[TESTING.md](../TESTING.md)",
      "[docs/accessibility.md](../docs/accessibility.md)",
      "[CONTRIBUTING.md](../CONTRIBUTING.md)",
    ]) {
      expect(template).toContain(requiredLink);
    }
  });
});
