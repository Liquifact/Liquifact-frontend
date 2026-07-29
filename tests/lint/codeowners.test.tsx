/**
 * @jest-environment node
 *
 * tests/lint/codeowners.test.tsx
 *
 * Validates .github/CODEOWNERS:
 *   - File exists and parses into well-formed (pattern, owners[]) rules.
 *   - Every rule uses valid GitHub owner syntax (@user or @org/team) so
 *     GitHub does not silently ignore the line.
 *   - The sensitive areas called out in issue #451 (lib/wallet/, lib/api/,
 *     components/, app/, docs/, .github/) each have an explicit rule.
 *   - No duplicate patterns (last one wins silently on GitHub, which hides
 *     mistakes) and a catch-all fallback rule exists.
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..", "..");
const CODEOWNERS_PATH = path.join(ROOT, ".github", "CODEOWNERS");

type Rule = { pattern: string; owners: string[]; line: number };

const OWNER_RE = /^@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)(\/[A-Za-z0-9._-]+)?$/;

function parseCodeowners(contents: string): Rule[] {
  const rules: Rule[] = [];
  const lines = contents.split(/\r?\n/);

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) return;

    const [pattern, ...owners] = line.split(/\s+/);
    rules.push({ pattern, owners, line: index + 1 });
  });

  return rules;
}

describe(".github/CODEOWNERS", () => {
  it("exists", () => {
    expect(fs.existsSync(CODEOWNERS_PATH)).toBe(true);
  });

  let contents: string;
  let rules: Rule[];

  beforeAll(() => {
    contents = fs.readFileSync(CODEOWNERS_PATH, "utf-8");
    rules = parseCodeowners(contents);
  });

  it("contains at least one ownership rule", () => {
    expect(rules.length).toBeGreaterThan(0);
  });

  it("gives every rule at least one owner", () => {
    const unowned = rules.filter((rule) => rule.owners.length === 0);
    expect(unowned).toEqual([]);
  });

  it("uses valid @user or @org/team syntax for every owner", () => {
    const invalid = rules.flatMap((rule) =>
      rule.owners
        .filter((owner) => !OWNER_RE.test(owner))
        .map((owner) => `line ${rule.line}: "${owner}"`)
    );
    expect(invalid).toEqual([]);
  });

  it("does not declare the same pattern twice", () => {
    const seen = new Map<string, number>();
    const duplicates: string[] = [];
    rules.forEach((rule) => {
      if (seen.has(rule.pattern)) {
        duplicates.push(`"${rule.pattern}" on lines ${seen.get(rule.pattern)} and ${rule.line}`);
      } else {
        seen.set(rule.pattern, rule.line);
      }
    });
    expect(duplicates).toEqual([]);
  });

  it("declares a catch-all fallback rule ('*')", () => {
    expect(rules.some((rule) => rule.pattern === "*")).toBe(true);
  });

  describe("required area coverage", () => {
    const requiredPatterns = [
      "/lib/wallet/",
      "/lib/api/",
      "/components/",
      "/app/",
      "/docs/",
      "/.github/",
    ];

    requiredPatterns.forEach((pattern) => {
      it(`maps ${pattern}`, () => {
        expect(rules.some((rule) => rule.pattern === pattern)).toBe(true);
      });
    });

    it("maps the wallet and api rules to different owners than the generic app/components rules", () => {
      const owner = (pattern: string) =>
        rules.find((rule) => rule.pattern === pattern)?.owners.join(",");

      const walletOwner = owner("/lib/wallet/");
      const apiOwner = owner("/lib/api/");
      const appOwner = owner("/app/");
      const componentsOwner = owner("/components/");

      expect(walletOwner).toBeDefined();
      expect(apiOwner).toBeDefined();
      expect(walletOwner).not.toBe(appOwner);
      expect(walletOwner).not.toBe(componentsOwner);
      expect(apiOwner).not.toBe(appOwner);
    });
  });

  describe("mapped paths exist in the repository", () => {
    const pathPatterns = [
      "/app/",
      "/components/",
      "/lib/wallet/",
      "/lib/api/",
      "/lib/securityHeaders.mjs",
      "/docs/",
      "/.github/",
    ];

    pathPatterns.forEach((pattern) => {
      it(`${pattern} resolves to a real path on disk`, () => {
        const relative = pattern.replace(/^\//, "").replace(/\/$/, "");
        expect(fs.existsSync(path.join(ROOT, relative))).toBe(true);
      });
    });
  });

  it("no rule references a directory pattern that does not end in '/' when it clearly names a directory listed elsewhere as a file", () => {
    // Sanity check: distinguishes directory rules (trailing slash) from file rules.
    const fileRule = rules.find((rule) => rule.pattern === "/lib/securityHeaders.mjs");
    expect(fileRule).toBeDefined();
    expect(fileRule?.pattern.endsWith("/")).toBe(false);
  });
});

describe("parseCodeowners / OWNER_RE helper behavior", () => {
  it("parses a simple rule", () => {
    const rules = parseCodeowners("/app/ @owner-one\n");
    expect(rules).toEqual([{ pattern: "/app/", owners: ["@owner-one"], line: 1 }]);
  });

  it("parses multiple owners on one rule", () => {
    const rules = parseCodeowners("/lib/wallet/ @owner-one @org/team-two\n");
    expect(rules[0].owners).toEqual(["@owner-one", "@org/team-two"]);
  });

  it("ignores blank lines and comments", () => {
    const rules = parseCodeowners("# comment\n\n/app/ @owner-one\n");
    expect(rules).toHaveLength(1);
  });

  it("accepts @user syntax", () => {
    expect(OWNER_RE.test("@teemi")).toBe(true);
  });

  it("accepts @org/team syntax", () => {
    expect(OWNER_RE.test("@Liquifact/wallet")).toBe(true);
  });

  it("rejects owners missing the leading @", () => {
    expect(OWNER_RE.test("teemi")).toBe(false);
  });

  it("rejects bare emails (unsupported by CODEOWNERS path rules used here)", () => {
    expect(OWNER_RE.test("someone@example.com")).toBe(false);
  });

  it("rejects an org/team with a trailing slash", () => {
    expect(OWNER_RE.test("@org/team/")).toBe(false);
  });
});
