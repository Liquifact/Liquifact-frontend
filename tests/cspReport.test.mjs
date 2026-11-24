import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REPORT_BYTES,
  createCspReportHandler,
  createDeduper,
  createRateLimiter,
  dedupeKey,
  getClientIp,
  normalizeReport,
  sanitizeUri,
} from "../lib/security/cspReport.js";
import { reportError, setReporter } from "../lib/observability/reportError.js";

const legacy = {
  "csp-report": {
    "document-uri": "https://app.liquifact.io/invoices?token=abc#frag",
    "violated-directive": "script-src-elem 'self' 'nonce-xyz'",
    "effective-directive": "script-src-elem",
    "blocked-uri": "https://evil.example.com/x.js?session=1",
    "source-file": "https://app.liquifact.io/_next/app.js",
    "line-number": 12,
    "column-number": 7,
    disposition: "report",
    "script-sample": "alert(1)",
    "original-policy": "default-src 'self'; script-src 'self'",
  },
};

const reportingApi = [
  {
    type: "csp-violation",
    url: "https://app.liquifact.io/",
    body: {
      documentURL: "https://app.liquifact.io/invoices",
      effectiveDirective: "img-src",
      blockedURL: "https://cdn.example.com/a.png",
      disposition: "enforce",
      lineNumber: 3,
      columnNumber: 9,
      sample: "",
    },
  },
  { type: "deprecation", body: { id: "x" } },
  {
    type: "csp-violation",
    body: { effectiveDirective: "script-src", blockedURL: "inline" },
  },
];

function makeClock(start = 1_000_000) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => {
    t += ms;
  };
  return now;
}

function post(body, { type = "application/csp-report", headers = {}, raw } = {}) {
  return new Request("https://app.liquifact.io/api/csp-report", {
    method: "POST",
    headers: { "content-type": type, ...headers },
    body: raw ?? (typeof body === "string" ? body : JSON.stringify(body)),
  });
}

function recorder() {
  const calls = [];
  return { calls, reporter: (error, context) => calls.push({ error, context }) };
}

describe("normalizeReport", () => {
  it("normalizes a legacy report-uri payload", () => {
    const [report, ...rest] = normalizeReport(legacy);
    assert.equal(rest.length, 0);
    assert.deepEqual(report, {
      directive: "script-src-elem",
      blockedUri: "https://evil.example.com/x.js",
      documentUri: "https://app.liquifact.io/invoices",
      sourceFile: "https://app.liquifact.io/_next/app.js",
      lineNumber: 12,
      columnNumber: 7,
      disposition: "report",
      sample: "alert(1)",
    });
  });

  it("normalizes a Reporting API batch and skips other report types", () => {
    const reports = normalizeReport(reportingApi);
    assert.equal(reports.length, 2);
    assert.equal(reports[0].directive, "img-src");
    assert.equal(reports[0].blockedUri, "https://cdn.example.com/a.png");
    assert.equal(reports[0].disposition, "enforce");
    assert.equal(reports[0].sample, undefined);
    assert.equal(reports[1].directive, "script-src");
    assert.equal(reports[1].blockedUri, "inline");
  });

  it("falls back to violated-directive and keeps only the directive name", () => {
    const [report] = normalizeReport({
      "csp-report": { "violated-directive": "Style-Src 'self'", "blocked-uri": "inline" },
    });
    assert.equal(report.directive, "style-src");
  });

  it("returns an empty list for malformed shapes without throwing", () => {
    for (const body of [null, undefined, 5, "x", true, [], {}, [1, "a", null], { "csp-report": "no" }, { "csp-report": {} }, [{ type: "csp-violation" }]]) {
      assert.deepEqual(normalizeReport(body), []);
    }
  });

  it("rejects a report whose directive is not a plain directive name", () => {
    assert.deepEqual(normalizeReport({ "csp-report": { "effective-directive": "<script>alert(1)</script>" } }), []);
    assert.deepEqual(normalizeReport({ "csp-report": { "effective-directive": 42 } }), []);
  });

  it("truncates long fields and drops control characters", () => {
    const [report] = normalizeReport({
      "csp-report": {
        "effective-directive": "script-src",
        "blocked-uri": `https://example.com/${"a".repeat(2000)}`,
        "script-sample": `a\u0000b${"x".repeat(500)}`,
        "source-file": "line1\nline2",
      },
    });
    assert.ok(report.blockedUri.length <= 256);
    assert.ok(report.sample.length <= 128);
    assert.ok(!report.sample.includes("\u0000"));
    assert.ok(!report.sourceFile.includes("\n"));
  });

  it("ignores non-integer or negative line and column numbers", () => {
    const [report] = normalizeReport({
      "csp-report": { "effective-directive": "script-src", "line-number": -1, "column-number": "7", "disposition": "bogus" },
    });
    assert.equal(report.lineNumber, undefined);
    assert.equal(report.columnNumber, undefined);
    assert.equal(report.disposition, undefined);
  });

  it("caps the number of reports taken from one batch", () => {
    const batch = Array.from({ length: 50 }, () => ({
      type: "csp-violation",
      body: { effectiveDirective: "img-src", blockedURL: "inline" },
    }));
    assert.equal(normalizeReport(batch).length, 10);
  });
});

