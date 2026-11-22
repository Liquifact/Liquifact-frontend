import fs from "node:fs";
import path from "node:path";
import { gzipSync as defaultGzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

/**
 * Recursively collects and measures `.js` chunk files under `dir`.
 *
 * @param {string} dir - Root directory to scan (e.g. `.next/static/chunks`).
 * @param {(buf: Buffer | Uint8Array | string) => Buffer | Uint8Array} [gzipFn] - Compression function (defaults to `zlib.gzipSync`).
 * @returns {Record<string, { rawBytes: number, gzipBytes: number }>} Map of POSIX relative file paths to byte measurements.
 */
export function measureChunks(dir, gzipFn = defaultGzipSync) {
  const sizes = {};
  if (!dir || !fs.existsSync(dir)) {
    return sizes;
  }

  function walk(currentDir) {
    const entries = fs
      .readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        const relPath = path.relative(dir, fullPath).split(path.sep).join("/");
        const content = fs.readFileSync(fullPath);
        const compressed = gzipFn(content);
        const gzipBytes =
          typeof compressed === "number" ? compressed : compressed.byteLength;
        sizes[relPath] = {
          rawBytes: content.byteLength,
          gzipBytes,
        };
      }
    }
  }

  walk(dir);
  return sizes;
}

function getGzipBytes(entry) {
  if (typeof entry === "number") return entry;
  if (entry && typeof entry === "object") {
    if (typeof entry.gzipBytes === "number") return entry.gzipBytes;
    if (typeof entry.gzip === "number") return entry.gzip;
    if (typeof entry.size === "number") return entry.size;
  }
  return 0;
}

function parseLimitBytes(spec) {
  if (typeof spec === "number") return spec;
  if (spec && typeof spec === "object") {
    if (typeof spec.maxGzipBytes === "number") return spec.maxGzipBytes;
    if (typeof spec.gzipBytes === "number") return spec.gzipBytes;
    if (typeof spec.limit === "number") return spec.limit;
    if (typeof spec.maxBytes === "number") return spec.maxBytes;
  }
  return null;
}

function matchesPattern(filePath, pattern) {
  const normFile = filePath.replace(/\\/g, "/");
  const normPat = pattern.replace(/\\/g, "/").replace(/^\.?\next\/static\/chunks\//, "");

  if (normFile === normPat) return true;

  // Glob pattern support (* and **)
  if (normPat.includes("*")) {
    const regexSource =
      "^" +
      normPat
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "\0")
        .replace(/\*/g, "[^/]*")
        .replace(/\0/g, ".*") +
      "$";
    return new RegExp(regexSource).test(normFile);
  }

  // Exact or prefix match for Next.js hashed chunks (e.g., "app/page" -> "app/page-abc123.js" or "app/page.js")
  if (
    normFile === `${normPat}.js` ||
    normFile.startsWith(`${normPat}-`) ||
    normFile.startsWith(`${normPat}/`)
  ) {
    return true;
  }

  return false;
}

const RESERVED_BUDGET_KEYS = new Set([
  "maxTotalGzipBytes",
  "totalGzipBytes",
  "total",
  "maxSingleChunkGzipBytes",
  "maxChunkGzipBytes",
  "defaultChunkGzipBytes",
  "perChunkGzipBytes",
  "routes",
  "chunks",
  "budgets",
]);

/**
 * Evaluates measured chunk sizes against configured budgets.
 *
 * @param {Record<string, number | { rawBytes?: number, gzipBytes: number }> | Array<{ file?: string, name?: string, path?: string, gzipBytes?: number, size?: number }>} sizes
 * @param {object} budgets
 * @returns {{ ok: boolean, passed: boolean, totalGzipBytes: number, violations: Array<{ type: string, label: string, file?: string, actualBytes: number, limitBytes: number, excessBytes: number, message: string }>, errors: string[] }}
 */
