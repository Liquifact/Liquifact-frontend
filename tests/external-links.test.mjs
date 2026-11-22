import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components"];
const EXTENSIONS = new Set([".js", ".jsx"]);

/**
 * Recursively collect all .js and .jsx files under a directory.
 */
function walkFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extract JSX opening tags from source text while respecting quoted strings
 * and nested `{...}` expressions so `>` inside expressions does not split a tag.
 */
function extractJsxOpeningTags(source) {
  const tags = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    if (source[i] !== "<") {
      i++;
      continue;
    }

    // Match opening JSX tag name (e.g., <a, <Link, <Foo.Bar)
    const tagNameMatch = /^<([A-Za-z][A-Za-z0-9_.-]*)(?=[\s/>])/.exec(source.slice(i));
    if (!tagNameMatch) {
      i++;
      continue;
    }

    const start = i;
    i += tagNameMatch[0].length;

    let braceDepth = 0;
    let quote = null;

    while (i < len) {
      const ch = source[i];

      if (quote) {
        if (ch === "\\" && quote !== "`") {
          i += 2;
          continue;
        }
        if (ch === "\\" && quote === "`") {
          i += 2;
          continue;
        }
        if (ch === quote) {
          quote = null;
        }
        i++;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        i++;
        continue;
      }

      if (ch === "{") {
        braceDepth++;
        i++;
        continue;
      }

      if (ch === "}") {
        if (braceDepth > 0) braceDepth--;
        i++;
        continue;
      }

      if (ch === ">" && braceDepth === 0) {
        const raw = source.slice(start, i + 1);
        const line = source.slice(0, start).split("\n").length;
        tags.push({ tagName: tagNameMatch[1], raw, line });
        i++;
        break;
      }

      i++;
    }
  }

  return tags;
}

/**
 * Inspect JSX source and return all `target="_blank"` occurrences and any
 * that lack `noopener` or `noreferrer` in their `rel` attribute.
 */
function inspectBlankTargets(source, filePath = "<input>") {
  const tags = extractJsxOpeningTags(source);
  const blankTargets = [];
  const violations = [];

  const targetBlankRe = /\btarget\s*=\s*(?:["']_blank["']|\{\s*["'`]_blank["'`]\s*\})/;
  const relAttrRe = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*["'`]([^"'`]*)["'`]\s*\})/;

  for (const tag of tags) {
    if (!targetBlankRe.test(tag.raw)) continue;

    blankTargets.push({ filePath, line: tag.line, tagName: tag.tagName });

    const relMatch = relAttrRe.exec(tag.raw);
    const relValue = relMatch ? (relMatch[1] ?? relMatch[2] ?? relMatch[3] ?? "") : "";
    const tokens = relValue.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (!tokens.includes("noopener") && !tokens.includes("noreferrer")) {
      violations.push({
        filePath,
        line: tag.line,
        tagName: tag.tagName,
        rel: relValue || "(missing)",
      });
    }
  }

  return { blankTargets, violations };
}

describe("external links security guard (target=_blank)", () => {
  it("flags target=_blank elements when rel is missing or unsafe", () => {
    const missingRel = `<a href="https://example.com" target="_blank">Example</a>`;
    const missingResult = inspectBlankTargets(missingRel, "MissingRel.jsx");
    assert.equal(missingResult.blankTargets.length, 1);
    assert.equal(missingResult.violations.length, 1);
    assert.equal(missingResult.violations[0].rel, "(missing)");

    const unsafeRel = `<a href="https://example.com" target="_blank" rel="external">Example</a>`;
    const unsafeResult = inspectBlankTargets(unsafeRel, "UnsafeRel.jsx");
    assert.equal(unsafeResult.violations.length, 1);
    assert.equal(unsafeResult.violations[0].rel, "external");
  });

  it("allows target=_blank elements with noopener or noreferrer", () => {
    const safeSource = `
      <div>
        <a href="https://a.test" target="_blank" rel="noreferrer">A</a>
        <a href="https://b.test" target="_blank" rel="noopener">B</a>
        <a
          href="https://c.test"
          onClick={() => x > 0}
          target="_blank"
          rel="noopener noreferrer"
        >
          C
        </a>
      </div>
    `;
    const result = inspectBlankTargets(safeSource, "Safe.jsx");
    assert.equal(result.blankTargets.length, 3);
    assert.equal(result.violations.length, 0);
  });

  it("ensures every target=_blank in app/ and components/ includes noopener or noreferrer", () => {
    const files = SCAN_DIRS.flatMap((dir) => walkFiles(path.join(ROOT, dir)));
    assert.ok(files.length > 0, "Expected to find .js/.jsx files in app/ and components/");

    let totalBlankLinks = 0;
    const allViolations = [];

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      const relPath = path.relative(ROOT, file).replace(/\\/g, "/");
      const { blankTargets, violations } = inspectBlankTargets(source, relPath);
      totalBlankLinks += blankTargets.length;
      allViolations.push(...violations);
    }

    assert.ok(totalBlankLinks > 0, "Expected to find at least one target=_blank link");
    assert.deepEqual(
      allViolations,
      [],
      `Found target="_blank" links missing rel="noopener" or rel="noreferrer":\n${allViolations
        .map((v) => `  - ${v.filePath}:${v.line} (<${v.tagName}>, rel=${v.rel})`)
        .join("\n")}`
    );
  });
});
