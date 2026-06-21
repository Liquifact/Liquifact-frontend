import { createPublicEnvConfig } from "./env";

describe("createPublicEnvConfig", () => {
  it("uses the localhost API default when NEXT_PUBLIC_API_URL is missing", () => {
    expect(createPublicEnvConfig({})).toEqual({
      apiUrl: "http://localhost:3001",
      stellarNetwork: "testnet",
    });
  });

  it("accepts and normalizes http and https origins", () => {
    expect(
      createPublicEnvConfig({
        NEXT_PUBLIC_API_URL: "https://api.example.com/",
        NEXT_PUBLIC_STELLAR_NETWORK: "public",
      }),
    ).toEqual({
      apiUrl: "https://api.example.com",
      stellarNetwork: "public",
    });

    expect(
      createPublicEnvConfig({
        NEXT_PUBLIC_API_URL: "http://127.0.0.1:3001",
      }).apiUrl,
    ).toBe("http://127.0.0.1:3001");
  });

  it("rejects an explicitly empty API URL", () => {
    expect(() =>
      createPublicEnvConfig({ NEXT_PUBLIC_API_URL: "" }),
    ).toThrow("NEXT_PUBLIC_API_URL must be a non-empty http(s) origin.");
  });

  it("rejects malformed API URLs", () => {
    expect(() =>
      createPublicEnvConfig({ NEXT_PUBLIC_API_URL: "not a url" }),
    ).toThrow("NEXT_PUBLIC_API_URL must be a valid URL origin.");
  });

  it("rejects disallowed API URL schemes", () => {
    expect(() =>
      createPublicEnvConfig({ NEXT_PUBLIC_API_URL: "javascript:alert(1)" }),
    ).toThrow("NEXT_PUBLIC_API_URL must use the http or https scheme.");
  });

  it("rejects API URLs with paths, queries, or hashes", () => {
    expect(() =>
      createPublicEnvConfig({ NEXT_PUBLIC_API_URL: "https://api.example.com/v1" }),
    ).toThrow("NEXT_PUBLIC_API_URL must be an origin only");

    expect(() =>
      createPublicEnvConfig({ NEXT_PUBLIC_API_URL: "https://api.example.com?debug=1" }),
    ).toThrow("NEXT_PUBLIC_API_URL must be an origin only");

    expect(() =>
      createPublicEnvConfig({ NEXT_PUBLIC_API_URL: "https://api.example.com#health" }),
    ).toThrow("NEXT_PUBLIC_API_URL must be an origin only");
  });

  it("rejects unsupported Stellar network values", () => {
    expect(() =>
      createPublicEnvConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "mainnet" }),
    ).toThrow("NEXT_PUBLIC_STELLAR_NETWORK must be one of");
  });

  it("returns a frozen config object", () => {
    expect(Object.isFrozen(createPublicEnvConfig({}))).toBe(true);
  });
});
