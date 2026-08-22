/**
 * Postinstall script to patch the broken `unrs-resolver` native binding on
 * Windows / Node 24 environments where the Rust `.node` binary cannot be loaded
 * (ERR_DLOPEN_FAILED, missing VC++ runtime).
 *
 * Replaces the package with a pure-JS fallback that uses `require.resolve`
 * and filesystem lookups.  Safe to run on any platform — if the native
 * binding loads fine the script is a no-op.
 */
const fs = require("fs");
const path = require("path");

const pkgDir = path.join(__dirname, "..", "node_modules", "unrs-resolver");
const indexPath = path.join(pkgDir, "index.js");

// If the package is missing entirely, skip silently (e.g. npm ci in progress)
if (!fs.existsSync(indexPath)) {
  process.exit(0);
}

// Test whether the native binding already works
try {
  require(pkgDir);
  // loaded without error → native binding is fine
  process.exit(0);
} catch {
  // broken – fall through to replacement
}

const replacement = `
const path = require('path');
const fs = require('fs');

const DEFAULT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.node'];

class ResolverFactory {
  constructor(options) {
    this.options = options || {};
  }

  cloneWithOptions(options) {
    return new ResolverFactory({ ...this.options, ...options });
  }

  sync(basedir, modulePath) {
    const baseDir = basedir || process.cwd();

    try {
      const resolved = require.resolve(modulePath, { paths: [baseDir] });
      return { path: resolved };
    } catch {
    }

    const exts = this.options.extensions || DEFAULT_EXTENSIONS;
    const tryPath = path.isAbsolute(modulePath)
      ? modulePath
      : path.resolve(baseDir, modulePath);

    if (fs.existsSync(tryPath) && fs.statSync(tryPath).isFile()) {
      return { path: tryPath };
    }

    for (const ext of exts) {
      const p = tryPath + ext;
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return { path: p };
      }
    }

    return { error: 'MODULE_NOT_FOUND' };
  }

  async async(basedir, modulePath) {
    return this.sync(basedir, modulePath);
  }

  clearCache() {}
}

module.exports = { ResolverFactory };
`;

fs.writeFileSync(indexPath, replacement, "utf8");
console.log("🔧 unrs-resolver: patched with JS fallback");