describe("sanitizeUri", () => {
  it("strips userinfo, query and fragment", () => {
    assert.equal(
      sanitizeUri("https://user:pass@example.com:8443/a/b?token=1#x"),
      "https://example.com:8443/a/b",
    );
  });

  it("keeps CSP keywords and reduces other schemes to the scheme", () => {
    assert.equal(sanitizeUri("inline"), "inline");
    assert.equal(sanitizeUri("eval"), "eval");
    assert.equal(sanitizeUri("data:text/html;base64,AAAA"), "data:");
    assert.equal(sanitizeUri("blob:https://example.com/uuid"), "blob:");
    assert.equal(sanitizeUri(""), undefined);
    assert.equal(sanitizeUri(7), undefined);
  });
});

describe("createRateLimiter", () => {
  it("allows a burst up to capacity then rejects with a retry hint", () => {
    const now = makeClock();
    const limiter = createRateLimiter({ capacity: 3, refillPerSecond: 1, now });
    assert.equal(limiter.take("a").allowed, true);
    assert.equal(limiter.take("a").allowed, true);
    assert.equal(limiter.take("a").allowed, true);
    const blocked = limiter.take("a");
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 1);
  });

  it("refills over time with the injected clock", () => {
    const now = makeClock();
    const limiter = createRateLimiter({ capacity: 2, refillPerSecond: 1, now });
    limiter.take("a");
    limiter.take("a");
    assert.equal(limiter.take("a").allowed, false);
    now.advance(999);
    assert.equal(limiter.take("a").allowed, false);
    now.advance(1);
    assert.equal(limiter.take("a").allowed, true);
    assert.equal(limiter.take("a").allowed, false);
    now.advance(60_000);
    assert.equal(limiter.take("a").allowed, true);
    assert.equal(limiter.take("a").allowed, true);
    assert.equal(limiter.take("a").allowed, false, "refill is capped at capacity");
  });

  it("keeps a separate bucket per key", () => {
    const now = makeClock();
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1, now });
    assert.equal(limiter.take("a").allowed, true);
    assert.equal(limiter.take("a").allowed, false);
    assert.equal(limiter.take("b").allowed, true);
  });

  it("bounds memory by dropping idle then oldest buckets", () => {
    const now = makeClock();
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1, maxKeys: 3, now });
    for (const key of ["a", "b", "c"]) limiter.take(key);
    assert.equal(limiter.size, 3);
    now.advance(5_000); // all refilled, so all idle
    limiter.take("d");
    assert.ok(limiter.size <= 3);
    for (const key of ["e", "f", "g", "h"]) limiter.take(key);
    assert.ok(limiter.size <= 3);
  });
});

