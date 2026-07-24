import sitemap from "./sitemap";

describe("Sitemap Route", () => {
  it("returns routes with expected public paths", () => {
    const routes = sitemap();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThanOrEqual(3);

    const urls = routes.map((r) => r.url);
    // Base URL fallback is localhost:3000
    expect(urls).toContain("http://localhost:3000/");
    expect(urls).toContain("http://localhost:3000/invoices");
    expect(urls).toContain("http://localhost:3000/invest");
    // Ensure no dynamic route placeholder
    urls.forEach((url) => {
      expect(url).not.toMatch(/\{.*\}/);
    });
  });
});
