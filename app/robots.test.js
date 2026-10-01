function loadRobots(siteUrl) {
  if (siteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = siteUrl;
  }

  let robots;
  jest.isolateModules(() => {
    robots = require("./robots").default;
  });

  return robots;
}

describe("robots metadata route", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it("returns the established rules and localhost sitemap by default", () => {
    const result = loadRobots()();

    expect(result).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "http://localhost:3000/sitemap.xml",
    });
  });

  it("preserves a configured site path and removes trailing slashes", () => {
    const result = loadRobots("https://example.com:8443/public/site///")();

    expect(result.sitemap).toBe(
      "https://example.com:8443/public/site/sitemap.xml",
    );
  });

  it.each([
    ["malformed URL", "not-a-url"],
    ["unsupported protocol", "javascript:alert(1)"],
    ["URL credentials", "https://user:pass@example.com"],
    ["query string", "https://example.com/?token=private"],
    ["fragment", "https://example.com/#private"],
  ])("rejects %s configuration", (_description, siteUrl) => {
    expect(() => loadRobots(siteUrl)).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("keeps racing and retried calls deterministic and independently mutable", async () => {
    const robots = loadRobots("https://example.com");
    const results = await Promise.all(
      Array.from({ length: 32 }, () => Promise.resolve().then(robots)),
    );

    expect(results).toHaveLength(32);
    results.slice(1).forEach((result) => {
      expect(result).toEqual(results[0]);
      expect(result).not.toBe(results[0]);
      expect(result.rules).not.toBe(results[0].rules);
    });

    results[0].rules.allow = "/changed";
    expect(robots().rules.allow).toBe("/");
    expect(robots()).toEqual(results[1]);
  });
});