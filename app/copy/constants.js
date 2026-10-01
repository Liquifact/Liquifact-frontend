
/**
 * Centralized constants for the application.
 * All constants are validated at module load time to fail-fast on invalid configuration.
 *
 * Validation Invariants:
 * - All URL constants must be non-empty strings
 * - All URL constants must use HTTPS protocol only
 * - All URL constants must have a valid hostname
 * - Dangerous protocols are rejected: javascript:, data:, mailto:, file:, ftp:, http:
 * - Invalid formats (null, undefined, malformed URLs) throw at module load
 * - This ensures security and prevents silent data loss or runtime errors
 */

/**
 * Validates a URL constant against security and format constraints.
 * @param {string} url - The URL to validate
 * @param {string} constantName - The name of the constant (for error messages)
 * @returns {string} The validated URL
 * @throws {Error} If the URL fails validation
 */
function validateUrl(url, constantName) {
  if (url === null || url === undefined) {
    throw new Error(
      `Constant "${constantName}" is ${url}. Must be a non-empty string.`
    );
  }

  if (typeof url !== "string") {
    throw new Error(
      `Constant "${constantName}" must be a string, received ${typeof url}.`
    );
  }

  if (url.trim() === "") {
    throw new Error(
      `Constant "${constantName}" cannot be an empty string.`
    );
  }

  // Validate URL format
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS protocol for security
    if (parsed.protocol !== "https:") {
      throw new Error(
        `Constant "${constantName}" must use HTTPS protocol. Received: ${parsed.protocol}`
      );
    }

    // Require a hostname (reject javascript:, data:, mailto:, etc.)
    if (!parsed.hostname || parsed.hostname === "") {
      throw new Error(
        `Constant "${constantName}" must have a valid hostname.`
      );
    }

    // Additional security: reject potentially dangerous protocols
    const dangerousProtocols = ["javascript:", "data:", "mailto:", "file:", "ftp:", "http:"];
    if (dangerousProtocols.includes(parsed.protocol)) {
      throw new Error(
        `Constant "${constantName}" uses dangerous protocol: ${parsed.protocol}`
      );
    }

  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        `Constant "${constantName}" is not a valid URL: "${url}"`
      );
    }
    throw e;
  }

  return url;
}

/**
 * Trusted wallet installation URL.
 * Validated at module load time to ensure:
 * - Non-empty string
 * - HTTPS protocol only
 * - Valid hostname
 * - No dangerous protocols (javascript:, data:, etc.)
 */
export const TRUSTED_WALLET_INSTALL_URL = validateUrl(
  "https://www.stellar.org/wallets",
  "TRUSTED_WALLET_INSTALL_URL"
);
