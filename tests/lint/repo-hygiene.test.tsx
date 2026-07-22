/**
 * @jest-environment node
 *
 * tests/lint/repo-hygiene.test.tsx
 *
 * Ensures the LiquiFact frontend root stays free of:
 *   - Rust / contract build artefacts (Cargo.toml, Cargo.lock, *.rs, *.exe, *.wasm,
 *     contracts/, src/ Rust dirs, examples/*.rs, test_snapshots/)
 *   - Transient PR-body / one-off note files (PR_BODY_*.md, PR_DESCRIPTION*.md,
 *     ISSUE_*_IMPLEMENTATION.md, *_REFACTOR_SUMMARY.md, etc.)
 *
 * All checks use only Node's built-in `fs` / `path` modules so the suite runs
 * in the `node` Jest environment without any browser globals.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Absolute path to the repository root (two levels up from tests/lint/). */
const ROOT = path.resolve(__dirname, "..", "..");

/** Returns true if the given root-relative path exists on disk. */
function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

/**
 * Recursively collects every file path under `dir` (relative to ROOT) that
 * matches `predicate`.  Returns an empty array if `dir` does not exist.
 */
function findFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];

  const results: string[] = [];

  function walk(current: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (predicate(full)) {
        results.push(path.relative(ROOT, full));
      }
    }
  }

  walk(abs);
  return results;
}

/**
 * Lists every *immediate* entry (files and directories) in a root-relative
 * path.  Returns an empty array if the directory does not exist.
 */
function listRoot(): string[] {
  return fs.readdirSync(ROOT);
}

// ---------------------------------------------------------------------------
// Matchers
// ---------------------------------------------------------------------------

/** Glob-style helpers used to describe forbidden file patterns. */
const RUST_EXTENSIONS = [".rs", ".toml", ".lock"];