export function checkBudgets(sizes, budgets = {}) {
  const entries = [];
  if (Array.isArray(sizes)) {
    for (const item of sizes) {
      const file = (item.file || item.path || item.name || "").replace(/\\/g, "/");
      entries.push([file, getGzipBytes(item)]);
    }
  } else if (sizes && typeof sizes === "object") {
    for (const [file, val] of Object.entries(sizes)) {
      entries.push([file.replace(/\\/g, "/"), getGzipBytes(val)]);
    }
  }

  const violations = [];
  const totalGzipBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);

  const recordViolation = (type, label, actualBytes, limitBytes, file) => {
    const excessBytes = actualBytes - limitBytes;
    const message = `[check-bundle-size] Budget exceeded for "${label}": ${actualBytes} B > ${limitBytes} B (+${excessBytes} B gzip)`;
    violations.push({
      type,
      label,
      ...(file ? { file } : {}),
      actualBytes,
      limitBytes,
      excessBytes,
      message,
    });
  };

  // 1. Total bundle gzip budget
  const totalLimit = parseLimitBytes(
    budgets.maxTotalGzipBytes ?? budgets.totalGzipBytes ?? budgets.total,
  );
  if (typeof totalLimit === "number" && totalGzipBytes > totalLimit) {
    recordViolation("total", "maxTotalGzipBytes", totalGzipBytes, totalLimit);
  }

  // 2. Per-chunk maximum gzip budget
  const singleChunkLimit = parseLimitBytes(
    budgets.maxSingleChunkGzipBytes ??
      budgets.maxChunkGzipBytes ??
      budgets.defaultChunkGzipBytes ??
      budgets.perChunkGzipBytes,
  );
  if (typeof singleChunkLimit === "number") {
    for (const [file, bytes] of entries) {
      if (bytes > singleChunkLimit) {
        recordViolation("chunk", file, bytes, singleChunkLimit, file);
      }
    }
  }

  // 3. Collect route/pattern budgets from `routes`, `chunks`, `budgets`, or direct keys
  const patternRules = [];

  if (Array.isArray(budgets)) {
    for (const rule of budgets) {
      const pat = rule.pattern || rule.path || rule.route || rule.name || rule.file;
      const limit = parseLimitBytes(rule);
      if (pat && typeof limit === "number") {
        patternRules.push({ label: rule.name || pat, pattern: pat, limit, aggregate: Boolean(rule.aggregate) });
      }
    }
  } else if (budgets && typeof budgets === "object") {
    for (const groupKey of ["routes", "chunks", "budgets"]) {
      const group = budgets[groupKey];
      if (Array.isArray(group)) {
        for (const rule of group) {
          const pat = rule.pattern || rule.path || rule.route || rule.name || rule.file;
          const limit = parseLimitBytes(rule);
          if (pat && typeof limit === "number") {
            patternRules.push({ label: rule.name || pat, pattern: pat, limit, aggregate: Boolean(rule.aggregate) });
          }
        }
      } else if (group && typeof group === "object") {
        for (const [pat, spec] of Object.entries(group)) {
          const limit = parseLimitBytes(spec);
          if (typeof limit === "number") {
            patternRules.push({
              label: pat,
              pattern: (spec && typeof spec === "object" && (spec.pattern || spec.path)) || pat,
              limit,
              aggregate: Boolean(spec && typeof spec === "object" && spec.aggregate),
            });
          }
        }
      }
    }

    for (const [key, spec] of Object.entries(budgets)) {
      if (RESERVED_BUDGET_KEYS.has(key)) continue;
      const limit = parseLimitBytes(spec);
      if (typeof limit === "number") {
        patternRules.push({
          label: key,
          pattern: (spec && typeof spec === "object" && (spec.pattern || spec.path)) || key,
          limit,
          aggregate: Boolean(spec && typeof spec === "object" && spec.aggregate),
        });
      }
    }
  }

  for (const rule of patternRules) {
    const matched = entries.filter(([file]) => matchesPattern(file, rule.pattern));
    if (matched.length === 0) continue;

    if (rule.aggregate) {
      const sumBytes = matched.reduce((acc, [, b]) => acc + b, 0);
      if (sumBytes > rule.limit) {
        recordViolation("route", rule.label, sumBytes, rule.limit);
      }
    } else {
      for (const [file, bytes] of matched) {
        if (bytes > rule.limit) {
          recordViolation("route", rule.label, bytes, rule.limit, file);
        }
      }
    }
  }

  const ok = violations.length === 0;
  return {
    ok,
    passed: ok,
    totalGzipBytes,
    violations,
    errors: violations.map((v) => v.message),
  };
}

/**
 * CLI runner that reads `.next/static/chunks` and `bundle-budgets.json`.
 */
export function runCli(argv = process.argv.slice(2), cwd = process.cwd()) {
  let chunksDir = path.resolve(cwd, ".next/static/chunks");
  let budgetsPath = path.resolve(cwd, "bundle-budgets.json");

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir" && argv[i + 1]) {
      chunksDir = path.resolve(cwd, argv[++i]);
    } else if (arg === "--budgets" && argv[i + 1]) {
      budgetsPath = path.resolve(cwd, argv[++i]);
    }
  }

  if (!fs.existsSync(budgetsPath)) {
    console.error(`[check-bundle-size] Missing budgets configuration file: ${budgetsPath}`);
    return 1;
  }

  if (!fs.existsSync(chunksDir)) {
    console.error(
      `[check-bundle-size] Chunks directory not found: ${chunksDir} (run "npm run build" first)`,
    );
    return 1;
  }

  const budgets = JSON.parse(fs.readFileSync(budgetsPath, "utf8"));
  const sizes = measureChunks(chunksDir);
  const fileCount = Object.keys(sizes).length;

  if (fileCount === 0) {
    console.error(`[check-bundle-size] No .js chunks found in ${chunksDir}`);
    return 1;
  }

  const result = checkBudgets(sizes, budgets);
  if (!result.ok) {
    for (const err of result.errors) {
      console.error(err);
    }
    return 1;
  }

  console.log(
    `[check-bundle-size] OK — ${fileCount} chunks measured (${result.totalGzipBytes} B total gzip) within budget.`,
  );
  return 0;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  process.exit(runCli());
}
