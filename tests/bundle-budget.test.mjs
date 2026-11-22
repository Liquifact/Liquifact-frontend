import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { measureChunks, checkBudgets, runCli } from "../scripts/check-bundle-size.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "check-bundle-size.mjs");
const budgetsFilePath = path.join(repoRoot, "bundle-budgets.json");

function withTempChunksFixture(files, fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "liquifact-bundle-test-"));
  try {
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(tmpDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    return fn(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

test("measureChunks recursively measures .js files with injected gzipSync and ignores non-JS files", () => {
  const fakeGzip = (buf) => Buffer.alloc(Math.ceil(buf.byteLength / 2));

  withTempChunksFixture(
    {
      "main-abc123.js": "x".repeat(200),
      "app/page-111.js": "y".repeat(500),
      "app/marketplace/page-222.js": "z".repeat(800),
      "app/page-111.js.map": "ignored sourcemap content",
      "styles.css": "body { margin: 0; }",
    },
    (dir) => {
      const sizes = measureChunks(dir, fakeGzip);
      assert.deepEqual(Object.keys(sizes).sort(), [
        "app/marketplace/page-222.js",
        "app/page-111.js",
        "main-abc123.js",
      ]);
      assert.deepEqual(sizes["main-abc123.js"], { rawBytes: 200, gzipBytes: 100 });
      assert.deepEqual(sizes["app/page-111.js"], { rawBytes: 500, gzipBytes: 250 });
      assert.deepEqual(sizes["app/marketplace/page-222.js"], { rawBytes: 800, gzipBytes: 400 });
    },
  );
});

test("measureChunks returns empty object when directory does not exist", () => {
  assert.deepEqual(measureChunks(path.join(os.tmpdir(), "non-existent-liquifact-dir-999")), {});
});

test("checkBudgets passes when all chunks, routes, and total gzip bytes are within limits", () => {
  const sizes = {
    "main-123.js": { rawBytes: 80000, gzipBytes: 30000 },
    "app/page-abc.js": { rawBytes: 120000, gzipBytes: 45000 },
    "app/marketplace/page-def.js": { rawBytes: 180000, gzipBytes: 70000 },
  };
  const budgets = {
    maxSingleChunkGzipBytes: 100000,
    maxTotalGzipBytes: 200000,
    routes: {
      "app/page": 60000,
      "app/marketplace/page": 90000,
    },
  };

  const result = checkBudgets(sizes, budgets);
  assert.equal(result.ok, true);
  assert.equal(result.passed, true);
  assert.equal(result.totalGzipBytes, 145000);
  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.errors, []);
});

test("checkBudgets reports route, per-chunk, and total gzip budget violations", () => {
  const sizes = {
    "vendor-big.js": { rawBytes: 400000, gzipBytes: 170000 },
    "app/page-abc.js": { rawBytes: 350000, gzipBytes: 160000 },
    "app/marketplace/page-def.js": { rawBytes: 200000, gzipBytes: 90000 },
  };
  const budgets = {
    maxSingleChunkGzipBytes: 153600,
    maxTotalGzipBytes: 300000,
    routes: {
      "app/page": 153600,
      "app/marketplace/page": 204800,
    },
  };

  const result = checkBudgets(sizes, budgets);
  assert.equal(result.ok, false);
  assert.equal(result.passed, false);
  assert.equal(result.totalGzipBytes, 420000);

  const types = result.violations.map((v) => v.type);
  assert.ok(types.includes("total"), "expected total budget violation");
  assert.ok(types.includes("chunk"), "expected single chunk budget violation");
  assert.ok(types.includes("route"), "expected route budget violation");

  const routeViolation = result.violations.find((v) => v.type === "route");
  assert.equal(routeViolation.label, "app/page");
  assert.equal(routeViolation.file, "app/page-abc.js");
  assert.equal(routeViolation.actualBytes, 160000);
  assert.equal(routeViolation.limitBytes, 153600);
  assert.equal(routeViolation.excessBytes, 6400);
  assert.match(routeViolation.message, /app\/page/);
});

test("checkBudgets supports glob patterns and direct numeric sizes", () => {
  const sizes = {
    "app/marketplace/[id]/page-987.js": 210000,
  };
  const budgets = {
    routes: {
      "app/marketplace/[id]/page-*.js": 204800,
    },
  };

  const result = checkBudgets(sizes, budgets);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].file, "app/marketplace/[id]/page-987.js");
});

test("bundle-budgets.json defines valid default budgets", () => {
  const budgets = JSON.parse(fs.readFileSync(budgetsFilePath, "utf8"));
  assert.equal(typeof budgets.maxSingleChunkGzipBytes, "number");
  assert.equal(typeof budgets.maxTotalGzipBytes, "number");
  assert.equal(typeof budgets.routes, "object");
  assert.ok(budgets.routes["app/page"] > 0);
  assert.ok(budgets.routes["app/marketplace/page"] > 0);
});

test("CLI exits 0 when chunks pass budget and exits non-zero when a budget is exceeded", () => {
  withTempChunksFixture(
    {
      "app/page-123.js": "console.log('small home chunk');\n".repeat(10),
      "budgets-pass.json": JSON.stringify({
        maxSingleChunkGzipBytes: 50000,
        maxTotalGzipBytes: 100000,
        routes: { "app/page": 10000 },
      }),
      "budgets-fail.json": JSON.stringify({
        maxSingleChunkGzipBytes: 50000,
        maxTotalGzipBytes: 100000,
        routes: { "app/page": 10 },
      }),
    },
    (dir) => {
      const passCode = runCli(
        ["--dir", dir, "--budgets", path.join(dir, "budgets-pass.json")],
        dir,
      );
      assert.equal(passCode, 0);

      const failRun = spawnSync(
        process.execPath,
        [scriptPath, "--dir", dir, "--budgets", path.join(dir, "budgets-fail.json")],
        { encoding: "utf8" },
      );
      assert.notEqual(failRun.status, 0);
      assert.match(failRun.stderr, /Budget exceeded/);
    },
  );
});