function isRustSource(filePath: string): boolean {
  return RUST_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

function isBinary(filePath: string): boolean {
  return [".exe", ".wasm", ".so", ".dylib"].some((ext) => filePath.endsWith(ext));
}

function isPrBodyFile(name: string): boolean {
  return /^PR_BODY_.*\.md$/i.test(name) || /^PR_DESCRIPTION.*\.md$/i.test(name);
}

function isTransientNote(name: string): boolean {
  return (
    /^ISSUE_\d+_IMPLEMENTATION\.md$/i.test(name) ||
    /^ISSUE_\d+_FLOW_DIAGRAM\.md$/i.test(name) ||
    /^DELIVERY_CHECKLIST\.md$/i.test(name) ||
    /_REFACTOR_SUMMARY\.md$/i.test(name) ||
    /^REFACTORING_(COMPLETE|SUMMARY)\.md$/i.test(name) ||
    /_IMPLEMENTATION_SUMMARY\.md$/i.test(name) ||
    /_INTEGRATION_SUMMARY\.md$/i.test(name) ||
    /^IMPLEMENTATION_COMPLETE\.md$/i.test(name) ||
    /_QUICK_REFERENCE\.md$/i.test(name) ||
    /^LEDGER_GAP_TESTS\.md$/i.test(name)
  );
}

// ---------------------------------------------------------------------------
// 1. Rust / contract artefacts
// ---------------------------------------------------------------------------

describe("Rust and contract artefacts are absent from the frontend root", () => {
  // ── Manifest / lock files ──────────────────────────────────────────────

  it("does not contain Cargo.toml at the root", () => {
    expect(exists("Cargo.toml")).toBe(false);
  });

  it("does not contain Cargo.lock at the root", () => {
    expect(exists("Cargo.lock")).toBe(false);
  });

  // ── Rust example file ─────────────────────────────────────────────────

  it("does not contain EXAMPLE_LENDING_INTEGRATION.rs at the root", () => {
    expect(exists("EXAMPLE_LENDING_INTEGRATION.rs")).toBe(false);
  });

  // ── Binary installer ──────────────────────────────────────────────────

  it("does not contain rustup-init.exe at the root", () => {
    expect(exists("rustup-init.exe")).toBe(false);
  });

  it("does not contain any .exe binary at the root", () => {
    const exeFiles = listRoot().filter((name) => name.endsWith(".exe"));
    expect(exeFiles).toHaveLength(0);
  });

  it("does not contain any .wasm binary at the root", () => {
    const wasmFiles = listRoot().filter((name) => name.endsWith(".wasm"));
    expect(wasmFiles).toHaveLength(0);
  });

  // ── Directories ───────────────────────────────────────────────────────

  it("does not contain a contracts/ directory", () => {
    expect(exists("contracts")).toBe(false);
  });

  it("does not contain a src/ directory with Rust sources", () => {
    // A src/ directory is acceptable if it contains only JS/TS files, but there
    // should be no .rs files inside it.
    if (!exists("src")) return; // already gone — pass
    const rustFiles = findFiles("src", (f) => f.endsWith(".rs"));
    expect(rustFiles).toHaveLength(0);
  });

  it("does not contain an examples/ directory with .rs files", () => {
    if (!exists("examples")) return;
    const rustFiles = findFiles("examples", (f) => f.endsWith(".rs"));
    expect(rustFiles).toHaveLength(0);
  });

  it("does not contain a test_snapshots/ directory", () => {
    expect(exists("test_snapshots")).toBe(false);
  });

  // ── Recursive scan: no .rs files anywhere ────────────────────────────

  it("contains no .rs files anywhere in the repository root", () => {
    // We scan only the immediate root level to avoid false positives from
    // node_modules or .next if they exist.
    const rootEntries = listRoot().filter(
      (name) =>
        name !== "node_modules" &&
        name !== ".next" &&
        name !== ".git"
    );

    const rsFiles: string[] = [];
    for (const entry of rootEntries) {
      const abs = path.join(ROOT, entry);
      const stat = fs.statSync(abs);
      if (stat.isFile() && entry.endsWith(".rs")) {
        rsFiles.push(entry);
      } else if (stat.isDirectory()) {
        rsFiles.push(...findFiles(entry, (f) => f.endsWith(".rs")));
      }
    }
    expect(rsFiles).toHaveLength(0);
  });

  // ── package.json / next.config.mjs do not reference Rust ─────────────

  it("package.json does not reference any Rust build step", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
    const scripts: string = JSON.stringify(pkg.scripts ?? {});
    expect(scripts).not.toMatch(/cargo|rustup|wasm-pack|soroban/i);
  });

  it("next.config.mjs does not reference Rust or Cargo", () => {
    const configPath = path.join(ROOT, "next.config.mjs");
    if (!fs.existsSync(configPath)) return;
    const src = fs.readFileSync(configPath, "utf-8");
    expect(src).not.toMatch(/cargo|rustup|wasm-pack|soroban/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Transient PR-body and one-off note files
// ---------------------------------------------------------------------------

describe("Transient PR-body and one-off note files are absent from the root", () => {
  // ── Named files explicitly mentioned in the issue ─────────────────────

  it("does not contain PR_BODY_253.md", () => {
    expect(exists("PR_BODY_253.md")).toBe(false);
  });

  it("does not contain PR_BODY_260.md", () => {
    expect(exists("PR_BODY_260.md")).toBe(false);
  });

  it("does not contain ISSUE_334_IMPLEMENTATION.md at the root (must be in docs/)", () => {
    expect(exists("ISSUE_334_IMPLEMENTATION.md")).toBe(false);
  });

  it("does not contain PR_DESCRIPTION.md at the root", () => {
    expect(exists("PR_DESCRIPTION.md")).toBe(false);
  });

  it("does not contain DELIVERY_CHECKLIST.md at the root", () => {
    expect(exists("DELIVERY_CHECKLIST.md")).toBe(false);
  });

  it("does not contain REFACTORING_COMPLETE.md at the root", () => {
    expect(exists("REFACTORING_COMPLETE.md")).toBe(false);
  });

  it("does not contain REFACTORING_SUMMARY.md at the root", () => {
    expect(exists("REFACTORING_SUMMARY.md")).toBe(false);
  });

  it("does not contain STORAGE_REFACTOR_SUMMARY.md at the root", () => {
    expect(exists("STORAGE_REFACTOR_SUMMARY.md")).toBe(false);
  });

  it("does not contain SLIPPAGE_IMPLEMENTATION_SUMMARY.md at the root", () => {
    expect(exists("SLIPPAGE_IMPLEMENTATION_SUMMARY.md")).toBe(false);
  });

  it("does not contain CALLBACK_IMPLEMENTATION_SUMMARY.md at the root", () => {
    expect(exists("CALLBACK_IMPLEMENTATION_SUMMARY.md")).toBe(false);
  });

  it("does not contain CALLBACK_INTERFACE.md at the root", () => {
    expect(exists("CALLBACK_INTERFACE.md")).toBe(false);
  });

  it("does not contain TELEMETRY_QUICK_REFERENCE.md at the root", () => {
    expect(exists("TELEMETRY_QUICK_REFERENCE.md")).toBe(false);
  });

  it("does not contain TELEMETRY_STORAGE_REFACTORING.md at the root", () => {
    expect(exists("TELEMETRY_STORAGE_REFACTORING.md")).toBe(false);
  });

  it("does not contain QUICK_REFERENCE.md at the root", () => {
    expect(exists("QUICK_REFERENCE.md")).toBe(false);
  });

  it("does not contain LEDGER_GAP_TESTS.md at the root", () => {
    expect(exists("LEDGER_GAP_TESTS.md")).toBe(false);
  });

  it("does not contain IMPLEMENTATION_COMPLETE.md at the root", () => {
    expect(exists("IMPLEMENTATION_COMPLETE.md")).toBe(false);
  });

  it("does not contain meta.md at the root", () => {
    expect(exists("meta.md")).toBe(false);
  });

  // ── Pattern-based scan: no PR_BODY_* files ────────────────────────────

  it("contains no PR_BODY_*.md files at the root level", () => {
    const matches = listRoot().filter((name) => /^PR_BODY_.*\.md$/i.test(name));
    expect(matches).toHaveLength(0);
  });

  // ── Pattern-based scan: no one-off implementation summaries ──────────

  it("contains no ISSUE_*_IMPLEMENTATION.md files at the root level", () => {
    const matches = listRoot().filter((name) => /^ISSUE_\d+_IMPLEMENTATION\.md$/i.test(name));
    expect(matches).toHaveLength(0);
  });

  it("contains no *_IMPLEMENTATION_SUMMARY.md files at the root level", () => {
    const matches = listRoot().filter((name) => /_IMPLEMENTATION_SUMMARY\.md$/i.test(name));
    expect(matches).toHaveLength(0);
  });

  it("contains no *_REFACTOR_SUMMARY.md files at the root level", () => {
    const matches = listRoot().filter((name) => /_REFACTOR_SUMMARY\.md$/i.test(name));
    expect(matches).toHaveLength(0);
  });

  it("contains no REFACTORING_*.md files at the root level", () => {
    const matches = listRoot().filter((name) => /^REFACTORING_.*\.md$/i.test(name));
    expect(matches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. .gitignore correctly lists forbidden patterns
// ---------------------------------------------------------------------------

describe(".gitignore blocks future re-addition of forbidden artefacts", () => {
  let gitignore: string;

  beforeAll(() => {
    gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf-8");
  });

  // ── Rust / binary patterns ────────────────────────────────────────────

  it("ignores Cargo.toml", () => {
    expect(gitignore).toMatch(/^Cargo\.toml$/m);
  });

  it("ignores Cargo.lock", () => {
    expect(gitignore).toMatch(/^Cargo\.lock$/m);
  });

  it("ignores .exe files", () => {
    expect(gitignore).toMatch(/\*\.exe/);
  });

  it("ignores .wasm files", () => {
    expect(gitignore).toMatch(/\*\.wasm/);
  });

  it("ignores rustup-init variants", () => {
    expect(gitignore).toMatch(/rustup-init/);
  });

  it("ignores the contracts/ directory", () => {
    expect(gitignore).toMatch(/\/contracts\//);
  });

  // ── PR-body and transient note patterns ───────────────────────────────

  it("ignores PR_BODY_*.md files", () => {
    expect(gitignore).toMatch(/PR_BODY_\*\.md/);
  });

  it("ignores PR_DESCRIPTION*.md files", () => {
    expect(gitignore).toMatch(/PR_DESCRIPTION/);
  });

  it("ignores ISSUE_*_IMPLEMENTATION.md files", () => {
    expect(gitignore).toMatch(/ISSUE_\*_IMPLEMENTATION\.md/);
  });

  it("ignores ISSUE_*_FLOW_DIAGRAM.md files", () => {
    expect(gitignore).toMatch(/ISSUE_\*_FLOW_DIAGRAM\.md/);
  });

  it("ignores *_REFACTOR_SUMMARY.md files", () => {
    expect(gitignore).toMatch(/\*_REFACTOR_SUMMARY\.md/);
  });

  it("ignores *_IMPLEMENTATION_SUMMARY.md files", () => {
    expect(gitignore).toMatch(/\*_IMPLEMENTATION_SUMMARY\.md/);
  });

  it("ignores IMPLEMENTATION_COMPLETE.md", () => {
    expect(gitignore).toMatch(/IMPLEMENTATION_COMPLETE\.md/);
  });

  it("ignores *_QUICK_REFERENCE.md files", () => {
    expect(gitignore).toMatch(/\*_QUICK_REFERENCE\.md/);
  });

  it("ignores DELIVERY_CHECKLIST.md", () => {
    expect(gitignore).toMatch(/DELIVERY_CHECKLIST\.md/);
  });

  it("ignores LEDGER_GAP_TESTS.md", () => {
    expect(gitignore).toMatch(/LEDGER_GAP_TESTS\.md/);
  });
});

// ---------------------------------------------------------------------------
// 4. Archived docs are present in docs/
// ---------------------------------------------------------------------------

describe("Useful notes are archived in docs/", () => {
  it("docs/issue-334-cpu-budget-median-throttling.md exists", () => {
    expect(exists("docs/issue-334-cpu-budget-median-throttling.md")).toBe(true);
  });

  it("docs/issue-334-flow-diagram.md exists", () => {
    expect(exists("docs/issue-334-flow-diagram.md")).toBe(true);
  });

  it("docs/architecture.md exists", () => {
    expect(exists("docs/architecture.md")).toBe(true);
  });

  it("docs/issue-334-cpu-budget-median-throttling.md has meaningful content", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "docs/issue-334-cpu-budget-median-throttling.md"),
      "utf-8"
    );
    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/334/);
  });

  it("docs/issue-334-flow-diagram.md has meaningful content", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "docs/issue-334-flow-diagram.md"),
      "utf-8"
    );
    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/334/);
  });
});

// ---------------------------------------------------------------------------
// 5. Core frontend files remain intact after cleanup
// ---------------------------------------------------------------------------

describe("Core frontend files are intact after cleanup", () => {
  const coreFiles = [
    "package.json",
    "package-lock.json",
    "next.config.mjs",
    "tsconfig.json",
    "jest.config.js",
    "jest.setup.js",
    ".gitignore",
    "README.md",
    "app/layout.js",
    "app/page.js",
    "app/globals.css",
  ];

  coreFiles.forEach((file) => {
    it(`${file} still exists`, () => {
      expect(exists(file)).toBe(true);
    });
  });

  it("app/ directory is present", () => {
    expect(exists("app")).toBe(true);
  });

  it("components/ directory is present", () => {
    expect(exists("components")).toBe(true);
  });

  it("lib/ directory is present", () => {
    expect(exists("lib")).toBe(true);
  });

  it("docs/ directory is present", () => {
    expect(exists("docs")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Helper function unit tests
// ---------------------------------------------------------------------------

describe("Helper predicates", () => {
  describe("isPrBodyFile", () => {
    it("matches PR_BODY_253.md", () => expect(isPrBodyFile("PR_BODY_253.md")).toBe(true));
    it("matches PR_BODY_260.md", () => expect(isPrBodyFile("PR_BODY_260.md")).toBe(true));
    it("matches PR_DESCRIPTION.md", () => expect(isPrBodyFile("PR_DESCRIPTION.md")).toBe(true));
    it("matches PR_DESCRIPTION_v2.md", () =>
      expect(isPrBodyFile("PR_DESCRIPTION_v2.md")).toBe(true));
    it("does not match README.md", () => expect(isPrBodyFile("README.md")).toBe(false));
    it("does not match CONTRIBUTING.md", () =>
      expect(isPrBodyFile("CONTRIBUTING.md")).toBe(false));
    it("does not match PR_BODY_253.txt (wrong extension)", () =>
      expect(isPrBodyFile("PR_BODY_253.txt")).toBe(false));
  });

  describe("isTransientNote", () => {
    it("matches ISSUE_334_IMPLEMENTATION.md", () =>
      expect(isTransientNote("ISSUE_334_IMPLEMENTATION.md")).toBe(true));
    it("matches ISSUE_453_IMPLEMENTATION.md", () =>
      expect(isTransientNote("ISSUE_453_IMPLEMENTATION.md")).toBe(true));
    it("matches ISSUE_334_FLOW_DIAGRAM.md", () =>
      expect(isTransientNote("ISSUE_334_FLOW_DIAGRAM.md")).toBe(true));
    it("matches DELIVERY_CHECKLIST.md", () =>
      expect(isTransientNote("DELIVERY_CHECKLIST.md")).toBe(true));
    it("matches STORAGE_REFACTOR_SUMMARY.md", () =>
      expect(isTransientNote("STORAGE_REFACTOR_SUMMARY.md")).toBe(true));
    it("matches REFACTORING_COMPLETE.md", () =>
      expect(isTransientNote("REFACTORING_COMPLETE.md")).toBe(true));
    it("matches REFACTORING_SUMMARY.md", () =>
      expect(isTransientNote("REFACTORING_SUMMARY.md")).toBe(true));
    it("matches SLIPPAGE_IMPLEMENTATION_SUMMARY.md", () =>
      expect(isTransientNote("SLIPPAGE_IMPLEMENTATION_SUMMARY.md")).toBe(true));
    it("matches TELEMETRY_QUICK_REFERENCE.md", () =>
      expect(isTransientNote("TELEMETRY_QUICK_REFERENCE.md")).toBe(true));
    it("matches LEDGER_GAP_TESTS.md", () =>
      expect(isTransientNote("LEDGER_GAP_TESTS.md")).toBe(true));
    it("matches IMPLEMENTATION_COMPLETE.md", () =>
      expect(isTransientNote("IMPLEMENTATION_COMPLETE.md")).toBe(true));
    it("does not match README.md", () =>
      expect(isTransientNote("README.md")).toBe(false));
    it("does not match CONTRIBUTING.md", () =>
      expect(isTransientNote("CONTRIBUTING.md")).toBe(false));
    it("does not match docs/architecture.md (path includes dir)", () =>
      expect(isTransientNote("docs/architecture.md")).toBe(false));
  });

  describe("isRustSource", () => {
    it("matches .rs files", () => expect(isRustSource("lib.rs")).toBe(true));
    it("matches .toml files", () => expect(isRustSource("Cargo.toml")).toBe(true));
    it("matches .lock files", () => expect(isRustSource("Cargo.lock")).toBe(true));
    it("does not match .ts files", () => expect(isRustSource("index.ts")).toBe(false));
    it("does not match .js files", () => expect(isRustSource("page.js")).toBe(false));
    it("does not match .json files", () => expect(isRustSource("package.json")).toBe(false));
  });

  describe("isBinary", () => {
    it("matches .exe files", () => expect(isBinary("rustup-init.exe")).toBe(true));
    it("matches .wasm files", () => expect(isBinary("contract.wasm")).toBe(true));
    it("matches .so files", () => expect(isBinary("lib.so")).toBe(true));
    it("matches .dylib files", () => expect(isBinary("lib.dylib")).toBe(true));
    it("does not match .js files", () => expect(isBinary("bundle.js")).toBe(false));
    it("does not match .md files", () => expect(isBinary("README.md")).toBe(false));
  });
});
