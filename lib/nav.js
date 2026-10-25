// Navigation helpers. Pure and dependency-free so `node --test` can import them.

function stripTrailingSlash(path) {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Whether a nav link `href` should be marked active for the current `pathname`.
 * "/" only matches exactly; other hrefs match themselves and nested routes on a
 * segment boundary, so "/marketplace" matches "/marketplace/INV_1" but "/submit"
 * does not match "/submit-guide".
 */
export function isActivePath(pathname, href) {
  if (typeof pathname !== "string" || typeof href !== "string") return false;
  const path = stripTrailingSlash(pathname || "/");
  const target = stripTrailingSlash(href || "/");
  if (target === "/") return path === "/";
  return path === target || path.startsWith(`${target}/`);
}
