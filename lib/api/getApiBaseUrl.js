/**
 * Returns the backend API base URL, resolved from the environment.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_API_URL environment variable (validated to be a parseable URL).
 *  2. http://localhost:3001 as the development fallback.
 *
 * The returned string always has its trailing slash stripped so callers can
 * safely concatenate paths with a leading slash.
 *
 * @returns {string} Validated base URL without trailing slash.
 * @throws {Error} If NEXT_PUBLIC_API_URL is set but cannot be parsed as a URL.
 */
export function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL;

  if (raw) {
    try {
      const parsed = new URL(raw);
      return parsed.origin + parsed.pathname.replace(/\/$/, "");
    } catch {
      throw new Error(
        `[getApiBaseUrl] NEXT_PUBLIC_API_URL is set but is not a valid URL: "${raw}"`
      );
    }
  }

  return "http://localhost:3001";
}
