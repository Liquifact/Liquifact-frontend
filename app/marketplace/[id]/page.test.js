import { invoiceJsonLd, stringifyJsonLd } from "./page";

describe("marketplace invoice JSON-LD", () => {
  it("escapes untrusted SME text before embedding JSON-LD in a script element", () => {
    const raw = stringifyJsonLd(
      invoiceJsonLd({
        id: "INV_XSS",
        issuer: '</script><script>alert("x")</script>Northwind & Co',
        amount: 100,
        currency: "USDC",
        yieldBps: 650,
        status: "Open",
      })
    );

    expect(raw).not.toContain("<script>");
    expect(raw).not.toContain("&");
    expect(JSON.parse(raw).seller.name).toBe('alert("x")Northwind & Co');
  });
});
