/**
 * @jest-environment jsdom
 *
 * Regression coverage for funding API request idempotency.
 */

import { fundInvoice } from "./fundInvoice";

describe("fundInvoice idempotency contract", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ txHash: "tx-test" }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("sends a provided idempotency key as a request header", async () => {
    await fundInvoice({
      id: "invoice/one",
      amount: 500,
      currency: "USD",
      idempotencyKey: "retry-key",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/invoices/invoice%2Fone/fund"),
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "retry-key" }),
        body: JSON.stringify({ amount: 500, currency: "USD" }),
      })
    );
  });

  it("keeps the request contract compatible when no key is provided", async () => {
    await fundInvoice({ id: "invoice-two", amount: 1, currency: "USD" });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers).not.toHaveProperty("Idempotency-Key");
  });
});