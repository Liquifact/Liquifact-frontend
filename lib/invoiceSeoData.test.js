import { fetchInvoiceById, SEO_DEMO_INVOICE } from "./invoiceSeoData.js";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("fetchInvoiceById", () => {
  it("uses a revalidated, timeout-bounded API request", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "INV_0002", issuer: "Northwind Textiles" }),
    });
    global.fetch = fetchMock;

    await expect(fetchInvoiceById("INV_0002")).resolves.toMatchObject({
      id: "INV_0002",
      issuer: "Northwind Textiles",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/invoices/INV_0002",
      expect.objectContaining({
        next: { revalidate: 60 },
        signal: expect.objectContaining({ aborted: false }),
      })
    );
  });

  it("falls back to the matching demo invoice when the API is unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("API unavailable"));

    await expect(fetchInvoiceById("INV_0002")).resolves.toBe(SEO_DEMO_INVOICE);
    await expect(fetchInvoiceById("unknown")).resolves.toBeNull();
  });
});