describe("dedupe", () => {
  it("keys on directive and the blocked host, not the path", () => {
    const a = dedupeKey({ directive: "script-src", blockedUri: "https://Evil.example.com/a.js" });
    const b = dedupeKey({ directive: "script-src", blockedUri: "https://evil.example.com/b.js" });
    const c = dedupeKey({ directive: "img-src", blockedUri: "https://evil.example.com/a.js" });
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(dedupeKey({ directive: "script-src", blockedUri: "inline" }), "script-src|inline");
  });

  it("suppresses repeats inside the window and allows them after", () => {
    const now = makeClock();
    const deduper = createDeduper({ windowMs: 1000, now });
    assert.equal(deduper.isDuplicate("k"), false);
    assert.equal(deduper.isDuplicate("k"), true);
    now.advance(999);
    assert.equal(deduper.isDuplicate("k"), true, "a repeat does not extend the window");
    now.advance(1);
    assert.equal(deduper.isDuplicate("k"), false);
    assert.equal(deduper.isDuplicate("other"), false);
  });

  it("bounds memory", () => {
    const now = makeClock();
    const deduper = createDeduper({ windowMs: 1000, maxEntries: 3, now });
    for (const key of ["a", "b", "c", "d", "e"]) deduper.isDuplicate(key);
    assert.ok(deduper.size <= 3);
  });
});

describe("getClientIp", () => {
  it("prefers the first forwarded address, then x-real-ip, then unknown", () => {
    assert.equal(getClientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "1.1.1.1");
    assert.equal(getClientIp(new Headers({ "x-real-ip": "3.3.3.3" })), "3.3.3.3");
    assert.equal(getClientIp(new Headers()), "unknown");
  });
});

describe("createCspReportHandler", () => {
  function setup(overrides = {}) {
    const now = makeClock();
    const { calls, reporter } = recorder();
    const handler = createCspReportHandler({
      reporter,
      limiter: createRateLimiter({ capacity: 5, refillPerSecond: 1, now }),
      deduper: createDeduper({ windowMs: 60_000, now }),
      ...overrides,
    });
    return { handler, calls, now };
  }

  it("accepts a legacy report with 204 and forwards it once", async () => {
    const { handler, calls } = setup();
    const response = await handler(post(legacy));
    assert.equal(response.status, 204);
    assert.equal(calls.length, 1);
    assert.match(calls[0].error.message, /script-src-elem/);
    assert.equal(calls[0].context.source, "csp-report");
    assert.equal(calls[0].context.blockedUri, "https://evil.example.com/x.js");
  });

  it("accepts a Reporting API batch (application/reports+json)", async () => {
    const { handler, calls } = setup();
    const response = await handler(post(reportingApi, { type: "application/reports+json; charset=utf-8" }));
    assert.equal(response.status, 204);
    assert.equal(calls.length, 2);
  });

  it("rejects other content types with 415", async () => {
    const { handler, calls } = setup();
    for (const type of ["application/json", "text/plain", ""]) {
      const response = await handler(post(legacy, { type }));
      assert.equal(response.status, 415);
    }
    assert.equal(calls.length, 0);
  });

  it("rejects an oversized body with 413, by header and by streamed size", async () => {
    const { handler, calls } = setup();
    const big = JSON.stringify({ "csp-report": { "effective-directive": "script-src", "script-sample": "x".repeat(MAX_REPORT_BYTES) } });

    const byHeader = await handler(post(big, { headers: { "content-length": String(big.length) } }));
    assert.equal(byHeader.status, 413);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    const streamed = await handler(
      new Request("https://app.liquifact.io/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/csp-report" },
        body: stream,
        duplex: "half",
      }),
    );
    assert.equal(streamed.status, 413);
    assert.equal(calls.length, 0);
  });

  it("returns 400 for invalid JSON and for JSON with no valid report", async () => {
    const { handler, calls } = setup();
    assert.equal((await handler(post("{not json"))).status, 400);
    assert.equal((await handler(post(""))).status, 400);
    assert.equal((await handler(post({ hello: "world" }))).status, 400);
    assert.equal((await handler(post([1, 2, 3]))).status, 400);
    assert.equal((await handler(post("null"))).status, 400);
    assert.equal(calls.length, 0);
  });

  it("never throws, even if the reporter does", async () => {
    const { handler } = setup({
      reporter: () => {
        throw new Error("sink down");
      },
    });
    const response = await handler(post(legacy));
    assert.ok(response.status >= 400 && response.status < 500);
  });

  it("de-duplicates by directive and blocked host within the window, then reports again", async () => {
    const now = makeClock();
    const { calls, reporter } = recorder();
    const handler = createCspReportHandler({
      reporter,
      limiter: createRateLimiter({ capacity: 100, refillPerSecond: 100, now }),
      deduper: createDeduper({ windowMs: 60_000, now }),
    });
    const variant = (host, path) => ({
      "csp-report": { "effective-directive": "img-src", "blocked-uri": `https://${host}/${path}` },
    });

    assert.equal((await handler(post(variant("cdn.example.com", "a.png")))).status, 204);
    assert.equal((await handler(post(variant("cdn.example.com", "b.png")))).status, 204);
    assert.equal(calls.length, 1, "same directive and host is collapsed");

    assert.equal((await handler(post(variant("other.example.com", "a.png")))).status, 204);
    assert.equal(calls.length, 2, "a different host is reported");

    now.advance(60_000);
    assert.equal((await handler(post(variant("cdn.example.com", "c.png")))).status, 204);
    assert.equal(calls.length, 3, "reported again once the window has passed");
  });

  it("rate limits per IP with 429 and Retry-After, and recovers", async () => {
    const now = makeClock();
    const { calls, reporter } = recorder();
    const handler = createCspReportHandler({
      reporter,
      limiter: createRateLimiter({ capacity: 2, refillPerSecond: 1, now }),
      deduper: createDeduper({ windowMs: 0, now }),
    });
    const from = (ip) => post(legacy, { headers: { "x-forwarded-for": ip } });

    assert.equal((await handler(from("9.9.9.9"))).status, 204);
    assert.equal((await handler(from("9.9.9.9"))).status, 204);
    const limited = await handler(from("9.9.9.9"));
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "1");

    assert.equal((await handler(from("8.8.8.8"))).status, 204, "another IP is unaffected");

    now.advance(1000);
    assert.equal((await handler(from("9.9.9.9"))).status, 204);
    assert.equal(calls.length, 4);
  });

  it("rate limits before reading the body", async () => {
    const { handler } = setup({
      limiter: createRateLimiter({ capacity: 1, refillPerSecond: 0.001 }),
    });
    await handler(post("{bad"));
    const second = await handler(post(legacy));
    assert.equal(second.status, 429);
  });
});

