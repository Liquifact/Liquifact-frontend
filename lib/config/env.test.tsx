import { loadEnv } from "./env";

/**
 * Tests for the typed env loader.
 *
 * Each test manipulates process.env and calls loadEnv() directly so the
 * module-level singleton does not interfere with individual cases.
 */

describe("loadEnv", () => {
  // Snapshot the real env before any test runs.
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    // Restore env so tests are fully isolated.
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, ORIGINAL_ENV);
  });

  // ── Defaults ──────────────────────────────────────────────────────────────

  it("returns the default apiUrl when NEXT_PUBLIC_API_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const cfg = loadEnv();
    expect(cfg.apiUrl).toBe("http://localhost:3001");
  });

  it("returns the default siteUrl when NEXT_PUBLIC_SITE_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const cfg = loadEnv();
    expect(cfg.siteUrl).toBe("http://localhost:3000");
  });

  it("returns undefined stellarNetwork when NEXT_PUBLIC_STELLAR_NETWORK is unset", () => {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    const cfg = loadEnv();
    expect(cfg.stellarNetwork).toBeUndefined();
  });

  it("does not throw when all vars use their defaults", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    expect(() => loadEnv()).not.toThrow();
  });

  // ── Valid overrides ────────────────────────────────────────────────────────

  it("returns the configured apiUrl when NEXT_PUBLIC_API_URL is a valid URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    expect(loadEnv().apiUrl).toBe("https://api.example.com");
  });

  it("returns the configured siteUrl when NEXT_PUBLIC_SITE_URL is a valid URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    expect(loadEnv().siteUrl).toBe("https://example.com");
  });

  it('accepts "testnet" as a valid NEXT_PUBLIC_STELLAR_NETWORK', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    expect(() => loadEnv()).not.toThrow();
    expect(loadEnv().stellarNetwork).toBe("testnet");
  });

  it('accepts "public" as a valid NEXT_PUBLIC_STELLAR_NETWORK', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "public";
    expect(() => loadEnv()).not.toThrow();
    expect(loadEnv().stellarNetwork).toBe("public");
  });

  it("accepts URLs with paths and ports", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.internal:8080/v2";
    expect(() => loadEnv()).not.toThrow();
    expect(loadEnv().apiUrl).toBe("http://api.internal:8080/v2");
  });

  // ── Invalid NEXT_PUBLIC_API_URL ───────────────────────────────────────────

  it("throws when NEXT_PUBLIC_API_URL is not a valid URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "not-a-url";
    expect(() => loadEnv()).toThrow();
  });

  it("error message names NEXT_PUBLIC_API_URL when it is invalid", () => {
    process.env.NEXT_PUBLIC_API_URL = "not-a-url";
    expect(() => loadEnv()).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it("error message includes the bad value when NEXT_PUBLIC_API_URL is invalid", () => {
    process.env.NEXT_PUBLIC_API_URL = "not-a-url";
    expect(() => loadEnv()).toThrow(/not-a-url/);
  });

  // ── Disallowed schemes (security) ─────────────────────────────────────────

  it("rejects a javascript: scheme for NEXT_PUBLIC_API_URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "javascript:alert(1)";
    expect(() => loadEnv()).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it("rejects a data: scheme for NEXT_PUBLIC_API_URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "data:text/html,<script>1</script>";
    expect(() => loadEnv()).toThrow(/disallowed scheme/);
  });

  it("rejects a file: scheme for NEXT_PUBLIC_API_URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "file:///etc/passwd";
    expect(() => loadEnv()).toThrow(/disallowed scheme/);
  });

  it("rejects an ftp: scheme for NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "ftp://example.com";
    expect(() => loadEnv()).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("names the offending scheme in the disallowed-scheme error", () => {
    process.env.NEXT_PUBLIC_API_URL = "javascript:alert(1)";
    expect(() => loadEnv()).toThrow(/javascript:/);
  });

  it("accepts an https URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    expect(() => loadEnv()).not.toThrow();
  });

  it("treats a trailing-slash URL as valid", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/";
    expect(() => loadEnv()).not.toThrow();
    expect(loadEnv().apiUrl).toBe("https://api.example.com/");
  });

  it("treats an empty-string NEXT_PUBLIC_API_URL as unset (uses default)", () => {
    process.env.NEXT_PUBLIC_API_URL = "";
    expect(loadEnv().apiUrl).toBe("http://localhost:3001");
  });

  // ── Frozen config object ──────────────────────────────────────────────────

  it("returns a frozen config object", () => {
    const cfg = loadEnv();
    expect(Object.isFrozen(cfg)).toBe(true);
  });

  it("ignores attempts to mutate the returned config", () => {
    const cfg = loadEnv();
    expect(() => {
      "use strict";
      // @ts-expect-error — intentionally testing immutability
      cfg.apiUrl = "https://evil.example.com";
    }).toThrow();
    expect(cfg.apiUrl).not.toBe("https://evil.example.com");
  });

  // ── Invalid NEXT_PUBLIC_SITE_URL ──────────────────────────────────────────

  it("throws when NEXT_PUBLIC_SITE_URL is not a valid URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "also-not-a-url";
    expect(() => loadEnv()).toThrow();
  });

  it("error message names NEXT_PUBLIC_SITE_URL when it is invalid", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "also-not-a-url";
    expect(() => loadEnv()).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  // ── Invalid NEXT_PUBLIC_STELLAR_NETWORK ───────────────────────────────────

  it("throws when NEXT_PUBLIC_STELLAR_NETWORK is an unrecognised value", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
    expect(() => loadEnv()).toThrow();
  });

  it("error message names NEXT_PUBLIC_STELLAR_NETWORK when it is invalid", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
    expect(() => loadEnv()).toThrow(/NEXT_PUBLIC_STELLAR_NETWORK/);
  });

  it("error message lists allowed values for NEXT_PUBLIC_STELLAR_NETWORK", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
    expect(() => loadEnv()).toThrow(/testnet/);
    expect(() => loadEnv()).toThrow(/public/);
  });

  it("treats empty-string NEXT_PUBLIC_STELLAR_NETWORK as unset (no error)", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "";
    expect(() => loadEnv()).not.toThrow();
    expect(loadEnv().stellarNetwork).toBeUndefined();
  });

  // ── Multi-error consolidation ─────────────────────────────────────────────

  it("consolidates multiple invalid vars into a single thrown error", () => {
    process.env.NEXT_PUBLIC_API_URL = "bad-api";
    process.env.NEXT_PUBLIC_SITE_URL = "bad-site";
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "invalid-net";

    let caught: Error | undefined;
    try {
      loadEnv();
    } catch (e) {
      caught = e as Error;
    }

    expect(caught).toBeDefined();
    expect(caught?.message).toMatch(/NEXT_PUBLIC_API_URL/);
    expect(caught?.message).toMatch(/NEXT_PUBLIC_SITE_URL/);
    expect(caught?.message).toMatch(/NEXT_PUBLIC_STELLAR_NETWORK/);
  });

  it("error message includes the [env] prefix for easy grepping in CI logs", () => {
    process.env.NEXT_PUBLIC_API_URL = "bad";
    expect(() => loadEnv()).toThrow(/\[env\]/);
  });

  it("error message contains a deploy hint so developers know the fix is required", () => {
    process.env.NEXT_PUBLIC_API_URL = "bad";
    expect(() => loadEnv()).toThrow(/fix before deploying/i);
  });

  // ── Return shape ──────────────────────────────────────────────────────────

  it("returns an object with exactly { apiUrl, siteUrl, stellarNetwork } keys", () => {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    const cfg = loadEnv();
    expect(Object.keys(cfg).sort()).toEqual(["apiUrl", "siteUrl", "stellarNetwork"].sort());
  });

  it("stellarNetwork is undefined (not null or empty string) when unset", () => {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    expect(loadEnv().stellarNetwork).toBeUndefined();
  });

  // ── Security: no server-only values leaked ────────────────────────────────

  it("does not include non-NEXT_PUBLIC_ keys in the returned config", () => {
    process.env.DATABASE_URL = "postgres://secret";
    const cfg = loadEnv();
    // The config object must not carry the server-only key.
    expect(Object.values(cfg)).not.toContain("postgres://secret");
  });
});
