if (typeof global.Request === "undefined") {
  (global as any).Request = class Request {};
  (global as any).Response = class Response {};
  (global as any).Headers = class Headers {};
}

const robots = require("./robots").default;

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
