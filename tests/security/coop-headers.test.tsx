import nextConfig from "../../next.config.mjs";

describe("COOP and CORP headers configuration", () => {
  test("headers are set correctly", async () => {
    const config: any = nextConfig as any;
    const headers = await config.headers?.();
    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/:path*",
          headers: expect.arrayContaining([
            { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
            { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          ]),
        }),
      ])
    );
  });

  test("includes a CSP header with a nonce-aware script-src policy", async () => {
    const config: any = nextConfig as any;
    const headers = await config.headers?.();
    const cspHeader = headers?.[0]?.headers?.find(
      (header: { key: string }) => header.key === "Content-Security-Policy"
    );
    expect(cspHeader).toBeDefined();
    expect(cspHeader.value).toContain("script-src");
    expect(cspHeader.value).toContain("'self'");
    expect(cspHeader.value).toContain("script-src 'self'");
    expect(cspHeader.value).toContain("style-src 'self' 'unsafe-inline'");
  });
});