describe("reports reach reportError scrubbed", () => {
  afterEach(() => setReporter(null));

  it("redacts Stellar secret seeds and sensitive keys in the forwarded context", async () => {
    const sink = [];
    setReporter((error, context) => sink.push({ error, context }));
    const seed = `S${"A".repeat(55)}`;
    const handler = createCspReportHandler({
      reporter: (error, context) => reportError(error, { ...context, token: "t0k3n", apiKey: "k" }),
      limiter: createRateLimiter(),
      deduper: createDeduper(),
    });

    const response = await handler(
      post({
        "csp-report": {
          "effective-directive": "script-src",
          "blocked-uri": "inline",
          "script-sample": `const s = "${seed}"`,
        },
      }),
    );

    assert.equal(response.status, 204);
    assert.equal(sink.length, 1);
    assert.ok(!sink[0].context.sample.includes(seed));
    assert.match(sink[0].context.sample, /\[REDACTED\]/);
    assert.equal(sink[0].context.token, "[REDACTED]");
    assert.equal(sink[0].context.apiKey, "[REDACTED]");
    assert.equal(sink[0].context.directive, "script-src");
  });

  it("uses reportError by default", async () => {
    const sink = [];
    setReporter((error, context) => sink.push({ error, context }));
    const seed = `S${"B".repeat(55)}`;
    const handler = createCspReportHandler({ limiter: createRateLimiter(), deduper: createDeduper() });
    await handler(
      post({ "csp-report": { "effective-directive": "script-src", "blocked-uri": "eval", "script-sample": seed } }),
    );
    assert.equal(sink.length, 1);
    assert.equal(sink[0].context.sample, "[REDACTED]");
  });
});
