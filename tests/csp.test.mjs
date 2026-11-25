import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCsp, normalizeOrigin, DEFAULT_CSP_REPORT_URI } from "../lib/security/csp.js";

describe("lib/security/csp", () => {
  const dummyNonce = "dGVzdC1ub25jZQ==";

  it("fails when nonce is not provided", () => {
    assert.throws(
      () => buildCsp({ dev: false }),
      /nonce is required/i
    );
  });

  it("handles production versus development directives", () => {
    const prodCsp = buildCsp({ nonce: dummyNonce, dev: false });
    assert.match(prodCsp, /script-src 'self' 'nonce-dGVzdC1ub25jZQ==' 'strict-dynamic'/);
    assert.doesNotMatch(prodCsp, /'unsafe-eval'/);
    assert.match(prodCsp, /upgrade-insecure-requests/);

    const devCsp = buildCsp({ nonce: dummyNonce, dev: true });
    assert.match(devCsp, /script-src 'self' 'nonce-dGVzdC1ub25jZQ==' 'strict-dynamic' 'unsafe-eval'/);
    assert.doesNotMatch(devCsp, /upgrade-insecure-requests/);
  });

  it("never includes 'unsafe-inline' in script-src", () => {
    const prodCsp = buildCsp({ nonce: dummyNonce, dev: false });
    const devCsp = buildCsp({ nonce: dummyNonce, dev: true });

    const getScriptSrc = (csp) => {
      const match = csp.match(/script-src ([^;]+)/);
      return match ? match[1] : "";
    };

    assert.equal(getScriptSrc(prodCsp).includes("'unsafe-inline'"), false);
    assert.equal(getScriptSrc(devCsp).includes("'unsafe-inline'"), false);
  });

  it("includes configured API, RPC, and Horizon URLs in connect-src", () => {
    const csp = buildCsp({
      nonce: dummyNonce,
      apiUrl: "https://backend.liquifact.io",
      rpcUrl: "https://soroban-rpc.stellar.org",
      horizonUrl: "https://horizon.stellar.org",
    });

    assert.match(csp, /connect-src 'self' https:\/\/friendbot\.stellar\.org https:\/\/backend\.liquifact\.io https:\/\/soroban-rpc\.stellar\.org https:\/\/horizon\.stellar\.org/);
  });

  it("includes every RPC and Horizon pool origin in connect-src", () => {
    const csp = buildCsp({
      nonce: dummyNonce,
      rpcUrl: ["https://rpc-a.test/rpc", "https://rpc-b.test:8443/rpc"],
      horizonUrl: "https://horizon-a.test,https://horizon-b.test/accounts/123",
    });
    const connectSrc = csp.match(/connect-src ([^;]+)/)?.[1] ?? "";

    assert.match(connectSrc, /https:\/\/rpc-a\.test/);
    assert.match(connectSrc, /https:\/\/rpc-b\.test:8443/);
    assert.match(connectSrc, /https:\/\/horizon-a\.test/);
    assert.match(connectSrc, /https:\/\/horizon-b\.test/);
    assert.doesNotMatch(connectSrc, /rpc-a\.test\/rpc|\/accounts\/123/);
  });

  it("normalizes URLs to origins, stripping paths, queries, and fragments", () => {
    const origin1 = normalizeOrigin("https://api.liquifact.io/v1/endpoints?query=1#frag");
    assert.equal(origin1, "https://api.liquifact.io");

    const origin2 = normalizeOrigin("http://localhost:8000/rpc/v2");
    assert.equal(origin2, "http://localhost:8000");

    const csp = buildCsp({
      nonce: dummyNonce,
      apiUrl: "https://api.example.com/api/v1/invoices",
      rpcUrl: "https://rpc.example.com:8443/jsonrpc?token=abc",
      horizonUrl: "https://horizon.example.com/accounts/123",
    });

    assert.match(csp, /https:\/\/api\.example\.com/);
    assert.match(csp, /https:\/\/rpc\.example\.com:8443/);
    assert.match(csp, /https:\/\/horizon\.example\.com/);
    assert.doesNotMatch(csp, /\/api\/v1\/invoices/);
    assert.doesNotMatch(csp, /\/jsonrpc/);
    assert.doesNotMatch(csp, /\/accounts\/123/);
  });

  it("throws on invalid configured URLs", () => {
    assert.throws(
      () => normalizeOrigin("not-a-valid-url", "apiUrl"),
      /Invalid apiUrl URL/i
    );

    assert.throws(
      () => normalizeOrigin("ftp://example.com/rpc", "rpcUrl"),
      /Invalid protocol for rpcUrl/i
    );

    assert.throws(
      () => buildCsp({ nonce: dummyNonce, apiUrl: "http://" }),
      /Invalid apiUrl URL/i
    );
  });

  it("retains style-src 'self' 'unsafe-inline' and essential directives", () => {
    const csp = buildCsp({ nonce: dummyNonce });
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /style-src 'self' 'unsafe-inline'/);
    assert.match(csp, /img-src 'self' data: blob:/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /form-action 'self'/);
    assert.match(csp, /object-src 'none'/);
  });

  it("supports optional report-uri and report-to", () => {
    const csp = buildCsp({
      nonce: dummyNonce,
      reportUri: "https://report.liquifact.io/csp",
      reportTo: "csp-endpoint",
    });
    assert.match(csp, /report-uri https:\/\/report\.liquifact\.io\/csp/);
    assert.match(csp, /report-to csp-endpoint/);
  });

  it("defaults report-uri to the first-party endpoint in report-only mode", () => {
    assert.equal(DEFAULT_CSP_REPORT_URI, "/api/csp-report");
    const csp = buildCsp({ nonce: dummyNonce, reportOnly: true });
    assert.match(csp, /report-uri \/api\/csp-report(;|$)/);
  });

  it("keeps an explicit report-uri in report-only mode", () => {
    const csp = buildCsp({ nonce: dummyNonce, reportOnly: true, reportUri: "https://report.liquifact.io/csp" });
    assert.match(csp, /report-uri https:\/\/report\.liquifact\.io\/csp/);
    assert.doesNotMatch(csp, /\/api\/csp-report/);
  });

  it("adds no report-uri when enforcing and none is set", () => {
    const csp = buildCsp({ nonce: dummyNonce, reportOnly: false });
    assert.doesNotMatch(csp, /report-uri/);
  });

  it("reads NEXT_PUBLIC_CSP_REPORT_ONLY when reportOnly is not passed", () => {
    const previous = process.env.NEXT_PUBLIC_CSP_REPORT_ONLY;
    try {
      process.env.NEXT_PUBLIC_CSP_REPORT_ONLY = "1";
      assert.match(buildCsp({ nonce: dummyNonce }), /report-uri \/api\/csp-report/);
      process.env.NEXT_PUBLIC_CSP_REPORT_ONLY = "0";
      assert.doesNotMatch(buildCsp({ nonce: dummyNonce }), /report-uri/);
      delete process.env.NEXT_PUBLIC_CSP_REPORT_ONLY;
      assert.doesNotMatch(buildCsp({ nonce: dummyNonce }), /report-uri/);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_CSP_REPORT_ONLY;
      else process.env.NEXT_PUBLIC_CSP_REPORT_ONLY = previous;
    }
  });
});
