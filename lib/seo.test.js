import { invoiceMeta } from "./seo.js";

describe("invoiceMeta", () => {
  const invoice = {
    id: "INV_0002",
    issuer: "Northwind Textiles",
    amount: 25_000,
    currency: "USDC",
    yieldBps: 650,
    fundedPercent: 72,
  };

  it("builds invoice metadata with canonical, Open Graph, and Twitter data", () => {
    const metadata = invoiceMeta(invoice, "https://liquifact.example");

    expect(metadata.title).toContain("INV_0002 · Northwind Textiles");
    expect(metadata.title).toContain("25,000 USDC at 6.50%, 72% funded");
    expect(metadata.description.length).toBeLessThanOrEqual(160);
    expect(metadata.alternates.canonical).toBe("/marketplace/INV_0002");
    expect(metadata.openGraph.images[0].url).toBe("/marketplace/INV_0002/opengraph-image");
    expect(metadata.twitter.card).toBe("summary_large_image");
    expect(metadata.robots).toBeUndefined();
  });

  it("marks missing invoices as non-indexable", () => {
    const metadata = invoiceMeta(null, "https://liquifact.example", "missing/id");
    expect(metadata.robots).toEqual({ index: false });
    expect(metadata.alternates.canonical).toBe("/marketplace/missing%2Fid");
  });

  it("removes markup delimiters from untrusted metadata text", () => {
    const metadata = invoiceMeta({ ...invoice, issuer: "<b>Northwind</b>" }, "https://liquifact.example");
    expect(metadata.title).not.toContain("<");
    expect(metadata.title).toContain("Northwind");
  });
});
