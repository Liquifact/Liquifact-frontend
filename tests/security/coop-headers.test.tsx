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
});
