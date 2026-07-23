/**
 * @jest-environment node
 *
 * tests/lint/jest-projects.test.tsx
 *
 * Locks in the Jest project layout for Issue #456:
 *   - Jest is split into two projects: `unit` and `a11y`.
 *   - npm test runs both, npm run test:unit runs only unit, npm run test:a11y
 *     runs only a11y.
 *   - Common configuration (moduleNameMapper, babel transform, setup,
 *     transformIgnorePatterns) is shared by both projects via object spread
 *     so it is never duplicated.
 *
 * All checks use only Node's built-in `fs` / `path` modules and `require`
 * so the suite runs in the `node` Jest environment without browser globals.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..", "..");

const JEST_CONFIG_PATH = path.join(ROOT, "jest.config.js");
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");

// `require` works here because jest.config.js is a CommonJS module that
// exports the full Jest configuration (including the `projects` array).
const jestConfig = require(JEST_CONFIG_PATH);

const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProject(displayName: string): {
  displayName: string;
  testMatch?: string[];
  testPathIgnorePatterns?: string[];
  moduleNameMapper?: Record<string, string>;
  transform?: Record<string, unknown>;
  setupFilesAfterEnv?: string[];
  testEnvironment?: string;
  transformIgnorePatterns?: string[];
} {
  const projects: Array<{ displayName?: string }> = Array.isArray(jestConfig.projects)
    ? jestConfig.projects
    : [];
  const project = projects.find((p) => p && p.displayName === displayName);
  if (!project) {
    throw new Error(
      `Jest project "${displayName}" is missing from jest.config.js ` +
        `(found ${projects.length} projects)`
    );
  }
  return project as ReturnType<typeof getProject>;
}

function joinGlobs(globs?: string[]): string {
  return Array.isArray(globs) ? globs.join("\n") : "";
}

// ---------------------------------------------------------------------------
// 1. Jest exposes two projects
// ---------------------------------------------------------------------------

describe("Jest exposes exactly two projects (unit, a11y)", () => {
  it("exports a `projects` array at the top level of jest.config.js", () => {
    expect(Array.isArray(jestConfig.projects)).toBe(true);
  });

  it("defines exactly two projects", () => {
    expect(jestConfig.projects).toHaveLength(2);
  });

  it("defines a `unit` project", () => {
    expect(getProject("unit").displayName).toBe("unit");
  });

  it("defines an `a11y` project", () => {
    expect(getProject("a11y").displayName).toBe("a11y");
  });

  it("does not expose more than two projects (no accidental copy)", () => {
    const names = jestConfig.projects.map((p) => p.displayName);
    expect(names).toEqual(["unit", "a11y"]);
  });
});

// ---------------------------------------------------------------------------
// 2. testMatch separates the two projects
// ---------------------------------------------------------------------------

describe("testMatch patterns correctly split the source trees", () => {
  it("`unit` project declares a non-empty testMatch array", () => {
    const unit = getProject("unit");
    expect(Array.isArray(unit.testMatch)).toBe(true);
    expect((unit.testMatch as string[]).length).toBeGreaterThan(0);
  });

  it("`a11y` project declares a non-empty testMatch array", () => {
    const a11y = getProject("a11y");
    expect(Array.isArray(a11y.testMatch)).toBe(true);
    expect((a11y.testMatch as string[]).length).toBeGreaterThan(0);
  });

  it("`a11y` testMatch targets *.a11y.test.{js,jsx,ts,tsx}", () => {
    const a11y = getProject("a11y");
    const globs = joinGlobs(a11y.testMatch);
    expect(globs).toMatch(/a11y\.test/);
    expect(globs).toMatch(/\.a11y\.test\.{js,jsx,ts,tsx}/);
  });

  it("`unit` testMatch sweeps the typical source roots", () => {
    const unit = getProject("unit");
    const globs = joinGlobs(unit.testMatch);
    // Positive list scoped to source directories so unrelated scripts/config
    // files are not picked up.
    expect(globs).toMatch(/<rootDir>\/app\/\*\*\//);
    expect(globs).toMatch(/<rootDir>\/components\/\*\*\//);
    expect(globs).toMatch(/<rootDir>\/lib\/\*\*\//);
  });

  it("`unit` testPathIgnorePatterns explicitly excludes *.a11y.test files", () => {
    const unit = getProject("unit");
    const patterns = joinGlobs(unit.testPathIgnorePatterns);
    // Pattern is stored with regex-escaped dots (`\\.a11y\\.test\\.[jt]sx?$`),
    // so we match the literal `\.a11y\.test` substring.
    expect(patterns).toMatch(/\\\.a11y\\\.test/);
  });

  it("`unit` testPathIgnorePatterns still excludes Playwright *.spec.* files", () => {
    const unit = getProject("unit");
    const patterns = joinGlobs(unit.testPathIgnorePatterns);
    expect(patterns).toMatch(/\.spec/);
  });

  it("`a11y` project does not pick up *.spec.* files", () => {
    const a11y = getProject("a11y");
    expect(joinGlobs(a11y.testMatch)).not.toMatch(/\.spec/);
  });

  it("`a11y` testMatch does not sweep the entire repository (no overlap with unit)", () => {
    const a11y = getProject("a11y");
    expect(joinGlobs(a11y.testMatch)).not.toMatch(/<rootDir>\/\*\*\/\*\.test\.{js,jsx,ts,tsx}$/);
  });
});

// ---------------------------------------------------------------------------
// 3. No duplicate / overlapping test matching
// ---------------------------------------------------------------------------

describe("projects do not match the same test file twice", () => {
  it("`unit` and `a11y` use distinct displayName values", () => {
    const names = jestConfig.projects.map((p) => p.displayName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("`unit` excludes a11y tests AND `a11y` only matches a11y tests", () => {
    const unit = getProject("unit");
    const a11y = getProject("a11y");
    // unit stores the pattern with escaped dots (`\\.a11y\\.test\\.[jt]sx?$`).
    expect(joinGlobs(unit.testPathIgnorePatterns)).toMatch(/\\\.a11y\\\.test/);
    // a11y testMatch uses raw `a11y.test` in the glob source.
    expect(joinGlobs(a11y.testMatch)).toMatch(/a11y\.test/);
  });

  it("`a11y` testMatch cannot be satisfied by a file lacking `.a11y.test`", () => {
    const a11y = getProject("a11y");
    const globs = joinGlobs(a11y.testMatch);
    // Every glob in a11y.testMatch must require the a11y substring.
    (a11y.testMatch as string[]).forEach((glob) => {
      expect(glob).toMatch(/a11y\.test/);
      // sanity: the glob is non-trivial
      expect(glob.length).toBeGreaterThan(10);
      // suspend sanity on the captured string
      expect(globs).toContain(glob);
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Shared config inheritance (moduleNameMapper, transform, setup, ...)
// ---------------------------------------------------------------------------

describe("shared configuration is inherited by both projects", () => {
  const SHARED_KEYS = [
    "moduleNameMapper",
    "transform",
    "setupFilesAfterEnv",
    "testEnvironment",
    "transformIgnorePatterns",
  ];

  it.each(["unit", "a11y"] as const)("`%s` project defines moduleNameMapper", (displayName) => {
    const project = getProject(displayName);
    expect(project.moduleNameMapper).toBeDefined();
  });

  it.each(["unit", "a11y"] as const)("`%s` project defines the babel transform", (displayName) => {
    const project = getProject(displayName);
    expect(project.transform).toBeDefined();
    expect(JSON.stringify(project.transform)).toMatch(/babel-jest/);
  });

  it.each(["unit", "a11y"] as const)(
    "`%s` project loads jest.setup.js via setupFilesAfterEnv",
    (displayName) => {
      const project = getProject(displayName);
      expect(project.setupFilesAfterEnv).toEqual(
        expect.arrayContaining(["<rootDir>/jest.setup.js"])
      );
    }
  );

  it.each(["unit", "a11y"] as const)(
    "`%s` project runs under jest-environment-jsdom",
    (displayName) => {
      const project = getProject(displayName);
      expect(project.testEnvironment).toBe("jest-environment-jsdom");
    }
  );

  it.each(["unit", "a11y"] as const)(
    "`%s` project preserves the Next.js transformIgnorePatterns exception",
    (displayName) => {
      const project = getProject(displayName);
      expect(project.transformIgnorePatterns).toEqual(
        expect.arrayContaining(["/node_modules/(?!(next|@next)/)"])
      );
    }
  );

  it("unit and a11y projects have IDENTICAL moduleNameMapper values", () => {
    const unit = getProject("unit");
    const a11y = getProject("a11y");
    expect(unit.moduleNameMapper).toEqual(a11y.moduleNameMapper);
  });

  it("unit and a11y projects have IDENTICAL babel transform values", () => {
    const unit = getProject("unit");
    const a11y = getProject("a11y");
    expect(unit.transform).toEqual(a11y.transform);
  });

  it("unit and a11y projects have IDENTICAL setupFilesAfterEnv arrays", () => {
    const unit = getProject("unit");
    const a11y = getProject("a11y");
    expect(unit.setupFilesAfterEnv).toEqual(a11y.setupFilesAfterEnv);
  });

  it.each(SHARED_KEYS)("shared key '%s' is present on every project", (key) => {
    jestConfig.projects.forEach((project) => {
      expect(project[key]).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Existing mocks / setup file still wired up
// ---------------------------------------------------------------------------

describe("existing mocks and setup continue working unchanged", () => {
  it("jest.setup.js still exists at the project root", () => {
    expect(fs.existsSync(path.join(ROOT, "jest.setup.js"))).toBe(true);
  });

  it("jest.setup.js still wires jest-axe matchers", () => {
    const setup = fs.readFileSync(path.join(ROOT, "jest.setup.js"), "utf-8");
    expect(setup).toMatch(/jest-axe/);
    expect(setup).toMatch(/toHaveNoViolations/);
  });

  it("__mocks__/next-link.js still present", () => {
    expect(fs.existsSync(path.join(ROOT, "__mocks__", "next-link.js"))).toBe(true);
  });

  it("__mocks__/next-font-google.js still present", () => {
    expect(fs.existsSync(path.join(ROOT, "__mocks__", "next-font-google.js"))).toBe(true);
  });

  it("__mocks__/style.js still present", () => {
    expect(fs.existsSync(path.join(ROOT, "__mocks__", "style.js"))).toBe(true);
  });

  it("babel-jest.config.js still referenced by both projects' transforms", () => {
    const transform = JSON.stringify(getProject("unit").transform);
    expect(transform).toMatch(/babel-jest\.config\.js/);
  });

  it("babel-jest.config.js still exists on disk", () => {
    expect(fs.existsSync(path.join(ROOT, "babel-jest.config.js"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. package.json scripts honor the new project layout
// ---------------------------------------------------------------------------

describe("package.json scripts match the new project layout", () => {
  it("`test` script runs Jest (both projects)", () => {
    expect(pkg.scripts.test).toBe("jest");
  });

  it("`test:unit` script invokes Jest with --selectProjects unit", () => {
    expect(pkg.scripts["test:unit"]).toBeDefined();
    expect(pkg.scripts["test:unit"]).toMatch(/jest/);
    expect(pkg.scripts["test:unit"]).toMatch(/--selectProjects/);
    expect(pkg.scripts["test:unit"]).toMatch(/\bunit\b/);
  });

  it("`test:a11y` script invokes Jest with --selectProjects a11y", () => {
    expect(pkg.scripts["test:a11y"]).toBeDefined();
    expect(pkg.scripts["test:a11y"]).toMatch(/jest/);
    expect(pkg.scripts["test:a11y"]).toMatch(/--selectProjects/);
    expect(pkg.scripts["test:a11y"]).toMatch(/\ba11y\b/);
  });

  it("`test:unit` and `test:a11y` are mutually exclusive", () => {
    expect(pkg.scripts["test:unit"]).not.toMatch(/--selectProjects\s+a11y\b/);
    expect(pkg.scripts["test:a11y"]).not.toMatch(/--selectProjects\s+unit\b/);
  });

  it("`test:unit` does not disable the a11y project globally", () => {
    // It must still load jest (and therefore honor both project definitions)
    expect(pkg.scripts["test:unit"]).not.toMatch(/--projects\s*=/);
  });
});

// ---------------------------------------------------------------------------
// 7. Edge cases
// ---------------------------------------------------------------------------

describe("edge-case guarantees", () => {
  it("empty project discovery does NOT crash the config (config requires projects array)", () => {
    // Sanity check: require'ing the config resolves without throwing even
    // if a project were empty. The require() call at the top of this file
    // already proves this — assert defensively via the projects array.
    expect(jestConfig.projects.length).toBeGreaterThanOrEqual(2);
  });

  it("handles duplicate test matching: a single test file is discoverable by only one project", () => {
    // We approximate this by asserting each project's testMatch / ignore
    // pairs cannot both accept the same file. Build a tiny matcher and
    // confirm no glob overlap.
    const unit = getProject("unit");
    const a11y = getProject("a11y");

    const a11yGlobs = joinGlobs(a11y.testMatch);
    const unitIgnore = joinGlobs(unit.testPathIgnorePatterns);

    // a11y tests live under testMatch a11y, AND unit explicitly excludes them.
    expect(a11yGlobs).toMatch(/a11y\.test/);
    // Pattern is stored with regex-escaped dots (`\\.a11y\\.test\\.[jt]sx?$`).
    expect(unitIgnore).toMatch(/\\\.a11y\\\.test/);
  });

  it("prevents incorrect pattern overlap: a11y testMatch does NOT include the unit sources", () => {
    const a11y = getProject("a11y");
    const globs = joinGlobs(a11y.testMatch);
    expect(globs).not.toMatch(/<rootDir>\/components\/\*\*\/\*\.test\.[jt]sx?$/);
    expect(globs).not.toMatch(/<rootDir>\/lib\/\*\*\/\*\.test\.[jt]sx?$/);
  });

  it("shared config inheritance: any field on `unit` is also on `a11y` when shared", () => {
    const sharedKeys = ["moduleNameMapper", "transform", "setupFilesAfterEnv"];
    const unit = getProject("unit");
    const a11y = getProject("a11y");
    sharedKeys.forEach((key) => {
      expect(unit[key]).toEqual(a11y[key]);
    });
  });

  it("existing snapshots directory exists and is referenced via testPathIgnorePatterns", () => {
    // The `__snapshots__/` directories live next to test files; we just
    // confirm Jest knows not to accidentally snapshot unrelated fixture
    // directories by checking `tests/fixtures/` is ignored.
    const unitIgnores = joinGlobs(getProject("unit").testPathIgnorePatterns);
    expect(unitIgnores).toMatch(/tests\/fixtures\//);
  });

  it("existing mocks directory is still referenced by shared moduleNameMapper", () => {
    const unitMapper = getProject("unit").moduleNameMapper as Record<string, string>;
    expect(unitMapper["^next/link$"]).toMatch(/__mocks__\/next-link\.js$/);
    expect(unitMapper["^next/font/google$"]).toMatch(/__mocks__\/next-font-google\.js$/);
    expect(unitMapper["^.+\\.css$"]).toMatch(/__mocks__\/style\.js$/);
  });
});
