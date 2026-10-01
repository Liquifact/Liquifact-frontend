/**
 * @file app/robots.test.tsx
 *
 * Compatibility-contract tests for the `app/robots.js` metadata route.
 *
 * The public contract under test (issue #1224):
 *   - the default export is a zero-arg function returning
 *     `{ rules: { userAgent: "*", allow: "/" }, sitemap }`
 *   - `sitemap` is always an absolute http(s) URL ending in `/sitemap.xml`
 *   - unset / blank / malformed / non-http(s) `NEXT_PUBLIC_SITE_URL` values
 *     all fall back to the localhost default instead of emitting a broken
 *     crawl directive
 *   - the route is deterministic and never throws
 *
 * Env is mutated per test and restored afterwards so the suite is isolated.
 */

if (typeof global.Request === "undefined") {
  (global as any).Request = class Request {};
  (global as any).Response = class Response {};
  (global as any).Headers = class Headers {};
}

const robotsModule = require("./robots");
const robots = robotsModule.default;
const { resolveSiteUrl, buildSitemapUrl, DEFAULT_SITE_URL, SITEMAP_PATH } = robotsModule;

describe("Robots Route – compatibility contract", () => {
  const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
    }
  });

  it("returns proper robots meta", () => {
    const result = robots();
    expect(result.rules).toBeDefined();
    expect(result.rules.userAgent).toBe("*");
    expect(result.rules.allow).toBe("/");
    // default base URL fallback
    expect(result.sitemap).toContain("http://localhost:3000/sitemap.xml");
  });

  it("preserves the exact top-level return shape across calls", () => {
    const a = robots();
    const b = robots();
    expect(a).toEqual(b);
    expect(Object.keys(a).sort()).toEqual(["rules", "sitemap"]);
    expect(Object.keys(a.rules).sort()).toEqual(["allow", "userAgent"]);
  });

  // ── Base-URL resolution: valid inputs ──────────────────────────────────────

  it("uses a configured https origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.liquifact.io";
    const result = robots();
    expect(result.sitemap).toBe("https://app.liquifact.io/sitemap.xml");
  });

  it("strips a trailing slash so the sitemap never gets a double slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.liquifact.io/";
    expect(robots().sitemap).toBe("https://app.liquifact.io/sitemap.xml");
  });

  it("trims surrounding whitespace before parsing", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "  https://app.liquifact.io  ";
    expect(robots().sitemap).toBe("https://app.liquifact.io/sitemap.xml");
  });

  it("preserves a non-root path segment in the base URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/app/";
    expect(robots().sitemap).toBe("https://example.com/app/sitemap.xml");
  });

  it("preserves a non-default port", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:4321";
    expect(robots().sitemap).toBe("http://localhost:4321/sitemap.xml");
  });

  // ── Base-URL resolution: adverse inputs fall back safely ───────────────────

  it("falls back to the default when the env var is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(resolveSiteUrl()).toBe(DEFAULT_SITE_URL);
    expect(robots().sitemap).toBe(`${DEFAULT_SITE_URL}${SITEMAP_PATH}`);
  });

  it("falls back to the default for blank and whitespace-only values", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "";
    expect(resolveSiteUrl()).toBe(DEFAULT_SITE_URL);
    process.env.NEXT_PUBLIC_SITE_URL = "   ";
    expect(resolveSiteUrl()).toBe(DEFAULT_SITE_URL);
  });

  it("falls back to the default for a malformed URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not-a-url";
    expect(resolveSiteUrl()).toBe(DEFAULT_SITE_URL);
    expect(robots().sitemap).toBe(`${DEFAULT_SITE_URL}${SITEMAP_PATH}`);
  });

  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>1</script>"],
    ["file:", "file:///etc/passwd"],
    ["ftp:", "ftp://example.com"],
  ])("rejects the %s scheme and falls back to the default", (_label, value) => {
    process.env.NEXT_PUBLIC_SITE_URL = value;
    expect(resolveSiteUrl()).toBe(DEFAULT_SITE_URL);
    expect(robots().sitemap).toBe(`${DEFAULT_SITE_URL}${SITEMAP_PATH}`);
  });

  it("falls back for non-string input (null/undefined/number)", () => {
    expect(resolveSiteUrl(null)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl(42)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl({})).toBe(DEFAULT_SITE_URL);
  });

  it("is deterministic and never throws for a hostile value", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "h ttp://%%%";
    expect(() => robots()).not.toThrow();
    expect(robots()).toEqual(robots());
  });

  // ── Helper contract ────────────────────────────────────────────────────────

  it("buildSitemapUrl appends the sitemap path to a resolved origin", () => {
    expect(buildSitemapUrl("https://x.example")).toBe("https://x.example/sitemap.xml");
    expect(SITEMAP_PATH).toBe("/sitemap.xml");
  });

  it("every produced sitemap is an absolute http(s) URL ending in /sitemap.xml", () => {
    for (const value of [undefined, "", "bad", "ftp://x.com", "https://x.com/"]) {
      if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = value;

      const { sitemap } = robots();
      expect(sitemap.endsWith(SITEMAP_PATH)).toBe(true);
      expect(sitemap).toMatch(/^https?:\/\//);
      expect(() => new URL(sitemap)).not.toThrow();
    }
  });

  it("does not mutate the configured env var", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.liquifact.io/";
    robots();
    expect(process.env.NEXT_PUBLIC_SITE_URL).toBe("https://app.liquifact.io/");
  });
});
