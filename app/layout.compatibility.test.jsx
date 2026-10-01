describe("RootLayout metadata compatibility", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
    jest.resetModules();
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["malformed", "also-not-a-url"],
    ["ftp", "ftp://example.com"],
    ["javascript", "javascript:alert(1)"],
  ])("falls back safely for %s NEXT_PUBLIC_SITE_URL values", async (_label, value) => {
    if (value === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = value;
    }

    const mod = await import("./layout");

    expect(mod.metadata.metadataBase).toBeInstanceOf(URL);
    expect(mod.metadata.metadataBase.origin).toBe("http://localhost:3000");
  });

  it("preserves the configured HTTPS origin when the value is valid", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";

    const mod = await import("./layout");

    expect(mod.metadata.metadataBase.origin).toBe("https://example.com");
  });
});
