import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

async function importFresh(modulePath, tag) {
  const url = new URL(modulePath, import.meta.url);
  url.searchParams.set("case", tag);
  return (await import(url.href)).default;
}

test("sitemap includes all expected static routes", async () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://liquifact.test";
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: [] }),
  });

  const sitemap = await importFresh("../app/sitemap.js", "static-routes");
  const entries = await sitemap();
  const pathnames = entries.map((entry) => new URL(entry.url).pathname);

  assert.deepEqual(pathnames, ["/", "/marketplace", "/submit", "/get-started", "/docs"]);
  for (const entry of entries) {
    assert.ok(entry.url.startsWith("https://liquifact.test"));
    assert.ok(entry.lastModified instanceof Date);
  }
});

test("sitemap URL-encodes invoice ids with spaces or slashes and excludes cancelled or id-less invoices", async () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://liquifact.test";
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: [
        { id: "INV 101/A", status: "open", createdAt: "2026-03-15T12:00:00.000Z" },
        { id: "INV/202 B", status: "funded", createdAt: "not-a-date" },
        { id: "INV_CANCELLED_STATUS", status: "cancelled" },
        { id: "INV_CANCELED_STATUS", status: "Canceled" },
        { id: "INV_CANCELLED_FLAG", status: "open", cancelled: true },
        { id: "INV_CANCELED_FLAG", status: "open", canceled: true },
        { status: "open" },
        { id: "", status: "open" },
        { id: null, status: "open" },
      ],
    }),
  });

  const sitemap = await importFresh("../app/sitemap.js", "encoding-and-filtering");
  const entries = await sitemap();
  const invoiceEntries = entries.filter((entry) => new URL(entry.url).pathname.startsWith("/marketplace/"));

  assert.equal(invoiceEntries.length, 2);

  const [first, second] = invoiceEntries;
  assert.equal(first.url, "https://liquifact.test/marketplace/INV%20101%2FA");
  assert.deepEqual(first.lastModified, new Date("2026-03-15T12:00:00.000Z"));
  assert.equal(first.changeFrequency, "daily");
  assert.equal(first.priority, 0.7);

  assert.equal(second.url, "https://liquifact.test/marketplace/INV%2F202%20B");
  assert.equal("lastModified" in second, false);
  assert.equal(second.changeFrequency, "daily");
  assert.equal(second.priority, 0.7);
});

test("robots builds host, sitemap URL, and rules from NEXT_PUBLIC_SITE_URL", async () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://staging.liquifact.io:8443";

  const robots = await importFresh("../app/robots.js", "custom-site-url");
  const output = robots();

  assert.deepEqual(output.rules, { userAgent: "*", allow: "/" });
  assert.equal(output.host, new URL("https://staging.liquifact.io:8443").host);
  assert.equal(output.sitemap, "https://staging.liquifact.io:8443/sitemap.xml");
  assert.ok(new URL(output.sitemap).pathname.endsWith("/sitemap.xml"));
});

test("robots falls back to default site URL when NEXT_PUBLIC_SITE_URL is unset", async () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;

  const robots = await importFresh("../app/robots.js", "default-site-url");
  const output = robots();
  const sitemapUrl = new URL(output.sitemap);

  assert.deepEqual(output.rules, { userAgent: "*", allow: "/" });
  assert.equal(output.host, sitemapUrl.host);
  assert.ok(sitemapUrl.pathname.endsWith("/sitemap.xml"));
});
