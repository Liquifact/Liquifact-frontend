import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, "docs");
const DOCS_INDEX = path.join(DOCS_DIR, "README.md");
const ROOT_README = path.join(ROOT, "README.md");
const CONTRIBUTING = path.join(ROOT, "CONTRIBUTING.md");

const REQUIRED_SECTIONS = [
  "Architecture",
  "Marketplace",
  "Wallet",
  "Invoice detail",
  "PWA/Performance",
  "Security",
  "Config",
];

const STALE_DOCS = [
  "accessibility.md",
  "api-integration.md",
  "architecture.md",
  "design-tokens.md",
  "invoice-data.md",
  "invoice-detail-a11y.md",
  "invoice-detail-data-flow.md",
  "invoice-detail-flow.md",
  "invoice-detail-usage.md",
  "issue-334-cpu-budget-median-throttling.md",
  "issue-334-flow-diagram.md",
  "marketplace-api.md",
  "marketplace-data-flow.md",
  "marketplace.md",
  "performance.md",
  "settings-api.md",
  "settings-data-flow.md",
  "theme-theming.md",
  "upload-a11y.md",
  "upload-api.md",
  "upload-data-flow.md",
  "wallet-api-reference.md",
  "wallet-data-flow.md",
  "wallet-developer-guide.md",
];

describe("docs/README.md documentation index", () => {
  it("exists and groups docs by the required area headings", () => {
    assert.ok(fs.existsSync(DOCS_INDEX), "docs/README.md should exist");
    const content = fs.readFileSync(DOCS_INDEX, "utf8");

    for (const section of REQUIRED_SECTIONS) {
      assert.match(
        content,
        new RegExp(`^##\\s+${section.replace("/", "\\/")}\\s*$`, "m"),
        `Missing section heading: ## ${section}`
      );
    }
  });

  it("lists every docs/*.md file (excluding README.md) exactly once", () => {
    const content = fs.readFileSync(DOCS_INDEX, "utf8");
    const docFiles = fs
      .readdirSync(DOCS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
      .map((entry) => entry.name)
      .sort();

    assert.ok(docFiles.length >= 25, `Expected 25+ docs/*.md files, found ${docFiles.length}`);

    for (const filename of docFiles) {
      const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const linkRegex = new RegExp(`\\]\\(${escaped}\\)`, "g");
      const matches = content.match(linkRegex) || [];
      assert.equal(
        matches.length,
        1,
        `Expected ${filename} to be linked in docs/README.md exactly once, found ${matches.length}`
      );
    }
  });

  it("flags planned/outdated docs accurately with a short note", () => {
    const content = fs.readFileSync(DOCS_INDEX, "utf8");
    const lines = content.split(/\r?\n/);

    for (const filename of STALE_DOCS) {
      const entryLine = lines.find((line) => line.includes(`](${filename})`));
      assert.ok(entryLine, `Expected an index entry line for ${filename}`);
      assert.match(
        entryLine,
        /planned\/outdated/i,
        `Expected ${filename} entry to be marked as planned/outdated`
      );
      assert.match(
        entryLine,
        /Note:/i,
        `Expected ${filename} entry to include a short explanatory note`
      );
    }

    const currentDocs = [
      "configuration.md",
      "dashboard-theming.md",
      "getting-started.md",
      "observability.md",
      "security.md",
    ];

    for (const filename of currentDocs) {
      const entryLine = lines.find((line) => line.includes(`](${filename})`));
      assert.ok(entryLine, `Expected an index entry line for ${filename}`);
      assert.doesNotMatch(
        entryLine,
        /planned\/outdated/i,
        `Expected current doc ${filename} not to be flagged as planned/outdated`
      );
    }
  });

  it("is linked from README.md and CONTRIBUTING.md", () => {
    const readmeContent = fs.readFileSync(ROOT_README, "utf8");
    const contributingContent = fs.readFileSync(CONTRIBUTING, "utf8");

    assert.match(readmeContent, /\(docs\/README\.md\)/, "README.md should link to docs/README.md");
    assert.match(
      contributingContent,
      /\(docs\/README\.md\)/,
      "CONTRIBUTING.md should link to docs/README.md"
    );
  });
});
