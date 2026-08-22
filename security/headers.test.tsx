/**
 * Tests for the security response headers and Content-Security-Policy.
 *
 * These assert the *shape* of the headers config (the pure builders in
 * lib/securityHeaders.mjs) and that next.config.mjs wires them onto every
 * route. Asserting the builders directly gives deterministic, fast coverage
 * without needing a running server, while the next.config integration test
 * confirms the headers() contract Next.js consumes.
 *
 * Edge cases covered (per issue #99):
 *  - API origin is allow-listed in connect-src.
 *  - Google Fonts hosts are allow-listed so Geist fonts load.
 *  - Framing is blocked (frame-ancestors 'none' + X-Frame-Options: DENY).
 *  - Dev-only relaxations (unsafe-eval, ws:) never leak into production.
 */
import {
  DEFAULT_API_URL,
  getApiOrigin,
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "../lib/securityHeaders.mjs";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a CSP string into a { directive: [sources] } map for easy assertions. */
function parseCsp(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [directive, ...sources] = part.split(/\s+/);
        return [directive, sources];
      })
  );
}

// ── getApiOrigin ─────────────────────────────────────────────────────────────

describe("getApiOrigin", () => {
  it("extracts the origin from a full URL", () => {
    expect(getApiOrigin("http://localhost:3001")).toBe("http://localhost:3001");
  });

  it("strips path, query and hash, keeping scheme/host/port", () => {
    expect(getApiOrigin("https://api.example.com:8443/v1/health?x=1#z")).toBe(
      "https://api.example.com:8443"
    );
  });

  it("returns null for an empty or whitespace value", () => {
    expect(getApiOrigin("")).toBeNull();
    expect(getApiOrigin("   ")).toBeNull();
    expect(getApiOrigin(undefined)).toBeNull();
    expect(getApiOrigin(null)).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(getApiOrigin("not a url")).toBeNull();
    expect(getApiOrigin("///")).toBeNull();
  });
});

// ── buildContentSecurityPolicy ───────────────────────────────────────────────

describe("buildContentSecurityPolicy", () => {
  it("is deny-by-default with default-src 'self'", () => {
    const csp = parseCsp(buildContentSecurityPolicy());
    expect(csp["default-src"]).toEqual(["'self'"]);
  });

  it("allow-lists the API origin in connect-src so fetch() is not blocked", () => {
    const csp = parseCsp(buildContentSecurityPolicy({ apiUrl: "https://api.liquifact.io" }));
    expect(csp["connect-src"]).toContain("'self'");
    expect(csp["connect-src"]).toContain("https://api.liquifact.io");
  });

  it("uses the default API origin when none is provided", () => {
    const csp = parseCsp(buildContentSecurityPolicy());
    expect(csp["connect-src"]).toContain(DEFAULT_API_URL);
  });

  it("omits an invalid API origin from connect-src", () => {
    const csp = parseCsp(buildContentSecurityPolicy({ apiUrl: "not a url" }));
    expect(csp["connect-src"]).toEqual(["'self'"]);
  });

  it("allow-lists Google Fonts hosts so Geist fonts load", () => {
    const csp = parseCsp(buildContentSecurityPolicy());
    expect(csp["style-src"]).toContain("https://fonts.googleapis.com");
    expect(csp["font-src"]).toContain("https://fonts.gstatic.com");
    expect(csp["font-src"]).toContain("'self'");
  });

  it("blocks framing via frame-ancestors 'none'", () => {
    const csp = parseCsp(buildContentSecurityPolicy());
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("locks down base-uri, object-src and form-action", () => {
    const csp = parseCsp(buildContentSecurityPolicy());
    expect(csp["base-uri"]).toEqual(["'self'"]);
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["form-action"]).toEqual(["'self'"]);
  });

  it("uses a nonce for inline scripts when one is supplied", () => {
    const csp = parseCsp(buildContentSecurityPolicy({ nonce: "abc123" }));
    expect(csp["script-src"]).toContain("'nonce-abc123'");
    expect(csp["script-src"]).not.toContain("'unsafe-inline'");
  });

  it("permits 'unsafe-inline' for styles only (documented trade-off)", () => {
    const csp = parseCsp(buildContentSecurityPolicy());
    expect(csp["style-src"]).toContain("'unsafe-inline'");
  });

  describe("production hardening", () => {
    const csp = parseCsp(buildContentSecurityPolicy({ isDev: false }));

    it("never ships 'unsafe-eval' in script-src", () => {
      expect(csp["script-src"]).not.toContain("'unsafe-eval'");
    });

    it("does not allow ws:/wss: in connect-src", () => {
      expect(csp["connect-src"]).not.toContain("ws:");
      expect(csp["connect-src"]).not.toContain("wss:");
    });
  });

  describe("development relaxations", () => {
    const csp = parseCsp(buildContentSecurityPolicy({ isDev: true }));

    it("allows 'unsafe-eval' for React Fast Refresh", () => {
      expect(csp["script-src"]).toContain("'unsafe-eval'");
    });

    it("allows ws:/wss: for Hot Module Replacement", () => {
      expect(csp["connect-src"]).toContain("ws:");
      expect(csp["connect-src"]).toContain("wss:");
    });
  });

  it("produces a single-line, semicolon-delimited header value", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).not.toMatch(/\n/);
    expect(csp).toContain("; ");
  });
});

