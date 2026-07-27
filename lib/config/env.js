/**
 * Typed environment-variable loader with build-time validation.
 *
 * Only NEXT_PUBLIC_* variables are exposed — these are inlined by Next.js at
 * build time and are safe to ship to the browser. Never add server-only secrets
 * (e.g. DATABASE_URL, API secret keys) to this file.
 *
 * Call loadEnv() directly in tests (after mutating process.env) to validate
 * specific configurations without re-importing the module.
 * The exported `env` singleton is evaluated once at module load, failing the
 * build immediately if any variable is misconfigured.
 */

const STELLAR_NETWORKS = ["testnet", "public"];

/**
 * Schemes permitted for browser-facing URL config. Anything else (javascript:,
 * data:, file:, ftp:, …) is rejected so a malicious or fat-fingered value can
 * never be concatenated into a fetch() URL or injected into a CSP origin.
 */
const ALLOWED_URL_SCHEMES = ["http:", "https:"];

/**
 * Parses a URL-typed env var, enforcing a well-formed origin and an http/https
 * scheme. Pushes a safe, reviewer-friendly error (no stack, no secrets) onto
 * `errors` when the value is malformed or uses a disallowed scheme.
 *
 * @param {string} name  Variable name, used in the error message.
 * @param {string} value Raw value to validate.
 * @param {string[]} errors Accumulator for human-readable error lines.
 */
function validateUrl(name, value, errors) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    errors.push(`${name}: "${value}" is not a valid URL`);
    return;
  }

  if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
    errors.push(
      `${name}: "${value}" uses a disallowed scheme "${parsed.protocol}" — only http/https are permitted`
    );
  }
}

/**
 * Reads, validates, and returns all NEXT_PUBLIC_* configuration.
 *
 * Validation rules:
 *  - NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SITE_URL must parse via `new URL(...)`
 *    AND use an http: or https: scheme (defaults applied when unset).
 *  - NEXT_PUBLIC_STELLAR_NETWORK is optional; when present it must be one of
 *    [testnet, public]. An empty string is treated as unset.
 *
 * @returns {Readonly<{
 *   apiUrl: string,
 *   siteUrl: string,
 *   stellarNetwork: string | undefined
 * }>} A frozen config object.
 * @throws {Error} Lists every misconfigured variable in a single message.
 */
export function loadEnv() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const stellarNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK || undefined;

  const errors = [];

  validateUrl("NEXT_PUBLIC_API_URL", apiUrl, errors);
  validateUrl("NEXT_PUBLIC_SITE_URL", siteUrl, errors);

  if (stellarNetwork && !STELLAR_NETWORKS.includes(stellarNetwork)) {
    errors.push(
      `NEXT_PUBLIC_STELLAR_NETWORK: "${stellarNetwork}" must be one of [${STELLAR_NETWORKS.join(", ")}]`
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `[env] Environment misconfiguration — fix before deploying:\n` +
        errors.map((e) => `  • ${e}`).join("\n")
    );
  }

  return Object.freeze({ apiUrl, siteUrl, stellarNetwork });
}

// Evaluated at module load (= Next.js build time). A misconfigured variable
// surfaces as a build error rather than a silent runtime failure.
export const env = loadEnv();
