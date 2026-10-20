import sitemap from "./sitemap";

describe("Sitemap Route", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns static routes and non-cancelled invoice URLs from the API", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "INV_0002", status: "Open", createdAt: "2026-01-02T00:00:00.000Z" },
        { id: "INV_cancelled", status: "Cancelled" },
      ],
    }) as jest.Mock;

    const routes = await sitemap();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThanOrEqual(3);

    const urls = routes.map((r) => r.url);
    // Base URL fallback is localhost:3000
    expect(urls).toContain("http://localhost:3000/");
    expect(urls).toContain("http://localhost:3000/invoices");
    expect(urls).toContain("http://localhost:3000/invest");
    expect(urls).toContain("http://localhost:3000/marketplace/INV_0002");
    expect(urls).not.toContain("http://localhost:3000/marketplace/INV_cancelled");
    expect(
      routes.find((route) => route.url.endsWith("/INV_0002"))?.lastModified.toISOString()
    ).toBe("2026-01-02T00:00:00.000Z");
    // Ensure no dynamic route placeholder
    urls.forEach((url) => {
      expect(url).not.toMatch(/\{.*\}/);
    });
  });

  it("keeps static routes and demo invoice URLs when the API fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("API unavailable")) as jest.Mock;

    const routes = await sitemap();
    const urls = routes.map((route) => route.url);

    expect(urls).toContain("http://localhost:3000/");
    expect(urls).toContain("http://localhost:3000/marketplace/INV_0002");
    expect(urls).toContain("http://localhost:3000/marketplace/inv-001");
  });
});
