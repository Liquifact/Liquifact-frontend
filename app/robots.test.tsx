import robots from "./robots";

describe("Robots Route", () => {
  it("returns proper robots meta", () => {
    const result = robots();
    expect(result.rules).toBeDefined();
    expect(result.rules.userAgent).toBe("*");
    expect(result.rules.allow).toBe("/");
    // default base URL fallback
    expect(result.sitemap).toContain("http://localhost:3000/sitemap.xml");
  });
});
