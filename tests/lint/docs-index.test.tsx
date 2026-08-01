/**
 * @jest-environment node
 *
 * tests/lint/docs-index.test.tsx
 *
 * Ensures every Markdown guide under docs/ is linked from docs/README.md so
 * the documentation index cannot drift when new guides are added.
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..", "..");
const DOCS_DIR = path.join(ROOT, "docs");
const INDEX_PATH = path.join(DOCS_DIR, "README.md");

/** Markdown files that are the index itself (not required as a linked entry). */
const INDEX_FILES = new Set(["README.md"]);

function listDocMarkdownFiles(): string[] {
  return fs
    .readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Collects markdown link targets that point at sibling docs/*.md files.
 * Matches both `[text](file.md)` and `[text](./file.md)` forms.
 */
function linkedDocFiles(indexContents: string): Set<string> {
  const links = new Set<string>();
  const linkRe = /\[[^\]]*]\(\.?\/?([^)#]+\.md)(?:#[^)]*)?\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(indexContents)) !== null) {
    const target = match[1];
    // Only count same-directory guide links (ignore ../CONTRIBUTING.md etc.).
    if (!target.includes("/")) {
      links.add(target);
    }
  }

  return links;
}

describe("docs/README.md index", () => {
  it("exists", () => {
    expect(fs.existsSync(INDEX_PATH)).toBe(true);
  });

  it("links every Markdown guide under docs/", () => {
    const indexContents = fs.readFileSync(INDEX_PATH, "utf-8");
    const linked = linkedDocFiles(indexContents);
    const guides = listDocMarkdownFiles().filter((name) => !INDEX_FILES.has(name));

    const missing = guides.filter((name) => !linked.has(name));

    expect(missing).toEqual([]);
  });

  it("does not link to Markdown files that are missing from docs/", () => {
    const indexContents = fs.readFileSync(INDEX_PATH, "utf-8");
    const linked = linkedDocFiles(indexContents);
    const onDisk = new Set(listDocMarkdownFiles());

    const dangling = [...linked].filter((name) => !onDisk.has(name));

    expect(dangling).toEqual([]);
  });

  it("groups guides under the required audience headings", () => {
    const indexContents = fs.readFileSync(INDEX_PATH, "utf-8");

    for (const heading of [
      "## Getting started",
      "## Building features",
      "## Operating",
      "## Contributing",
    ]) {
      expect(indexContents).toContain(heading);
    }
  });
});