// ── buildSecurityHeaders ─────────────────────────────────────────────────────

describe("buildSecurityHeaders", () => {
  const headers = buildSecurityHeaders();
  const asMap = Object.fromEntries(headers.map((h) => [h.key, h.value]));

  it("returns an array of { key, value } entries", () => {
    expect(Array.isArray(headers)).toBe(true);
    for (const h of headers) {
      expect(typeof h.key).toBe("string");
      expect(typeof h.value).toBe("string");
      expect(h.value.length).toBeGreaterThan(0);
    }
  });

  it("sets X-Content-Type-Options: nosniff", () => {
    expect(asMap["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("sets Referrer-Policy: strict-origin-when-cross-origin", () => {
    expect(asMap["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("sets X-Frame-Options: DENY", () => {
    expect(asMap["X-Frame-Options"]).toBe("DENY");
  });

  it("sets a Permissions-Policy that disables sensitive features", () => {
    expect(asMap["Permissions-Policy"]).toContain("camera=()");
    expect(asMap["Permissions-Policy"]).toContain("microphone=()");
    expect(asMap["Permissions-Policy"]).toContain("geolocation=()");
  });

  it("includes a Content-Security-Policy header", () => {
    expect(asMap["Content-Security-Policy"]).toContain("default-src 'self'");
  });

  it("supports a nonce in the CSP builder output", () => {
    const headers = buildSecurityHeaders({ nonce: "abc123" });
    const csp = headers.find((header) => header.key === "Content-Security-Policy")?.value;
    expect(csp).toContain("'nonce-abc123'");
    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
  });

  it("includes Strict-Transport-Security", () => {
    expect(asMap["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
  });

  it("does not emit duplicate header keys", () => {
    const keys = headers.map((h) => h.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ── next.config.mjs integration ──────────────────────────────────────────────

describe("next.config.mjs headers()", () => {
  it("applies the security headers to every route", async () => {
    const { default: nextConfig } = await import("../next.config.mjs");
    const rules = await nextConfig.headers();

    expect(Array.isArray(rules)).toBe(true);
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");

    const keys = rules[0].headers.map((h: { key: string }) => h.key);
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("Permissions-Policy");
  });

  it("reads NEXT_PUBLIC_API_URL into connect-src", async () => {
    const prev = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "https://api.test.example";
    jest.resetModules();
    try {
      const { default: nextConfig } = await import("../next.config.mjs");
      const rules = await nextConfig.headers();
      const csp = rules[0].headers.find(
        (h: { key: string }) => h.key === "Content-Security-Policy"
      ).value;
      expect(csp).toContain("https://api.test.example");
    } finally {
      process.env.NEXT_PUBLIC_API_URL = prev;
      jest.resetModules();
    }
  });
});
